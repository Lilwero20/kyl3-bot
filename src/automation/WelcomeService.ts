import type { Client, GuildMember } from 'discord.js';
import { store } from '../utils/store';
import { logger } from '../utils/logger';

export interface WelcomeConfig {
  channelId: string;
  /** Template with {user}, {userMention}, {server} placeholders */
  message: string;
  /** Optional title for an embed version. When set, the message is sent as an embed. */
  embedTitle?: string;
  /** Hex color for the embed */
  color?: string;
  enabled: boolean;
}

export interface GoodbyeConfig {
  channelId: string;
  message: string;
  enabled: boolean;
}

export interface AutoroleConfig {
  roleId: string;
  enabled: boolean;
}

const DEFAULT_WELCOME = 'Welcome to **{server}**, {userMention}! 👋 We now have {memberCount} members.';
const DEFAULT_GOODBYE = '**{user}** left the server. Goodbye! 👋';

function fillTemplate(template: string, member: GuildMember): string {
  return template
    .replaceAll('{user}', member.user.username)
    .replaceAll('{userMention}', `<@${member.user.id}>`)
    .replaceAll('{server}', member.guild.name)
    .replaceAll('{memberCount}', String(member.guild.memberCount))
    .replaceAll('{userTag}', member.user.tag);
}

export function getWelcomeConfig(guildId: string): WelcomeConfig | null {
  return store.get<WelcomeConfig>('welcome', guildId);
}

export function getGoodbyeConfig(guildId: string): GoodbyeConfig | null {
  return store.get<GoodbyeConfig>('goodbye', guildId);
}

export function getAutoroleConfig(guildId: string): AutoroleConfig | null {
  return store.get<AutoroleConfig>('autorole', guildId);
}

export async function handleMemberJoin(client: Client, member: GuildMember): Promise<void> {
  const guildId = member.guild.id;

  // Welcome message
  const welcome = getWelcomeConfig(guildId);
  if (welcome?.enabled) {
    const channel = await client.channels.fetch(welcome.channelId).catch(() => null);
    if (channel && 'send' in channel) {
      const text = fillTemplate(welcome.message || DEFAULT_WELCOME, member);
      try {
        if (welcome.embedTitle) {
          const { EmbedBuilder } = await import('discord.js');
          const e = new EmbedBuilder()
            .setTitle(fillTemplate(welcome.embedTitle, member))
            .setDescription(text)
            .setColor((welcome.color as import('discord.js').ColorResolvable | undefined) ?? 0x2ecc71)
            .setThumbnail(member.user.displayAvatarURL({ size: 256 }));
          await channel.send({ embeds: [e] });
        } else {
          await channel.send({ content: text, allowedMentions: { parse: ['users'] } });
        }
      } catch (err) {
        logger.warn('Failed to send welcome message', err);
      }
    }
  }

  // Autorole
  const autorole = getAutoroleConfig(guildId);
  if (autorole?.enabled) {
    try {
      const role = await member.guild.roles.fetch(autorole.roleId);
      if (role) {
        await member.roles.add(role).catch((err) => logger.warn('Autorole failed', err));
      }
    } catch {
      /* role no longer exists */
    }
  }
}

export async function handleMemberLeave(client: Client, member: GuildMember): Promise<void> {
  const guildId = member.guild.id;
  const goodbye = getGoodbyeConfig(guildId);
  if (!goodbye?.enabled) return;

  const channel = await client.channels.fetch(goodbye.channelId).catch(() => null);
  if (!channel || !('send' in channel)) return;

  const text = fillTemplate(goodbye.message || DEFAULT_GOODBYE, member);
  try {
    await channel.send({ content: text, allowedMentions: { parse: [] } });
  } catch (err) {
    logger.warn('Failed to send goodbye message', err);
  }
}
