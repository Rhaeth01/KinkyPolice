const webhookLogger = require('./webhookLogger');

/**
 * Adaptateur moderne pour les logs de messages
 * Remplace progressivement messageLogs.js avec le système webhook
 */
module.exports = {
    async logEditedMessage(oldMessage, newMessage) {
        try {
            console.log('🔍 [ModernMessageLogger] Tentative de log d\'un message édité...');
            
            // Vérification des messages partiels
            if (oldMessage.partial) {
                console.log('🔍 [ModernMessageLogger] Ancien message partiel détecté...');
                try {
                    await oldMessage.fetch();
                } catch (error) {
                    console.error('❌ [ModernMessageLogger] Impossible de récupérer l\'ancien message:', error.message);
                    return;
                }
            }
            
            if (newMessage.partial) {
                console.log('🔍 [ModernMessageLogger] Nouveau message partiel détecté...');
                try {
                    await newMessage.fetch();
                } catch (error) {
                    console.error('❌ [ModernMessageLogger] Impossible de récupérer le nouveau message:', error.message);
                    return;
                }
            }

            // Ignorer les messages de bots
            if (oldMessage.author.bot) {
                console.log('🔍 [ModernMessageLogger] Message de bot ignoré');
                return;
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