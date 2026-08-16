import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embed';
import { logModeration } from '../../utils/moderation';

export default class KickCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server.')
    .addUserOption((o) => o.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Kick reason'));

  constructor() {
    super({
      name: 'kick',
      description: 'Kick a member from the server.',
      category: 'Moderation',
      userPermissions: ['KickMembers'],
      botPermissions: ['KickMembers'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    const member = interaction.guild?.members.cache.get(target.id);
    if (!member) {
      await interaction.reply({ embeds: [errorEmbed('That user is not in this server.')], ephemeral: true });
      return;
    }
    if (member.id === interaction.user.id) {
      await interaction.reply({ embeds: [errorEmbed('You cannot kick yourself.')], ephemeral: true });
      return;
    }
    if (member.permissions.has('KickMembers')) {
      await interaction.reply({ embeds: [errorEmbed('You cannot kick a member with `KickMembers` permission.')], ephemeral: true });
      return;
    }
    if (!member.kickable) {
      await interaction.reply({ embeds: [errorEmbed('I cannot kick that member (check role hierarchy).')], ephemeral: true });
      return;
    }

    await interaction.deferReply();
    try {
      await member.kick(reason);
    } catch {
      await interaction.editReply({ embeds: [errorEmbed(`Failed to kick **${target.tag}**.`) ] });
      return;
    }

    await logModeration(interaction.client, guild, {
      action: 'Kick',
      target: { tag: target.tag, id: target.id },
      moderator: { tag: interaction.user.tag, id: interaction.user.id },
      reason,
    });

    await interaction.editReply({
      embeds: [successEmbed(`**${target.tag}** was kicked.\nReason: ${reason}`)],
    });
  }
}
