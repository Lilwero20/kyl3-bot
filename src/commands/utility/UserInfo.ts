import { Command } from '../../structures/Command';
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
} from 'discord.js';
import { embed } from '../../utils/embed';
import { discordTimestamp } from '../../utils/time';

export default class UserInfoCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show information about a user.')
    .addUserOption((o) => o.setName('user').setDescription('User to inspect'));

  constructor() {
    super({
      name: 'userinfo',
      description: 'Show information about a user.',
      category: 'Utility',
      aliases: ['whois', 'ui'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const member = interaction.guild?.members.cache.get(target.id);

    const roles = member?.roles.cache
      .filter((r) => r.id !== interaction.guild!.id)
      .sort((a, b) => b.position - a.position)
      .map((r) => r.toString());

    const e = embed({
      title: `${target.username}`,
      color: member?.displayColor ?? undefined,
      description: `\`${target.id}\` · ${target.bot ? '🤖 Bot' : '👤 User'}`,
      fields: [
        { name: 'Account created', value: discordTimestamp(Math.floor(target.createdTimestamp / 1000)), inline: true },
        { name: 'Joined server', value: member ? discordTimestamp(Math.floor(member.joinedTimestamp ?? Date.now() / 1000)) : 'N/A', inline: true },
        { name: 'Roles', value: roles && roles.length ? roles.slice(0, 20).join(' ') : 'None', inline: false },
        { name: 'Nickname', value: member?.nickname ?? 'None', inline: true },
        { name: 'Status', value: member?.presence?.status ?? 'offline', inline: true },
      ],
      footer: `Requested by ${interaction.user.tag}`,
    }).setThumbnail(target.displayAvatarURL({ size: 256 }));

    await interaction.reply({ embeds: [e] });
  }

  public async runLegacy(message: Message, args: string[]): Promise<void> {
    const target = message.mentions.users.first() ?? message.author;
    const member = message.guild?.members.cache.get(target.id);
    const e = embed({
      title: `${target.username}`,
      color: member?.displayColor ?? undefined,
      description: `\`${target.id}\` · ${target.bot ? '🤖 Bot' : '👤 User'}`,
      fields: [
        { name: 'Account created', value: discordTimestamp(Math.floor(target.createdTimestamp / 1000)), inline: true },
        { name: 'Joined server', value: member ? discordTimestamp(Math.floor(member.joinedTimestamp ?? Date.now() / 1000)) : 'N/A', inline: true },
      ],
    }).setThumbnail(target.displayAvatarURL({ size: 256 }));
    if (message.channel.isSendable()) {
      await message.channel.send({ embeds: [e] });
    }
  }
}
