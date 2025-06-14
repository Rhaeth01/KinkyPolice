/**
 * @file handlers/moderationInteractionHandler.js
 * @description Handler spécialisé pour les interactions de modération
 * Gère les tickets, modmail, demandes d'accès, validation de règles, etc.
 */

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { createAccessRequestModal } = require('../modals/accessRequestModal');
const configManager = require('../utils/configManager');
const { closeModmail } = require('../handlers/modmailHandler');
const accessRequestHandler = require('../handlers/accessRequestHandler');
const ticketHandler = require('../handlers/ticketHandler');
const { getMessage } = require('../utils/messageManager');
const { touretteUsers } = require('../commands/tourette.js');

class ModerationInteractionHandler {
    constructor() {
        // Protection contre les interactions rapides
        this.cooldowns = new Map();
        this.processingRequests = new Set();
    }

    /**
     * Vérifie le cooldown pour un utilisateur
     * @param {string} userId - L'ID de l'utilisateur
     * @param {number} cooldownMs - Durée du cooldown en millisecondes
     * @returns {boolean} True si l'utilisateur est en cooldown
     */
    isOnCooldown(userId, cooldownMs = 3000) {
        const now = Date.now();
        const lastUsed = this.cooldowns.get(userId);
        
        if (lastUsed && now - lastUsed < cooldownMs) {
            return true;
        }
        
        this.cooldowns.set(userId, now);
        return false;
    }

