import { Command } from '../../structures/Command';
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embed';
import { resolveMessage } from '../../utils/messages';

export default class ReplyCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('reply')
    .setDescription('Reply to a specific message with custom text.')
    .addStringOption((o) =>
      o.setName('message_id').setDescription('ID of the message to reply to').setRequired(true)
    )
    .addStringOption((o) =>
      o.setName('text').setDescription('What the bot replies').setRequired(true).setMaxLength(2000)
    )
    .addStringOption((o) =>
      o.setName('emoji').setDescription('Emoji to add as a reaction on the reply')
    )
    .addBooleanOption((o) =>
      o.setName('mention').setDescription('Mention the original author (default: no)')
    );

  constructor() {
    super({
      name: 'reply',
      description: 'Reply to a specific message with custom text.',
      category: 'Utility',
      aliases: ['ans', 'respond'],
      userPermissions: ['ManageMessages'],
    });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const messageId = interaction.options.getString('message_id', true);
    const text = interaction.options.getString('text', true);
    const emoji = interaction.options.getString('emoji');
    const mention = interaction.options.getBoolean('mention') ?? false;

    const target = await resolveMessage(interaction, messageId);
    if (!target) {
      await interaction.reply({
        embeds: [errorEmbed('I could not find that message in this server (check the message ID).')],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const msg = await target.reply({
      content: text,
      allowedMentions: { parse: mention ? ['users'] : [] },
    });
    if (emoji) {
      await msg.react(emoji).catch(() => null);
    }

    await interaction.editReply({
      embeds: [successEmbed(`Replied to message \`${messageId}\`.`)],

    });
  }
}