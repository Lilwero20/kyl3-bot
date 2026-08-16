# Kyl3 Bot — Setup & Usage Tutorial

A full-featured Discord bot (TypeScript, discord.js 14) with utility commands, moderation, auto-mod and automations.

---

## 1. Prerequisites

- **Node.js 18 or newer** — check with `node --version`
- A **Discord account** and a server where you have **Manage Server** permission

## 2. Create the Discord application

1. Go to https://discord.com/developers/applications
2. Click **New Application** → give it a name → **Create**
3. Open **Bot** in the left sidebar → click **Reset Token** → **Copy** the token.
   - ⚠️ Treat this token like a password. Never share it or commit it to git.

## 3. Enable the required intents

In the **Bot** page, scroll to **Privileged Gateway Intents** and enable:

- ✅ **Message Content Intent** — required for `/say`, `/sayembed`, auto-mod filters and prefix commands
- ✅ **Server Members Intent** — required for `/serverinfo`, welcome/goodbye, autorole

## 4. Invite the bot to your server

In the developer portal open **OAuth2 → URL Generator**:

1. Check **bot**
2. Under *Bot Permissions* choose **Administrator** (easiest) or at minimum:
   - Send Messages, Embed Links, Read Message History
   - Manage Messages, Ban Members, Kick Members, Moderate Members
   - Manage Roles, Manage Guild
3. Open the generated URL in a browser → add the bot to your server.

## 5. Configure the project

Copy the example config and fill in your values:

```bash
copy .env.example .env     # Windows
# cp .env.example .env     # Mac/Linux
```

Edit `.env`:

```env
DISCORD_TOKEN=PASTE_YOUR_BOT_TOKEN_HERE
OWNER_IDS=                 # your user ID(s), comma separated — for /eval
PREFIX=!                   # prefix for text commands (optional)
DEV_GUILD_ID=              # your server ID for instant command registration
```

> Set `DEV_GUILD_ID` to your **test server's ID** while developing. Global commands can take up to an hour to appear; guild commands appear instantly.
>
> To get your user/server ID: Settings → Advanced → enable **Developer Mode**, then right-click your user or server → **Copy ID**.

Install dependencies (one time):

```bash
npm install
```

## 6. Run the bot

```bash
npm run dev        # development (auto-reload on file changes)
# or
npm run build && npm start    # production
```

You should see:

```
[INFO] Logged in as Kyl3Bot#1234 (1234567890)
[INFO] Serving 1 guild(s)
[INFO] Registered 26 slash commands.
```

## 7. First commands to try

| Command | What it does |
|---|---|
| `/help` | List every command |
| `/ping` | Latency check |
| `/say text:hello` | Bot says "hello" |
| `/sayembed description:hello` | Sends an embed |
| `/userinfo` | Your user info |
| `/serverinfo` | Server info |
| `/poll question:... option1:... option2:...` | Reaction poll |
| `/remindme time:10m text:...` | Set a reminder |

If `DEV_GUILD_ID` is set, slash commands appear in your server within seconds. Otherwise wait up to 1 hour for global registration.

## 8. Set up moderation + auto-mod (recommended)

1. **Mod logs** — pick a channel for logs:
   ```
   /logging set channel:#mod-logs
   ```
   Ban/kick/mute/warn/auto-mod events will be posted there.

2. **Auto-mod rules** (Discord-side, blocks messages):
   ```
   /automod setup
   ```
   Creates profanity, mention-spam and spam rules. Add your own blocked words:
   ```
   /automod keyword action:add keywords:badword1, badword2
   ```

3. **Try moderation commands**:
   ```
   /warn user:@user reason:be nice
   /mute user:@user duration:10m reason:spam
   /warnings list user:@user
   ```

## 9. Set up automations

```
/welcome set channel:#welcome message:Welcome {userMention}!        # welcome message
/goodbye set channel:#goodbye                                       # goodbye message
/autorole set role:@Member                                          # auto-assign role on join
/schedule create channel:#announcements message:... interval:60     # repeating announcements
```

Welcome templates support placeholders: `{user}`, `{userMention}`, `{server}`, `{memberCount}`.

## 10. Prefix (text) commands

All slash commands also work with the prefix, e.g. `!say hello`, `!poll ...`, `!clear 10`, `!warn @user reason`. Set `ENABLE_PREFIX=false` in `.env` to disable them.

## Troubleshooting

| Problem | Fix |
|---|---|
| `DISCORD_TOKEN is missing` | Create `.env` from `.env.example` and paste the token |
| Commands don't appear | Check `DEV_GUILD_ID`; global commands take up to 1h |
| `/say` says "Missing Access" | Bot was invited without *Manage Messages* / *Send Messages* permission |
| Auto-mod rules fail to create | Bot needs **Manage Guild** + **Moderate Members** permissions |
| `Message content is required` errors | Enable the **Message Content Intent** (step 3) |
| Warn/mute works but no log embed | Run `/logging set` to point to a channel |

---

### File structure cheat-sheet

```
src/
├─ index.ts                  # entry point, event wiring
├─ config.ts                 # env settings
├─ commands/                 # one file per command
│  ├─ utility/               # say, sayembed, ping, poll, ...
│  ├─ moderation/            # ban, kick, mute, warn, ...
│  ├─ automod/               # /automod setup
│  ├─ automation/            # welcome, autorole, schedule, logging
│  └─ owner/                 # /eval
├─ automod/                  # anti-spam + keyword filter engines
├─ automation/               # reminder + scheduler services
├─ events/                   # message / join / leave / delete handlers
├─ structures/               # command framework, client
└─ utils/                    # embed helpers, JSON store, logger
```

Data (warnings, reminders, config) persists in `data/store.json` automatically — no database setup needed.