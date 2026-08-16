import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embed';
import { logModeration } from '../../utils/moderation';
import { parseDuration, formatDuration } from '../../utils/time';

export default class MuteCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a member for a given duration.')
    .addUserOption((o) => o.setName('user').setDescription('User to mute').setRequired(true))
    .addStringOption((o) =>
      o.setName('duration').setDescription('Duration, e.g. "10m", "1h", "7d"').setRequired(true)
    )
    .addStringOption((o) => o.setName('reason').setDescription('Mute reason'));

  constructor() {
    super({
      name: 'mute',
      description: 'Timeout a member for a given duration.',
      category: 'Moderation',
      aliases: ['timeout'],
      userPermissions: ['ModerateMembers'],
      botPermissions: ['ModerateMembers'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;
    const target = interaction.options.getUser('user', true);
    const durationRaw = interaction.options.getString('duration', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    const ms = parseDuration(durationRaw);
    if (!ms || ms < 1000 || ms > 28 * 86400_000) {
      await interaction.reply({
        embeds: [errorEmbed('Invalid duration. Discord timeouts max out at **28 days**. Examples: `10m`, `1h`, `2d`.')],
        ephemeral: true,
      });
      return;
    }

    const member = interaction.guild?.members.cache.get(target.id);
    if (!member) {
      await interaction.reply({ embeds: [errorEmbed('That user is not in this server.')], ephemeral: true });
      return;
    }
    if (member.id === interaction.user.id) {
      await interaction.reply({ embeds: [errorEmbed('You cannot mute yourself.')], ephemeral: true });
      return;
    }
    if (member.permissions.has('ModerateMembers')) {
      await interaction.reply({ embeds: [errorEmbed('You cannot mute a member with `ModerateMembers` permission.')], ephemeral: true });
      return;
    }
    if (!member.moderatable) {
      await interaction.reply({ embeds: [errorEmbed('I cannot mute that member (check role hierarchy).')], ephemeral: true });
      return;
    }

    await interaction.deferReply();
    try {
      await member.timeout(ms, reason);
    } catch {
      await interaction.editReply({ embeds: [errorEmbed(`Failed to mute **${target.tag}**.`) ] });
      return;
    }

    await logModeration(interaction.client, guild, {
      action: 'Mute',
      target: { tag: target.tag, id: target.id },
      moderator: { tag: interaction.user.tag, id: interaction.user.id },
      reason,
      duration: formatDuration(ms),
    });

    await interaction.editReply({
      embeds: [successEmbed(`**${target.tag}** was muted for **${formatDuration(ms)}**.\nReason: ${reason}`)],
    });
  }
}
