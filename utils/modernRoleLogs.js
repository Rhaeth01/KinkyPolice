const webhookLogger = require('./webhookLogger');

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

            // Utiliser le webhook logger moderne
            await webhookLogger.logRoleChange(member, role, action, moderator);
            console.log(`✅ [ModernRoleLogger] Rôle ${action} loggé avec succès via webhook`);

        } catch (error) {
            console.error(`❌ [ModernRoleLogger] Erreur lors du log du rôle ${action}:`, error);
        }
    }
};