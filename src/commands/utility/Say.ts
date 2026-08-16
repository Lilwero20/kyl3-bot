import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';

export default class SayCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot say something.')
    .addStringOption((o) =>
      o.setName('text').setDescription('Text to say').setRequired(true).setMaxLength(2000)
    )
    .addBooleanOption((o) =>
      o.setName('silent').setDescription('Send without the "Sent by" footer').setRequired(false)
    );

  constructor() {
    super({
      name: 'say',
      description: 'Make the bot say something.',
      category: 'Utility',
      aliases: ['echo'],
      userPermissions: ['ManageMessages'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const text = interaction.options.getString('text', true);
    await interaction.reply({ content: 'Sent!', ephemeral: true });
    if (interaction.channel && interaction.channel.isSendable()) {
      await interaction.channel.send(text);
    }
  }

  public async runLegacy(message: Message, args: string[]): Promise<void> {
    const text = args.join(' ');
    if (!text) return;
    if (message.channel.isSendable()) {
      await message.channel.send(text);
    }
    try {
      await message.delete();
    } catch {
      /* noop */
    }
  }
}
