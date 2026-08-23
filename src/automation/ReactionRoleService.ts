import type { MessageReaction, PartialMessageReaction, User, PartialUser, Emoji, Message, PartialMessage } from 'discord.js';
import { store } from '../utils/store';
import { logger } from '../utils/logger';

/** A single emoji → role mapping on a reaction-role panel. */
export interface ReactionRoleEntry {
  /** Raw emoji as provided (unicode char or `<:name:id>` / `<a:name:id>`). */
  emoji: string;
  roleId: string;
}

export interface ReactionRolePanel {
  channelId: string;
  title?: string;
  description?: string;
  roles: ReactionRoleEntry[];
}

/**
 * Normalize an emoji from a reaction event into a stable match key.
 * Custom emojis compare by their id, unicode emojis by their character.
 */
export function reactionKeyFromEmoji(emoji: Emoji): string {
  if (emoji.id) return emoji.id;
  return emoji.name ?? '';
}

/** Normalize a manually provided emoji string into the same match key space. */
export function emojiKeyFromString(emoji: string): string {
  const m = emoji.match(/^<a?:\w+:(\d+)>$/);
  if (m) return m[1];
  return emoji;
}

/** All panels for a guild, keyed by message id. */
export function getPanels(guildId: string): Record<string, ReactionRolePanel> {
  return store.get<Record<string, ReactionRolePanel>>('reactroles', guildId) ?? {};
}

export function setPanels(guildId: string, panels: Record<string, ReactionRolePanel>): void {
  store.set('reactroles', guildId, panels);
}

export function getPanel(guildId: string, messageId: string): ReactionRolePanel | null {
  const panels = getPanels(guildId);
  return panels[messageId] ?? null;
}

export function savePanel(
  guildId: string,
  messageId: string,
  panel: ReactionRolePanel
): void {
  const panels = getPanels(guildId);
  panels[messageId] = panel;
  setPanels(guildId, panels);
}

export function deletePanel(guildId: string, messageId: string): void {
  const panels = getPanels(guildId);
  if (messageId in panels) {
    delete panels[messageId];
    setPanels(guildId, panels);
  }
}

async function resolveReaction(
  reaction: MessageReaction | PartialMessageReaction
): Promise<Message | null> {
  try {
    if (reaction.partial) await reaction.fetch();
    let message = reaction.message as Message | PartialMessage;
    if (message.partial) {
      try {
        message = await message.fetch();
      } catch {
        return null;
      }
    }
    return message as Message;
  } catch (err) {
    logger.warn('Failed to resolve reaction/message', err);
    return null;
  }
}

async function applyRole(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  add: boolean
): Promise<void> {
  if (user.bot) return;
  try {
    if (user.partial) await user.fetch();
  } catch {
    /* ignore */
  }

  const message = await resolveReaction(reaction);
  if (!message?.guild) return;

  const guild = message.guild;
  const panel = getPanel(guild.id, message.id);
  if (!panel) return;

  const entry = panel.roles.find(
    (r) => emojiKeyFromString(r.emoji) === reactionKeyFromEmoji(reaction.emoji)
  );
  if (!entry) return;

  let member = guild.members.cache.get(user.id);
  if (!member) {
    try {
      member = await guild.members.fetch(user.id);
    } catch {
      return;
    }
  }

  try {
    if (add) {
      await member.roles.add(entry.roleId);
    } else {
      await member.roles.remove(entry.roleId);
    }
  } catch (err) {
    logger.warn('Failed to update reaction role', err);
  }
}

export async function handleReactionAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): Promise<void> {
  await applyRole(reaction, user, true);
}

export async function handleReactionRemove(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): Promise<void> {
  await applyRole(reaction, user, false);
}
