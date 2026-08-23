import { Command } from '../../structures/Command';
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
} from 'discord.js';
import { embed, EMBED_COLORS } from '../../utils/embed';

export default class SayCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot say something, optionally with an image.')
    .addStringOption((o) =>
      o.setName('text').setDescription('Text to say').setRequired(true).setMaxLength(2000)
    )
    .addAttachmentOption((o) =>
      o.setName('attachment').setDescription('Image/file to attach')
    )
    .addStringOption((o) =>
      o.setName('image').setDescription('Image URL to embed alongside the text')
    )
    .addBooleanOption((o) =>
      o.setName('silent').setDescription('Send without the "Sent by" footer').setRequired(false)
    );

  constructor() {
    super({
      name: 'say',
      description: 'Make the bot say something, optionally with an image.',
      category: 'Utility',
      aliases: ['echo'],
      userPermissions: ['ManageMessages'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const text = interaction.options.getString('text', true);
    const attachment = interaction.options.getAttachment('attachment');
    const image = interaction.options.getString('image');
    const silent = interaction.options.getBoolean('silent') ?? false;

    await interaction.reply({ content: 'Sent!', ephemeral: true });
    if (!interaction.channel || !interaction.channel.isSendable()) return;

    if (attachment) {
      await interaction.channel.send({ content: text, files: [attachment] });
    } else if (image) {
      const footer = silent ? undefined : `Sent by ${interaction.user.tag}`;
      const e = embed({
        description: text,
        color: EMBED_COLORS.primary,
        timestamp: false,
      }).setImage(image);
      if (footer) {
        e.setFooter({ text: footer, iconURL: interaction.user.displayAvatarURL() });
      }
      await interaction.channel.send({ embeds: [e] });
    } else {
      await interaction.channel.send(text);
    }
  }

  public async runLegacy(message: Message, args: string[]): Promise<void> {
    if (!message.channel.isSendable()) return;
    const attachment = message.attachments.first();

    // Legacy: `!say text` or `!say text @image` — here just handle URL in args.
    const text = args.join(' ');
    if (attachment) {
      await message.channel.send({ content: text, files: [attachment] });
    } else if (text) {
      await message.channel.send(text);
    }
    try {
      await message.delete();
    } catch {
      /* noop */
    }
  }
}
