import type { Client, Guild, SendableChannels } from 'discord.js';
import { store, key } from './store';
import { embed, EMBED_COLORS } from './embed';
import { isSendable } from './replies';

export interface ModLogConfig {
  channelId: string;
}

/** Resolve the configured mod-log channel for a guild, if any. */
export function getModLogChannel(
  client: Client,
  guildId: string
): SendableChannels | null {
  const cfg = store.get<ModLogConfig>('modlog', key(guildId, 'config'));
  if (!cfg?.channelId) return null;
  const channel = client.channels.cache.get(cfg.channelId);
  return isSendable(channel) ? channel : null;
}

export interface LogEntry {
  action: string;
  target?: { tag: string; id: string };
  moderator?: { tag: string; id: string };
  reason?: string;
  duration?: string;
  color?: string;
  extra?: string;
}

/** Send a formatted moderation log embed to the configured channel. */
export async function logModeration(client: Client, guild: Guild, entry: LogEntry): Promise<void> {
  const channel = getModLogChannel(client, guild.id);
  if (!channel) return;

  const e = embed({
    title: `${entry.action} | ${entry.target?.tag ?? 'System'}`,
    color: (entry.color as never) ?? EMBED_COLORS.mod,
    fields: [
      entry.moderator ? { name: 'Moderator', value: `${entry.moderator.tag} (\`${entry.moderator.id}\`)`, inline: true } : null,
      entry.target ? { name: 'Target', value: `\`${entry.target.id}\``, inline: true } : null,
      entry.duration ? { name: 'Duration', value: entry.duration, inline: true } : null,
      entry.reason ? { name: 'Reason', value: entry.reason, inline: false } : null,
      entry.extra ? { name: 'Info', value: entry.extra, inline: false } : null,
    ].filter(Boolean) as { name: string; value: string; inline: boolean }[],
  });

  try {
    await channel.send({ embeds: [e] });
  } catch (err) {
    console.warn('Failed to send mod log:', err);
  }
}
