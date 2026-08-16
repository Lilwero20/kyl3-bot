import { Command } from '../../structures/Command';
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
} from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embed';

export default class ClearCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk delete messages in the current channel.')
    .addIntegerOption((o) =>
      o.setName('amount').setDescription('Number of messages (1-100)').setRequired(true)
    )
    .addUserOption((o) => o.setName('user').setDescription('Only delete messages from this user'))
    .addChannelOption((o) => o.setName('channel').setDescription('Channel to clear'));

  constructor() {
    super({
      name: 'clear',
      description: 'Bulk delete messages in the current channel.',
      category: 'Moderation',
      aliases: ['purge', 'prune'],
      userPermissions: ['ManageMessages'],
      botPermissions: ['ManageMessages', 'ReadMessageHistory'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const amount = interaction.options.getInteger('amount', true);
    const user = interaction.options.getUser('user');
    const targetChannelId = interaction.options.getChannel('channel')?.id ?? interaction.channelId;
    const channel = interaction.guild?.channels.cache.get(targetChannelId);

    if (amount < 1 || amount > 100) {
      await interaction.reply({ embeds: [errorEmbed('Amount must be between 1 and 100.')], ephemeral: true });
      return;
    }

    if (!channel || !('bulkDelete' in channel)) {
      await interaction.reply({ embeds: [errorEmbed('That channel does not support bulk delete.')], ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    let fetched;
    if (user) {
      let deleted = 0;
      let cursor: string | undefined;
      while (deleted < amount) {
        fetched = await channel.messages.fetch({ limit: 100, before: cursor });
        if (fetched.size === 0) break;
        const targets = fetched
          .filter((m) => m.author.id === user.id)
          .first(amount - deleted);
        if (targets.length === 0) break;
        const ids = targets.map((m) => m.id);
        await channel.bulkDelete(ids);
        deleted += ids.length;
        cursor = fetched.last()?.id;
      }
      await interaction.editReply({
        embeds: [successEmbed(`Deleted **${deleted}** messages from **${user.tag}**.`)],
      });
    } else {
      fetched = await channel.messages.fetch({ limit: Math.min(amount + 1, 100) });
      const targets = fetched.filter((m) => Date.now() - m.createdTimestamp < 14 * 86400_000);
      const bulk = targets.first(amount);
      if (bulk.length === 0) {
        await interaction.editReply({ embeds: [errorEmbed('No deletable messages found (max age 14 days).')] });
        return;
      }
      await channel.bulkDelete(bulk);
      await interaction.editReply({
        embeds: [successEmbed(`Deleted **${bulk.length}** messages.`)],
      });
    }
  }

  public async runLegacy(message: Message, args: string[]): Promise<void> {
    const amount = Number(args[0]);
    if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
      if (message.channel.isSendable()) {
        await message.channel.send('Usage: `!clear <1-100>`');
      }
      return;
    }
    if (!message.channel.isSendable()) return;
    const fetched = await message.channel.messages.fetch({ limit: Math.min(amount + 1, 100) });
    const targets = fetched.filter((m) => Date.now() - m.createdTimestamp < 14 * 86400_000);
    await (message.channel as import('discord.js').TextChannel).bulkDelete(targets.first(amount));
  }
}
