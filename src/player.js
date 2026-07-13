const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
} = require('@discordjs/voice');
const { getQueue, deleteQueue } = require('./queue');
const { spawn } = require('child_process');

// Always use system FFmpeg
const FFMPEG_PATH = '/usr/bin/ffmpeg';

/**
 * Play the next song in the queue
 */
async function playSong(guildId, song) {
  const queue = getQueue(guildId);

  if (!song) {
    setTimeout(() => {
      const currentQueue = getQueue(guildId);
      if (currentQueue && currentQueue.songs.length === 0 && !currentQueue.radio) {
        if (currentQueue.connection) {
          currentQueue.connection.destroy();
        }
        deleteQueue(guildId);
      }
    }, 120_000);
    return;
  }

  try {
    // Determine how to stream the audio
    let process;

    if (song.url.includes('soundcloud.com')) {
      // SoundCloud: use yt-dlp (it supports SoundCloud without auth)
      process = spawn('yt-dlp', [
        '-f', 'bestaudio',
        '-o', '-',
        '--quiet',
        '--no-warnings',
        '--no-playlist',
        song.url,
      ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } else {
      // YouTube or other: use yt-dlp with web_creator bypass
      process = spawn('yt-dlp', [
        '-f', 'bestaudio[ext=webm]/bestaudio',
        '-o', '-',
        '--quiet',
        '--no-warnings',
        '--no-playlist',
        '--extractor-args', 'youtube:player_client=web_creator',
        song.url,
      ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    }

    process.stderr.on('data', (d) => {
      const msg = d.toString().trim();
      if (msg) console.error('yt-dlp:', msg);
    });
    process.on('error', (e) => console.error('yt-dlp spawn error:', e.message));

    const resource = createAudioResource(process.stdout, {
      inputType: StreamType.Arbitrary,
    });

    queue.player.play(resource);
    queue.playing = true;
    queue.paused = false;
    queue.radioProcess = process;

    queue.textChannel.send(
      `🎶 **Now Playing:**\n` +
      `**${song.title}**\n` +
      `Duration: \`${song.duration || 'Live'}\` | Requested by: ${song.requestedBy || 'Unknown'}\n` +
      `${song.url}`
    );
  } catch (error) {
    console.error('Error playing song:', error);
    queue.textChannel.send(`❌ Couldn't play **${song.title}** — skipping.\nReason: ${error.message}`);
    queue.songs.shift();
    if (queue.songs.length > 0) {
      playSong(guildId, queue.songs[0]);
    }
  }
}

/**
 * Play a radio stream using system FFmpeg
 */
async function playRadio(guildId, station) {
  const queue = getQueue(guildId);

  try {
    // Kill any existing radio process
    if (queue.radioProcess) {
      try { queue.radioProcess.kill('SIGKILL'); } catch {}
      queue.radioProcess = null;
    }

    console.log(`Starting radio: ${station.name} - ${station.url}`);

    // Use system FFmpeg to fetch and stream radio
    const ffmpegProcess = spawn('/usr/bin/ffmpeg', [
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5',
      '-i', station.url,
      '-analyzeduration', '0',
      '-loglevel', 'error',
      '-vn',
      '-acodec', 'libopus',
      '-f', 'ogg',
      '-ar', '48000',
      '-ac', '2',
      '-b:a', '96k',
      'pipe:1',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    ffmpegProcess.stderr.on('data', (data) => {
      console.error('Radio FFmpeg error:', data.toString().trim());
    });

    ffmpegProcess.on('error', (err) => {
      console.error('FFmpeg spawn failed:', err.message);
    });

    ffmpegProcess.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.error('Radio FFmpeg exited with code:', code);
      }
    });

    // Wait for FFmpeg to produce data
    const hasData = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 8000);
      ffmpegProcess.stdout.once('data', () => {
        clearTimeout(timeout);
        resolve(true);
      });
      ffmpegProcess.once('close', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });

    if (!hasData) {
      console.error('Radio FFmpeg produced no data for:', station.url);
      queue.textChannel.send(`❌ Couldn't connect to **${station.name}**. Stream may be unavailable.`);
      queue.radio = null;
      return;
    }

    const resource = createAudioResource(ffmpegProcess.stdout, {
      inputType: StreamType.OggOpus,
    });

    queue.player.play(resource);
    queue.playing = true;
    queue.paused = false;
    queue.radioProcess = ffmpegProcess;

    // Only send message for new station
    if (queue.radio !== station) {
      queue.radio = station;
      queue.textChannel.send(
        `📻 **Radio: ${station.name}**\n` +
        `Genre: ${station.genre}\n` +
        `🔊 Streaming live — use \`.stop\` to end`
      );
    } else {
      queue.radio = station;
    }
  } catch (error) {
    console.error('Error playing radio:', error);
    queue.textChannel.send(`❌ Couldn't connect to radio station: ${error.message}`);
    queue.radio = null;
  }
}

/**
 * Connect to voice channel and play a song
 */
async function connectAndPlay(message, song) {
  const voiceChannel = message.member.voice.channel;
  const queue = getQueue(message.guild.id);

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: message.guild.id,
    adapterCreator: message.guild.voiceAdapterCreator,
    selfDeaf: false,
  });

  // Wait for connection to be ready
  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    console.log('Voice connection is Ready!');
  } catch (error) {
    console.error('Voice connection failed:', error);
    connection.destroy();
    deleteQueue(message.guild.id);
    return message.channel.send('❌ Failed to connect to voice channel. Try again!');
  }

  const player = createAudioPlayer();

  queue.connection = connection;
  queue.player = player;
  queue.textChannel = message.channel;

  connection.subscribe(player);

  // When song ends
  player.on(AudioPlayerStatus.Idle, () => {
    // Radio reconnect (with delay to prevent spam)
    if (queue.radio && queue.songs.length === 0) {
      const currentStation = queue.radio;
      setTimeout(() => {
        if (queue.radio === currentStation && queue.connection) {
          playRadio(message.guild.id, queue.radio);
        }
      }, 15000);
      return;
    }

    // Loop modes
    if (queue.loop && queue.songs.length > 0) {
      playSong(message.guild.id, queue.songs[0]);
      return;
    }
    if (queue.loopQueue && queue.songs.length > 0) {
      const finished = queue.songs.shift();
      queue.songs.push(finished);
      playSong(message.guild.id, queue.songs[0]);
      return;
    }

    // Next song
    queue.songs.shift();
    playSong(message.guild.id, queue.songs[0]);
  });

  player.on('error', (error) => {
    console.error('Player error:', error.message);
    queue.songs.shift();
    if (queue.songs.length > 0) {
      playSong(message.guild.id, queue.songs[0]);
    }
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      connection.destroy();
      deleteQueue(message.guild.id);
    }
  });

  // Log state changes
  player.on('stateChange', (oldState, newState) => {
    console.log(`Player: ${oldState.status} -> ${newState.status}`);
  });

  await playSong(message.guild.id, song);
}

