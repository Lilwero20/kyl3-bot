import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embed';
import { resolveMessage } from '../../utils/messages';
import { emojiKeyFromString, reactionKeyFromEmoji } from '../../automation/ReactionRoleService';

export default class ReactCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('react')
    .setDescription('Add or remove an emoji reaction on a message.')
    .addStringOption((o) =>
      o.setName('message_id').setDescription('ID of the message to react to').setRequired(true)
    )
    .addStringOption((o) => o.setName('emoji').setDescription('Emoji to use').setRequired(true))
    .addStringOption((o) =>
      o
        .setName('action')
        .setDescription('Add or remove the reaction (default: add)')
        .setChoices(
          { name: 'Add', value: 'add' },
          { name: 'Remove', value: 'remove' }
        )
    );

  constructor() {
    super({
      name: 'react',
      description: 'Add or remove an emoji reaction on a message.',
      category: 'Utility',
      aliases: ['addreaction', 'reactemoji'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const messageId = interaction.options.getString('message_id', true);
    const emoji = interaction.options.getString('emoji', true);
    const action = interaction.options.getString('action') ?? 'add';

    const target = await resolveMessage(interaction, messageId);
    if (!target) {
      await interaction.reply({
        embeds: [errorEmbed('I could not find that message in this server (check the message ID).')],
        ephemeral: true,
      });
      return;
    }

    if (action === 'remove') {
      const reaction = target.reactions.cache.find(
        (r) => emojiKeyFromString(emoji) === reactionKeyFromEmoji(r.emoji)
      );
      if (!reaction) {
        await interaction.reply({
          embeds: [errorEmbed('That reaction is not on the message.')],
          ephemeral: true,
        });
        return;
      }
      await reaction.remove().catch(() => {
        /* ignore */
      });
      await interaction.reply({
        embeds: [successEmbed(`Removed ${emoji} from message \`${messageId}\`.`)],
        ephemeral: true,
      });
      return;
    }

    try {
      await target.react(emoji);
    } catch {
      await interaction.reply({
        embeds: [errorEmbed('Could not add the reaction (check the emoji is valid).')],
        ephemeral: true,
      });
      return;
    }
    await interaction.reply({
      embeds: [successEmbed(`Added ${emoji} to message \`${messageId}\`.`)],
      ephemeral: true,
    });
  }
}