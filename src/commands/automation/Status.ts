import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { embed, errorEmbed, successEmbed, warningEmbed } from '../../utils/embed';
import {
  getStatus,
  getStatusHistory,
  setStatus,
  setStatusChannel,
  STATUS_META,
  STATUS_KEYS,
  type StatusKey,
} from '../../automation/StatusService';

const statusChoices = STATUS_KEYS.map((s) => ({ name: s, value: s }));

export default class StatusCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('status')
    .setDescription('Group-wide status and update tracker.')
    .addSubcommand((s) =>
      s
        .setName('set')
        .setDescription('Update the system status and post an announcement')
        .addStringOption((o) =>
          o
            .setName('status')
            .setDescription('New status')
            .setRequired(true)
            .setChoices(statusChoices)
        )
        .addStringOption((o) =>
          o.setName('message').setDescription('Update message').setMaxLength(1024)
        )
        .addChannelOption((o) =>
          o.setName('channel').setDescription('Channel to announce in (default: current / configured)')
        )
        .addRoleOption((o) =>
          o.setName('notify_role').setDescription('Role to ping (e.g. a @Ping Status role)')
        )
    )
    .addSubcommand((s) =>
      s
        .setName('channel')
        .setDescription('Set the default channel for status announcements')
        .addChannelOption((o) => o.setName('channel').setDescription('Channel').setRequired(true))
    )
    .addSubcommand((s) => s.setName('current').setDescription('Show the current system status'))
    .addSubcommand((s) => s.setName('history').setDescription('Show recent status updates'));

  constructor() {
    super({
      name: 'status',
      description: 'Group-wide status and update tracker.',
      category: 'Automation',
      aliases: ['status', 'statustracker'],
      userPermissions: ['ManageGuild'],
      botPermissions: ['ManageGuild'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const status = interaction.options.getString('status', true) as StatusKey;
      const message = interaction.options.getString('message');
      const notifyRole = interaction.options.getRole('notify_role');
      const channel = interaction.options.getChannel('channel') ?? interaction.channel;

      if (!channel || !('send' in channel)) {
        await interaction.reply({
          embeds: [errorEmbed('I cannot post announcements to that channel.')],
          ephemeral: true,
        });
        return;
      }

      const meta = STATUS_META[status];
      const description =
        message ?? `The service is now **${status}**. Thank you for your patience.`;

      const e = embed({
        title: 'System Status Update',
        description,
        color: meta.color,
        footer: `Updated by: ${interaction.user.tag}`,
      })
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields({ name: 'Status', value: `${meta.badge} **${status}**`, inline: false });

      setStatus(
        guild.id,
        {
          status,
          message: message ?? '',
          channelId: channel.id,
          roleId: notifyRole?.id,
        },
        interaction.user.tag
      );

      const content = notifyRole ? `<@&${notifyRole.id}>` : undefined;
      await channel.send({
        content,
        embeds: [e],
        allowedMentions: { parse: ['roles'] },
      });

      await interaction.reply({
        embeds: [successEmbed(`System status set to **${status}**.\nAnnounced in <#${channel.id}>.`)],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel', true);
      setStatusChannel(guild.id, channel.id);
      await interaction.reply({
        embeds: [successEmbed(`Status announcements will now use <#${channel.id}>.`)],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'current') {
      const cfg = getStatus(guild.id);
      if (!cfg) {
        await interaction.reply({
          embeds: [warningEmbed('No status has been set yet. Use `/status set`.')],
          ephemeral: true,
        });
        return;
      }
      const meta = STATUS_META[cfg.status];
      const e = embed({
        title: 'System Status',
        description: cfg.message || 'No message provided.',
        color: meta.color,
        footer: `Updated by: ${cfg.updatedByTag}`,
        timestamp: true,
      })
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields({ name: 'Status', value: `${meta.badge} **${cfg.status}**`, inline: false });
      await interaction.reply({ embeds: [e] });
      return;
    }

    if (sub === 'history') {
      const history = getStatusHistory(guild.id);
      if (history.length === 0) {
        await interaction.reply({
          embeds: [warningEmbed('No status updates recorded yet.')],
          ephemeral: true,
        });
        return;
      }
      const e = embed({
        title: 'Status Update History',
        description: `**${history.length}** recorded update(s).`,
        timestamp: false,
      });
      for (const entry of history.slice(0, 10)) {
        const meta = STATUS_META[entry.status];
        e.addFields({
          name: `${meta.badge} ${entry.status} — ${new Date(entry.updatedAt).toLocaleString()}`,
          value: entry.message || 'No message provided.',
          inline: false,
        });
      }
      await interaction.reply({ embeds: [e] });
    }
  }
}
