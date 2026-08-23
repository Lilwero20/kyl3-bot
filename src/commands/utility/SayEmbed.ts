import { Command } from '../../structures/Command';
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
} from 'discord.js';
import { embed, parseColor } from '../../utils/embed';

export default class SayEmbedCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('sayembed')
    .setDescription('Send a message inside an embed.')
    .addStringOption((o) =>
      o.setName('description').setDescription('Embed description').setRequired(true)
    )
    .addStringOption((o) => o.setName('title').setDescription('Embed title'))
    .addStringOption((o) =>
      o.setName('color').setDescription('Hex color or name, e.g. #FF0000')
    )
    .addStringOption((o) => o.setName('footer').setDescription('Footer text'))
    .addStringOption((o) =>
      o.setName('thumbnail').setDescription('Image URL for the thumbnail')
    )
    .addStringOption((o) => o.setName('image').setDescription('Image URL'))
    .addStringOption((o) =>
      o.setName('emoji').setDescription('Emoji to add as a reaction on the sent message')
    )
    .addBooleanOption((o) =>
      o.setName('silent').setDescription('Send without "Sent by" footer').setRequired(false)
    );

  constructor() {
    super({
      name: 'sayembed',
      description: 'Send a message inside an embed.',
      category: 'Utility',
      aliases: ['embedmsg'],
      userPermissions: ['ManageMessages'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const description = interaction.options.getString('description', true);
    const title = interaction.options.getString('title');
    const colorRaw = interaction.options.getString('color');
    const footer = interaction.options.getString('footer');
    const thumbnail = interaction.options.getString('thumbnail');
    const image = interaction.options.getString('image');
    const emoji = interaction.options.getString('emoji');

    const color = colorRaw ? parseColor(colorRaw) : undefined;
    const e = embed({
      title: title ?? undefined,
      description,
      color: color ?? undefined,
      footer: footer ?? undefined,
    });

    if (thumbnail) e.setThumbnail(thumbnail);
    if (image) e.setImage(image);
    if (!footer) {
      e.setFooter({
        text: `Sent by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      });
    }

    await interaction.reply({ content: 'Sent!', ephemeral: true });
    if (interaction.channel && interaction.channel.isSendable()) {
      const sent = await interaction.channel.send({ embeds: [e] });
      if (emoji) await sent.react(emoji).catch(() => null);
    }
  }

  public async runLegacy(message: Message, args: string[]): Promise<void> {
    const text = args.join(' ');
    if (!text) return;
    if (message.channel.isSendable()) {
      await message.channel.send({
        embeds: [embed({ description: text })],
      });
    }
    try {
      await message.delete();
    } catch {
      /* noop */
    }
  }
}
