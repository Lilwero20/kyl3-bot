import { Command } from '../../structures/Command';
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
} from 'discord.js';
import { embed } from '../../utils/embed';

export default class AvatarCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Show a user avatar.')
    .addUserOption((o) => o.setName('user').setDescription('User to show'));

  constructor() {
    super({
      name: 'avatar',
      description: 'Show a user avatar.',
      category: 'Utility',
      aliases: ['pfp', 'av'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const size = 1024;
    const e = embed({
      title: `${target.username}'s avatar`,
      description: `[PNG](${target.displayAvatarURL({ size, extension: 'png' })}) · [GIF](${target.displayAvatarURL({ size, extension: 'gif' })}) · [WebP](${target.displayAvatarURL({ size, extension: 'webp' })})`,
      color: interaction.guild?.members.cache.get(target.id)?.displayColor ?? undefined,
      footer: `ID: ${target.id}`,
    }).setImage(target.displayAvatarURL({ size }));

    await interaction.reply({ embeds: [e] });
  }

  public async runLegacy(message: Message, args: string[]): Promise<void> {
    const mention = message.mentions.users.first();
    const target = mention ?? message.author;
    const e = embed({
      title: `${target.username}'s avatar`,
      footer: `ID: ${target.id}`,
    }).setImage(target.displayAvatarURL({ size: 1024 }));
    if (message.channel.isSendable()) {
      await message.channel.send({ embeds: [e] });
    }
  }
}
