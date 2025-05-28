const { createAccessRequestModal } = require('../modals/accessRequestModal');
const configManager = require('../utils/configManager');
const { handleRefusalModal } = require('./refusalHandler');
const ticketHandler = require('./ticketHandler');
const { closeModmail } = require('./modmailHandler');
const { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { handleGameButtons } = require('../utils/gameInteractionUtils');
const { safeErrorReply } = require('../utils/interactionUtils');
const { getMessage } = require('../utils/messageManager');

async function handleButtonInteraction(interaction) {
    if (interaction.replied || interaction.deferred) {
        return;
    }

    // Demande d'accès
    if (interaction.customId === 'request_access_button') {
        const modal = createAccessRequestModal();
        await interaction.showModal(modal);
    }
    // Acceptation du règlement (avec ou sans rôles personnalisés)
    else if (interaction.customId === 'accept_rules_button' || interaction.customId.startsWith('accept_rules_button_')) {
        let rolesToAssign = [];
        
        if (interaction.customId.startsWith('accept_rules_button_')) {
            try {
                const encodedRoles = interaction.customId.replace('accept_rules_button_', '');
                const decodedRoles = Buffer.from(encodedRoles, 'base64').toString();
                rolesToAssign = decodedRoles.split(',').map(id => id.trim()).filter(id => id);
            } catch (error) {
                console.error('Erreur lors du décodage des rôles personnalisés:', error);
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
            console.error('Erreur critique: Aucun rôle configuré pour accept_rules_button.');
            return interaction.reply({ content: getMessage('rulesAcceptance.configError'), flags: MessageFlags.Ephemeral });
        }
        
        const member = interaction.member;
        let addedRoles = [];
        let removedRoles = [];
        let errors = [];
        
        try {
            // Vérifier les rôles à ne pas ajouter si l'utilisateur a déjà un rôle spécifique
            const rolesToCheckBeforeAdd = configManager.rolesToCheckBeforeAdd || [];
            const hasBlockingRole = rolesToCheckBeforeAdd.some(roleId => member.roles.cache.has(roleId));

            if (hasBlockingRole) {
                // Si l'utilisateur a un rôle bloquant, ne pas ajouter les rôles
                // On peut choisir d'envoyer un message ou non
                return interaction.reply({ content: getMessage('rulesAcceptance.alreadyHasRole'), flags: MessageFlags.Ephemeral });
            }

            // Retirer les rôles configurés
            const rolesToRemoveOnAccept = configManager.rolesToRemoveOnAccept || [];
            for (const roleId of rolesToRemoveOnAccept) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (role && member.roles.cache.has(roleId)) {
                    await member.roles.remove(role);
                    removedRoles.push(role.name);
                }
            }

            // Ajouter les rôles configurés
            for (const roleId of rolesToAssign) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (!role) {
                    errors.push(`Rôle introuvable: ${roleId}`);
                    continue;
                }
                
                if (!member.roles.cache.has(roleId)) { // N'ajouter que si le rôle n'est pas déjà présent
                    await member.roles.add(role);
                    addedRoles.push(role.name);
                }
            }
            
            let replyMessage = '';
            if (addedRoles.length > 0) {
                replyMessage += getMessage('rulesAcceptance.successAddedRoles', { roles: addedRoles.join(', ') });
            }
            if (removedRoles.length > 0) {
                replyMessage += getMessage('rulesAcceptance.successRemovedRoles', { roles: removedRoles.join(', ') });
            }
            if (errors.length > 0) {
                replyMessage += getMessage('rulesAcceptance.errorRoles', { errors: errors.join(', ')});
            }
            
            if (addedRoles.length > 0) {
                replyMessage += getMessage('rulesAcceptance.thankYou');
            }
            
            await interaction.reply({ content: replyMessage || getMessage('rulesAcceptance.actionCompleted'), flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error(`Erreur lors de la gestion des rôles pour ${member.user.tag}:`, error);
            await interaction.reply({ content: getMessage('errors.genericActionErrorWithCode', { code: error.code }), flags: MessageFlags.Ephemeral });
        }
    }
    else if (interaction.customId.startsWith('accept_access_') || interaction.customId.startsWith('refuse_access_')) {
        function isValidId(id) {
            return typeof id === 'string' && /^\d+$/.test(id);
        }
        
        const validStaffRoleIds = configManager.getValidStaffRoleIds();
        
        const hasStaffRole = validStaffRoleIds.some(roleId =>
            interaction.member.roles.cache.has(roleId)
        );
        
        if (!hasStaffRole) {
            return interaction.reply({ content: getMessage('errors.noPermission'), flags: MessageFlags.Ephemeral });
        }
        const parts = interaction.customId.split('_');
        const action = parts[0];
        const userId = parts[parts.length -1];
        const originalRequester = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!originalRequester) {
            return interaction.reply({ content: getMessage('errors.userNotFound'), flags: MessageFlags.Ephemeral });
        }
        const originalEmbed = interaction.message.embeds[0];
        if (!originalEmbed) {
            return interaction.reply({ content: getMessage('errors.embedNotFound'), flags: MessageFlags.Ephemeral });
        }
        if (action === 'accept') {
            try {
                const accessRequestHandler = require('./accessRequestHandler');
                await accessRequestHandler.acceptAccessRequest(interaction, originalRequester, originalEmbed, userId);
            } catch (error) {
                console.error("Erreur lors de l'acceptation de la demande :", error);
                await interaction.reply({ content: getMessage('errors.accessRequestAcceptError'), flags: MessageFlags.Ephemeral });
            }
        } else if (action === 'refuse') {
            const refusalModal = new ModalBuilder().setCustomId(`refusal_reason_modal_${userId}_${interaction.message.id}`).setTitle('Motif du refus et sanction');
            const reasonInput = new TextInputBuilder().setCustomId('refusal_reason_input').setLabel('Motif du refus').setStyle(TextInputStyle.Paragraph).setRequired(true);
            const sanctionInput = new TextInputBuilder().setCustomId('refusal_sanction_input').setLabel('Sanction (aucune, kick, ban)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('aucune / kick / ban');
            refusalModal.addComponents(new ActionRowBuilder().addComponents(reasonInput), new ActionRowBuilder().addComponents(sanctionInput));
            await interaction.showModal(refusalModal);
        }
    }
    else if (interaction.customId === 'create_ticket_button' || interaction.customId.startsWith('create_ticket_button_') || interaction.customId.startsWith('soft_close_ticket_') || interaction.customId.startsWith('delete_ticket_') || interaction.customId.startsWith('transcript_ticket_')) {
        if (interaction.customId.startsWith('create_ticket_button_')) {
            try {
                const encodedRoles = interaction.customId.replace('create_ticket_button_', '');
                const decodedRoles = Buffer.from(encodedRoles, 'base64').toString();
                const customRoles = decodedRoles.split(',').map(id => id.trim()).filter(id => id);
                
                await ticketHandler.handleTicketInteraction(interaction, customRoles);
            } catch (error) {
                console.error('Erreur lors du décodage des rôles de ticket:', error);
                await ticketHandler.handleTicketInteraction(interaction);
            }
        } else {
            await ticketHandler.handleTicketInteraction(interaction);
        }
    }
    else if (interaction.customId.startsWith('modmail_close_') || interaction.customId.startsWith('modmail_delete_') || interaction.customId.startsWith('modmail_transcript_')) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        const channelId = parts[2];
        
        if (action === 'close') {
            const userId = interaction.channel.topic;
            await closeModmail(interaction, channelId, userId);
        } else if (action === 'delete' || action === 'transcript') {
            const ticketChannel = interaction.guild.channels.cache.get(channelId);
            if (!ticketChannel) {
                return interaction.reply({ content: getMessage('errors.modmailChannelNotFound'), flags: MessageFlags.Ephemeral });
            }
            
            if (action === 'delete') {
                await ticketHandler.deleteTicket(interaction, ticketChannel);
            } else if (action === 'transcript') {
                await ticketHandler.transcriptTicket(interaction, ticketChannel);
            }
        }
    }
    else if (interaction.customId.includes('_replay_') || interaction.customId.includes('_review_')) {
        await handleGameButtons(interaction);
    }
    else if (interaction.customId.startsWith('morpion_')) {
        const { activeGames, handlePlayerMove } = require('../commands/games/board/morpion.js');
        const parts = interaction.customId.split('_');
        const row = parseInt(parts[1]);
        const col = parseInt(parts[2]);
        const gameId = `${interaction.channel.id}-${interaction.message.interaction.user.id}-${interaction.message.embeds[0].title.includes('vs IA') ? 'AI' : interaction.message.embeds[0].title.split(' vs ')[1].split(' ')[0].replace('(', '')}`;
        const game = activeGames.get(gameId);

        if (game) {
            await interaction.deferUpdate();
            await handlePlayerMove(game, row, col, interaction.user);
        } else {
            await interaction.reply({ content: getMessage('errors.gameNotFound'), ephemeral: true });
        }
    }
}

module.exports = {
    handleButtonInteraction
};