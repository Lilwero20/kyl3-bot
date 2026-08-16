import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ChatInputCommandInteraction, Client } from 'discord.js';
import { Command } from '../structures/Command';
import { logger } from '../utils/logger';

export class CommandLoader {
  public commands = new Map<string, Command>();
  public aliases = new Map<string, Command>();

  public load(): void {
    const baseDir = join(__dirname, '..', 'commands');
    const categories = readdirSync(baseDir, { withFileTypes: true }).filter((e) =>
      e.isDirectory()
    );

    for (const category of categories) {
      const files = readdirSync(join(baseDir, category.name)).filter((f) =>
        f.endsWith('.js') || f.endsWith('.ts')
      );
      for (const file of files) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const loaded = require(join(baseDir, category.name, file)) as {
          default?: new () => Command;
        };
        const Ctor = loaded.default ?? (loaded as new () => Command);
        if (typeof Ctor !== 'function') {
          logger.warn(`Skipping ${file}: no default Command export.`);
          continue;
        }
        let cmd: Command;
        try {
          cmd = new Ctor();
        } catch (err) {
          logger.warn(`Skipping ${file}: could not instantiate.`, err);
          continue;
        }
        if (!(cmd instanceof Command)) {
          logger.warn(`Skipping ${file}: default export is not a Command.`);
          continue;
        }
        this.register(cmd);
      }
    }
    logger.info(`Loaded ${this.commands.size} commands.`);
  }

  public register(cmd: Command): void {
    this.commands.set(cmd.options.name, cmd);
    for (const alias of cmd.options.aliases ?? []) {
      this.aliases.set(alias, cmd);
    }
  }

  public get(name: string): Command | undefined {
    return this.commands.get(name) ?? this.aliases.get(name);
  }

  public async registerSlashCommands(client: Client): Promise<void> {
    const guildId = process.env.DEV_GUILD_ID ?? '';
    const body = [...this.commands.values()].map((cmd) => cmd.data.toJSON());

    if (guildId) {
      try {
        const guild = await client.guilds.fetch(guildId);
        await guild.commands.set(body);
        logger.info(`Registered ${body.length} slash commands in guild ${guildId}.`);
      } catch (err) {
        logger.warn(
          `Could not register commands in guild ${guildId} (${err instanceof Error ? err.message : String(err)}). Falling back to global registration.`
        );
        await client.application?.commands.set(body);
        logger.info(`Registered ${body.length} global slash commands.`);
      }
    } else {
      try {
        await client.application?.commands.set(body);
        logger.info(`Registered ${body.length} global slash commands.`);
      } catch (err) {
        logger.error(
          `Failed to register global slash commands: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }
}
