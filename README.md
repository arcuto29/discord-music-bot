# 🎵 Discord Music Bot

**Free music bot — no ads, no votes, no limits.**
Drop a link and everyone in the voice channel hears it.

## Features

- ▶️ Play from any link — YouTube, SoundCloud, or search by name
- 📋 Full queue system — add, remove, shuffle, loop
- 📻 49 radio stations — Virgin Radio, BBC, NRJ, CBC, and more
- 🔊 Volume control — 0-150%
- 🔁 Loop modes — single track or entire queue
- 🔀 Shuffle — randomize your queue
- 📋 Playlist support — YouTube playlist links load all tracks

## Quick Setup (5 min)

### 1. Install Requirements

- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **FFmpeg** — `brew install ffmpeg` (Mac) or `sudo apt install ffmpeg` (Linux)

### 2. Create a Discord Bot

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. New Application → name it → Create
3. Bot tab → Reset Token → copy it
4. Enable **Message Content Intent**
5. OAuth2 → URL Generator → check `bot` → permissions: Send Messages, Connect, Speak
6. Open the URL to invite bot to your server

### 3. Run It

```bash
npm install
cp .env.example .env
# Edit .env → paste your bot token
npm start
```

## Commands

| Command | Description |
|---------|-------------|
| `!play <link/search>` | Play a song |
| `!skip` | Skip current song |
| `!stop` | Stop and leave |
| `!pause` / `!resume` | Pause/resume |
| `!queue` | View queue |
| `!shuffle` | Shuffle queue |
| `!loop` / `!loop queue` | Loop modes |
| `!volume <0-150>` | Set volume |
| `!radio <station>` | Play radio |
| `!stations` | List all stations |
| `!help` | All commands |

## Radio Stations

Virgin Radio UK, BBC Radio 1/2/6, NRJ, CBC Music,
KEXP, Triple J, SomaFM, and 40+ genre stations.

Use `!stations` in Discord to see the full list.

## License

MIT
