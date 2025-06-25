const webhookLogger = require('./webhookLogger');
const configManager = require('./configManager');

/**
 * Adaptateur moderne pour les logs de rôles
 * Remplace progressivement roleLogs.js avec le système webhook
 */
module.exports = {
    async logRoleChange(member, role, action, moderator) {
        try {
            // Validation des paramètres
            if (!member || !role || !action || !moderator) {
                console.error('❌ [ModernRoleLogger] Paramètres manquants:', { member: !!member, role: !!role, action, moderator: !!moderator });
                return;
            }

            // Ignorer les rôles système ou gérés par des bots (sauf si c'est important)
            if (role.managed && role.name.includes('bot')) {
                return;
            }

            // Ignorer le rôle @everyone
            if (role.name === '@everyone') {
                return;
            }

            // Vérifier les exclusions de la configuration
            const config = configManager.getConfig();
            const exclusions = config.logging || {};
            
            // Vérifier si l'utilisateur est exclu
            if (exclusions.excludedUsers && exclusions.excludedUsers.includes(member.id)) {
                console.log('🔍 [ModernRoleLogger] Utilisateur exclu des logs de rôles');
                return;
            }
            
            // Vérifier si le rôle est exclu des logs de rôles spécifiquement
            if (exclusions.roleLogsExcludedRoles && exclusions.roleLogsExcludedRoles.includes(role.id)) {
                console.log(`🔍 [ModernRoleLogger] Rôle ${role.name} (${role.id}) exclu des logs de rôles`);
                return;
            }
            
            // Vérifier si le rôle est exclu globalement
            if (exclusions.excludedRoles && exclusions.excludedRoles.includes(role.id)) {
                console.log('🔍 [ModernRoleLogger] Rôle exclu des logs globalement');
                return;
            }

            // Utiliser le webhook logger moderne
            await webhookLogger.logRoleChange(member, role, action, moderator);
            console.log(`✅ [ModernRoleLogger] Rôle ${action} loggé avec succès via webhook`);

        } catch (error) {
            console.error(`❌ [ModernRoleLogger] Erreur lors du log du rôle ${action}:`, error);
        }
    }
};