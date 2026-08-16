import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, successEmbed, warningEmbed } from '../../utils/embed';
import { store } from '../../utils/store';
import { getAutoroleConfig } from '../../automation/WelcomeService';

export default class AutoroleCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Automatically assign a role to new members.')
    .addSubcommand((s) =>
      s.setName('set').setDescription('Set the role to auto-assign')
        .addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true))
    )
    .addSubcommand((s) => s.setName('status').setDescription('Show current autorole'))
    .addSubcommand((s) => s.setName('disable').setDescription('Disable autorole'));

  constructor() {
    super({
      name: 'autorole',
      description: 'Automatically assign a role to new members.',
      category: 'Automation',
      userPermissions: ['ManageRoles'],
      botPermissions: ['ManageRoles'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const role = interaction.options.getRole('role', true);
      if (role.id === guild.id) {
        await interaction.reply({ embeds: [errorEmbed('You cannot set the @everyone role.')], ephemeral: true });
        return;
      }
      store.set('autorole', guild.id, { roleId: role.id, enabled: true });
      await interaction.reply({
        embeds: [successEmbed(`New members will now receive <@&${role.id}>.`)],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'status') {
      const cfg = getAutoroleConfig(guild.id);
      if (!cfg || !cfg.enabled) {
        await interaction.reply({ embeds: [warningEmbed('Autorole is disabled.')], ephemeral: true });
        return;
      }
      await interaction.reply({
        embeds: [successEmbed(`New members will receive <@&${cfg.roleId}>.`)],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'disable') {
      store.set('autorole', guild.id, { roleId: '', enabled: false });
      await interaction.reply({ embeds: [successEmbed('Autorole disabled.')], ephemeral: true });
    }
  }
}
