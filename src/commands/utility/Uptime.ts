import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { embed, EMBED_COLORS } from '../../utils/embed';
import { formatDuration } from '../../utils/time';

export default class UptimeCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Show how long the bot has been running.');

  constructor() {
    super({
      name: 'uptime',
      description: 'Show how long the bot has been running.',
      category: 'Utility',
      aliases: ['up'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const ms = interaction.client.uptime ?? 0;
    const e = embed({
      title: '⏱️ Uptime',
      description: `I have been online for **${formatDuration(ms)}**.`,
      color: EMBED_COLORS.success,
      footer: 'Started ' + new Date(Date.now() - ms).toLocaleString(),
    });
    await interaction.reply({ embeds: [e] });
  }

  public async runLegacy(message: Message): Promise<void> {
    const ms = message.client.uptime ?? 0;
    if (message.channel.isSendable()) {
      await message.channel.send(`⏱️ Online for **${formatDuration(ms)}**.`);
    }
  }
}
