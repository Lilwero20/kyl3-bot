import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { CommandLoader } from './CommandLoader';
import { logger } from '../utils/logger';
import { config } from '../config';

export class OpenCodeClient extends Client {
  public readonly commands = new CommandLoader();
  public readonly cooldowns = new Collection<string, number>();

  constructor() {
    const intents = [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildMessageReactions,
    ];

    if (config.privilegedIntents) {
      intents.push(
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent
      );
    }

    super({
      intents,
      partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message,
        Partials.Reaction,
        Partials.User,
      ],
    });

    this.on('error', (err) => logger.error('Client error:', err));
  }

  /** Returns seconds remaining for a user+command cooldown, or 0 if none. */
  public cooldownRemaining(userId: string, command: string): number {
    const key = `${userId}:${command}`;
    const until = this.cooldowns.get(key);
    if (!until) return 0;
    const remaining = until - Date.now();
    if (remaining <= 0) {
      this.cooldowns.delete(key);
      return 0;
    }
    return Math.ceil(remaining / 1000);
  }

  public setCooldown(userId: string, command: string, seconds: number): void {
    const key = `${userId}:${command}`;
    this.cooldowns.set(key, Date.now() + seconds * 1000);
    setTimeout(() => this.cooldowns.delete(key), seconds * 1000).unref();
  }
}
