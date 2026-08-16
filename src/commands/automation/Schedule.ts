import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, successEmbed, warningEmbed, embed } from '../../utils/embed';
import { store } from '../../utils/store';
import type { ScheduledMessage } from '../../automation/SchedulerService';

export default class ScheduleCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Create and manage scheduled announcements.')
    .addSubcommand((s) =>
      s.setName('create').setDescription('Create a scheduled announcement')
        .addChannelOption((o) => o.setName('channel').setDescription('Target channel').setRequired(true))
        .addStringOption((o) => o.setName('message').setDescription('Announcement text').setRequired(true))
        .addIntegerOption((o) => o.setName('interval').setDescription('Repeat every N minutes').setRequired(true))
    )
    .addSubcommand((s) => s.setName('list').setDescription('List scheduled announcements'))
    .addSubcommand((s) =>
      s.setName('remove').setDescription('Remove a scheduled announcement')
        .addStringOption((o) => o.setName('id').setDescription('Announcement ID').setRequired(true))
    );

  constructor() {
    super({
      name: 'schedule',
      description: 'Create and manage scheduled announcements.',
      category: 'Automation',
      aliases: ['schedannounce', 'announce'],
      userPermissions: ['ManageMessages'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId!;
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const channel = interaction.options.getChannel('channel', true);
      const message = interaction.options.getString('message', true);
      const interval = interaction.options.getInteger('interval', true);

      if (interval < 1 || interval > 100_000) {
        await interaction.reply({ embeds: [errorEmbed('Interval must be between 1 and 100000 minutes.')], ephemeral: true });
        return;
      }

      const s: ScheduledMessage = {
        id: `${Date.now()}`,
        guildId,
        channelId: channel.id,
        content: message,
        intervalMinutes: interval,
        lastRunAt: 0,
        nextRunAt: Date.now() + interval * 60_000,
        enabled: true,
      };

      const all = store.get<Record<string, ScheduledMessage>>('scheduled', 'all') ?? {};
      all[s.id] = s;
      store.set('scheduled', 'all', all);

      await interaction.reply({
        embeds: [successEmbed(`Scheduled announcement **${s.id}** created in <#${channel.id}>, repeating every **${interval} minutes**.`)],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'list') {
      const all = store.get<Record<string, ScheduledMessage>>('scheduled', 'all') ?? {};
      const mine = Object.values(all).filter((s) => s.guildId === guildId);
      if (mine.length === 0) {
        await interaction.reply({ embeds: [warningEmbed('No scheduled announcements in this server.')], ephemeral: true });
        return;
      }
      const e = embed({
        title: 'Scheduled announcements',
        description: mine
          .map(
            (s) =>
              `**${s.id}** — every ${s.intervalMinutes} min in <#${s.channelId}>\n> ${s.content.slice(0, 80)}`
          )
          .join('\n\n'),
      });
      await interaction.reply({ embeds: [e], ephemeral: true });
      return;
    }

    if (sub === 'remove') {
      const id = interaction.options.getString('id', true);
      const all = store.get<Record<string, ScheduledMessage>>('scheduled', 'all') ?? {};
      const s = all[id];
      if (!s || s.guildId !== guildId) {
        await interaction.reply({ embeds: [errorEmbed('No scheduled announcement with that ID.')], ephemeral: true });
        return;
      }
      delete all[id];
      store.set('scheduled', 'all', all);
      await interaction.reply({ embeds: [successEmbed(`Removed scheduled announcement **${id}**.`)], ephemeral: true });
    }
  }
}
