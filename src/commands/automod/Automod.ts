import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleKeywordPresetType,
  AutoModerationRuleTriggerType,
  EmbedBuilder,
  SlashCommandBuilder,
  type AutoModerationActionOptions,
  type AutoModerationRuleTriggerType as TriggerType,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Command } from '../../structures/Command';
import { errorEmbed, successEmbed, warningEmbed, EMBED_COLORS } from '../../utils/embed';
import { store } from '../../utils/store';

interface AutomodConfig {
  enabled: boolean;
  logChannelId?: string;
  createdAt: number;
}

const BLOCK_ACTIONS: AutoModerationActionOptions[] = [
  { type: AutoModerationActionType.BlockMessage },
];

function timeoutAction(durationSeconds: number): AutoModerationActionOptions {
  return {
    type: AutoModerationActionType.Timeout,
    metadata: { durationSeconds },
  };
}

export default class AutomodCommand extends Command {
  public readonly data = new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure auto-moderation rules.')
    .addSubcommand((s) =>
      s.setName('setup').setDescription('Create the full set of auto-mod rules')
    )
    .addSubcommand((s) => s.setName('status').setDescription('Show current auto-mod rules'))
    .addSubcommand((s) =>
      s.setName('disable').setDescription('Disable a rule type')
        .addStringOption((o) =>
          o.setName('type')
            .setDescription('Rule type to disable')
            .setRequired(true)
            .setChoices(
              { name: 'Profanity preset', value: 'preset' },
              { name: 'Keyword filter', value: 'keyword' },
              { name: 'Spam', value: 'spam' },
              { name: 'Mention spam', value: 'mention' }
            )
        )
    )
    .addSubcommand((s) =>
      s.setName('keyword').setDescription('Manage custom keyword rules')
        .addStringOption((o) =>
          o.setName('action')
            .setDescription('Action to take')
            .setRequired(true)
            .setChoices(
              { name: 'Add keyword(s)', value: 'add' },
              { name: 'List keywords', value: 'list' },
              { name: 'Remove keyword', value: 'remove' }
            )
        )
        .addStringOption((o) => o.setName('keywords').setDescription('Keywords, comma separated'))
    );

  constructor() {
    super({
      name: 'automod',
      description: 'Configure auto-moderation rules.',
      category: 'AutoMod',
      userPermissions: ['ManageGuild'],
      botPermissions: ['ManageGuild', 'ModerateMembers', 'BanMembers'],
    });
  }

