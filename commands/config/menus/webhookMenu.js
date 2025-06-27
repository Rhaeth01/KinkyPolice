const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, WebhookClient, ChannelType, PermissionFlagsBits } = require('discord.js');
const configManager = require('../../../utils/configManager');

class WebhookMenu {
    static createEmbed(config) {
        const loggingConfig = config.logging || {};
        const embed = new EmbedBuilder()
            .setTitle('🔗 Gestion des Webhooks')
            .setDescription('Gérez les webhooks utilisés pour les logs. Les webhooks sont créés automatiquement lorsque vous activez un log.')
            .setColor(0x5865F2);

        const fields = Object.entries(loggingConfig)
            .filter(([key, value]) => typeof value === 'object' && value !== null && value.hasOwnProperty('webhookUrl'))
            .map(([key, value]) => ({
                name: this.getLogTypeName(key),
                value: value.webhookUrl ? `✅ [Lien](${value.webhookUrl})` : '❌ Non configuré',
                inline: true
            }));

        if (fields.length > 0) {
            embed.addFields(fields);
        } else {
            embed.setDescription('Aucun log n\'est configuré pour utiliser des webhooks.');
        }

        return embed;
    }

    static createComponents(config) {
        const loggingConfig = config.logging || {};
        const hasWebhooks = Object.values(loggingConfig)
            .some(log => typeof log === 'object' && log?.webhookUrl);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('config_webhook_test_all')
                .setLabel('🧪 Tester Tous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!hasWebhooks),
            new ButtonBuilder()
                .setCustomId('config_webhook_clean_old')
                .setLabel('🧹 Nettoyer les Anciens')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('config_webhook_recreate_all')
                .setLabel('🔄 Recréer Tous')
                .setStyle(ButtonStyle.Danger)
        );
        return [row];
    }

    static async testAllWebhooks(loggingConfig) {
        const results = [];
        for (const [logType, config] of Object.entries(loggingConfig)) {
            if (typeof config !== 'object' || !config.webhookUrl) continue;

            try {
                const webhookClient = new WebhookClient({ url: config.webhookUrl });
                await webhookClient.send({ content: `✅ Test pour ${this.getLogTypeName(logType)} réussi.` });
                webhookClient.destroy();
                results.push({ name: this.getLogTypeName(logType), success: true });
            } catch (error) {
                results.push({ name: this.getLogTypeName(logType), success: false, error: error.message });
            }
        }
        return results;
    }

    static async cleanOldWebhooks(guild) {
        const config = configManager.getConfig();
        const loggingConfig = config.logging || {};
        let cleaned = 0;
        const errors = [];
        const activeWebhookUrls = Object.values(loggingConfig)
            .filter(log => typeof log === 'object' && log?.webhookUrl)
            .map(log => log.webhookUrl);

        const allChannels = new Set(Object.values(loggingConfig)
            .filter(log => typeof log === 'object' && log?.channelId)
            .map(log => log.channelId));

        for (const channelId of allChannels) {
            try {
                const channel = await guild.channels.fetch(channelId);
                if (!channel || channel.type !== ChannelType.GuildText || !channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ManageWebhooks)) continue;

                const webhooks = await channel.fetchWebhooks();
                for (const webhook of webhooks.values()) {
                    if (webhook.owner.id === guild.client.user.id && !activeWebhookUrls.includes(webhook.url)) {
                        await webhook.delete('Nettoyage des anciens webhooks KinkyPolice');
                        cleaned++;
                    }
                }
            } catch (error) {
                errors.push(`Erreur dans <#${channelId}>: ${error.message}`);
            }
        }
        return { cleaned, errors };
    }

    static getLogTypeName(logType) {
        const names = {
            modLogs: 'Modération',
            messageLogs: 'Messages',
            voiceLogs: 'Vocaux',
            memberLogs: 'Membres',
            roleLogs: 'Rôles',
            ticketLogs: 'Tickets'
        };
        return names[logType] || logType;
    }
}

module.exports = WebhookMenu;
