import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { embed, EMBED_COLORS } from '../../utils/embed';

export default class PingCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot latency.');

  constructor() {
    super({
      name: 'ping',
      description: 'Check the bot latency.',
      category: 'Utility',
      aliases: ['latency', 'pong'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sent = Date.now();
    await interaction.reply({ content: 'Pinging...' });
    const roundtrip = Date.now() - sent;
    const ws = interaction.client.ws.ping;
    const e = embed({
      title: 'Pong!',
      fields: [
        { name: 'WebSocket', value: `\`${Math.round(ws)}ms\``, inline: true },
        { name: 'Roundtrip', value: `\`${roundtrip}ms\``, inline: true },
      ],
      color: EMBED_COLORS.success,
    });
    await interaction.editReply({ content: null, embeds: [e] });
  }

  public async runLegacy(message: Message): Promise<void> {
    const sent = Date.now();
    if (!message.channel.isSendable()) return;
    const msg = await message.channel.send('Pinging...');
    const roundtrip = Date.now() - sent;
    const ws = message.client.ws.ping;
    await msg.edit(
      `Pong! \`${Math.round(ws)}ms\` ws / \`${roundtrip}ms\` roundtrip`
    );
  }
}
