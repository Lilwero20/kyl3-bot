import { Command } from '../../structures/Command';
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { embed, successEmbed, EMBED_COLORS, errorEmbed } from '../../utils/embed';
import { store } from '../../utils/store';
import { getUserWarnings, type Warning } from './Warn';

export default class WarningsCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Manage warnings for a member.')
    .addSubcommand((s) =>
      s.setName('list').setDescription('List warnings')
        .addUserOption((o) => o.setName('user').setDescription('User to inspect').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('clear').setDescription('Remove all warnings')
        .addUserOption((o) => o.setName('user').setDescription('User to clear').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('remove').setDescription('Remove a specific warning')
        .addUserOption((o) => o.setName('user').setDescription('User').setRequired(true))
        .addIntegerOption((o) => o.setName('index').setDescription('Warning index (1-based)').setRequired(true))
    );

  constructor() {
    super({
      name: 'warnings',
      description: 'Manage warnings for a member.',
      category: 'Moderation',
      aliases: ['warns'],
      userPermissions: ['ModerateMembers'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;
    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user', true);

    if (sub === 'list') {
      const warnings = getUserWarnings(guild.id, target.id);
      if (warnings.length === 0) {
        await interaction.reply({ embeds: [errorEmbed(`**${target.tag}** has no warnings.`)], ephemeral: true });
        return;
      }
      const e = embed({
        title: `Warnings for ${target.tag}`,
        color: EMBED_COLORS.warning,
        fields: warnings.map((w: Warning, i) => ({
          name: `#${i + 1} · ${w.moderatorTag} · <t:${Math.floor(w.at / 1000)}:F>`,
          value: w.reason,
          inline: false,
        })),
      });
      await interaction.reply({ embeds: [e] });
      return;
    }

    if (sub === 'clear') {
      const all = store.get<Record<string, Warning[]>>('warnings', guild.id) ?? {};
      delete all[target.id];
      store.set('warnings', guild.id, all);
      await interaction.reply({ embeds: [successEmbed(`Cleared all warnings for **${target.tag}**.`)], ephemeral: true });
      return;
    }

    if (sub === 'remove') {
      const index = interaction.options.getInteger('index', true);
      const warnings = getUserWarnings(guild.id, target.id);
      if (index < 1 || index > warnings.length) {
        await interaction.reply({ embeds: [errorEmbed(`Invalid index. **${target.tag}** has ${warnings.length} warning(s).`)], ephemeral: true });
        return;
      }
      warnings.splice(index - 1, 1);
      const all = store.get<Record<string, Warning[]>>('warnings', guild.id) ?? {};
      all[target.id] = warnings;
      store.set('warnings', guild.id, all);
      await interaction.reply({ embeds: [successEmbed(`Removed warning #${index} from **${target.tag}**.`)], ephemeral: true });
    }
  }
}
