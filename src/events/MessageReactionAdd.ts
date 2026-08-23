import type { MessageReaction, PartialMessageReaction, User, PartialUser } from 'discord.js';
import type { OpenCodeClient } from '../structures/OpenCodeClient';
import { handleReactionAdd } from '../automation/ReactionRoleService';

export async function onMessageReactionAdd(
  _client: OpenCodeClient,
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): Promise<void> {
  await handleReactionAdd(reaction, user);
}
