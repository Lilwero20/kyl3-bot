import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN ?? '',
  ownerIds: (process.env.OWNER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0),
  prefix: process.env.PREFIX ?? '!',
  enablePrefix: (process.env.ENABLE_PREFIX ?? 'true').toLowerCase() !== 'false',
  devGuildId: process.env.DEV_GUILD_ID ?? '',
  dataDir: process.env.DATA_DIR ?? './data',
  /**
   * Requires enabling "Privileged Gateway Intents" in the Discord developer portal.
   * If the portal doesn't have them enabled yet, the login fails with
   * "Used disallowed intents" — set this to false to run anyway (some features
   * like welcome/autorole/auto-mod filters will be disabled until enabled).
   */
  privilegedIntents: (process.env.ENABLE_PRIVILEGED_INTENTS ?? 'true').toLowerCase() !== 'false',
};

if (!config.token) {
  console.error('[CONFIG] DISCORD_TOKEN is missing. Copy .env.example to .env and set your token.');
  process.exit(1);
}
