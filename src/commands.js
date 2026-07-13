const play = require('play-dl');
const { getQueue, deleteQueue, hasQueue } = require('./queue');
const { playSong, playRadio, connectAndPlay, connectAndPlayRadio } = require('./player');
const { getStation, getAllStations, searchStations } = require('./radio');

/**
 * Route commands
 */
async function handleCommand(command, args, message) {
  switch (command) {
    case 'play':
    case 'p':
      return commandPlay(args, message);
    case 'skip':
    case 's':
    case 'next':
      return commandSkip(message);
    case 'stop':
    case 'leave':
    case 'disconnect':
    case 'dc':
      return commandStop(message);
    case 'pause':
      return commandPause(message);
    case 'resume':
    case 'unpause':
      return commandResume(message);
    case 'queue':
    case 'q':
      return commandQueue(message);
    case 'nowplaying':
    case 'np':
      return commandNowPlaying(message);
    case 'loop':
      return commandLoop(args, message);
    case 'shuffle':
      return commandShuffle(message);
    case 'volume':
    case 'vol':
      return commandVolume(args, message);
    case 'remove':
      return commandRemove(args, message);
    case 'clear':
      return commandClear(message);
    case 'radio':
      return commandRadio(args, message);
    case 'stations':
      return commandStations(message);
    case 'help':
    case 'h':
      return commandHelp(message);
    default:
      return;
  }
}


/**
 * !play <url or search> — Play from any link or search YouTube
 */
async function commandPlay(args, message) {
  if (!args.length) {
    return message.reply(
      '❌ Give me a link or search query!\n' +
      'Examples:\n' +
      '`!play https://youtube.com/watch?v=...`\n' +
      '`!play lofi beats to study to`\n' +
      '`!play https://soundcloud.com/artist/track`'
    );
  }

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
    return message.reply('❌ Join a voice channel first!');
  }

  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has('Connect') || !permissions.has('Speak')) {
    return message.reply('❌ I need **Connect** and **Speak** permissions in your voice channel!');
  }

  const query = args.join(' ');
  let songInfo;

  message.channel.sendTyping();

  try {
    songInfo = await resolveQuery(query, message);
  } catch (error) {
    console.error('Error resolving query:', error);
    return message.reply(`❌ Couldn't find anything for: \`${query}\`\nError: ${error.message}`);
  }

  if (!songInfo) {
    return message.reply('❌ No results found.');
  }

  const queue = getQueue(message.guild.id);

  if (queue.radio) {
    queue.radio = null;
  }

  queue.songs.push(songInfo);

  if (!queue.connection) {
    await connectAndPlay(message, songInfo);
  } else {
    message.reply(
      `✅ **Added to Queue** (#${queue.songs.length})\n` +
      `**${songInfo.title}**\n` +
      `Duration: \`${songInfo.duration || 'N/A'}\``
    );
  }
}


/**
 * Resolve a query to song info — handles URLs and searches
 */
async function resolveQuery(query, message) {
  const ytValidation = play.yt_validate(query);

  if (ytValidation === 'video') {
    const info = await play.video_info(query);
    return {
      title: info.video_details.title,
      url: info.video_details.url,
      duration: info.video_details.durationRaw,
      requestedBy: message.author.username,
    };
  }

  if (ytValidation === 'playlist') {
    const playlist = await play.playlist_info(query, { incomplete: true });
    const videos = await playlist.all_videos();
    if (videos.length === 0) throw new Error('Empty playlist');

    const queue = getQueue(message.guild.id);
    const songs = videos.map((video) => ({
      title: video.title,
      url: video.url,
      duration: video.durationRaw,
      requestedBy: message.author.username,
    }));

    for (let i = 1; i < songs.length; i++) {
      queue.songs.push(songs[i]);
    }

    message.channel.send(`📋 **Playlist loaded:** ${playlist.title} — ${songs.length} tracks added`);
    return songs[0];
  }

  if (query.includes('soundcloud.com')) {
    const scType = await play.so_validate(query);
    if (scType === 'track') {
      const info = await play.soundcloud(query);
      return {
        title: info.name,
        url: info.url,
        duration: formatDuration(info.durationInMs),
        requestedBy: message.author.username,
      };
    }
  }

  // Search YouTube
  const results = await play.search(query, { limit: 1 });
  if (!results || results.length === 0) return null;

  return {
    title: results[0].title,
    url: results[0].url,
    duration: results[0].durationRaw,
    requestedBy: message.author.username,
  };
}


