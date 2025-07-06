const { EmbedBuilder } = require('discord.js');

/**
 * Gestionnaire d'erreurs centralisé pour le bot Discord
 * Fournit des méthodes cohérentes pour gérer et reporter les erreurs
 */
class ErrorHandler {
    constructor() {
        this.errorTypes = {
            PERMISSION_DENIED: 'PERMISSION_DENIED',
            VALIDATION_FAILED: 'VALIDATION_FAILED',
            RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
            RATE_LIMITED: 'RATE_LIMITED',
            EXTERNAL_SERVICE: 'EXTERNAL_SERVICE',
            INTERNAL_ERROR: 'INTERNAL_ERROR',
            USER_INPUT: 'USER_INPUT',
            CONFIGURATION: 'CONFIGURATION'
        };

        this.errorMessages = {
            [this.errorTypes.PERMISSION_DENIED]: '🚫 Vous n\'avez pas les permissions nécessaires pour cette action.',
            [this.errorTypes.VALIDATION_FAILED]: '❌ Les données fournies ne sont pas valides.',
            [this.errorTypes.RESOURCE_NOT_FOUND]: '🔍 La ressource demandée est introuvable.',
            [this.errorTypes.RATE_LIMITED]: '⏰ Vous allez trop vite ! Veuillez patienter.',
            [this.errorTypes.EXTERNAL_SERVICE]: '🌐 Service externe indisponible. Réessayez plus tard.',
            [this.errorTypes.INTERNAL_ERROR]: '⚠️ Une erreur interne s\'est produite.',
            [this.errorTypes.USER_INPUT]: '📝 Format d\'entrée incorrect.',
            [this.errorTypes.CONFIGURATION]: '⚙️ Erreur de configuration du bot.'
        };
    }

    /**
     * Gère une erreur d'interaction Discord de manière cohérente
     * @param {import('discord.js').Interaction} interaction - L'interaction Discord
     * @param {Error|string} error - L'erreur à gérer
     * @param {string} errorType - Type d'erreur (optionnel)
     * @param {Object} options - Options supplémentaires
     */
    async handleInteractionError(interaction, error, errorType = this.errorTypes.INTERNAL_ERROR, options = {}) {
        const { 
            ephemeral = true, 
            customMessage = null, 
            showDetails = false,
            logToConsole = true 
        } = options;

        // Log l'erreur pour debug
        if (logToConsole) {
            console.error(`[ErrorHandler] ${errorType}:`, error);
        }

        // Préparer le message d'erreur
        const errorMessage = customMessage || this.errorMessages[errorType] || this.errorMessages[this.errorTypes.INTERNAL_ERROR];
        const embed = this.createErrorEmbed(errorMessage, error, showDetails);

        // Envoyer la réponse selon l'état de l'interaction
        try {
            if (interaction.replied) {
                await interaction.followUp({ embeds: [embed], ephemeral });
            } else if (interaction.deferred) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral });
            }
        } catch (replyError) {
            console.error('[ErrorHandler] Impossible d\'envoyer la réponse d\'erreur:', replyError);
        }
    }

    /**
     * Crée un embed d'erreur formaté
     * @param {string} message - Message d'erreur principal
     * @param {Error|string} error - Détails de l'erreur
     * @param {boolean} showDetails - Afficher les détails techniques
     */
    createErrorEmbed(message, error, showDetails = false) {
        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('Erreur')
            .setDescription(message)
            .setTimestamp();

        if (showDetails && error) {
            const details = typeof error === 'string' ? error : error.message;
            embed.addFields({ name: 'Détails', value: `\`\`\`${details}\`\`\``, inline: false });
        }

        return embed;
    }

    /**
     * Valide les permissions d'un utilisateur
     * @param {import('discord.js').GuildMember} member - Membre à vérifier
     * @param {bigint|bigint[]} permissions - Permission(s) requise(s)
     * @param {import('discord.js').Interaction} interaction - Interaction pour la réponse d'erreur
     * @returns {boolean} True si l'utilisateur a les permissions
     */
    async validatePermissions(member, permissions, interaction = null) {
        const hasPermission = Array.isArray(permissions) 
            ? permissions.some(perm => member.permissions.has(perm))
            : member.permissions.has(permissions);

        if (!hasPermission && interaction) {
            await this.handleInteractionError(interaction, 'Permissions insuffisantes', this.errorTypes.PERMISSION_DENIED);
        }

        return hasPermission;
    }

    /**
     * Valide l'entrée utilisateur avec un schéma personnalisé
     * @param {any} input - Données à valider
     * @param {Function} validator - Fonction de validation
     * @param {import('discord.js').Interaction} interaction - Interaction pour la réponse d'erreur
     * @returns {boolean} True si la validation réussit
     */
    async validateUserInput(input, validator, interaction = null) {
        try {
            const isValid = validator(input);
            if (!isValid && interaction) {
                await this.handleInteractionError(interaction, 'Format d\'entrée invalide', this.errorTypes.USER_INPUT);
            }
            return isValid;
        } catch (error) {
            if (interaction) {
                await this.handleInteractionError(interaction, error, this.errorTypes.VALIDATION_FAILED);
            }
            return false;
        }
    }

    /**
     * Wrapper sécurisé pour les opérations asynchrones
     * @param {Function} operation - Opération à exécuter
     * @param {import('discord.js').Interaction} interaction - Interaction pour la gestion d'erreur
     * @param {string} errorType - Type d'erreur par défaut
     */
    async safeExecute(operation, interaction = null, errorType = this.errorTypes.INTERNAL_ERROR) {
        try {
            return await operation();
        } catch (error) {
            if (interaction) {
                await this.handleInteractionError(interaction, error, errorType);
            } else {
                console.error(`[ErrorHandler] ${errorType}:`, error);
            }
            return null;
        }
    }

    /**
     * Gère les erreurs de rate limiting
     * @param {import('discord.js').Interaction} interaction - L'interaction
     * @param {number} retryAfter - Temps d'attente en secondes
     */
    async handleRateLimit(interaction, retryAfter) {
        const message = `⏰ Trop de requêtes ! Réessayez dans ${retryAfter} seconde(s).`;
        await this.handleInteractionError(interaction, message, this.errorTypes.RATE_LIMITED, {
            customMessage: message
        });
    }

    /**
     * Log structuré pour les erreurs
     * @param {string} context - Contexte de l'erreur
     * @param {Error|string} error - L'erreur
     * @param {Object} metadata - Métadonnées supplémentaires
     */
    logError(context, error, metadata = {}) {
        const timestamp = new Date().toISOString();
        const errorData = {
            timestamp,
            context,
            error: typeof error === 'string' ? error : {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            metadata
        };

        console.error(`[${timestamp}] [${context}]`, JSON.stringify(errorData, null, 2));
    }
}

// Export d'une instance singleton
module.exports = new ErrorHandler();