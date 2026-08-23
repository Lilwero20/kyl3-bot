import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embed';

export default class LockCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel (prevent @everyone from sending).')
    .addChannelOption((o) => o.setName('channel').setDescription('Channel (default: current)'));

  constructor() {
    super({
      name: 'lock',
      description: 'Lock a channel (prevent @everyone from sending).',
      category: 'Moderation',
      aliases: ['lockchannel'],
      userPermissions: ['ManageChannels'],
      botPermissions: ['ManageChannels'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    if (!channel || !('permissionOverwrites' in channel)) {
      await interaction.reply({
        embeds: [errorEmbed('That channel cannot be locked.')],
        ephemeral: true,
      });
      return;
    }

    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
    } catch {
      await interaction.reply({
        embeds: [errorEmbed('Failed to lock the channel (check permissions).')],
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      embeds: [successEmbed(`🔒 Locked <#${channel.id}>.`)],
      ephemeral: true,
    });
  }
}
