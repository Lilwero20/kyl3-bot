import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embed';
import { logModeration } from '../../utils/moderation';

export default class UnmuteCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove a timeout from a member.')
    .addUserOption((o) => o.setName('user').setDescription('User to unmute').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason'));

  constructor() {
    super({
      name: 'unmute',
      description: 'Remove a timeout from a member.',
      category: 'Moderation',
      aliases: ['untimeout'],
      userPermissions: ['ModerateMembers'],
      botPermissions: ['ModerateMembers'],
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
    if (!member.communicationDisabledUntilTimestamp) {
      await interaction.reply({ embeds: [errorEmbed('**' + target.tag + '** is not muted.')], ephemeral: true });
      return;
    }

    await interaction.deferReply();
    try {
      await member.timeout(null, reason);
    } catch {
      await interaction.editReply({ embeds: [errorEmbed(`Failed to unmute **${target.tag}**.`) ] });
      return;
    }

    await logModeration(interaction.client, guild, {
      action: 'Unmute',
      target: { tag: target.tag, id: target.id },
      moderator: { tag: interaction.user.tag, id: interaction.user.id },
      reason,
    });

    await interaction.editReply({
      embeds: [successEmbed(`**${target.tag}** was unmuted.\nReason: ${reason}`)],
    });
  }
}