  private async getConfig(guildId: string): Promise<AutomodConfig> {
    return store.get<AutomodConfig>('automod', guildId) ?? { enabled: false, createdAt: 0 };
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const rules = await guild.autoModerationRules.fetch();
      if (rules.size === 0) {
        await interaction.reply({ embeds: [warningEmbed('No auto-mod rules configured. Run `/automod setup`.')], ephemeral: true });
        return;
      }
      const e = new EmbedBuilder()
        .setTitle('Auto-mod rules')
        .setColor(EMBED_COLORS.info)
        .setDescription(
          rules.map((r) => `• **${r.name}** — trigger \`${r.triggerType}\` · ${r.actions.map((a) => `\`${a.type}\``).join(', ')} · ${r.enabled ? '🟢' : '🔴'}`).join('\n')
        );
      await interaction.reply({ embeds: [e] });
      return;
    }

    if (sub === 'setup') {
      await interaction.deferReply();
      const existing = await guild.autoModerationRules.fetch();
      const counts = existing.size;

      const rulesToCreate: {
        name: string;
        triggerType: TriggerType;
        triggerMetadata?: Record<string, unknown>;
        actions: AutoModerationActionOptions[];
      }[] = [
        {
          name: 'Profanity Protection',
          triggerType: AutoModerationRuleTriggerType.KeywordPreset,
          triggerMetadata: {
            presets: [
              AutoModerationRuleKeywordPresetType.Profanity,
              AutoModerationRuleKeywordPresetType.SexualContent,
            ],
          },
          actions: BLOCK_ACTIONS,
        },
        {
          name: 'Mention Spam Protection',
          triggerType: AutoModerationRuleTriggerType.MentionSpam,
          triggerMetadata: { mentionTotalLimit: 5 },
          actions: [...BLOCK_ACTIONS, timeoutAction(600)],
        },
        {
          name: 'Spam Protection',
          triggerType: AutoModerationRuleTriggerType.Spam,
          triggerMetadata: {},
          actions: BLOCK_ACTIONS,
        },
      ];

      const customKeywords = this.getCustomKeywords(guild.id);
      if (customKeywords.length > 0) {
        rulesToCreate.push({
          name: 'Custom Keywords',
          triggerType: AutoModerationRuleTriggerType.Keyword,
          triggerMetadata: { keywordFilter: customKeywords },
          actions: BLOCK_ACTIONS,
        });
      }

      let created = 0;
      const errors: string[] = [];
      for (const rule of rulesToCreate) {
        try {
          await guild.autoModerationRules.create({
            name: rule.name,
            eventType: AutoModerationRuleEventType.MessageSend,
            triggerType: rule.triggerType,
            triggerMetadata: rule.triggerMetadata as never,
            actions: rule.actions,
            enabled: true,
          });
          created++;
        } catch (err) {
          errors.push(`${rule.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      store.set('automod', guild.id, { enabled: true, createdAt: Date.now() });

      await interaction.editReply({
        embeds: [
          successEmbed(
            `Created **${created}** auto-mod rule(s).\n` +
              (errors.length ? `Some rules failed: \n${errors.join('\n')}` : 'All rules are now active.')
          ),
        ],
      });
      return;
    }

    if (sub === 'disable') {
      const type = interaction.options.getString('type', true);
      await interaction.deferReply();
      const rules = await guild.autoModerationRules.fetch();
      const map: Record<string, (r: import('discord.js').AutoModerationRule) => boolean> = {
        preset: (r) => r.triggerType === AutoModerationRuleTriggerType.KeywordPreset,
        keyword: (r) => r.triggerType === AutoModerationRuleTriggerType.Keyword,
        spam: (r) => r.triggerType === AutoModerationRuleTriggerType.Spam,
        mention: (r) => r.triggerType === AutoModerationRuleTriggerType.MentionSpam,
      };
      const targets = rules.filter((r) => map[type]?.(r));
      if (targets.size === 0) {
        await interaction.editReply({ embeds: [errorEmbed('No matching rules found.')] });
        return;
      }
      let disabled = 0;
      for (const r of targets.values()) {
        try {
          await r.edit({ enabled: false });
          disabled++;
        } catch {
          /* noop */
        }
      }
      await interaction.editReply({ embeds: [successEmbed(`Disabled **${disabled}** rule(s).`) ] });
      return;
    }

    if (sub === 'keyword') {
      const action = interaction.options.getString('action', true);
      const keywordsRaw = interaction.options.getString('keywords');

      if (action === 'list') {
        const keywords = this.getCustomKeywords(guild.id);
        const e = new EmbedBuilder()
          .setTitle('Custom keywords')
          .setColor(EMBED_COLORS.info)
          .setDescription(keywords.length ? keywords.map((k) => `\`${k}\``).join(', ') : 'No custom keywords.');
        await interaction.reply({ embeds: [e], ephemeral: true });
        return;
      }

      if (!keywordsRaw) {
        await interaction.reply({ embeds: [errorEmbed('You must provide keywords.')], ephemeral: true });
        return;
      }

      const keywords = keywordsRaw.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
      const current = this.getCustomKeywords(guild.id);

      if (action === 'add') {
        const merged = [...new Set([...current, ...keywords])];
        store.set('automod_keywords', guild.id, merged);
        await interaction.reply({
          embeds: [successEmbed(`Added **${keywords.length}** keyword(s). Total: **${merged.length}**.`)],
          ephemeral: true,
        });
      } else if (action === 'remove') {
        const remaining = current.filter((k) => !keywords.includes(k));
        store.set('automod_keywords', guild.id, remaining);
        await interaction.reply({
          embeds: [successEmbed(`Removed **${current.length - remaining.length}** keyword(s). Total: **${remaining.length}**.`)],
          ephemeral: true,
        });
      }
    }
  }

  private getCustomKeywords(guildId: string): string[] {
    return store.get<string[]>('automod_keywords', guildId) ?? [];
  }
}