    /**
     * Handler principal pour les interactions de modération
     * @param {import('discord.js').Interaction} interaction - L'interaction à traiter
     */
    async handleInteraction(interaction) {
        const customId = interaction.customId;
        const userId = interaction.user.id;
        
        console.log(`[MODERATION HANDLER] Traitement de ${customId} par ${interaction.user.tag}`);

        // Protection contre les interactions rapides
        if (this.isOnCooldown(userId)) {
            console.log(`[MODERATION HANDLER] Cooldown actif pour ${interaction.user.tag}`);
            return;
        }

        // Protection contre les double-clics
        const requestKey = `${userId}_${customId}`;
        if (this.processingRequests.has(requestKey)) {
            console.log(`[MODERATION HANDLER] Requête déjà en traitement: ${customId}`);
            return;
        }

        this.processingRequests.add(requestKey);

        try {
            // Router vers la méthode appropriée
            if (customId === 'request_access_button') {
                await this.handleAccessRequest(interaction);
            }
            else if (customId === 'accept_rules_button' || customId.startsWith('accept_rules_button_')) {
                await this.handleRulesAcceptance(interaction);
            }
            else if (customId.startsWith('approve_')) {
                await this.handleApproval(interaction);
            }
            else if (customId.startsWith('refuse_')) {
                await this.handleRefusal(interaction);
            }
            else if (customId.startsWith('ticket_')) {
                await this.handleTicketInteraction(interaction);
            }
            else if (customId.startsWith('modmail_')) {
                await this.handleModmailInteraction(interaction);
            }
            else if (customId.startsWith('tourette_')) {
                await this.handleTouretteInteraction(interaction);
            }
            else {
                console.log(`[MODERATION HANDLER] Interaction non reconnue: ${customId}`);
                await this.sendUnknownInteractionResponse(interaction);
            }

        } catch (error) {
            console.error(`[MODERATION HANDLER] Erreur lors du traitement de ${customId}:`, error);
            
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ Une erreur est survenue lors du traitement de votre demande.',
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error(`[MODERATION HANDLER] Erreur de réponse d'urgence:`, replyError);
                }
            }
        } finally {
            // Nettoyer la protection après 5 secondes
            setTimeout(() => {
                this.processingRequests.delete(requestKey);
            }, 5000);
        }
    }

    /**
     * Gère les demandes d'accès
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async handleAccessRequest(interaction) {
        console.log(`[MODERATION HANDLER] Demande d'accès de ${interaction.user.tag}`);
        
        const modal = createAccessRequestModal();
        await interaction.showModal(modal);
    }

    /**
     * Gère l'acceptation des règles
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async handleRulesAcceptance(interaction) {
        console.log(`[MODERATION HANDLER] Acceptation des règles par ${interaction.user.tag}`);
        
        let rolesToAssign = [];
        
        // Vérifier s'il y a des rôles personnalisés encodés
        if (interaction.customId.startsWith('accept_rules_button_')) {
            try {
                const encodedRoles = interaction.customId.replace('accept_rules_button_', '');
                const decodedRoles = Buffer.from(encodedRoles, 'base64').toString();
                rolesToAssign = decodedRoles.split(',').map(id => id.trim()).filter(id => id);
            } catch (error) {
                console.error('[MODERATION HANDLER] Erreur lors du décodage des rôles personnalisés:', error);
            }
        }
        
        // Si aucun rôle personnalisé, utiliser le rôle par défaut
        if (rolesToAssign.length === 0) {
            const reglesValidesId = configManager.reglesValidesId;
            if (reglesValidesId) {
                rolesToAssign = [reglesValidesId];
            }
        }
        
        if (rolesToAssign.length === 0) {
            console.error('[MODERATION HANDLER] Erreur critique: Aucun rôle configuré pour accept_rules_button.');
            return interaction.reply({ 
                content: getMessage('rulesAcceptance.configError'), 
                ephemeral: true 
            });
        }
        
        const member = interaction.member;
        let addedRoles = [];
        let removedRoles = [];
        let errors = [];
        
        // Traitement des rôles
        for (const roleId of rolesToAssign) {
            try {
                const role = await interaction.guild.roles.fetch(roleId);
                if (!role) {
                    errors.push(`Rôle ${roleId} introuvable`);
                    continue;
                }
                
                if (member.roles.cache.has(roleId)) {
                    await member.roles.remove(role);
                    removedRoles.push(role.name);
                } else {
                    await member.roles.add(role);
                    addedRoles.push(role.name);
                }
            } catch (error) {
                console.error(`[MODERATION HANDLER] Erreur attribution rôle ${roleId}:`, error);
                errors.push(`Erreur avec le rôle ${roleId}`);
            }
        }
        
        // Construire la réponse
        let responseMessage = '';
        if (addedRoles.length > 0) {
            responseMessage += `✅ Rôles ajoutés: ${addedRoles.join(', ')}\n`;
        }
        if (removedRoles.length > 0) {
            responseMessage += `➖ Rôles retirés: ${removedRoles.join(', ')}\n`;
        }
        if (errors.length > 0) {
            responseMessage += `❌ Erreurs: ${errors.join(', ')}`;
        }
        
        if (!responseMessage) {
            responseMessage = '⚠️ Aucun changement de rôle effectué.';
        }
        
        await interaction.reply({ content: responseMessage, ephemeral: true });
    }

    /**
     * Gère les approbations
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async handleApproval(interaction) {
        console.log(`[MODERATION HANDLER] Approbation par ${interaction.user.tag}: ${interaction.customId}`);
        
        // Router vers le handler approprié selon le préfixe
        if (interaction.customId.startsWith('approve_access_')) {
            await accessRequestHandler.handleApproval(interaction);
        } else {
            console.log(`[MODERATION HANDLER] Type d'approbation non géré: ${interaction.customId}`);
            await this.sendUnknownInteractionResponse(interaction);
        }
    }

    /**
     * Gère les refus
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async handleRefusal(interaction) {
        console.log(`[MODERATION HANDLER] Refus par ${interaction.user.tag}: ${interaction.customId}`);
        
        // Router vers le handler approprié selon le préfixe
        if (interaction.customId.startsWith('refuse_access_')) {
            await accessRequestHandler.handleRefusal(interaction);
        } else {
            console.log(`[MODERATION HANDLER] Type de refus non géré: ${interaction.customId}`);
            await this.sendUnknownInteractionResponse(interaction);
        }
    }

    /**
     * Gère les interactions de tickets
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async handleTicketInteraction(interaction) {
        console.log(`[MODERATION HANDLER] Ticket par ${interaction.user.tag}: ${interaction.customId}`);
        
        // Router vers le ticketHandler existant
        await ticketHandler.handleTicketInteraction(interaction);
    }

    /**
     * Gère les interactions de modmail
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async handleModmailInteraction(interaction) {
        console.log(`[MODERATION HANDLER] Modmail par ${interaction.user.tag}: ${interaction.customId}`);
        
        if (interaction.customId === 'modmail_close') {
            await closeModmail(interaction);
        } else {
            console.log(`[MODERATION HANDLER] Interaction modmail non gérée: ${interaction.customId}`);
            await this.sendUnknownInteractionResponse(interaction);
        }
    }

    /**
     * Gère les interactions des boutons tourette
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async handleTouretteInteraction(interaction) {
        console.log(`[MODERATION HANDLER] Tourette par ${interaction.user.tag}: ${interaction.customId}`);
        
        const [action, subAction, userId] = interaction.customId.split('_');
        
        if (action !== 'tourette') {
            await this.sendUnknownInteractionResponse(interaction);
            return;
        }
        
        // Vérifier les permissions
        if (!interaction.member.permissions.has('ModerateMembers')) {
            return interaction.reply({
                content: '❌ Vous devez avoir la permission de modérer les membres pour utiliser cette fonction.',
                ephemeral: true
            });
        }
        
        const guildId = interaction.guild.id;
        const key = `${guildId}-${userId}`;
        
        if (subAction === 'disable') {
            if (!touretteUsers.has(key)) {
                return interaction.reply({
                    content: '❌ Cet utilisateur n\'est plus affecté par la tourette.',
                    ephemeral: true
                });
            }
            
            touretteUsers.delete(key);
            
            const user = await interaction.client.users.fetch(userId).catch(() => null);
            const username = user ? user.username : 'Utilisateur inconnu';
            
            await interaction.reply({
                content: `🟢 Mode Tourette désactivé pour **${username}** par ${interaction.user}`,
                ephemeral: false
            });
            
            console.log(`[TOURETTE] Désactivé via bouton pour ${username} (${userId}) par ${interaction.user.username}`);
            
        } else if (subAction === 'status') {
            if (!touretteUsers.has(key)) {
                return interaction.reply({
                    content: '❌ Cet utilisateur n\'est plus affecté par la tourette.',
                    ephemeral: true
                });
            }
            
            const touretteData = touretteUsers.get(key);
            const remainingTime = Math.max(0, Math.floor((touretteData.endTime - Date.now()) / 1000 / 60));
            const elapsedTime = Math.floor((Date.now() - touretteData.startTime) / 1000 / 60);
            
            const user = await interaction.client.users.fetch(userId).catch(() => null);
            const username = user ? user.username : 'Utilisateur inconnu';
            
            await interaction.reply({
                content: `📊 **Statut Tourette pour ${username}**\n` +
                        `⏱️ Temps restant: ${remainingTime} minute${remainingTime > 1 ? 's' : ''}\n` +
                        `📅 Actif depuis: ${elapsedTime} minute${elapsedTime > 1 ? 's' : ''}\n` +
                        `📊 Messages remplacés: ${touretteData.messageCount}`,
                ephemeral: true
            });
        } else {
            await this.sendUnknownInteractionResponse(interaction);
        }
    }

    /**
     * Envoie une réponse pour une interaction non reconnue
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async sendUnknownInteractionResponse(interaction) {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Cette action de modération n\'est pas reconnue.',
                ephemeral: true
            });
        }
    }

    /**
     * Obtient des statistiques sur les interactions de modération
     * @returns {Object} Statistiques de modération
     */
    getModerationStats() {
        return {
            activeCooldowns: this.cooldowns.size,
            processingRequests: this.processingRequests.size
        };
    }

    /**
     * Nettoie les cooldowns expirés
     */
    cleanupExpiredCooldowns() {
        const now = Date.now();
        const expiredUsers = [];
        
        for (const [userId, lastUsed] of this.cooldowns.entries()) {
            if (now - lastUsed > 60000) { // Nettoyer après 1 minute
                expiredUsers.push(userId);
            }
        }
        
        expiredUsers.forEach(userId => this.cooldowns.delete(userId));
        return expiredUsers.length;
    }
}

module.exports = new ModerationInteractionHandler();