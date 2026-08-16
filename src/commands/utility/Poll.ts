import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { embed, EMBED_COLORS } from '../../utils/embed';

const EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

export default class PollCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a reaction poll.')
    .addStringOption((o) =>
      o.setName('question').setDescription('Poll question').setRequired(true)
    )
    .addStringOption((o) => o.setName('option1').setDescription('First option'))
    .addStringOption((o) => o.setName('option2').setDescription('Second option'))
    .addStringOption((o) => o.setName('option3').setDescription('Third option'))
    .addStringOption((o) => o.setName('option4').setDescription('Fourth option'))
    .addStringOption((o) => o.setName('option5').setDescription('Fifth option'))
    .addStringOption((o) => o.setName('option6').setDescription('Sixth option'));

  constructor() {
    super({
      name: 'poll',
      description: 'Create a reaction poll.',
      category: 'Utility',
      aliases: ['vote'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const question = interaction.options.getString('question', true);
    const options: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) options.push(opt);
    }

    if (options.length < 2) {
      const e = embed({
        title: '📊 Poll',
        description: question,
        color: EMBED_COLORS.primary,
        fields: [{ name: 'Replies', value: '👍 Yes / 👎 No', inline: false }],
      });
      const msg = await interaction.reply({ embeds: [e], fetchReply: true });
      await msg.react('👍');
      await msg.react('👎');
      return;
    }

    const fields = options.map((opt, i) => ({
      name: `${EMOJIS[i]} ${opt}`,
      value: '·',
      inline: true,
    }));

    const e = embed({
      title: '📊 Poll',
      description: question,
      color: EMBED_COLORS.primary,
      fields,
    });

    const msg = await interaction.reply({ embeds: [e], fetchReply: true });
    for (let i = 0; i < options.length; i++) {
      await msg.react(EMOJIS[i]);
    }
  }

  public async runLegacy(message: Message, args: string[]): Promise<void> {
    if (!message.channel.isSendable()) return;
    const sep = '|';
    const parts = args.join(' ').split(sep).map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) {
      await message.channel.send('Usage: `!poll <question> | <option1> | <option2> ...`');
      return;
    }
    const [question, ...options] = parts;
    if (options.length > 10) {
      await message.channel.send('Maximum of 10 options.');
      return;
    }
    const fields = options.map((opt, i) => ({
      name: `${EMOJIS[i]} ${opt}`,
      value: '·',
      inline: true,
    }));
    const e = embed({
      title: '📊 Poll',
      description: question,
      color: EMBED_COLORS.primary,
      fields,
    });
    const msg = await message.channel.send({ embeds: [e] });
    for (let i = 0; i < options.length; i++) {
      await msg.react(EMOJIS[i]);
    }
  }
}
