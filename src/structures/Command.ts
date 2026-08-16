import type {
  ChatInputCommandInteraction,
  Message,
  PermissionResolvable,
} from 'discord.js';
import type { SharedSlashCommand } from '@discordjs/builders';

export type CommandCategory =
  | 'Utility'
  | 'Moderation'
  | 'AutoMod'
  | 'Automation'
  | 'Owner';

export interface CommandOptions {
  name: string;
  description: string;
  category: CommandCategory;
  aliases?: string[];
  userPermissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  cooldown?: number; // seconds
}

export abstract class Command {
  public readonly options: CommandOptions;
  public abstract readonly data: SharedSlashCommand;

  constructor(options: CommandOptions) {
    this.options = options;
  }

  /** Run as a slash command. */
  public abstract execute(interaction: ChatInputCommandInteraction): Promise<void>;

  /** Optional run as a legacy prefix command. */
  public async runLegacy?(message: Message, args: string[]): Promise<void>;

  public hasPermission(
    interaction: ChatInputCommandInteraction
  ): { ok: boolean; reason?: string } {
    const member = interaction.member;
    if (!member) return { ok: true };
    if (!this.options.userPermissions || this.options.userPermissions.length === 0) {
      return { ok: true };
    }
    const perms = interaction.memberPermissions;
    if (!perms) return { ok: true };
    if (perms.missing(this.options.userPermissions).length > 0) {
      return {
        ok: false,
        reason: this.options.userPermissions
          .map((p) => `\`${String(p)}\``)
          .join(', '),
      };
    }
    return { ok: true };
  }
}
