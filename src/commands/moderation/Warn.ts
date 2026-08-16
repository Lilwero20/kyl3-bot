import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embed';
import { logModeration } from '../../utils/moderation';
import { store } from '../../utils/store';

export interface Warning {
  id: string;
  moderatorId: string;
  moderatorTag: string;
  reason: string;
  at: number;
}

export function getUserWarnings(guildId: string, userId: string): Warning[] {
  const all = store.get<Record<string, Warning[]>>('warnings', guildId) ?? {};
  return all[userId] ?? [];
}

export function addWarning(guildId: string, userId: string, warning: Warning): void {
  const all = store.get<Record<string, Warning[]>>('warnings', guildId) ?? {};
  const list = all[userId] ?? [];
  list.push(warning);
  all[userId] = list;
  store.set('warnings', guildId, all);
}

export default class WarnCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member.')
    .addUserOption((o) => o.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Warn reason').setRequired(true));

  constructor() {
    super({
      name: 'warn',
      description: 'Warn a member.',
      category: 'Moderation',
      userPermissions: ['ModerateMembers'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

    if (target.id === interaction.user.id) {
      await interaction.reply({ embeds: [errorEmbed('You cannot warn yourself.')], ephemeral: true });
      return;
    }

    const warning: Warning = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      reason,
      at: Date.now(),
    };
    addWarning(guild.id, target.id, warning);

    await logModeration(interaction.client, guild, {
      action: 'Warn',
      target: { tag: target.tag, id: target.id },
      moderator: { tag: interaction.user.tag, id: interaction.user.id },
      reason,
    });

    await interaction.reply({
      embeds: [successEmbed(`**${target.tag}** was warned (${getUserWarnings(guild.id, target.id).length} total).\nReason: ${reason}`)],
    });
  }
}
