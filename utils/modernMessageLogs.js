const webhookLogger = require('./webhookLogger');
const configManager = require('./configManager');

/**
 * Adaptateur moderne pour les logs de messages
 * Remplace progressivement messageLogs.js avec le système webhook
 */
module.exports = {
    async logEditedMessage(oldMessage, newMessage) {
        try {
            // Vérification des messages partiels
            if (oldMessage.partial) {
                try {
                    await oldMessage.fetch();
                } catch (error) {
                    console.error('❌ [ModernMessageLogger] Impossible de récupérer l\'ancien message:', error.message);
                    return;
                }
            }

            if (newMessage.partial) {
                try {
                    await newMessage.fetch();
                } catch (error) {
                    console.error('❌ [ModernMessageLogger] Impossible de récupérer le nouveau message:', error.message);
                    return;
                }
            }

            // Ignorer les messages de bots
            if (oldMessage.author.bot) {
                return;
            }

            // Vérifier les exclusions de la configuration
            const config = configManager.getConfig();
            const exclusions = config.logging || {};

            // Vérifier si le canal est exclu
            if (exclusions.excludedChannels && exclusions.excludedChannels.includes(newMessage.channelId)) {
                return;
            }
            
            // Vérifier si l'utilisateur est exclu
            if (exclusions.excludedUsers && exclusions.excludedUsers.includes(newMessage.author.id)) {
                console.log('🔍 [ModernMessageLogger] Utilisateur exclu des logs');
                return;
            }
            
            // Vérifier si l'utilisateur a un rôle exclu
            if (exclusions.excludedRoles && newMessage.member) {
                const hasExcludedRole = newMessage.member.roles.cache.some(role => 
                    exclusions.excludedRoles.includes(role.id)
                );
                if (hasExcludedRole) {
                    console.log('🔍 [ModernMessageLogger] Utilisateur avec rôle exclu des logs');
                    return;
                }
            }

            // Ignorer si le contenu n'a pas changé (peut-être juste un embed)
            if (oldMessage.content === newMessage.content) {
                console.log('🔍 [ModernMessageLogger] Contenu identique, pas de log nécessaire');
                return;
            }

            // Utiliser le webhook logger moderne
            await webhookLogger.logMessageEdit(oldMessage, newMessage);
            console.log('✅ [ModernMessageLogger] Message édité loggé avec succès via webhook');

        } catch (error) {
            console.error('❌ [ModernMessageLogger] Erreur lors du log du message édité:', error);
        }
    },

    async logDeletedMessage(message) {
        try {
            console.log('🔍 [ModernMessageLogger] Tentative de log d\'un message supprimé...');
            
            // Vérification des messages partiels
            if (message.partial) {
                console.log('🔍 [ModernMessageLogger] Message partiel détecté...');
                try {
                    await message.fetch();
                } catch (error) {
                    console.error('❌ [ModernMessageLogger] Impossible de récupérer le message:', error.message);
                    // On continue quand même avec les infos limitées
                }
            }

            // Ignorer les messages de bots
            if (message.author && message.author.bot) {
                console.log('🔍 [ModernMessageLogger] Message de bot ignoré');
                return;
            }

            // Vérifier les exclusions de la configuration
            const config = configManager.getConfig();
            const exclusions = config.logging || {};
            
            // Vérifier si le canal est exclu
            if (exclusions.excludedChannels && exclusions.excludedChannels.includes(message.channelId)) {
                console.log('🔍 [ModernMessageLogger] Canal exclu des logs');
                return;
            }
            
            // Vérifier si l'utilisateur est exclu
            if (message.author && exclusions.excludedUsers && exclusions.excludedUsers.includes(message.author.id)) {
                console.log('🔍 [ModernMessageLogger] Utilisateur exclu des logs');
                return;
            }
            
            // Vérifier si l'utilisateur a un rôle exclu
            if (exclusions.excludedRoles && message.member) {
                const hasExcludedRole = message.member.roles.cache.some(role => 
                    exclusions.excludedRoles.includes(role.id)
                );
                if (hasExcludedRole) {
                    console.log('🔍 [ModernMessageLogger] Utilisateur avec rôle exclu des logs');
                    return;
                }
            }

            // Ignorer les messages vides (souvent des embeds)
            if (!message.content && message.attachments.size === 0) {
                console.log('🔍 [ModernMessageLogger] Message vide ignoré');
                return;
            }

            // Utiliser le webhook logger moderne
            await webhookLogger.logMessageDelete(message);
            console.log('✅ [ModernMessageLogger] Message supprimé loggé avec succès via webhook');

        } catch (error) {
            console.error('❌ [ModernMessageLogger] Erreur lors du log du message supprimé:', error);
        }
    }
};