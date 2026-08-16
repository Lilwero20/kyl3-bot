import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { embed, EMBED_COLORS } from '../../utils/embed';
import { formatDuration } from '../../utils/time';
import type { Kyl3Client } from '../../structures/Kyl3Client';

export default class BotInfoCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Show information about the bot.');

  constructor() {
    super({
      name: 'botinfo',
      description: 'Show information about the bot.',
      category: 'Utility',
      aliases: ['about', 'info'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const client = interaction.client;
    const guilds = client.guilds.cache.size;
    const users = client.users.cache.size;
    const commands = (client as Kyl3Client).commands.commands.size;

    const e = embed({
      title: `${client.user?.username}`,
      color: EMBED_COLORS.primary,
      description: 'A full-featured Discord bot with utility commands, moderation, auto-mod and automations.',
      fields: [
        { name: 'Servers', value: `\`${guilds}\``, inline: true },
        { name: 'Cached users', value: `\`${users}\``, inline: true },
        { name: 'Commands', value: `\`${commands}\``, inline: true },
        { name: 'Uptime', value: `\`${formatDuration(client.uptime ?? 0)}\``, inline: true },
        { name: 'Ping', value: `\`${Math.round(client.ws.ping)}ms\``, inline: true },
        { name: 'Version', value: `\`1.0.0\``, inline: true },
      ],
      footer: `Node ${process.version} · discord.js 14`,
    }).setThumbnail(client.user?.displayAvatarURL() ?? null);

    await interaction.reply({ embeds: [e] });
  }

  public async runLegacy(message: Message): Promise<void> {
    const client = message.client;
    if (message.channel.isSendable()) {
      await message.channel.send(
        `🤖 **${client.user?.username}** — ${client.guilds.cache.size} servers · ${formatDuration(client.uptime ?? 0)} uptime`
      );
    }
  }
}
