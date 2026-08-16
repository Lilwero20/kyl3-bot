import type { Client, Message } from 'discord.js';
import { store } from '../utils/store';
import { logger } from '../utils/logger';
import { logModeration } from '../utils/moderation';

export interface AntiSpamConfig {
  enabled: boolean;
  /** Max messages allowed within the window */
  threshold: number;
  /** Window in seconds */
  windowSeconds: number;
  /** Timeout applied on repeat offenders (seconds) */
  timeoutSeconds: number;
}

const DEFAULT: AntiSpamConfig = {
  enabled: true,
  threshold: 5,
  windowSeconds: 5,
  timeoutSeconds: 600,
};

/** In-memory message log: userId -> timestamps[] */
const messageLog = new Map<string, number[]>();
/** userId -> current strike count */
const strikes = new Map<string, number>();

export function getAntiSpamConfig(guildId: string): AntiSpamConfig {
  return { ...DEFAULT, ...(store.get<Partial<AntiSpamConfig>>('antispam', guildId) ?? {}) };
}

/** Process a message through the anti-spam. Returns true if action was taken. */
export async function processAntiSpam(client: Client, message: Message): Promise<boolean> {
  if (!message.guild || !message.member || message.member.permissions.has('ManageMessages')) {
    return false;
  }
  const config = getAntiSpamConfig(message.guild.id);
  if (!config.enabled) return false;

  const now = Date.now();
  const log = (messageLog.get(message.author.id) ?? []).filter(
    (t) => now - t < config.windowSeconds * 1000
  );
  log.push(now);
  messageLog.set(message.author.id, log);

  if (log.length < config.threshold) return false;

  const strike = (strikes.get(message.author.id) ?? 0) + 1;
  strikes.set(message.author.id, strike);

  const action: string =
    strike >= 3
      ? await muteOffender(client, message, config.timeoutSeconds)
      : await deleteMessage(message);

  try {
    await message.member.send(
      `🚨 **Anti-spam** — slow down! Your message was ${action} in **${message.guild.name}**.`
    );
  } catch {
    /* DM blocked */
  }

  await logModeration(client, message.guild, {
    action: 'Anti-spam',
    target: { tag: message.author.tag, id: message.author.id },
    reason: `Spam: ${log.length} messages in ${config.windowSeconds}s (strike ${strike}/3)`,
    extra: action === 'muted' ? `Timed out for ${config.timeoutSeconds}s` : 'Message deleted',
  });

  // Decay strikes after a while
  setTimeout(() => strikes.delete(message.author.id), 10 * 60 * 1000).unref();
  return true;
}

async function deleteMessage(message: Message): Promise<string> {
  try {
    await message.delete();
    return 'deleted';
  } catch {
    return 'flagged';
  }
}

async function muteOffender(
  client: Client,
  message: Message,
  timeoutSeconds: number
): Promise<string> {
  try {
    if (message.member && message.member.moderatable) {
      await message.member.timeout(timeoutSeconds * 1000, 'Anti-spam: repeat offense');
      strikes.set(message.author.id, 0);
      return 'muted';
    }
  } catch (err) {
    logger.warn('Anti-spam timeout failed', err);
  }
  await deleteMessage(message);
  return 'deleted';
}