function commandSkip(message) {
  if (!hasQueue(message.guild.id)) return message.reply('❌ Nothing is playing.');
  const queue = getQueue(message.guild.id);
  if (queue.songs.length === 0 && !queue.radio) return message.reply('❌ Nothing to skip.');
  queue.loop = false;
  message.reply('⏭️ Skipped!');
  queue.player.stop();
}

function commandStop(message) {
  if (!hasQueue(message.guild.id)) return message.reply('❌ I\'m not playing anything.');
  const queue = getQueue(message.guild.id);
  queue.songs = [];
  queue.radio = null;
  if (queue.player) queue.player.stop();
  if (queue.connection) queue.connection.destroy();
  deleteQueue(message.guild.id);
  message.reply('👋 Stopped and disconnected. See ya!');
}

function commandPause(message) {
  if (!hasQueue(message.guild.id)) return message.reply('❌ Nothing is playing.');
  const queue = getQueue(message.guild.id);
  if (queue.paused) return message.reply('⏸️ Already paused. Use `!resume` to continue.');
  queue.player.pause();
  queue.paused = true;
  queue.playing = false;
  message.reply('⏸️ Paused.');
}

function commandResume(message) {
  if (!hasQueue(message.guild.id)) return message.reply('❌ Nothing to resume.');
  const queue = getQueue(message.guild.id);
  if (!queue.paused) return message.reply('▶️ Already playing!');
  queue.player.unpause();
  queue.paused = false;
  queue.playing = true;
  message.reply('▶️ Resumed!');
}


function commandQueue(message) {
  if (!hasQueue(message.guild.id)) return message.reply('📭 Queue is empty. Use `!play` to add songs!');
  const queue = getQueue(message.guild.id);

  if (queue.radio && queue.songs.length === 0) {
    return message.reply(`📻 **Radio mode:** ${queue.radio.name}\nGenre: ${queue.radio.genre}`);
  }
  if (!queue.songs.length) return message.reply('📭 Queue is empty.');

  const now = queue.songs[0];
  let text = `🎶 **Now Playing:** ${now.title} [\`${now.duration || 'Live'}\`]\n`;
  text += `Requested by: ${now.requestedBy || 'Unknown'}\n\n`;
  if (queue.loop) text += '🔂 Loop: **Song**\n';
  if (queue.loopQueue) text += '🔁 Loop: **Queue**\n';
  text += `🔊 Volume: **${queue.volume}%**\n\n`;

  if (queue.songs.length > 1) {
    text += '**Up Next:**\n';
    const upcoming = queue.songs.slice(1, 11);
    upcoming.forEach((song, i) => {
      text += `\`${i + 1}.\` ${song.title} [\`${song.duration || 'N/A'}\`] — *${song.requestedBy}*\n`;
    });
    if (queue.songs.length > 11) text += `\n...and **${queue.songs.length - 11}** more tracks`;
  }
  text += `\n\n**Total:** ${queue.songs.length} track(s)`;
  message.reply(text);
}

function commandNowPlaying(message) {
  if (!hasQueue(message.guild.id)) return message.reply('❌ Nothing is playing.');
  const queue = getQueue(message.guild.id);
  if (queue.radio) return message.reply(`📻 **Radio:** ${queue.radio.name}\nGenre: ${queue.radio.genre}`);
  if (!queue.songs.length) return message.reply('❌ Nothing is playing.');
  const song = queue.songs[0];
  let text = `🎶 **Now Playing:**\n**${song.title}**\nDuration: \`${song.duration || 'Live'}\`\n`;
  text += `Requested by: ${song.requestedBy || 'Unknown'}\n${song.url}`;
  message.reply(text);
}


function commandLoop(args, message) {
  if (!hasQueue(message.guild.id)) return message.reply('❌ Nothing is playing.');
  const queue = getQueue(message.guild.id);
  const mode = args[0]?.toLowerCase();

  if (!mode || mode === 'song' || mode === 'track') {
    queue.loop = !queue.loop;
    queue.loopQueue = false;
    return message.reply(queue.loop ? '🔂 **Loop:** Current song (on)' : '➡️ **Loop:** Off');
  }
  if (mode === 'queue' || mode === 'all') {
    queue.loopQueue = !queue.loopQueue;
    queue.loop = false;
    return message.reply(queue.loopQueue ? '🔁 **Loop:** Entire queue (on)' : '➡️ **Loop:** Off');
  }
  if (mode === 'off' || mode === 'none') {
    queue.loop = false;
    queue.loopQueue = false;
    return message.reply('➡️ **Loop:** Off');
  }
  message.reply('Usage: `!loop` (song) | `!loop queue` | `!loop off`');
}

