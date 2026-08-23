import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embed';

export default class SetNickCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('setnick')
    .setDescription('Change a member nickname.')
    .addUserOption((o) => o.setName('user').setDescription('User to rename').setRequired(true))
    .addStringOption((o) =>
      o.setName('nickname').setDescription('New nickname (empty to reset)').setMaxLength(32)
    );

  constructor() {
    super({
      name: 'setnick',
      description: 'Change a member nickname.',
      category: 'Moderation',
      aliases: ['nick'],
      userPermissions: ['ManageNicknames'],
      botPermissions: ['ManageNicknames'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;
    const target = interaction.options.getUser('user', true);
    const nickname = interaction.options.getString('nickname');

    const member = guild.members.cache.get(target.id);
    if (!member) {
      await interaction.reply({ embeds: [errorEmbed('That user is not in this server.')], ephemeral: true });
      return;
    }
    if (member.id === interaction.user.id && !interaction.memberPermissions?.has('ManageNicknames')) {
      await interaction.reply({ embeds: [errorEmbed('You cannot change your own nickname here.')], ephemeral: true });
      return;
    }
    if (!member.manageable) {
      await interaction.reply({ embeds: [errorEmbed('I cannot change that member nickname (check role hierarchy).')], ephemeral: true });
      return;
    }

    try {
      await member.setNickname(nickname ?? '');
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Failed to change nickname.')], ephemeral: true });
      return;
    }

    const value = nickname?.length ? ` **${nickname}**` : ' back to their';
    await interaction.reply({
      embeds: [successEmbed(`Changed ${target.username}'s nickname to${value} original name.`)],
      ephemeral: true,
    });
  }
}
