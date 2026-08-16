import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { embed, EMBED_COLORS } from '../../utils/embed';
import type { CommandCategory } from '../../structures/Command';
import type { Kyl3Client } from '../../structures/Kyl3Client';

export default class HelpCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands.')
    .addStringOption((o) =>
      o.setName('category')
        .setDescription('Filter by category')
        .setChoices(
          { name: 'Utility', value: 'Utility' },
          { name: 'Moderation', value: 'Moderation' },
          { name: 'AutoMod', value: 'AutoMod' },
          { name: 'Automation', value: 'Automation' },
          { name: 'Owner', value: 'Owner' }
        )
    );

  constructor() {
    super({
      name: 'help',
      description: 'List all commands.',
      category: 'Utility',
      aliases: ['commands', 'h', 'cmds'],
    });
  }

  private buildEmbed(interaction: ChatInputCommandInteraction, category?: string) {
    const all = [...(interaction.client as Kyl3Client).commands.commands.values()];

    const categories: CommandCategory[] = ['Utility', 'Moderation', 'AutoMod', 'Automation', 'Owner'];

    const e = embed({
      title: 'Help',
      description: `Bot prefix: \`${process.env.PREFIX ?? '!'}\`\nCommands: **${all.length}**`,
      color: EMBED_COLORS.primary,
      timestamp: false,
    });

    if (category) {
      const cmds = all.filter((c) => c.options.category === category);
      e.addFields({
        name: `**${category}** (${cmds.length})`,
        value: cmds
          .map((c) => `\`/${c.options.name}\` — ${c.options.description}`)
          .join('\n') || 'No commands.',
      });
    } else {
      for (const cat of categories) {
        const cmds = all.filter((c) => c.options.category === cat);
        if (cmds.length === 0) continue;
        e.addFields({
          name: `**${cat}** (${cmds.length})`,
          value: cmds.map((c) => `\`/${c.options.name}\``).join(' · '),
          inline: false,
        });
      }
    }
    return e;
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const category = interaction.options.getString('category') ?? undefined;
    const e = this.buildEmbed(interaction, category);
    await interaction.reply({ embeds: [e] });
  }

  public async runLegacy(message: Message, args: string[]): Promise<void> {
    const e = this.buildEmbed(message as unknown as ChatInputCommandInteraction, args[0]);
    if (message.channel.isSendable()) {
      await message.channel.send({ embeds: [e] });
    }
  }
}
