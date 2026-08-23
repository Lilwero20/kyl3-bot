import type { MessageReaction, PartialMessageReaction, User, PartialUser } from 'discord.js';
import type { OpenCodeClient } from '../structures/OpenCodeClient';
import { handleReactionRemove } from '../automation/ReactionRoleService';

export async function onMessageReactionRemove(
  _client: OpenCodeClient,
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): Promise<void> {
  await handleReactionRemove(reaction, user);
}
