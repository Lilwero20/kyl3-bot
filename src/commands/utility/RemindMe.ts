import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { store, key } from '../../utils/store';
import { parseDuration, formatDuration } from '../../utils/time';
import { successEmbed, errorEmbed } from '../../utils/embed';

export interface Reminder {
  id: string;
  userId: string;
  channelId: string;
  text: string;
  createdAt: number;
  dueAt: number;
}

export default class RemindMeCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('remindme')
    .setDescription('Set a reminder.')
    .addStringOption((o) =>
      o.setName('time').setDescription('Time, e.g. "10m", "1h 30m", "2d"').setRequired(true)
    )
    .addStringOption((o) =>
      o.setName('text').setDescription('What to remind you about').setRequired(true)
    );

  constructor() {
    super({
      name: 'remindme',
      description: 'Set a reminder.',
      category: 'Utility',
      aliases: ['remind', 'timer'],
      cooldown: 10,
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const rawTime = interaction.options.getString('time', true);
    const text = interaction.options.getString('text', true);
    const ms = parseDuration(rawTime);

    if (!ms || ms < 1000 || ms > 30 * 86400_000) {
      await interaction.reply({
        embeds: [errorEmbed('Invalid time. Use formats like `10m`, `1h 30m`, `2d`. Max 30 days.')],
        ephemeral: true,
      });
      return;
    }

    const id = `${Date.now()}-${interaction.user.id}`;
    const reminder: Reminder = {
      id,
      userId: interaction.user.id,
      channelId: interaction.channelId,
      text,
      createdAt: Date.now(),
      dueAt: Date.now() + ms,
    };

    const all = store.get<Record<string, Reminder>>('reminders', 'all') ?? {};
    all[id] = reminder;
    store.set('reminders', 'all', all);

    await interaction.reply({
      embeds: [
        successEmbed(`I will remind you in **${formatDuration(ms)}**.\n> ${text}`),
      ],
      ephemeral: true,
    });
  }
}
