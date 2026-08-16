import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, successEmbed, warningEmbed } from '../../utils/embed';
import { store } from '../../utils/store';
import { getGoodbyeConfig, type GoodbyeConfig } from '../../automation/WelcomeService';

export default class GoodbyeCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('goodbye')
    .setDescription('Configure the goodbye message.')
    .addSubcommand((s) =>
      s.setName('set').setDescription('Set the goodbye channel and message')
        .addChannelOption((o) => o.setName('channel').setDescription('Goodbye channel').setRequired(true))
        .addStringOption((o) => o.setName('message').setDescription('Message template. Placeholders: {user}, {server}, {memberCount}'))
    )
    .addSubcommand((s) => s.setName('status').setDescription('Show current goodbye config'))
    .addSubcommand((s) => s.setName('disable').setDescription('Disable goodbye messages'));

  constructor() {
    super({
      name: 'goodbye',
      description: 'Configure the goodbye message.',
      category: 'Automation',
      userPermissions: ['ManageGuild'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId!;
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const channel = interaction.options.getChannel('channel', true);
      const message = interaction.options.getString('message') ?? '';
      const cfg: GoodbyeConfig = { channelId: channel.id, message, enabled: true };
      store.set('goodbye', guildId, cfg);
      await interaction.reply({
        embeds: [successEmbed(`Goodbye messages enabled in <#${channel.id}>.`)],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'status') {
      const cfg = getGoodbyeConfig(guildId);
      if (!cfg || !cfg.enabled) {
        await interaction.reply({ embeds: [warningEmbed('Goodbye messages are disabled.')], ephemeral: true });
        return;
      }
      await interaction.reply({
        embeds: [successEmbed(`Channel: <#${cfg.channelId}>\nMessage: \`${cfg.message}\``)],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'disable') {
      store.set('goodbye', guildId, { channelId: '', message: '', enabled: false });
      await interaction.reply({ embeds: [successEmbed('Goodbye messages disabled.')], ephemeral: true });
    }
  }
}
