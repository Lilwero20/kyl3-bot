import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { embed, EMBED_COLORS } from '../../utils/embed';

export default class EmojisCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('emojis')
    .setDescription('List the emojis in this server.');

  constructor() {
    super({
      name: 'emojis',
      description: 'List the emojis in this server.',
      category: 'Utility',
      aliases: ['serveremoji', 'emoji'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const emojis = [...interaction.guild!.emojis.cache.values()];
    if (emojis.length === 0) {
      await interaction.reply({
        embeds: [embed({ title: 'Emojis', description: 'No emojis in this server.', color: EMBED_COLORS.info })],
      });
      return;
    }

    const animated = emojis.filter((e) => e.animated);
    const e = embed({
      title: 'Emojis',
      description: `**${emojis.length}** emoji(s) — ${animated.length} animated.`,
      color: EMBED_COLORS.primary,
      timestamp: false,
    });

    for (let i = 0; i < emojis.length; i += 40) {
      const chunk = emojis.slice(i, i + 40);
      e.addFields({ name: `Emojis (${i + 1}-${i + chunk.length})`, value: chunk.map((x) => x.toString()).join(' '), inline: false });
    }

    await interaction.reply({ embeds: [e] });
  }

  public async runLegacy(message: Message): Promise<void> {
    if (!message.channel.isSendable()) return;
    const emojis = [...(message.guild?.emojis.cache.values() ?? [])];
    if (emojis.length === 0) return;
    const e = embed({ title: 'Emojis', description: emojis.map((x) => x.toString()).join(' '), color: EMBED_COLORS.primary, timestamp: false });
    await message.channel.send({ embeds: [e] });
  }
}
