/**
 * @file handlers/gameInteractionHandler.js
 * @description Handler spécialisé pour toutes les interactions de jeux
 * Gère les boutons des jeux : blackjack, pile-ou-face, pendu, jeux kinky, etc.
 */

const { EmbedBuilder } = require('discord.js');

class GameInteractionHandler {
    constructor() {
        // Cache des sessions de jeu actives pour éviter les conflits
        this.activeSessions = new Map();
        
        // Patterns des interactions de jeux
        this.gamePatterns = {
            blackjack: ['blackjack_hit_', 'blackjack_stand_', 'blackjack_join_', 'blackjack_start_', 'blackjack_cancel_'],
            coinflip: ['pile_', 'face_'],
            boardGames: ['col_', 'join_game_'],
            kinkyGames: ['guess_', 'anagram_', 'memory_', 'word_', 'quiz_']
        };
    }

    /**
     * Détermine le type de jeu basé sur le customId
     * @param {string} customId - L'ID personnalisé de l'interaction
     * @returns {string} Le type de jeu
     */
    getGameType(customId) {
        for (const [gameType, patterns] of Object.entries(this.gamePatterns)) {
            if (patterns.some(pattern => customId.startsWith(pattern))) {
                return gameType;
            }
        }
        return 'unknown';
    }

    /**
     * Vérifie si une session de jeu est active
     * @param {string} sessionId - L'ID de la session
     * @returns {boolean} True si la session est active
     */
    isSessionActive(sessionId) {
        return this.activeSessions.has(sessionId);
    }

    /**
     * Marque une session comme active
     * @param {string} sessionId - L'ID de la session
     * @param {Object} sessionData - Les données de la session
     */
    markSessionActive(sessionId, sessionData = {}) {
        this.activeSessions.set(sessionId, {
            ...sessionData,
            startTime: Date.now()
        });
        
        // Auto-nettoyage après 30 minutes
        setTimeout(() => {
            this.activeSessions.delete(sessionId);
        }, 30 * 60 * 1000);
    }

    /**
     * Handler principal pour les interactions de jeux
     * @param {import('discord.js').Interaction} interaction - L'interaction à traiter
     */
    async handleInteraction(interaction) {
        const customId = interaction.customId;
        const gameType = this.getGameType(customId);
        
        console.log(`[GAME HANDLER] Traitement de ${customId} (type: ${gameType})`);

        try {
            switch (gameType) {
                case 'blackjack':
                    await this.handleBlackjackInteraction(interaction);
                    break;
                    
                case 'coinflip':
                    await this.handleCoinflipInteraction(interaction);
                    break;
                    
                case 'boardGames':
                    await this.handleBoardGameInteraction(interaction);
                    break;
                    
                case 'kinkyGames':
                    await this.handleKinkyGameInteraction(interaction);
                    break;
                    
                default:
                    console.log(`[GAME HANDLER] Type de jeu inconnu pour: ${customId}`);
                    await this.sendGameNotFoundResponse(interaction);
            }
            
        } catch (error) {
            console.error(`[GAME HANDLER] Erreur lors du traitement de ${customId}:`, error);
            
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ Une erreur est survenue dans le jeu. Veuillez réessayer.',
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error(`[GAME HANDLER] Erreur de réponse d'urgence:`, replyError);
                }
            }
        }
    }

    /**
     * Gère les interactions du blackjack
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async handleBlackjackInteraction(interaction) {
        const customId = interaction.customId;
        
        // Ces interactions sont gérées par les collectors des commandes
        // On indique simplement qu'elles sont reconnues mais pas traitées ici
        console.log(`[GAME HANDLER] Blackjack: ${customId} - Géré par collector de commande`);
        
        // Ne pas répondre car le collector de la commande s'en charge
        // Cela évite les conflits "Unknown interaction"
    }

    /**
     * Gère les interactions de pile ou face
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async handleCoinflipInteraction(interaction) {
        const customId = interaction.customId;
        
        console.log(`[GAME HANDLER] Pile-ou-face: ${customId} - Géré par collector de commande`);
        
        // Même principe : géré par le collector de la commande
    }

    /**
     * Gère les interactions des jeux de plateau
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async handleBoardGameInteraction(interaction) {
        const customId = interaction.customId;
        
        if (customId.startsWith('col_')) {
            console.log(`[GAME HANDLER] Jeu de plateau (colonne): ${customId} - Géré par collector`);
            // Géré par le collector du jeu
            return;
        }
        
        if (customId.startsWith('join_game_')) {
            console.log(`[GAME HANDLER] Rejoindre jeu: ${customId} - Géré par collector`);
            // Géré par le collector du jeu
            return;
        }
        
        console.log(`[GAME HANDLER] Interaction de jeu de plateau non reconnue: ${customId}`);
    }

    /**
     * Gère les interactions des jeux kinky
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async handleKinkyGameInteraction(interaction) {
        const customId = interaction.customId;
        
        console.log(`[GAME HANDLER] Jeu kinky: ${customId} - Géré par collector de commande`);
        
        // Ces interactions sont gérées par les collectors des jeux kinky
    }

    /**
     * Envoie une réponse quand le jeu n'est pas trouvé
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async sendGameNotFoundResponse(interaction) {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Ce jeu n\'est plus disponible ou a expiré.',
                ephemeral: true
            });
        }
    }

    /**
     * Obtient des statistiques sur les sessions de jeu
     * @returns {Object} Statistiques des jeux
     */
    getGameStats() {
        const activeSessionsByType = {};
        
        for (const [sessionId, sessionData] of this.activeSessions.entries()) {
            const gameType = sessionData.gameType || 'unknown';
            activeSessionsByType[gameType] = (activeSessionsByType[gameType] || 0) + 1;
        }
        
        return {
            totalActiveSessions: this.activeSessions.size,
            sessionsByType: activeSessionsByType,
            oldestSession: this.activeSessions.size > 0 ? 
                Math.min(...Array.from(this.activeSessions.values()).map(s => s.startTime)) : null
        };
    }

    /**
     * Nettoie les sessions expirées
     */
    cleanupExpiredSessions() {
        const now = Date.now();
        const expiredSessions = [];
        
        for (const [sessionId, sessionData] of this.activeSessions.entries()) {
            // Sessions expirées après 30 minutes d'inactivité
            if (now - sessionData.startTime > 30 * 60 * 1000) {
                expiredSessions.push(sessionId);
            }
        }
        
        expiredSessions.forEach(sessionId => {
            this.activeSessions.delete(sessionId);
            console.log(`[GAME HANDLER] Session expirée nettoyée: ${sessionId}`);
        });
        
        return expiredSessions.length;
    }
}

module.exports = new GameInteractionHandler();