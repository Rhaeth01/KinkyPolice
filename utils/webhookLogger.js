const { EmbedBuilder, WebhookClient } = require('discord.js');
const configManager = require('./configManager');

class WebhookLogger {
    constructor() {
        this.webhooks = new Map();
        this.client = null;
        this.logTypeNames = {
            modLogs: 'Modération',
            messageLogs: 'Messages',
            voiceLogs: 'Vocaux',
            memberLogs: 'Membres',
            roleLogs: 'Rôles',
            ticketLogs: 'Tickets'
        };
    }

    initialize(client) {
        this.client = client;
        const loggingConfig = configManager.getConfig().logging || {};

        for (const [logType, config] of Object.entries(loggingConfig)) {
            if (config && config.enabled && config.webhookUrl) {
                try {
                    const webhookClient = new WebhookClient({ url: config.webhookUrl });
                    this.webhooks.set(logType, webhookClient);
                } catch (error) {
                    console.error(`[WebhookLogger] Erreur initialisation webhook pour ${logType}:`, error.message);
                }
            }
        }
        console.log(`[WebhookLogger] Initialisé avec ${this.webhooks.size} webhook(s) actif(s).`);
    }

    async log(logType, embed, options = {}) {
        const webhook = this.webhooks.get(logType);
        if (!webhook) {
            return this.fallbackLog(logType, embed);
        }

        try {
            const webhookOptions = {
                embeds: [embed],
                username: `KinkyPolice ${this.logTypeNames[logType] || 'Logs'}`,
                avatarURL: this.client.user.displayAvatarURL(),
                ...options
            };
            await webhook.send(webhookOptions);
        } catch (error) {
            console.error(`[WebhookLogger] Erreur envoi webhook pour ${logType}:`, error.message);
            if (error.code === 10015) { // Unknown Webhook
                console.warn(`[WebhookLogger] Webhook pour ${logType} invalide. Suppression.`);
                this.webhooks.delete(logType);
                // Optionnel: tenter de recréer ou notifier
            }
            await this.fallbackLog(logType, embed);
        }
    }

    async fallbackLog(logType, embed) {
        const loggingConfig = configManager.getConfig().logging || {};
        const logConfig = loggingConfig[logType];

        if (!logConfig || !logConfig.channelId) {
            // console.error(`[WebhookLogger] Fallback impossible: channelId non configuré pour ${logType}`);
            return;
        }

        try {
            const channel = await this.client.channels.fetch(logConfig.channelId);
            if (channel && channel.isTextBased()) {
                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error(`[WebhookLogger] Erreur fallback pour ${logType} dans le salon ${logConfig.channelId}:`, error.message);
        }
    }

    refreshConfig() {
        // Détruire les anciens clients
        for (const webhook of this.webhooks.values()) {
            webhook.destroy();
        }
        this.webhooks.clear();
        // Ré-initialiser avec la nouvelle config
        this.initialize(this.client);
    }
}

module.exports = new WebhookLogger();