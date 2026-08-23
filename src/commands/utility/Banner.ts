import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { embed, errorEmbed, EMBED_COLORS } from '../../utils/embed';

export default class BannerCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Show a user banner.')
    .addUserOption((o) => o.setName('user').setDescription('User to show'));

  constructor() {
    super({
      name: 'banner',
      description: 'Show a user banner.',
      category: 'Utility',
      aliases: ['userbanner'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const banner = target.bannerURL({ size: 1024 });
    if (!banner) {
      await interaction.reply({
        embeds: [errorEmbed(`${target.username} has no banner set.`)],
        ephemeral: true,
      });
      return;
    }
    const e = embed({
      title: `${target.username}'s banner`,
      description: `[Open](${banner})`,
      color: target.accentColor ?? EMBED_COLORS.primary,
      footer: `ID: ${target.id}`,
      timestamp: false,
    }).setImage(banner);
    await interaction.reply({ embeds: [e] });
  }

  public async runLegacy(message: Message, args: string[]): Promise<void> {
    const target = message.mentions.users.first() ?? message.author;
    const banner = target.bannerURL({ size: 1024 });
    if (!banner || !message.channel.isSendable()) return;
    const e = embed({ title: `${target.username}'s banner`, footer: `ID: ${target.id}`, timestamp: false }).setImage(banner);
    await message.channel.send({ embeds: [e] });
  }
}
