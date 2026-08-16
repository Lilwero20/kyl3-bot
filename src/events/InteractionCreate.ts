import type { ChatInputCommandInteraction } from 'discord.js';
import type { Kyl3Client } from '../structures/Kyl3Client';
import { errorEmbed } from '../utils/embed';
import { logger } from '../utils/logger';

export async function onInteractionCreate(
  client: Kyl3Client,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // Cooldown
  if (command.options.cooldown) {
    const remaining = client.cooldownRemaining(interaction.user.id, command.options.name);
    if (remaining > 0) {
      await interaction.reply({
        embeds: [errorEmbed(`Please wait **${remaining}s** before using this command again.`)],
        ephemeral: true,
      });
      return;
    }
    client.setCooldown(interaction.user.id, command.options.name, command.options.cooldown);
  }

  // Permissions
  const permCheck = command.hasPermission(interaction);
  if (!permCheck.ok) {
    await interaction.reply({
      embeds: [
        errorEmbed(`You need the following permission(s): ${permCheck.reason}`),
      ],
      ephemeral: true,
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    logger.error(`Command ${command.options.name} failed:`, err);
    const e = errorEmbed('An unexpected error occurred while running this command.');
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [e] });
      } else {
        await interaction.reply({ embeds: [e], ephemeral: true });
      }
    } catch {
      /* noop */
    }
  }
}
