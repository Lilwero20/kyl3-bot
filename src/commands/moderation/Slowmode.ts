import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embed';
import { formatDuration } from '../../utils/time';

export default class SlowmodeCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Manage channel slowmode.')
    .addSubcommand((s) =>
      s
        .setName('set')
        .setDescription('Set slowmode delay in seconds')
        .addIntegerOption((o) =>
          o
            .setName('seconds')
            .setDescription('Seconds (0 to disable, max 21600)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(21600)
        )
        .addChannelOption((o) => o.setName('channel').setDescription('Channel (default: current)'))
    )
    .addSubcommand((s) => s.setName('off').setDescription('Disable slowmode').addChannelOption((o) => o.setName('channel').setDescription('Channel (default: current)')));

  constructor() {
    super({
      name: 'slowmode',
      description: 'Manage channel slowmode.',
      category: 'Moderation',
      aliases: ['slow'],
      userPermissions: ['ManageChannels'],
      botPermissions: ['ManageChannels'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    if (!channel || !('setRateLimitPerUser' in channel)) {
      await interaction.reply({
        embeds: [errorEmbed('I cannot manage slowmode in that channel.')],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'set') {
      const seconds = interaction.options.getInteger('seconds', true);
      try {
        await channel.setRateLimitPerUser(seconds);
      } catch {
        await interaction.reply({
          embeds: [errorEmbed('Failed to set slowmode.')],
          ephemeral: true,
        });
        return;
      }
      await interaction.reply({
        embeds: [successEmbed(`Slowmode set to **${formatDuration(seconds * 1000)}** in <#${channel.id}>.`)],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'off') {
      try {
        await channel.setRateLimitPerUser(0);
      } catch {
        await interaction.reply({
          embeds: [errorEmbed('Failed to disable slowmode.')],
          ephemeral: true,
        });
        return;
      }
      await interaction.reply({
        embeds: [successEmbed(`Slowmode disabled in <#${channel.id}>.`)],
        ephemeral: true,
      });
    }
  }
}
