import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { store } from '../../utils/store';
import { embed } from '../../utils/embed';

interface SnipeEntry {
  content: string;
  authorId: string;
  authorTag: string;
  avatar: string;
  deletedAt: number;
}

export default class SnipeCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('Show the most recently deleted message in this channel.');

  constructor() {
    super({
      name: 'snipe',
      description: 'Show the most recently deleted message in this channel.',
      category: 'Utility',
      aliases: ['sn'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const entry = store.get<SnipeEntry>('snipe', interaction.channelId);
    if (!entry) {
      await interaction.reply({ content: 'Nothing to snipe here.', ephemeral: true });
      return;
    }

    const e = embed({
      title: 'Deleted message',
      description: entry.content || '(no text)',
      color: interaction.guild?.members.cache.get(entry.authorId)?.displayColor ?? undefined,
      footer: `Deleted <t:${Math.floor(entry.deletedAt / 1000)}:R>`,
    })
      .setAuthor({ name: entry.authorTag, iconURL: entry.avatar });

    await interaction.reply({ embeds: [e] });
  }

  public async runLegacy(message: Message): Promise<void> {
    const entry = store.get<SnipeEntry>('snipe', message.channelId);
    if (!entry) {
      if (message.channel.isSendable()) {
        await message.channel.send('Nothing to snipe here.');
      }
      return;
    }
    const e = embed({
      title: 'Deleted message',
      description: entry.content || '(no text)',
      footer: `Deleted <t:${Math.floor(entry.deletedAt / 1000)}:R>`,
    }).setAuthor({ name: entry.authorTag, iconURL: entry.avatar });
    if (message.channel.isSendable()) {
      await message.channel.send({ embeds: [e] });
    }
  }
}
