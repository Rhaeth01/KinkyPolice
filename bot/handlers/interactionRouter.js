/**
 * @file handlers/interactionRouter.js
 * @description Router principal pour distribuer les interactions vers les handlers spécialisés
 * Résout les conflits d'interactions en routant selon des patterns de customId
 */

const ConfigInteractionManager = require('../commands/config/handlers/configInteractionManager');

// Protection contre les interactions en double
const processingInteractions = new Set();

class InteractionRouter {
    constructor() {
        // Initialisation paresseuse des handlers pour éviter les dépendances circulaires
        this.handlers = {
            game: null,
            moderation: null,
            general: null
        };
        
        // Patterns de routage avec priorité (ordre important)
        this.routingRules = [
            // Configuration - priorité la plus haute
            {
                patterns: ['config_', 'games_', 'confession_', 'webhook_'],
                handler: 'config',
                description: 'Configuration du bot'
            },
            // Jeux - priorité haute (géré par collectors)
            {
                patterns: ['blackjack_', 'pile_', 'face_', 'col_', 'join_game_', 'guess_', 'anagram_', 'memory_', 'word_', 'quiz_', 'mystery_', 'morpion_', '_modal_', '_replay_', '_review_', 'game_replay_', 'game_review_', 'pendu_modal_', 'letter_', 'guess_modal_', 'anagram_modal_', 'memory_modal_', 'quiz_modal_', 'mystery_modal_'],
                handler: 'skip',
                description: 'Interactions de jeux (géré par collectors)'
            },
            // Modération - priorité moyenne
            {
                patterns: ['ticket_', 'modmail_', 'access_request_', 'request_access_', 'accept_rules_', 'refuse_', 'approve_', 'tourette_'],
                handler: 'moderation',
                description: 'Modération et administration'
            },
            // Vote - priorité spéciale (géré par les commands directement)
            {
                patterns: ['vote_'],
                handler: 'skip',
                description: 'Vote (géré par collector)'
            },
            // Général - priorité la plus basse (fallback)
            {
                patterns: ['*'],
                handler: 'general',
                description: 'Interactions générales'
            }
        ];
    }

    /**
     * Initialise les handlers de façon paresseuse
     */
    initializeHandlers() {
        if (!this.handlers.game) {
            try {
                this.handlers.game = require('./gameInteractionHandler');
            } catch (error) {
                console.log('[ROUTER] GameInteractionHandler pas encore disponible');
            }
        }
        
        if (!this.handlers.moderation) {
            try {
                this.handlers.moderation = require('./moderationInteractionHandler');
            } catch (error) {
                console.log('[ROUTER] ModerationInteractionHandler pas encore disponible');
            }
        }
        
        if (!this.handlers.general) {
            try {
                this.handlers.general = require('./generalInteractionHandler');
            } catch (error) {
                console.log('[ROUTER] GeneralInteractionHandler pas encore disponible');
            }
        }
    }

    /**
     * Détermine le handler approprié pour une interaction
     * @param {string} customId - L'ID personnalisé de l'interaction
     * @returns {string} Le nom du handler à utiliser
     */
    getHandlerForInteraction(customId) {
        for (const rule of this.routingRules) {
            for (const pattern of rule.patterns) {
                if (pattern === '*' || customId.startsWith(pattern)) {
                    console.log(`[ROUTER] ${customId} → ${rule.handler} (${rule.description})`);
                    return rule.handler;
                }
            }
        }
        return 'general'; // Fallback
    }

    /**
     * Route une interaction vers le handler approprié
     * @param {import('discord.js').Interaction} interaction - L'interaction à router
     */
    async routeInteraction(interaction) {
        // Protection contre les interactions en double
        const interactionKey = `${interaction.user.id}_${interaction.customId}_${interaction.id}`;
        if (processingInteractions.has(interactionKey)) {
            console.log(`[ROUTER] Interaction déjà en traitement: ${interaction.customId}`);
            return;
        }

        // Vérifier si l'interaction a déjà été traitée
        if (interaction.replied || interaction.deferred) {
            console.log(`[ROUTER] Interaction déjà traitée: ${interaction.customId}`);
            return;
        }

        processingInteractions.add(interactionKey);

        try {
            this.initializeHandlers();
            
            const handlerName = this.getHandlerForInteraction(interaction.customId);
            
            switch (handlerName) {
                case 'config':
                    await ConfigInteractionManager.handleInteraction(interaction);
                    break;
                    
                case 'game':
                    if (this.handlers.game) {
                        await this.handlers.game.handleInteraction(interaction);
                    } else {
                        console.log(`[ROUTER] GameHandler non disponible pour: ${interaction.customId}`);
                        await this.sendFallbackResponse(interaction);
                    }
                    break;
                    
                case 'moderation':
                    if (this.handlers.moderation) {
                        await this.handlers.moderation.handleInteraction(interaction);
                    } else {
                        console.log(`[ROUTER] ModerationHandler non disponible pour: ${interaction.customId}`);
                        await this.sendFallbackResponse(interaction);
                    }
                    break;
                    
                case 'general':
                    if (this.handlers.general) {
                        await this.handlers.general.handleInteraction(interaction);
                    } else {
                        console.log(`[ROUTER] GeneralHandler non disponible pour: ${interaction.customId}`);
                        await this.sendFallbackResponse(interaction);
                    }
                    break;
                    
                case 'skip':
                    console.log(`[ROUTER] Interaction ignorée (gérée par collector): ${interaction.customId}`);
                    break;
                    
                default:
                    console.log(`[ROUTER] Handler inconnu '${handlerName}' pour: ${interaction.customId}`);
                    await this.sendFallbackResponse(interaction);
            }
            
        } catch (error) {
            console.error(`[ROUTER] Erreur lors du routage de ${interaction.customId}:`, error);
            
            // Gestion spécifique des erreurs d'interactions expirées
            if (error.code === 10062) {
                console.log(`[ROUTER] Interaction expirée ignorée: ${interaction.customId}`);
                return; // Ne pas tenter de répondre à une interaction expirée
            }
            
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ Une erreur est survenue lors du traitement de votre demande.',
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error(`[ROUTER] Erreur de réponse d'urgence:`, replyError);
                    // Si c'est aussi une erreur d'expiration, l'ignorer silencieusement
                    if (replyError.code !== 10062) {
                        console.error(`[ROUTER] Erreur critique non-expiration:`, replyError);
                    }
                }
            }
        } finally {
            // Nettoyer la protection après 5 secondes
            setTimeout(() => {
                processingInteractions.delete(interactionKey);
            }, 5000);
        }
    }

    /**
     * Envoie une réponse de fallback quand aucun handler n'est disponible
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async sendFallbackResponse(interaction) {
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: '⚠️ Cette fonctionnalité est temporairement indisponible.',
                    ephemeral: true
                });
            } catch (error) {
                console.error(`[ROUTER] Erreur de réponse fallback:`, error);
            }
        }
    }

    /**
     * Obtient des statistiques sur le routage
     * @returns {Object} Statistiques de routage
     */
    getRoutingStats() {
        return {
            activeInteractions: processingInteractions.size,
            availableHandlers: {
                config: true,
                game: !!this.handlers.game,
                moderation: !!this.handlers.moderation,
                general: !!this.handlers.general
            }
        };
    }
}

// Export d'une instance singleton
module.exports = new InteractionRouter();