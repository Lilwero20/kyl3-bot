import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { embed, EMBED_COLORS } from '../../utils/embed';
import { discordTimestamp } from '../../utils/time';

export default class ServerInfoCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Show information about this server.');

  constructor() {
    super({
      name: 'serverinfo',
      description: 'Show information about this server.',
      category: 'Utility',
      aliases: ['guildinfo', 'si'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;
    const owner = await guild.fetchOwner();

    const channels = guild.channels.cache;
    const textChannels = channels.filter((c) => c.isTextBased()).size;
    const voiceChannels = channels.filter((c) => c.isVoiceBased()).size;
    const categories = channels.filter((c) => c.type === 4).size;

    const members = guild.members.cache;
    const online = members.filter((m) => m.presence?.status && m.presence.status !== 'offline').size;
    const bots = members.filter((m) => m.user.bot).size;

    const boosts = guild.premiumSubscriptionCount ?? 0;

    const e = embed({
      title: guild.name,
      color: EMBED_COLORS.primary,
      description: `\`${guild.id}\``,
      fields: [
        { name: 'Owner', value: owner.user.tag, inline: true },
        { name: 'Created', value: discordTimestamp(Math.floor(guild.createdTimestamp / 1000)), inline: true },
        { name: 'Members', value: `${members.size} total · ${online} online · ${bots} bots`, inline: false },
        { name: 'Channels', value: `${textChannels} text · ${voiceChannels} voice · ${categories} categories`, inline: true },
        { name: 'Boost level', value: `Level ${guild.premiumTier} · ${boosts} boosts`, inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Emojis', value: `${guild.emojis.cache.size}`, inline: true },
        { name: 'Verification level', value: `${guild.verificationLevel}`, inline: true },
      ],
      footer: `Requested by ${interaction.user.tag}`,
    });
    if (guild.iconURL()) e.setThumbnail(guild.iconURL()!);

    await interaction.reply({ embeds: [e] });
  }

  public async runLegacy(message: Message): Promise<void> {
    const guild = message.guild!;
    const owner = await guild.fetchOwner();
    const e = embed({
      title: guild.name,
      color: EMBED_COLORS.primary,
      description: `\`${guild.id}\``,
      fields: [
        { name: 'Owner', value: owner.user.tag, inline: true },
        { name: 'Members', value: `${guild.memberCount}`, inline: true },
        { name: 'Boost level', value: `Level ${guild.premiumTier} · ${guild.premiumSubscriptionCount} boosts`, inline: true },
      ],
    });
    if (guild.iconURL()) e.setThumbnail(guild.iconURL()!);
    if (message.channel.isSendable()) {
      await message.channel.send({ embeds: [e] });
    }
  }
}
