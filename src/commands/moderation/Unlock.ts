import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embed';

export default class UnlockCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a channel (allow @everyone to send again).')
    .addChannelOption((o) => o.setName('channel').setDescription('Channel (default: current)'));

  constructor() {
    super({
      name: 'unlock',
      description: 'Unlock a channel (allow @everyone to send again).',
      category: 'Moderation',
      aliases: ['unlockchannel'],
      userPermissions: ['ManageChannels'],
      botPermissions: ['ManageChannels'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    if (!channel || !('permissionOverwrites' in channel)) {
      await interaction.reply({
        embeds: [errorEmbed('That channel cannot be unlocked.')],
        ephemeral: true,
      });
      return;
    }

    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
    } catch {
      await interaction.reply({
        embeds: [errorEmbed('Failed to unlock the channel (check permissions).')],
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      embeds: [successEmbed(`🔓 Unlocked <#${channel.id}>.`)],
      ephemeral: true,
    });
  }
}
