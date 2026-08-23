import type { Message, PartialMessage } from 'discord.js';
import type { OpenCodeClient } from '../structures/OpenCodeClient';
import { store } from '../utils/store';

export async function onMessageDelete(
  client: OpenCodeClient,
  message: Message | PartialMessage
): Promise<void> {
  if (message.partial) return;
  if (message.author?.bot) return;

  store.set('snipe', message.channelId, {
    content: message.content || '(attachment or embed)',
    authorId: message.author.id,
    authorTag: message.author.tag,
    avatar: message.author.displayAvatarURL(),
    deletedAt: Date.now(),
  });
}
