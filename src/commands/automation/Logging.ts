import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, successEmbed, warningEmbed } from '../../utils/embed';
import { store } from '../../utils/store';

export default class LoggingCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('logging')
    .setDescription('Configure the moderation log channel.')
    .addSubcommand((s) =>
      s.setName('set').setDescription('Set the mod log channel')
        .addChannelOption((o) => o.setName('channel').setDescription('Channel').setRequired(true))
    )
    .addSubcommand((s) => s.setName('status').setDescription('Show current log channel'))
    .addSubcommand((s) => s.setName('disable').setDescription('Disable logging'));

  constructor() {
    super({
      name: 'logging',
      description: 'Configure the moderation log channel.',
      category: 'Automation',
      userPermissions: ['ManageGuild'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId!;
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const channel = interaction.options.getChannel('channel', true);
      store.set('modlog', guildId, { channelId: channel.id });
      await interaction.reply({
        embeds: [successEmbed(`Moderation logs will be sent to <#${channel.id}>.`)],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'status') {
      const cfg = store.get<{ channelId: string }>('modlog', guildId);
      if (!cfg?.channelId) {
        await interaction.reply({ embeds: [warningEmbed('Logging is disabled.')], ephemeral: true });
        return;
      }
      await interaction.reply({
        embeds: [successEmbed(`Log channel: <#${cfg.channelId}>.`)],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'disable') {
      store.delete('modlog', guildId);
      await interaction.reply({ embeds: [successEmbed('Logging disabled.')], ephemeral: true });
    }
  }
}
