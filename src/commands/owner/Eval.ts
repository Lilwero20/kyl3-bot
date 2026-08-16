import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed } from '../../utils/embed';
import { config } from '../../config';

export default class EvalCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('eval')
    .setDescription('Evaluate arbitrary JavaScript (owner only).')
    .addStringOption((o) => o.setName('code').setDescription('Code to evaluate').setRequired(true));

  constructor() {
    super({
      name: 'eval',
      description: 'Evaluate arbitrary JavaScript (owner only).',
      category: 'Owner',
    });
  }

  private isOwner(userId: string): boolean {
    return config.ownerIds.length === 0 || config.ownerIds.includes(userId);
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!this.isOwner(interaction.user.id)) {
      await interaction.reply({ embeds: [errorEmbed('Only bot owners may use this command.')], ephemeral: true });
      return;
    }

    const code = interaction.options.getString('code', true);
    await interaction.deferReply({ ephemeral: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const context: Record<string, any> = {
      client: interaction.client,
      interaction,
      message: interaction,
      guild: interaction.guild,
      channel: interaction.channel,
    };
    const keys = Object.keys(context);

    try {
      // eslint-disable-next-line no-new-func
      const result = await new Function(...keys, `return (async () => { ${code} })()`)(...Object.values(context));
      const output =
        typeof result === 'string' ? result : (result && typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
      await interaction.editReply({
        embeds: [{
          title: 'Eval result',
          description: `\`\`\`js\n${output.slice(0, 3800)}\n\`\`\``,
          color: 0x2ecc71,
        }],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.stack ?? err.message : String(err);
      await interaction.editReply({
        embeds: [{
          title: 'Eval error',
          description: `\`\`\`js\n${msg.slice(0, 3800)}\n\`\`\``,
          color: 0xe74c3c,
        }],
      });
    }
  }
}
