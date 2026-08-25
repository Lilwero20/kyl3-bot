import type { ChatInputCommandInteraction } from 'discord.js';
import type { OpenCodeClient } from '../structures/OpenCodeClient';
import { errorEmbed } from '../utils/embed';
import { logger } from '../utils/logger';

/**
 * Discord requires every interaction to be acknowledged within 3 seconds, or it
 * shows "The application did not respond" and later replies are rejected with
 * error 10062 ("Unknown interaction"). A command that does slow work (network
 * calls, channel lookups) before its first reply can exceed that window.
 *
 * To make ALL commands resilient without editing each one, we install a safety
 * net per interaction:
 *   1. patch `interaction.reply` so a reply made AFTER the interaction is
 *      already deferred routes to `editReply` instead of throwing "Already deferred";
 *   2. patch `interaction.deferReply` to be a no-op once already deferred;
 *   3. schedule a fallback `deferReply` within ~2.5s so the interaction is always
 *      acknowledged before Discord's deadline.
 * Commands that reply immediately are unaffected (their reply stays ephemeral,
 * and the fallback never fires).
 */
function installDeferSafety(interaction: ChatInputCommandInteraction): NodeJS.Timeout {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyInteraction = interaction as any;
  const originalReply = interaction.reply.bind(interaction);
  const originalDeferReply = interaction.deferReply.bind(interaction);

  anyInteraction.reply = (opts: unknown) =>
    interaction.deferred ? anyInteraction.editReply(opts) : originalReply(opts);

  anyInteraction.deferReply = (opts?: unknown) =>
    interaction.deferred || interaction.replied
      ? Promise.resolve()
      : originalDeferReply(opts);

  return setTimeout(async () => {
    if (!interaction.replied && !interaction.deferred) {
      try {
        await originalDeferReply();
      } catch {
        /* interaction already gone */
      }
    }
  }, 2500);
}

/** True when Discord reports the interaction token as expired/already handled. */
function isUnknownInteraction(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 10062
  );
}

/** True when the interaction was already acknowledged (reply after defer, etc.). */
function isAlreadyDeferred(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 18
  );
}

export async function onInteractionCreate(
  client: OpenCodeClient,
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
        flags: 64, // Ephemeral
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
      flags: 64, // Ephemeral
    });
    return;
  }

  const safetyTimer = installDeferSafety(interaction);

  try {
    await command.execute(interaction);
  } catch (err) {
    if (isUnknownInteraction(err) || isAlreadyDeferred(err)) {
      // The interaction already expired (10062) or was already acked (18) —
      // typically a duplicate bot session, or the 3s window passed. Nothing left
      // to send; log quietly so it does not look like a crash.
      logger.warn(
        `Command ${command.options.name}: interaction closed/unavailable (code ${(err as { code?: number }).code}). ` +
          `Most common cause: the bot is running on more than one device at once, or the interaction timed out.`
      );
    } else {
      logger.error(`Command ${command.options.name} failed:`, err);
      const e = errorEmbed('An unexpected error occurred while running this command.');
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ embeds: [e] });
        } else {
          await interaction.reply({ embeds: [e], flags: 64 });
        }
      } catch {
        /* noop */
      }
    }
  } finally {
    clearTimeout(safetyTimer);
  }
}
