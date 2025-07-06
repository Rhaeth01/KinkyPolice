const configManager = require('./configManager');
const fs = require('fs').promises;
const path = require('path');

class ConfigMigration {
    static async run() {
        const migrationLockFile = path.join(__dirname, '.._migration.lock');
        try {
            await fs.access(migrationLockFile);
            // Le fichier de verrouillage existe, la migration a déjà été effectuée.
            return;
        } catch (error) {
            // Le fichier de verrouillage n'existe pas, procéder à la migration.
        }

        console.log('[Migration] Démarrage de la migration de la configuration des logs...');
        const currentConfig = configManager.getConfig();

        if (!currentConfig.logging || this.isNewFormat(currentConfig.logging)) {
            console.log('[Migration] Aucune migration nécessaire.');
            await fs.writeFile(migrationLockFile, 'completed');
            return;
        }

        const oldLogging = currentConfig.logging;
        const newLogging = {
            modLogs: this.transformLog(oldLogging.modLogs, oldLogging.moderationWebhookUrl),
            messageLogs: this.transformLog(oldLogging.messageLogs, oldLogging.messagesWebhookUrl),
            voiceLogs: this.transformLog(oldLogging.voiceLogs, oldLogging.voiceWebhookUrl),
            memberLogs: this.transformLog(oldLogging.memberLogs, oldLogging.memberWebhookUrl),
            roleLogs: this.transformLog(oldLogging.roleLogChannelId, oldLogging.rolesWebhookUrl),
            ticketLogs: this.transformLog(oldLogging.ticketLogs, oldLogging.ticketsWebhookUrl),
            excludedChannels: oldLogging.excludedChannels || [],
            excludedRoles: oldLogging.excludedRoles || [],
            excludedUsers: oldLogging.excludedUsers || [],
            roleLogsExcludedRoles: oldLogging.roleLogsExcludedRoles || [],
        };

        try {
            await configManager.updateConfig({ logging: newLogging });
            console.log('[Migration] La configuration des logs a été migrée avec succès.');
            await fs.writeFile(migrationLockFile, 'completed');
        } catch (error) {
            console.error('[Migration] Erreur lors de la sauvegarde de la configuration migrée:', error);
        }
    }

    static isNewFormat(loggingConfig) {
        // Vérifie si un des logs a le nouveau format d'objet
        return typeof loggingConfig.modLogs === 'object' && loggingConfig.modLogs !== null;
    }

    static transformLog(channelId, webhookUrl) {
        return {
            enabled: !!channelId,
            channelId: channelId || null,
            webhookUrl: webhookUrl || null,
        };
    }
}

module.exports = ConfigMigration;
