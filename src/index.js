require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { generateDependencyReport } = require('@discordjs/voice');
const { handleCommand } = require('./commands');

// Print dependency report on startup
console.log(generateDependencyReport());

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
