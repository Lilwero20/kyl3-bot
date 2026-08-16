import type { ChatInputCommandInteraction, Message, SendableChannels } from 'discord.js';
import { errorEmbed } from './embed';

/** Narrow a channel to one that actually has a .send() method. */
export function isSendable(channel: unknown): channel is SendableChannels {
  return !!channel && typeof (channel as { send?: unknown }).send === 'function';
}

/**
 * Reply to an interaction, handling both deferred and ephemeral cases.
 */
export async function reply(
  interaction: ChatInputCommandInteraction,
  content: string,
  ephemeral = false
): Promise<void> {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content });
    return;
  }
  await interaction.reply({ content, ephemeral });
}

export async function replyError(
  interaction: ChatInputCommandInteraction,
  content: string
): Promise<void> {
  const e = errorEmbed(content);
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ embeds: [e] });
    return;
  }
  await interaction.reply({ embeds: [e], ephemeral: true });
}

export async function defer(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply();
  }
}

/** Safe helper to send to a channel, ignoring non-sendable channels and errors. */
export async function send(
  channel: unknown,
  payload: Parameters<SendableChannels['send']>[0]
): Promise<Message | null> {
  if (!isSendable(channel)) return null;
  try {
    return await channel.send(payload);
  } catch {
    return null;
  }
}

/** Safe helper to reply to a legacy message. */
export async function sendMessage(message: Message, content: string): Promise<Message | null> {
  return send(message.channel, { content, allowedMentions: { parse: [] } });
}
