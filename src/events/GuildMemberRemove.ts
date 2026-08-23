import type { GuildMember, PartialGuildMember } from 'discord.js';
import type { OpenCodeClient } from '../structures/OpenCodeClient';
import { handleMemberLeave } from '../automation/WelcomeService';
import { logger } from '../utils/logger';

export async function onGuildMemberRemove(
  client: OpenCodeClient,
  member: GuildMember | PartialGuildMember
): Promise<void> {
  if (member.partial) {
    try {
      member = await member.fetch();
    } catch (err) {
      logger.warn('Could not fetch partial member', err);
      return;
    }
  }
  await handleMemberLeave(client, member);
}
