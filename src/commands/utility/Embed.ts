import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { embed, parseColor } from '../../utils/embed';

export default class EmbedCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Build and send a custom embed.')
    .addStringOption((o) =>
      o.setName('description').setDescription('Embed description').setRequired(true)
    )
    .addStringOption((o) => o.setName('title').setDescription('Embed title'))
    .addStringOption((o) =>
      o.setName('color').setDescription('Hex color, e.g. #FF0000')
    )
    .addStringOption((o) => o.setName('footer').setDescription('Footer text'))
    .addStringOption((o) => o.setName('thumbnail').setDescription('Thumbnail image URL'))
    .addStringOption((o) => o.setName('image').setDescription('Main image URL'))
    .addStringOption((o) => o.setName('author').setDescription('Author name'))
    .addStringOption((o) => o.setName('field1').setDescription('Field: "name | value"'))
    .addStringOption((o) => o.setName('field2').setDescription('Field: "name | value"'))
    .addStringOption((o) => o.setName('field3').setDescription('Field: "name | value"'))
    .addStringOption((o) => o.setName('field4').setDescription('Field: "name | value"'))
    .addBooleanOption((o) =>
      o.setName('send_to_channel').setDescription('Post publicly in the channel (default: only you see preview)')
    );

  constructor() {
    super({
      name: 'embed',
      description: 'Build and send a custom embed.',
      category: 'Utility',
      userPermissions: ['ManageMessages'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description', true);
    const colorRaw = interaction.options.getString('color');
    const footer = interaction.options.getString('footer');
    const thumbnail = interaction.options.getString('thumbnail');
    const image = interaction.options.getString('image');
    const author = interaction.options.getString('author');
    const sendToChannel = interaction.options.getBoolean('send_to_channel') ?? false;

    const color = colorRaw ? parseColor(colorRaw) : undefined;

    const e = embed({ title: title ?? undefined, description, color: color ?? undefined });

    if (footer) e.setFooter({ text: footer });
    if (thumbnail) e.setThumbnail(thumbnail);
    if (image) e.setImage(image);
    if (author) e.setAuthor({ name: author });

    const fields: { name: string; value: string; inline: boolean }[] = [];
    for (let i = 1; i <= 4; i++) {
      const raw = interaction.options.getString(`field${i}`);
      if (!raw) continue;
      const [name, ...rest] = raw.split('|').map((s) => s.trim());
      if (name && rest.length > 0) {
        fields.push({ name, value: rest.join('|').trim(), inline: true });
      }
    }
    if (fields.length) e.addFields(fields);

    if (sendToChannel) {
      await interaction.reply({ content: 'Embed sent!', ephemeral: true });
      if (interaction.channel && interaction.channel.isSendable()) {
        await interaction.channel.send({ embeds: [e] });
      }
    } else {
      await interaction.reply({ embeds: [e], ephemeral: true });
    }
  }
}
