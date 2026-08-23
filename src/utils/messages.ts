import type { ChatInputCommandInteraction, Message, GuildTextBasedChannel } from 'discord.js';

/**
 * Resolve a message by id anywhere in the guild.
 * Tries the current channel first, then cached text channels.
 */
export async function resolveMessage(
  interaction: ChatInputCommandInteraction,
  messageId: string
): Promise<Message | null> {
  const guild = interaction.guild;
  if (!guild) return null;

  const channels: GuildTextBasedChannel[] = [];
  if (interaction.channel && 'messages' in interaction.channel) {
    channels.push(interaction.channel as GuildTextBasedChannel);
  }
  for (const channel of guild.channels.cache.values()) {
    if ('messages' in channel && channel.id !== interaction.channelId) {
      channels.push(channel as GuildTextBasedChannel);
    }
    if (channels.length >= 20) break;
  }

  for (const channel of channels) {
    try {
      const msg = await channel.messages.fetch(messageId);
      if (msg) return msg;
    } catch {
      /* not in this channel */
    }
  }
  return null;
}