const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
} = require('@discordjs/voice');
const play = require('play-dl');
const { getQueue, deleteQueue } = require('./queue');

// Get FFmpeg path - use ffmpeg-static if available, otherwise system ffmpeg
let FFMPEG_PATH = 'ffmpeg';
try {
  FFMPEG_PATH = require('ffmpeg-static');
} catch {
  // Fall back to system ffmpeg
}

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
    const { spawn } = require('child_process');

    // Use yt-dlp to pipe audio directly to FFmpeg, then to Discord
    // yt-dlp outputs audio -> FFmpeg converts -> pipe to discord.js
    const ytdlp = spawn('yt-dlp', [
      '--no-warnings',
      '-f', 'bestaudio',
      '-o', '-',
      '--quiet',
      song.url,
    ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

    const ffmpegProcess = spawn(FFMPEG_PATH, [
      '-i', 'pipe:0',
      '-analyzeduration', '0',
      '-loglevel', 'error',
      '-acodec', 'libopus',
      '-f', 'ogg',
      '-ar', '48000',
      '-ac', '2',
      '-b:a', '96k',
      'pipe:1',
    ], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });

    // Pipe yt-dlp output into FFmpeg input
    ytdlp.stdout.pipe(ffmpegProcess.stdin);

    ytdlp.stderr.on('data', (data) => {
      console.error('yt-dlp error:', data.toString());
    });
    ffmpegProcess.stderr.on('data', (data) => {
      console.error('FFmpeg error:', data.toString());
    });
    ytdlp.on('error', (err) => {
      console.error('yt-dlp spawn error:', err.message);
    });

    // Wait for FFmpeg to produce data
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 5000);
      ffmpegProcess.stdout.once('readable', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    const resource = createAudioResource(ffmpegProcess.stdout, {
      inputType: StreamType.OggOpus,
    });

    queue.player.play(resource);
    queue.playing = true;
    queue.paused = false;
    queue.radioProcess = ffmpegProcess;

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
 * Play a radio stream
 */
async function playRadio(guildId, station) {
  const queue = getQueue(guildId);

  try {
    const { spawn } = require('child_process');

    // Kill any existing radio process
    if (queue.radioProcess) {
      try { queue.radioProcess.kill('SIGTERM'); } catch {}
      queue.radioProcess = null;
    }

    // Spawn FFmpeg to fetch radio stream and output raw PCM s16le
    // Discord.js @discordjs/voice handles Raw PCM at 48kHz stereo
    const ffmpegProcess = spawn(FFMPEG_PATH, [
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5',
      '-i', station.url,
      '-analyzeduration', '0',
      '-loglevel', 'error',
      '-acodec', 'libopus',
      '-f', 'ogg',
      '-ar', '48000',
      '-ac', '2',
      '-b:a', '96k',
      'pipe:1',
    ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

    let hasErrored = false;

    ffmpegProcess.on('error', (err) => {
      hasErrored = true;
      console.error('FFmpeg spawn error:', err.message);
      queue.textChannel.send(`❌ FFmpeg error: ${err.message}\nMake sure FFmpeg is installed and in your PATH.`);
    });

    ffmpegProcess.stderr.on('data', (data) => {
      console.error('FFmpeg stderr:', data.toString());
    });

    ffmpegProcess.on('close', (code) => {
      console.log('FFmpeg process closed with code:', code);
    });

    // Wait for FFmpeg to connect and start producing audio data
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => resolve(), 3000);
      ffmpegProcess.stdout.once('readable', () => {
        clearTimeout(timeout);
        resolve();
      });
      ffmpegProcess.once('error', () => {
        clearTimeout(timeout);
        reject(new Error('FFmpeg failed to start'));
      });
    });

    if (hasErrored) return;

    const resource = createAudioResource(ffmpegProcess.stdout, {
      inputType: StreamType.OggOpus,
    });

    queue.player.play(resource);
    queue.playing = true;
    queue.paused = false;
    queue.radio = station;
    queue.radioProcess = ffmpegProcess;

    queue.textChannel.send(
      `📻 **Radio: ${station.name}**\n` +
      `Genre: ${station.genre}\n` +
      `🔊 Streaming live — use \`!stop\` to end`
    );
  } catch (error) {
    console.error('Error playing radio:', error);
    queue.textChannel.send(`❌ Couldn't connect to radio station: ${error.message}`);
    queue.radio = null;
  }
}

/**
 * Connect to a voice channel and set up the audio player
 */
async function connectAndPlay(message, song) {
  const voiceChannel = message.member.voice.channel;
  const queue = getQueue(message.guild.id);

  // Create voice connection
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: message.guild.id,
    adapterCreator: message.guild.voiceAdapterCreator,
    selfDeaf: true, // Better audio quality
  });

  // Create audio player
  const player = createAudioPlayer();

  // Store in queue
  queue.connection = connection;
  queue.player = player;
  queue.textChannel = message.channel;

  // Subscribe the connection to the player
  connection.subscribe(player);

  // Handle when a song ends
  player.on(AudioPlayerStatus.Idle, () => {
    // If radio was playing and got interrupted, restart it
    if (queue.radio && queue.songs.length === 0) {
      playRadio(message.guild.id, queue.radio);
      return;
    }

    // Handle loop modes
    if (queue.loop && queue.songs.length > 0) {
      // Loop current song — play it again
      playSong(message.guild.id, queue.songs[0]);
      return;
    }

    if (queue.loopQueue && queue.songs.length > 0) {
      // Loop queue — move current song to the end
      const finished = queue.songs.shift();
      queue.songs.push(finished);
      playSong(message.guild.id, queue.songs[0]);
      return;
    }

    // Normal mode — move to next
    queue.songs.shift();
    playSong(message.guild.id, queue.songs[0]);
  });

  // Handle player errors
  player.on('error', (error) => {
    console.error('Player error:', error);
    queue.textChannel.send('❌ Playback error — skipping to next track.');
    queue.songs.shift();
    if (queue.songs.length > 0) {
      playSong(message.guild.id, queue.songs[0]);
    }
  });

  // Handle disconnection
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
      // Reconnecting...
    } catch {
      // Actually disconnected
      connection.destroy();
      deleteQueue(message.guild.id);
    }
  });

  // Start playing
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
    selfDeaf: true,
  });

  const player = createAudioPlayer();

  queue.connection = connection;
  queue.player = player;
  queue.textChannel = message.channel;

  connection.subscribe(player);

  // Handle when radio stream ends (reconnect)
  player.on(AudioPlayerStatus.Idle, () => {
    if (queue.radio) {
      // Radio stream ended, restart it
      setTimeout(() => {
        if (queue.radio) {
          playRadio(message.guild.id, queue.radio);
        }
      }, 2000);
    }
  });

  player.on('error', (error) => {
    console.error('Radio error:', error);
    if (queue.radio) {
      queue.textChannel.send('📻 Radio stream interrupted — reconnecting...');
      setTimeout(() => {
        if (queue.radio) {
          playRadio(message.guild.id, queue.radio);
        }
      }, 3000);
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

  await playRadio(message.guild.id, station);
}

module.exports = { playSong, playRadio, connectAndPlay, connectAndPlayRadio };
