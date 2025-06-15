const configManager = require('../../../utils/configManager');

/**
 * @file commands/config/utils/configFixer.js
 * @description Utilitaire pour corriger les problèmes de configuration
 */

class ConfigFixer {
    /**
     * Corrige la configuration des logs si elle contient des valeurs invalides
     */
    static async fixLoggingConfig() {
        const config = configManager.getConfig();
        
        if (config.logging && (config.logging.null !== undefined)) {
            console.log('[CONFIG FIXER] Correction de la configuration des logs...');
            
            // Reconstruire la configuration des logs avec les bonnes valeurs
            const fixedLogging = {
                modLogs: config.logging.modLogs || "",
                messageLogs: config.logging.messageLogs || config.logging.null || "",
                voiceLogs: config.logging.voiceLogs || "",
                memberLogs: config.logging.memberLogs || "",
                roleLogChannelId: config.logging.roleLogChannelId || "",
                excludedChannels: config.logging.excludedChannels || [],
                excludedRoles: config.logging.excludedRoles || [],
                excludedUsers: config.logging.excludedUsers || [],
                roleLogsExcludedRoles: config.logging.roleLogsExcludedRoles || [],
                // Préserver les webhooks existants
                moderationWebhookUrl: config.logging.moderationWebhookUrl || "",
                messagesWebhookUrl: config.logging.messagesWebhookUrl || "",
                messagesEditedWebhookUrl: config.logging.messagesEditedWebhookUrl || "",
                messagesDeletedWebhookUrl: config.logging.messagesDeletedWebhookUrl || "",
                voiceWebhookUrl: config.logging.voiceWebhookUrl || "",
                rolesWebhookUrl: config.logging.rolesWebhookUrl || "",
                memberWebhookUrl: config.logging.memberWebhookUrl || "",
                ticketsWebhookUrl: config.logging.ticketsWebhookUrl || ""
            };
            
            // Si la valeur dans "null" semble être un ID de salon, la mettre dans voiceLogs
            if (config.logging.null && config.logging.null.match(/^\d+$/)) {
                fixedLogging.voiceLogs = config.logging.null;
            }
            
            // Mettre à jour la configuration
            await configManager.updateConfig({ logging: fixedLogging });
            
            console.log('[CONFIG FIXER] Configuration des logs corrigée avec succès');
            return true;
        }
        
        return false;
    }
    
    /**
     * Corrige toutes les configurations problématiques
     */
    static async fixAllConfigs() {
        let fixed = false;
        
        // Corriger les logs
        if (await this.fixLoggingConfig()) {
            fixed = true;
        }
        
        // Ajouter d'autres corrections ici si nécessaire
        
        return fixed;
    }
}

module.exports = ConfigFixer;