import { Command } from '../../structures/Command';
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
} from 'discord.js';
import { embed, errorEmbed, successEmbed, warningEmbed, EMBED_COLORS } from '../../utils/embed';
import { store } from '../../utils/store';
import {
  getPanels,
  getPanel,
  savePanel,
  deletePanel,
  emojiKeyFromString,
  reactionKeyFromEmoji,
  type ReactionRolePanel,
} from '../../automation/ReactionRoleService';

export default class ReactRolesCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('reactroles')
    .setDescription('Manage reaction roles (self-assign roles by reacting).')
    .addSubcommand((s) =>
      s
        .setName('create')
        .setDescription('Create a new reaction-role panel message')
        .addStringOption((o) => o.setName('title').setDescription('Panel title').setMaxLength(256))
        .addStringOption((o) =>
          o.setName('description').setDescription('Panel description').setMaxLength(1024)
        )
        .addChannelOption((o) =>
          o.setName('channel').setDescription('Channel to post the panel in (default: current)')
        )
    )
    .addSubcommand((s) =>
      s
        .setName('add')
        .setDescription('Add an emoji → role pair to a panel')
        .addStringOption((o) =>
          o.setName('message_id').setDescription('Message ID of the panel').setRequired(true)
        )
        .addStringOption((o) => o.setName('emoji').setDescription('Emoji to react with').setRequired(true))
        .addRoleOption((o) => o.setName('role').setDescription('Role to assign').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('remove')
        .setDescription('Remove an emoji → role pair from a panel')
        .addStringOption((o) =>
          o.setName('message_id').setDescription('Message ID of the panel').setRequired(true)
        )
        .addStringOption((o) => o.setName('emoji').setDescription('Emoji to remove').setRequired(true))
    )
    .addSubcommand((s) => s.setName('list').setDescription('List all reaction-role panels'))
    .addSubcommand((s) =>
      s
        .setName('delete')
        .setDescription('Delete a reaction-role panel')
        .addStringOption((o) =>
          o.setName('message_id').setDescription('Message ID of the panel').setRequired(true)
        )
    )
    .addSubcommand((s) => s.setName('clear').setDescription('Remove all panels in this server'));

  constructor() {
    super({
      name: 'reactroles',
      description: 'Manage reaction roles (self-assign roles by reacting).',
      category: 'Automation',
      aliases: ['reactionrole', 'rr', 'autoroles'],
      userPermissions: ['ManageRoles'],
      botPermissions: ['ManageRoles'],
    });
  }

  private buildPanelEmbed(panel: ReactionRolePanel) {
    const lines = panel.roles.map((r) => `${r.emoji} <@&${r.roleId}>`);
    return embed({
      title: panel.title ?? 'Reaction Roles',
      description:
        panel.description ??
        'React to this message to get or remove the following roles:',
      color: EMBED_COLORS.primary,
      fields: lines.length
        ? [{ name: 'Roles', value: lines.map((l) => `- ${l}`).join('\n'), inline: false }]
        : [],
      footer: 'React to toggle a role · React again to remove it.',
      timestamp: false,
    });
  }

  private async getPanelMessage(
    interaction: ChatInputCommandInteraction,
    panel: ReactionRolePanel,
    messageId: string
  ): Promise<Message | null> {
    const guild = interaction.guild!;
    const channel = await guild.channels.fetch(panel.channelId).catch(() => null);
    if (!channel || !('messages' in channel)) return null;
    try {
      return await channel.messages.fetch(messageId);
    } catch {
      return null;
    }
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const channel = interaction.options.getChannel('channel') ?? interaction.channel;

      if (!channel || !('send' in channel)) {
        await interaction.reply({
          embeds: [errorEmbed('I cannot send messages to that channel.')],
          ephemeral: true,
        });
        return;
      }

      const panel: ReactionRolePanel = {
        channelId: channel.id,
        title: title ?? undefined,
        description: description ?? undefined,
        roles: [],
      };
      const msg = await channel.send({ embeds: [this.buildPanelEmbed(panel)] });
      savePanel(guild.id, msg.id, panel);

      await interaction.reply({
        embeds: [
          successEmbed(
            `Reaction-role panel created.\nMessage ID: \`${msg.id}\`\nUse \`/reactroles add message_id:${msg.id} emoji:<emoji> role:<role>\` to attach roles.`
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'add') {
      const messageId = interaction.options.getString('message_id', true);
      const emoji = interaction.options.getString('emoji', true);
      const role = interaction.options.getRole('role', true);

      if (role.id === guild.id) {
        await interaction.reply({
          embeds: [errorEmbed('You cannot use the @everyone role.')],
          ephemeral: true,
        });
        return;
      }

      const panel = getPanel(guild.id, messageId);
      if (!panel) {
        await interaction.reply({
          embeds: [errorEmbed('No panel found with that message ID.')],
          ephemeral: true,
        });
        return;
      }

      const existing = panel.roles.find(
        (r) => emojiKeyFromString(r.emoji) === emojiKeyFromString(emoji)
      );
      if (existing) {
        await interaction.reply({
          embeds: [warningEmbed('That emoji is already mapped to a role on this panel.')],
          ephemeral: true,
        });
        return;
      }

      panel.roles.push({ emoji, roleId: role.id });
      savePanel(guild.id, messageId, panel);

      const msg = await this.getPanelMessage(interaction, panel, messageId);
      try {
        if (msg) {
          await msg.react(emoji);
          await msg.edit({ embeds: [this.buildPanelEmbed(panel)] });
        }
      } catch {
        await interaction.reply({
          embeds: [
            errorEmbed('Could not add the reaction (check the emoji is valid and shared with the bot).'),
          ],
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        embeds: [successEmbed(`Added ${emoji} → <@&${role.id}>.`)],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'remove') {
      const messageId = interaction.options.getString('message_id', true);
      const emoji = interaction.options.getString('emoji', true);

      const panel = getPanel(guild.id, messageId);
      if (!panel) {
        await interaction.reply({
          embeds: [errorEmbed('No panel found with that message ID.')],
          ephemeral: true,
        });
        return;
      }

      const index = panel.roles.findIndex(
        (r) => emojiKeyFromString(r.emoji) === emojiKeyFromString(emoji)
      );
      if (index === -1) {
        await interaction.reply({
          embeds: [errorEmbed('That emoji is not mapped on this panel.')],
          ephemeral: true,
        });
        return;
      }

      panel.roles.splice(index, 1);
      savePanel(guild.id, messageId, panel);

      const msg = await this.getPanelMessage(interaction, panel, messageId);
      if (msg) {
        const reaction = msg.reactions.cache.find(
          (r) => emojiKeyFromString(emoji) === reactionKeyFromEmoji(r.emoji)
        );
        if (reaction) await reaction.remove().catch(() => null);
        await msg.edit({ embeds: [this.buildPanelEmbed(panel)] });
      }

      await interaction.reply({
        embeds: [successEmbed(`Removed ${emoji} from the panel.`)],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'list') {
      const panels = getPanels(guild.id);
      const entries = Object.entries(panels);
      if (entries.length === 0) {
        await interaction.reply({
          embeds: [warningEmbed('No reaction-role panels in this server.')],
          ephemeral: true,
        });
        return;
      }

      const e = embed({
        title: 'Reaction Roles',
        description: `**${entries.length}** panel(s) in this server.`,
        color: EMBED_COLORS.info,
        timestamp: false,
      });
      for (const [messageId, panel] of entries) {
        const roles = panel.roles.map((r) => `${r.emoji} <@&${r.roleId}>`).join(' ') || '*none*';
        e.addFields({ name: `${panel.title ?? 'Panel'} (\`${messageId}\`)`, value: roles, inline: false });
      }
      await interaction.reply({ embeds: [e], ephemeral: true });
      return;
    }

    if (sub === 'delete') {
      const messageId = interaction.options.getString('message_id', true);
      const panel = getPanel(guild.id, messageId);
      if (!panel) {
        await interaction.reply({
          embeds: [errorEmbed('No panel found with that message ID.')],
          ephemeral: true,
        });
        return;
      }

      const msg = await this.getPanelMessage(interaction, panel, messageId);
      if (msg) {
        for (const reaction of msg.reactions.cache.values()) {
          await reaction.remove().catch(() => null);
        }
      }
      deletePanel(guild.id, messageId);
      await interaction.reply({
        embeds: [successEmbed('Panel deleted and reactions cleared.')],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'clear') {
      const panels = getPanels(guild.id);
      for (const [messageId, panel] of Object.entries(panels)) {
        const msg = await this.getPanelMessage(interaction, panel, messageId);
        if (msg) {
          for (const reaction of msg.reactions.cache.values()) {
            await reaction.remove().catch(() => null);
          }
        }
      }
      store.set('reactroles', guild.id, {});
      await interaction.reply({
        embeds: [successEmbed('All reaction-role panels cleared.')],
        ephemeral: true,
      });
    }
  }
}
