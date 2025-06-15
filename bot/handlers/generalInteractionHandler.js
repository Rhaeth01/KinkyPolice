/**
 * @file handlers/generalInteractionHandler.js
 * @description Handler général pour les interactions non spécialisées
 * Gère les interactions qui ne rentrent pas dans les autres catégories
 */

const { EmbedBuilder } = require('discord.js');
const { getMessage } = require('../utils/messageManager');

class GeneralInteractionHandler {
    constructor() {
        // Protection basique contre les interactions rapides
        this.recentInteractions = new Map();
    }

    /**
     * Vérifie si une interaction est trop récente
     * @param {string} userId - L'ID de l'utilisateur
     * @param {string} customId - L'ID de l'interaction
     * @returns {boolean} True si l'interaction est trop récente
     */
    isInteractionTooRecent(userId, customId) {
        const key = `${userId}_${customId}`;
        const now = Date.now();
        const lastInteraction = this.recentInteractions.get(key);
        
        if (lastInteraction && now - lastInteraction < 1000) { // 1 seconde de protection
            return true;
        }
        
        this.recentInteractions.set(key, now);
        
        // Nettoyer les anciennes entrées après 5 secondes
        setTimeout(() => {
            this.recentInteractions.delete(key);
        }, 5000);
        
        return false;
    }

    /**
     * Handler principal pour les interactions générales
     * @param {import('discord.js').Interaction} interaction - L'interaction à traiter
     */
    async handleInteraction(interaction) {
        const customId = interaction.customId;
        const userId = interaction.user.id;

        // Protection contre les interactions rapides
        if (this.isInteractionTooRecent(userId, customId)) {
            return;
        }

        try {
            // Router vers la méthode appropriée
            if (customId.includes('_connect_')) {
                await this.handleConnectInteraction(interaction);
            }
            else if (customId.includes('_disconnect_')) {
                await this.handleDisconnectInteraction(interaction);
            }
            else if (customId.includes('_info_')) {
                await this.handleInfoInteraction(interaction);
            }
            else if (customId.includes('_help_')) {
                await this.handleHelpInteraction(interaction);
            }
            else if (customId.startsWith('custom_')) {
                await this.handleCustomInteraction(interaction);
            }
            else {
                // Interaction non reconnue - traitement par défaut
                console.log(`[GENERAL HANDLER] Interaction non reconnue: ${customId}`);
                await this.handleUnknownInteraction(interaction);
            }

        } catch (error) {
            console.error(`[GENERAL HANDLER] Erreur lors du traitement de ${customId}:`, error);

            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ Une erreur inattendue est survenue.',
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error(`[GENERAL HANDLER] Erreur de réponse d'urgence:`, replyError);
                }
            }
        }
    }

    /**
     * Gère les interactions de connexion
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async handleConnectInteraction(interaction) {
        await interaction.reply({
            content: '🔗 Connexion en cours...',
            ephemeral: true
        });
    }

    /**
     * Gère les interactions de déconnexion
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async handleDisconnectInteraction(interaction) {
        console.log(`[GENERAL HANDLER] Déconnexion: ${interaction.customId}`);
        
        await interaction.reply({
            content: '🔌 Déconnexion en cours...',
            ephemeral: true
        });
    }

    /**
     * Gère les interactions d'information
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async handleInfoInteraction(interaction) {
        console.log(`[GENERAL HANDLER] Information: ${interaction.customId}`);
        
        const infoEmbed = new EmbedBuilder()
            .setTitle('ℹ️ Information')
            .setDescription('Cette fonctionnalité fournit des informations sur le système.')
            .setColor('#3498db')
            .setTimestamp();
        
        await interaction.reply({
            embeds: [infoEmbed],
            ephemeral: true
        });
    }

    /**
     * Gère les interactions d'aide
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async handleHelpInteraction(interaction) {
        console.log(`[GENERAL HANDLER] Aide: ${interaction.customId}`);
        
        const helpEmbed = new EmbedBuilder()
            .setTitle('❓ Aide')
            .setDescription('Cette fonctionnalité fournit de l\'aide sur l\'utilisation du bot.')
            .addFields(
                { name: '📋 Commandes', value: 'Utilisez `/help` pour voir toutes les commandes', inline: true },
                { name: '🎮 Jeux', value: 'Utilisez `/kinky` pour accéder aux jeux', inline: true },
                { name: '⚙️ Configuration', value: 'Les administrateurs peuvent utiliser `/config`', inline: true }
            )
            .setColor('#f39c12')
            .setTimestamp();
        
        await interaction.reply({
            embeds: [helpEmbed],
            ephemeral: true
        });
    }

    /**
     * Gère les interactions personnalisées
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async handleCustomInteraction(interaction) {
        console.log(`[GENERAL HANDLER] Interaction personnalisée: ${interaction.customId}`);
        
        // Extraire l'ID personnalisé
        const customId = interaction.customId.replace('custom_', '');
        
        await interaction.reply({
            content: `🔧 Interaction personnalisée '${customId}' exécutée avec succès.`,
            ephemeral: true
        });
    }

    /**
     * Gère les interactions non reconnues
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async handleUnknownInteraction(interaction) {
        console.log(`[GENERAL HANDLER] Interaction inconnue: ${interaction.customId}`);
        
        // Vérifier si l'interaction a déjà été traitée
        if (interaction.replied || interaction.deferred) {
            console.log(`[GENERAL HANDLER] Interaction déjà traitée: ${interaction.customId}`);
            return;
        }
        
        // Essayer de déterminer si c'est une interaction obsolète ou expirée
        const isLikelyExpired = this.isInteractionLikelyExpired(interaction);
        
        if (isLikelyExpired) {
            await interaction.reply({
                content: '⏰ Cette interaction a expiré. Veuillez relancer la commande.',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: '❓ Interaction non reconnue. Cette fonctionnalité pourrait ne pas être disponible.',
                ephemeral: true
            });
        }
    }

    /**
     * Détermine si une interaction est probablement expirée
     * @param {import('discord.js').Interaction} interaction - L'interaction
     * @returns {boolean} True si l'interaction semble expirée
     */
    isInteractionLikelyExpired(interaction) {
        const customId = interaction.customId;
        
        // Patterns communs d'interactions qui peuvent expirer
        const expirablePatterns = [
            /\d{13,}/, // Contient un timestamp
            /_\d+_\d+/, // Contient des IDs numériques (user_id_timestamp)
            /temp_/, // Préfixe temporaire
            /session_/, // Session-based
        ];
        
        return expirablePatterns.some(pattern => pattern.test(customId));
    }

    /**
     * Obtient des statistiques sur les interactions générales
     * @returns {Object} Statistiques générales
     */
    getGeneralStats() {
        return {
            recentInteractions: this.recentInteractions.size
        };
    }

    /**
     * Nettoie les données expirées
     */
    cleanup() {
        // Les interactions récentes se nettoient automatiquement avec setTimeout
        // Cette méthode peut être utilisée pour des nettoyages supplémentaires si nécessaire
        console.log(`[GENERAL HANDLER] Nettoyage effectué. Interactions récentes: ${this.recentInteractions.size}`);
    }
}

module.exports = new GeneralInteractionHandler();