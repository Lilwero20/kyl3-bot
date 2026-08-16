import type { Client, Message } from 'discord.js';
import { store } from '../utils/store';
import { logModeration } from '../utils/moderation';

export interface FilterConfig {
  enabled: boolean;
  /** Also timeout users on filter hit */
  timeoutSeconds?: number;
}

const DEFAULT: FilterConfig = { enabled: true };

export function getFilterConfig(guildId: string): FilterConfig {
  return { ...DEFAULT, ...(store.get<Partial<FilterConfig>>('filter', guildId) ?? {}) };
}

export function getFilterKeywords(guildId: string): string[] {
  return store.get<string[]>('automod_keywords', guildId) ?? [];
}

/** Check a message against configured custom keywords. Returns true if action taken. */
export async function processFilter(client: Client, message: Message): Promise<boolean> {
  if (!message.guild || !message.member || message.member.permissions.has('ManageMessages')) {
    return false;
  }
  const config = getFilterConfig(message.guild.id);
  if (!config.enabled) return false;

  const keywords = getFilterKeywords(message.guild.id);
  if (keywords.length === 0) return false;

  const content = message.content.toLowerCase();
  const hit = keywords.find((k) => content.includes(k.toLowerCase()));
  if (!hit) return false;

  try {
    await message.delete();
  } catch {
    return false;
  }

  let extra: string | undefined;
  if (config.timeoutSeconds && message.member.moderatable) {
    try {
      await message.member.timeout(config.timeoutSeconds * 1000, 'Filter: ' + hit);
      extra = `Timed out ${config.timeoutSeconds}s`;
    } catch {
      /* noop */
    }
  }

  await logModeration(client, message.guild, {
    action: 'Filter',
    target: { tag: message.author.tag, id: message.author.id },
    reason: `Matched filtered keyword \`${hit}\`:\n> ${message.content.slice(0, 500)}`,
    extra,
  });

  try {
    await message.member.send(
      `🚫 Your message in **${message.guild.name}** was removed: it matched a filtered keyword.\n> ${message.content.slice(0, 200)}`
    );
  } catch {
    /* DM blocked */
  }

  return true;
}
