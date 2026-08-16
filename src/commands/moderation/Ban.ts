import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embed';
import { logModeration } from '../../utils/moderation';

export default class BanCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server.')
    .addUserOption((o) => o.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Ban reason'))
    .addIntegerOption((o) => o.setName('days').setDescription('Days of messages to delete (0-7)'))
    .addBooleanOption((o) => o.setName('silent').setDescription('Skip DM notification'));

  constructor() {
    super({
      name: 'ban',
      description: 'Ban a user from the server.',
      category: 'Moderation',
      userPermissions: ['BanMembers'],
      botPermissions: ['BanMembers'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const days = interaction.options.getInteger('days') ?? 0;
    const silent = interaction.options.getBoolean('silent') ?? false;

    const member = interaction.guild?.members.cache.get(target.id);
    if (member && member.id === interaction.user.id) {
      await interaction.reply({ embeds: [errorEmbed('You cannot ban yourself.')], ephemeral: true });
      return;
    }
    if (member && member.permissions.has('BanMembers')) {
      await interaction.reply({ embeds: [errorEmbed('You cannot ban a member with `BanMembers` permission.')], ephemeral: true });
      return;
    }
    if (!member?.bannable) {
      await interaction.reply({ embeds: [errorEmbed('I cannot ban that user (check role hierarchy).')], ephemeral: true });
      return;
    }

    if (!silent) {
      try {
        await target.send(`You have been banned from **${guild.name}**. Reason: ${reason}`);
      } catch {
        /* noop */
      }
    }

    await interaction.deferReply();
    try {
      await guild.members.ban(target.id, { reason, deleteMessageSeconds: days * 86400 });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed(`Failed to ban **${target.tag}**.`) ] });
      return;
    }

    await logModeration(interaction.client, guild, {
      action: 'Ban',
      target: { tag: target.tag, id: target.id },
      moderator: { tag: interaction.user.tag, id: interaction.user.id },
      reason,
      extra: days ? `Deleted last ${days} day(s) of messages.` : undefined,
    });

    await interaction.editReply({
      embeds: [successEmbed(`**${target.tag}** was banned.\nReason: ${reason}`)],
    });
  }
}
