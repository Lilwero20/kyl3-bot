import type { Client } from 'discord.js';
import { store } from '../utils/store';
import { embed, EMBED_COLORS } from '../utils/embed';
import { formatDuration } from '../utils/time';
import type { Reminder } from '../commands/utility/RemindMe';
import { logger } from '../utils/logger';

/** Process due reminders every few seconds. */
export class ReminderService {
  private timer: ReturnType<typeof setInterval> | null = null;

  public start(client: Client): void {
    this.timer = setInterval(() => this.tick(client), 5000);
    this.timer.unref();
    logger.info('Reminder service started.');
  }

  private async tick(client: Client): Promise<void> {
    const all = store.get<Record<string, Reminder>>('reminders', 'all') ?? {};
    const now = Date.now();
    const due: Reminder[] = [];

    for (const [id, r] of Object.entries(all)) {
      if (r.dueAt <= now) {
        due.push(r);
        delete all[id];
      }
    }

    if (due.length) {
      store.set('reminders', 'all', all);
    }

    for (const r of due) {
      const channel = await client.channels.fetch(r.channelId).catch(() => null);
      if (channel && 'send' in channel) {
        const e = embed({
          title: '⏰ Reminder',
          description: `> ${r.text}`,
          color: EMBED_COLORS.warning,
          footer: `Set ${formatDuration(now - r.createdAt)} ago`,
        });
        await channel
          .send({ content: `<@${r.userId}>`, embeds: [e] })
          .catch(() => null);
      }
    }
  }

  public stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