/**
 * Connect and play radio
 */
async function connectAndPlayRadio(message, station) {
  const voiceChannel = message.member.voice.channel;
  const queue = getQueue(message.guild.id);

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: message.guild.id,
    adapterCreator: message.guild.voiceAdapterCreator,
    selfDeaf: false,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    console.log('Voice connection (radio) is Ready!');
  } catch (error) {
    console.error('Voice connection failed:', error);
    connection.destroy();
    deleteQueue(message.guild.id);
    return message.channel.send('❌ Failed to connect to voice channel. Try again!');
  }

  const player = createAudioPlayer();

  queue.connection = connection;
  queue.player = player;
  queue.textChannel = message.channel;

  connection.subscribe(player);

  // Radio reconnect on idle (with delay)
  player.on(AudioPlayerStatus.Idle, () => {
    if (queue.radio) {
      const currentStation = queue.radio;
      setTimeout(() => {
        if (queue.radio === currentStation && queue.connection) {
          console.log('Radio reconnecting...');
          playRadio(message.guild.id, queue.radio);
        }
      }, 15000);
    }
  });

  player.on('error', (error) => {
    console.error('Radio player error:', error.message);
  });

  player.on('stateChange', (oldState, newState) => {
    console.log(`Player: ${oldState.status} -> ${newState.status}`);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      connection.destroy();
      deleteQueue(message.guild.id);
    }
  });

  await playRadio(message.guild.id, station);
}

module.exports = { playSong, playRadio, connectAndPlay, connectAndPlayRadio };