function commandShuffle(message) {
  if (!hasQueue(message.guild.id)) return message.reply('❌ Nothing in queue.');
  const queue = getQueue(message.guild.id);
  if (queue.songs.length <= 2) return message.reply('❌ Need at least 2 songs in queue to shuffle.');
  const current = queue.songs[0];
  const rest = queue.songs.slice(1);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  queue.songs = [current, ...rest];
  message.reply(`🔀 Shuffled **${rest.length}** tracks in queue!`);
}

function commandVolume(args, message) {
  if (!hasQueue(message.guild.id)) return message.reply('❌ Nothing is playing.');
  const queue = getQueue(message.guild.id);
  if (!args.length) return message.reply(`🔊 Volume: **${queue.volume}%**`);
  const vol = parseInt(args[0]);
  if (isNaN(vol) || vol < 0 || vol > 150) return message.reply('❌ Volume must be between 0 and 150.');
  queue.volume = vol;
  try {
    const resource = queue.player?.state?.resource;
    if (resource?.volume) resource.volume.setVolumeLogarithmic(vol / 100);
  } catch {}
  const emoji = vol === 0 ? '🔇' : vol < 50 ? '🔉' : '🔊';
  message.reply(`${emoji} Volume set to **${vol}%**`);
}

function commandRemove(args, message) {
  if (!hasQueue(message.guild.id)) return message.reply('❌ Nothing in queue.');
  const queue = getQueue(message.guild.id);
  const pos = parseInt(args[0]);
  if (isNaN(pos) || pos < 1 || pos >= queue.songs.length) {
    return message.reply(`❌ Invalid position. Use a number between 1 and ${queue.songs.length - 1}`);
  }
  const removed = queue.songs.splice(pos, 1)[0];
  message.reply(`🗑️ Removed: **${removed.title}**`);
}

function commandClear(message) {
  if (!hasQueue(message.guild.id)) return message.reply('❌ Nothing in queue.');
  const queue = getQueue(message.guild.id);
  const current = queue.songs[0];
  queue.songs = current ? [current] : [];
  message.reply('🗑️ Queue cleared! Current song still playing.');
}


async function commandRadio(args, message) {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.reply('❌ Join a voice channel first!');
  if (!args.length) return commandStations(message);

  const stationName = args.join(' ').toLowerCase();
  const station = getStation(stationName);

  if (!station) {
    const results = searchStations(stationName);
    if (results.length === 0) {
      return message.reply(`❌ Station not found: \`${stationName}\`\nUse \`!stations\` to see all available stations.`);
    }
    if (results.length === 1) return playRadioStation(message, results[0][1]);
    const list = results.slice(0, 5).map(([key, s]) => `\`${key}\` — ${s.name} (${s.genre})`).join('\n');
    return message.reply(`Found multiple stations:\n${list}\n\nUse \`!radio <name>\` to pick one.`);
  }
  await playRadioStation(message, station);
}

async function playRadioStation(message, station) {
  const queue = getQueue(message.guild.id);
  if (!queue.connection) {
    await connectAndPlayRadio(message, station);
  } else {
    queue.radio = station;
    queue.songs = [];
    await playRadio(message.guild.id, station);
  }
}

