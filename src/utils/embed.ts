import {
  EmbedBuilder,
  type ColorResolvable,
  type MessageCreateOptions,
} from 'discord.js';

export const EMBED_COLORS = {
  success: 0x2ecc71,
  error: 0xe74c3c,
  warning: 0xf1c40f,
  info: 0x3498db,
  primary: 0x9b59b6,
  mod: 0xe67e22,
} as const;

export function embed(data: {
  title?: string;
  description?: string;
  color?: ColorResolvable;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: string;
  timestamp?: boolean;
}): EmbedBuilder {
  const e = new EmbedBuilder().setColor(data.color ?? EMBED_COLORS.info);
  if (data.title) e.setTitle(data.title);
  if (data.description) e.setDescription(data.description);
  if (data.fields) e.addFields(data.fields);
  if (data.footer) e.setFooter({ text: data.footer });
  if (data.timestamp !== false) e.setTimestamp();
  return e;
}

export function successEmbed(description: string, title = 'Success'): EmbedBuilder {
  return embed({ title, description, color: EMBED_COLORS.success });
}

export function errorEmbed(description: string, title = 'Error'): EmbedBuilder {
  return embed({ title, description, color: EMBED_COLORS.error });
}

export function warningEmbed(description: string, title = 'Warning'): EmbedBuilder {
  return embed({ title, description, color: EMBED_COLORS.warning });
}

/** Build a MessageCreateOptions object with a footer author appended. */
export function embedWithAuthor(
  e: EmbedBuilder,
  authorName: string,
  authorAvatar: string | null
): MessageCreateOptions {
  e.setFooter({ text: authorName, iconURL: authorAvatar ?? undefined });
  return { embeds: [e] };
}

export function parseColor(raw: string): number | null {
  const hex = raw.replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return parseInt(hex, 16);
  }
  const named: Record<string, number> = {
    red: 0xe74c3c,
    orange: 0xe67e22,
    yellow: 0xf1c40f,
    green: 0x2ecc71,
    blue: 0x3498db,
    purple: 0x9b59b6,
    pink: 0xe91e63,
    white: 0xffffff,
    black: 0x000000,
    grey: 0x95a5a6,
  };
  return named[raw.toLowerCase()] ?? null;
}
