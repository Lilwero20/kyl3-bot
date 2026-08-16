import { ActivityType } from 'discord.js';
import type { Kyl3Client } from '../structures/Kyl3Client';
import { logger } from '../utils/logger';
import { config } from '../config';

export async function onReady(client: Kyl3Client): Promise<void> {
  logger.info(`Logged in as ${client.user?.tag} (${client.user?.id})`);
  logger.info(`Serving ${client.guilds.cache.size} guild(s)`);

  const status = config.prefix ? `/${config.prefix}help` : '/help';
  client.user?.setPresence({
    activities: [{ name: status, type: ActivityType.Watching }],
    status: 'online',
  });

  await client.commands.registerSlashCommands(client);
}
