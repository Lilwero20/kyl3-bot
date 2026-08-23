import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { embed, errorEmbed, EMBED_COLORS } from '../../utils/embed';

export default class ServerIconCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('servericon')
    .setDescription('Show the server icon.');

  constructor() {
    super({
      name: 'servericon',
      description: 'Show the server icon.',
      category: 'Utility',
      aliases: ['guildicon', 'icon'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;
    const icon = guild.iconURL({ size: 1024, extension: 'png' });
    if (!icon) {
      await interaction.reply({
        embeds: [errorEmbed('This server has no icon.')],
        ephemeral: true,
      });
      return;
    }
    const e = embed({
      title: `${guild.name}'s icon`,
      color: EMBED_COLORS.primary,
      footer: `ID: ${guild.id}`,
      timestamp: false,
    }).setImage(icon);
    await interaction.reply({ embeds: [e] });
  }

  public async runLegacy(message: Message): Promise<void> {
    const guild = message.guild;
    const icon = guild?.iconURL({ size: 1024, extension: 'png' });
    if (!icon || !message.channel.isSendable()) return;
    const e = embed({ title: `${guild?.name}'s icon`, footer: `ID: ${guild?.id}`, timestamp: false }).setImage(icon);
    await message.channel.send({ embeds: [e] });
  }
}
