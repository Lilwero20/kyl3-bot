import type { Client } from 'discord.js';
import { store } from '../utils/store';
import { embed, EMBED_COLORS } from '../utils/embed';
import { logger } from '../utils/logger';

export interface ScheduledMessage {
  id: string;
  guildId: string;
  channelId: string;
  content: string;
  /** Cron-like schedule, simplified: array of [minute, hour, day] or nextRunAt */
  intervalMinutes: number;
  lastRunAt: number;
  nextRunAt: number;
  enabled: boolean;
}

/** Run scheduled announcements every minute. */
export class SchedulerService {
  private timer: ReturnType<typeof setInterval> | null = null;

  public start(client: Client): void {
    this.timer = setInterval(() => this.tick(client), 60_000);
    this.timer.unref();
    logger.info('Scheduler service started.');
  }

  private async tick(client: Client): Promise<void> {
    const all = store.get<Record<string, ScheduledMessage>>('scheduled', 'all') ?? {};
    const now = Date.now();
    const changed = new Set<string>();

    for (const [id, s] of Object.entries(all)) {
      if (!s.enabled) continue;
      if (s.nextRunAt > now) continue;

      const channel = await client.channels.fetch(s.channelId).catch(() => null);
      if (channel && 'send' in channel) {
        const e = embed({
          title: '📢 Scheduled announcement',
          description: s.content,
          color: EMBED_COLORS.primary,
          footer: `Next run ${new Date(s.nextRunAt + s.intervalMinutes * 60_000).toLocaleString()}`,
        });
        await channel
          .send({ embeds: [e], allowedMentions: { parse: ['users'] } })
          .catch((err: unknown) => {
            logger.warn('Scheduled message failed', err);
          });
      }

      s.lastRunAt = now;
      s.nextRunAt = now + s.intervalMinutes * 60_000;
      all[id] = s;
      changed.add(id);
    }

    if (changed.size) {
      store.set('scheduled', 'all', all);
    }
  }

  public stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
