import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embed';
import { logModeration } from '../../utils/moderation';

export default class UnbanCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server.')
    .addStringOption((o) => o.setName('user_id').setDescription('User ID to unban').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason'));

  constructor() {
    super({
      name: 'unban',
      description: 'Unban a user from the server.',
      category: 'Moderation',
      userPermissions: ['BanMembers'],
      botPermissions: ['BanMembers'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;
    const userId = interaction.options.getString('user_id', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!/^\d{17,20}$/.test(userId)) {
      await interaction.reply({ embeds: [errorEmbed('That is not a valid user ID.')], ephemeral: true });
      return;
    }

    try {
      await guild.bans.fetch(userId);
    } catch {
      await interaction.reply({ embeds: [errorEmbed('That user is not banned.')], ephemeral: true });
      return;
    }

    await interaction.deferReply();
    try {
      const user = await guild.bans.remove(userId, reason);
      await logModeration(interaction.client, guild, {
        action: 'Unban',
        target: { tag: user?.tag ?? userId, id: userId },
        moderator: { tag: interaction.user.tag, id: interaction.user.id },
        reason,
      });
      await interaction.editReply({
        embeds: [successEmbed(`**${user?.tag ?? userId}** was unbanned.\nReason: ${reason}`)],
      });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed(`Failed to unban <@${userId}>.`) ] });
    }
  }
}
