require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { generateDependencyReport } = require('@discordjs/voice');
const play = require('play-dl');
const { handleCommand } = require('./commands');

// Print dependency report on startup
console.log(generateDependencyReport());

// Initialize Spotify support (uses public API, no credentials needed for basic search)
async function initPlayDl() {
  try {
    // Set SoundCloud as default for play-dl if no YouTube cookies
    if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
      await play.setToken({
        spotify: {
          client_id: process.env.SPOTIFY_CLIENT_ID,
          client_secret: process.env.SPOTIFY_CLIENT_SECRET,
          refresh_token: process.env.SPOTIFY_REFRESH_TOKEN || '',
          market: 'US',
        },
      });
      console.log('✅ Spotify support enabled');
    } else {
      console.log('ℹ️ Spotify links will work with basic metadata (no SPOTIFY_CLIENT_ID set)');
    }
  } catch (e) {
    console.error('play-dl init error:', e.message);
  }
}
initPlayDl();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = process.env.PREFIX || '!';

client.once('ready', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎵 Music Bot Online!`);
  console.log(`   Tag: ${client.user.tag}`);
  console.log(`   Prefix: ${PREFIX}`);
  console.log(`   Servers: ${client.guilds.cache.size}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Set bot status
  client.user.setActivity(`${PREFIX}help | Free Music`, {
    type: ActivityType.Listening,
  });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  try {
    await handleCommand(command, args, message);
  } catch (error) {
    console.error(`[ERROR] Command "${command}":`, error);
    message.reply('❌ Something went wrong. Try again!');
  }
});

// Handle uncaught errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

client.login(process.env.DISCORD_TOKEN);