function commandStations(message) {
  const pages = [
    `📻 **Radio Stations — Page 1/3**\n\n` +
    `**🇬🇧 UK:**\n` +
    `\`!radio virgin\` — Virgin Radio UK (Pop/Hits)\n` +
    `\`!radio virgin-anthems\` — Virgin Radio Anthems (Rock)\n` +
    `\`!radio virgin-chilled\` — Virgin Radio Chilled\n` +
    `\`!radio virgin-80s\` — Virgin Radio 80s\n` +
    `\`!radio bbc1\` — BBC Radio 1 (New Music)\n` +
    `\`!radio bbc1xtra\` — BBC 1Xtra (Hip Hop/R&B/Grime)\n` +
    `\`!radio bbc2\` — BBC Radio 2 (Adult Hits)\n` +
    `\`!radio bbc6\` — BBC 6 Music (Alternative)\n\n` +
    `**🇨🇦 Canada:**\n` +
    `\`!radio cbc-music\` — CBC Music (Vancouver)\n` +
    `\`!radio cbc-radio1\` — CBC Radio One (Toronto)\n\n` +
    `**🇫🇷 France / NRJ:**\n` +
    `\`!radio nrj\` — NRJ Hit Music Only\n` +
    `\`!radio nrj-dance\` — NRJ Dance\n` +
    `\`!radio nrj-hiphop\` — NRJ Hip Hop`,

    `📻 **Radio Stations — Page 2/3**\n\n` +
    `**🇺🇸 US:**\n` +
    `\`!radio kexp\` — KEXP 90.3 (Seattle - Indie)\n` +
    `\`!radio kcrw\` — KCRW (LA - Eclectic)\n\n` +
    `**🌍 International:**\n` +
    `\`!radio nts\` — NTS Radio (London Underground)\n` +
    `\`!radio triplej\` — Triple J (Australia)\n` +
    `\`!radio worldwide\` — Worldwide FM (Global)\n` +
    `\`!radio virgin-italy\` — Virgin Radio Italy (Rock)\n` +
    `\`!radio radio105\` — Radio 105 (Italy Pop)\n` +
    `\`!radio rmc\` — Radio Monte Carlo\n\n` +
    `**🎶 SomaFM (ad-free, curated):**\n` +
    `\`!radio somafm-groove\` — Groove Salad (Chill)\n` +
    `\`!radio somafm-indie\` — Indie Pop Rocks\n` +
    `\`!radio somafm-soul\` — Seven Inch Soul (60s/70s)\n` +
    `\`!radio somafm-defcon\` — DEF CON (Synthwave)\n` +
    `\`!radio somafm-metal\` — Metal Detector`,

    `📻 **Radio Stations — Page 3/3**\n\n` +
    `**🎶 Genre Stations (24/7, no talk):**\n` +
    `\`!radio pop\` — Pop Hits\n` +
    `\`!radio rock\` — Classic Rock\n` +
    `\`!radio metal\` — Metal\n` +
    `\`!radio hiphop\` — Hip Hop\n` +
    `\`!radio rnb\` — R&B / Soul\n` +
    `\`!radio house\` — Deep House\n` +
    `\`!radio techno\` — Techno\n` +
    `\`!radio indie\` — Indie Rock\n` +
    `\`!radio reggae\` — Reggae\n` +
    `\`!radio blues\` — Blues\n` +
    `\`!radio jazz\` — Jazz (KJAZZ LA)\n` +
    `\`!radio jazz-nola\` — Jazz (New Orleans)\n` +
    `\`!radio classical\` — Classical (WQXR NYC)\n` +
    `\`!radio 80s\` — 80s Hits\n` +
    `\`!radio 90s\` — 90s Hits\n` +
    `\`!radio lofi\` — Lo-fi / Vaporwave\n` +
    `\`!radio ambient\` — Ambient / Sleep\n\n` +
    `💡 **Tip:** You can also search! Try \`!radio hip hop\` or \`!radio italian\``,
  ];
  pages.forEach((page) => message.channel.send(page));
}


function commandHelp(message) {
  const text = `
🎵 **Music Bot — Commands**

**▶️ Playback:**
\`!play <link/search>\` — Play from any link or search YouTube
\`!pause\` — Pause
\`!resume\` — Resume
\`!skip\` — Skip to next
\`!stop\` — Stop & leave channel

**📋 Queue:**
\`!queue\` — View queue
\`!shuffle\` — Shuffle queue
\`!loop\` — Loop current song
\`!loop queue\` — Loop entire queue
\`!loop off\` — Disable loop
\`!remove <#>\` — Remove track from queue
\`!clear\` — Clear queue

**🔊 Audio:**
\`!volume <0-150>\` — Set volume
\`!nowplaying\` — Show current track

**📻 Radio (24/7 streams, no ads):**
\`!radio <station>\` — Play a radio station
\`!stations\` — List all stations

**Shortcuts:** \`!p\`, \`!s\`, \`!q\`, \`!np\`, \`!dc\`, \`!vol\`, \`!h\`

**Supported Links:**
• YouTube videos & playlists
• SoundCloud tracks
• Direct audio URLs
• Search by song name

*No ads. No votes. No limits. Just music.* 🎶
  `;
  message.reply(text);
}

function formatDuration(ms) {
  if (!ms) return 'N/A';
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

module.exports = { handleCommand };
