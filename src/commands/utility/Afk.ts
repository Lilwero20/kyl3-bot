import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { store } from '../../utils/store';
import { successEmbed } from '../../utils/embed';

interface AfkData {
  message: string;
  since: number;
}

export default class AfkCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set an away-from-keyboard status.')
    .addStringOption((o) =>
      o.setName('reason').setDescription('Why you are AFK')
    );

  constructor() {
    super({
      name: 'afk',
      description: 'Set an away-from-keyboard status.',
      category: 'Utility',
      aliases: ['away'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const guildId = interaction.guildId!;

    const data: AfkData = { message: reason, since: Date.now() };
    store.set('afk', interaction.user.id, { ...data, guildId });

    await interaction.reply({
      embeds: [
        successEmbed(`You are now AFK: **${reason}**`),
      ],
      ephemeral: true,
    });
  }

  public async runLegacy(message: Message, args: string[]): Promise<void> {
    const reason = args.join(' ') || 'No reason provided';
    if (!message.guild) return;
    store.set('afk', message.author.id, { message: reason, since: Date.now(), guildId: message.guild.id });
    if (message.channel.isSendable()) {
      await message.channel.send(`<@${message.author.id}> is now AFK: **${reason}**`);
    }
  }
}
