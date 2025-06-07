const webhookLogger = require('./webhookLogger');
const configManager = require('./configManager');

/**
 * Adaptateur moderne pour les logs de rôles
 * Remplace progressivement roleLogs.js avec le système webhook
 */
module.exports = {
    async logRoleChange(member, role, action, moderator) {
        try {
            console.log(`🔍 [ModernRoleLogger] Tentative de log ${action} du rôle...`);
            
            // Validation des paramètres
            if (!member || !role || !action || !moderator) {
                console.error('❌ [ModernRoleLogger] Paramètres manquants:', { member: !!member, role: !!role, action, moderator: !!moderator });
                return;
            }

            // Ignorer les rôles système ou gérés par des bots (sauf si c'est important)
            if (role.managed && role.name.includes('bot')) {
                console.log('🔍 [ModernRoleLogger] Rôle de bot ignoré');
                return;
            }

            // Ignorer le rôle @everyone
            if (role.name === '@everyone') {
                console.log('🔍 [ModernRoleLogger] Rôle @everyone ignoré');
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
            
            // Vérifier si le rôle est exclu
            if (exclusions.excludedRoles && exclusions.excludedRoles.includes(role.id)) {
                console.log('🔍 [ModernRoleLogger] Rôle exclu des logs');
                return;
            }
            
            // Vérifier si l'utilisateur a déjà un rôle exclu (pour éviter de logger les changements de rôles pour les utilisateurs exclus)
            if (exclusions.excludedRoles && member.roles) {
                const hasExcludedRole = member.roles.cache.some(r => 
                    exclusions.excludedRoles.includes(r.id)
                );
                if (hasExcludedRole) {
                    console.log('🔍 [ModernRoleLogger] Utilisateur avec rôle exclu des logs');
                    return;
                }
            }

            // Utiliser le webhook logger moderne
            await webhookLogger.logRoleChange(member, role, action, moderator);
            console.log(`✅ [ModernRoleLogger] Rôle ${action} loggé avec succès via webhook`);

        } catch (error) {
            console.error(`❌ [ModernRoleLogger] Erreur lors du log du rôle ${action}:`, error);
        }
    }
};