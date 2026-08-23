import type { Message } from 'discord.js';
import type { OpenCodeClient } from '../structures/OpenCodeClient';
import { config } from '../config';
import { store } from '../utils/store';
import { processAntiSpam } from '../automod/AntiSpam';
import { processFilter } from '../automod/Filter';
import { logger } from '../utils/logger';
import { successEmbed } from '../utils/embed';

interface AfkData {
  message: string;
  since: number;
  guildId: string;
}

export async function onMessageCreate(client: OpenCodeClient, message: Message): Promise<void> {
  if (message.author.bot || !message.guild) return;

  // Clear AFK status when the user speaks again
  const afk = store.get<AfkData>('afk', message.author.id);
  if (afk && afk.guildId === message.guild.id) {
    store.delete('afk', message.author.id);
    if (message.channel.isSendable()) {
      await message.channel
        .send({
          embeds: [
            successEmbed(`Welcome back! You were AFK for **${Math.round((Date.now() - afk.since) / 60000)} minutes**.`),
          ],
        })
        .then((m) => setTimeout(() => m.delete().catch(() => null), 10000));
    }
  }

  // Mentioning an AFK user notifies the author
  if (message.mentions.users.size > 0) {
    for (const [userId, user] of message.mentions.users) {
      if (user.id === message.author.id) continue;
      const targetAfk = store.get<AfkData>('afk', user.id);
      if (targetAfk) {
        await message.reply(`**${user.username}** is AFK: ${targetAfk.message}`);
        break;
      }
    }
  }

  // Auto-mod processing (skip commands)
  if (!message.content.startsWith(config.prefix)) {
    try {
      await processFilter(client, message);
      await processAntiSpam(client, message);
    } catch (err) {
      logger.warn('Auto-mod processing error:', err);
    }
  }

  // Legacy prefix commands
  if (!config.enablePrefix) return;
  if (!message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/\s+/);
  const name = args.shift()?.toLowerCase();
  if (!name) return;

  const command = client.commands.get(name);
  if (!command?.runLegacy) return;

  try {
    await command.runLegacy(message, args);
  } catch (err) {
    logger.error(`Legacy command ${name} failed:`, err);
    if (message.channel.isSendable()) {
      await message.channel.send('An error occurred while running that command.').catch(() => null);
    }
  }
}
