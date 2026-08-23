import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { embed, EMBED_COLORS } from '../../utils/embed';

export default class RolesCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('roles')
    .setDescription('List all roles in the server, with a member count.');

  constructor() {
    super({
      name: 'roles',
      description: 'List all roles in the server, with a member count.',
      category: 'Utility',
      aliases: ['listroles'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;
    const roles = [...guild.roles.cache.values()]
      .filter((r) => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .slice(0, 24);

    if (roles.length === 0) {
      await interaction.reply({
        embeds: [embed({ title: 'Roles', description: 'No roles found.', color: EMBED_COLORS.info })],
      });
      return;
    }

    const members = roles.reduce((acc, r) => acc + r.members.size, 0);
    const e = embed({
      title: 'Roles',
      description: `${roles.length} role(s) · ${members} total members with a role.\n(Showing top **${roles.length}**)`,
      color: EMBED_COLORS.primary,
      timestamp: false,
    });

    for (const role of roles) {
      e.addFields({
        name: `${role.name === '@everyone' ? '@everyone' : role.toString()}`,
        value: `ID: \`${role.id}\` · ${role.members.size} members`,
        inline: true,
      });
    }

    await interaction.reply({ embeds: [e] });
  }

  public async runLegacy(message: Message): Promise<void> {
    if (!message.channel.isSendable()) return;
    const guild = message.guild;
    if (!guild) return;
    const roles = [...guild.roles.cache.values()].filter((r) => r.id !== guild.id);
    const names = roles.map((r) => r.toString()).join(', ') || 'No roles.';
    const e = embed({ title: 'Roles', description: names, color: EMBED_COLORS.primary, timestamp: false });
    await message.channel.send({ embeds: [e] });
  }
}
