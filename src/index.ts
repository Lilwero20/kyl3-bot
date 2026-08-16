import { Kyl3Client } from './structures/Kyl3Client';
import { config } from './config';
import { logger } from './utils/logger';
import { onReady } from './events/Ready';
import { onInteractionCreate } from './events/InteractionCreate';
import { onMessageCreate } from './events/MessageCreate';
import { onGuildMemberAdd } from './events/GuildMemberAdd';
import { onGuildMemberRemove } from './events/GuildMemberRemove';
import { onMessageDelete } from './events/MessageDelete';
import { ReminderService } from './automation/ReminderService';
import { SchedulerService } from './automation/SchedulerService';
import type { Interaction } from 'discord.js';

async function main(): Promise<void> {
  const client = new Kyl3Client();

  // Load commands
  client.commands.load();

  // Wire up events
  client.once('clientReady', () => onReady(client));
  client.on('interactionCreate', (i: Interaction) => {
    if (i.isChatInputCommand()) onInteractionCreate(client, i);
  });
  client.on('messageCreate', (m) => onMessageCreate(client, m));
  client.on('guildMemberAdd', (m) => onGuildMemberAdd(client, m));
  client.on('guildMemberRemove', (m) => onGuildMemberRemove(client, m));
  client.on('messageDelete', (m) => onMessageDelete(client, m));

  // Start services
  const reminders = new ReminderService();
  const scheduler = new SchedulerService();
  reminders.start(client);
  scheduler.start(client);

  await client.login(config.token);

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    reminders.stop();
    scheduler.stop();
    client.destroy();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Fatal error during startup:', err);
  process.exit(1);
});
