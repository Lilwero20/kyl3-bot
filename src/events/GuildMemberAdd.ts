import type { GuildMember, PartialGuildMember } from 'discord.js';
import type { Kyl3Client } from '../structures/Kyl3Client';
import { handleMemberJoin } from '../automation/WelcomeService';
import { logger } from '../utils/logger';

export async function onGuildMemberAdd(
  client: Kyl3Client,
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
  await handleMemberJoin(client, member);
}
