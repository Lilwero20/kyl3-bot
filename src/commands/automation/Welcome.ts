import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, successEmbed, warningEmbed } from '../../utils/embed';
import { store } from '../../utils/store';
import { getWelcomeConfig, type WelcomeConfig } from '../../automation/WelcomeService';

export default class WelcomeCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure the welcome message.')
    .addSubcommand((s) =>
      s.setName('set').setDescription('Set the welcome channel and message')
        .addChannelOption((o) => o.setName('channel').setDescription('Welcome channel').setRequired(true))
        .addStringOption((o) => o.setName('message').setDescription('Message template. Placeholders: {user}, {userMention}, {server}, {memberCount}'))
        .addBooleanOption((o) => o.setName('embed').setDescription('Send as an embed'))
        .addStringOption((o) => o.setName('title').setDescription('Embed title'))
    )
    .addSubcommand((s) => s.setName('status').setDescription('Show current welcome config'))
    .addSubcommand((s) => s.setName('disable').setDescription('Disable welcome messages'));

  constructor() {
    super({
      name: 'welcome',
      description: 'Configure the welcome message.',
      category: 'Automation',
      userPermissions: ['ManageGuild'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId!;
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const channel = interaction.options.getChannel('channel', true);
      const message = interaction.options.getString('message');
      const embed = interaction.options.getBoolean('embed') ?? false;
      const title = interaction.options.getString('title');

      const cfg: WelcomeConfig = {
        channelId: channel.id,
        message: message ?? '',
        embedTitle: embed && title ? title : undefined,
        enabled: true,
      };
      store.set('welcome', guildId, cfg);
      await interaction.reply({
        embeds: [successEmbed(`Welcome messages enabled in <#${channel.id}>.`)],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'status') {
      const cfg = getWelcomeConfig(guildId);
      if (!cfg || !cfg.enabled) {
        await interaction.reply({ embeds: [warningEmbed('Welcome messages are disabled.')], ephemeral: true });
        return;
      }
      await interaction.reply({
        embeds: [
          successEmbed(
            `Channel: <#${cfg.channelId}>\nMessage: \`${cfg.message}\`\nEmbed: ${cfg.embedTitle ? `yes (title: ${cfg.embedTitle})` : 'no'}`
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'disable') {
      store.set('welcome', guildId, { channelId: '', message: '', enabled: false });
      await interaction.reply({ embeds: [successEmbed('Welcome messages disabled.')], ephemeral: true });
    }
  }
}
