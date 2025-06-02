const { Events, MessageFlags } = require('discord.js');
const { Events, MessageFlags } = require('discord.js');
const { createAccessRequestModal } = require('../modals/accessRequestModal');
const configManager = require('../utils/configManager');
const mots = require('../data/mots.json');
const { closeModmail } = require('../handlers/modmailHandler');
const accessRequestHandler = require('../handlers/accessRequestHandler');
const { handleRefusalModal } = require('../handlers/refusalHandler');
const ticketHandler = require('../handlers/ticketHandler');
const { handleButtonInteraction } = require('../handlers/buttonHandler');
const { safeErrorReply } = require('../utils/interactionUtils');
const configInteractionHandler = require('../handlers/configInteractionHandler');
const { touretteUsers } = require('../commands/tourette.js');

const cooldowns = new Map();
const processingInteractions = new Set();

// Fonction pour gérer les boutons de la commande tourette
async function handleTouretteButton(interaction) {
    const [action, subAction, userId] = interaction.customId.split('_');
    
    if (action !== 'tourette') return false;
    
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
        
        const touretteData = touretteUsers.get(key);
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
    }
    
    return true;
}

// Fonction pour obtenir les messages (à adapter selon votre système)
function getMessage(key, params = {}) {
    // Implémentation basique - à adapter selon votre système de messages
    const messages = {
        'errors.commandNotFoundDetailed': `Aucune commande correspondant à ${params.commandName} n'a été trouvée.`
    };
    return messages[key] || key;
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Gestion des commandes slash
        if (interaction.isChatInputCommand()) {
            if (processingInteractions.has(interaction.id)) {
                return;
            }
            
            processingInteractions.add(interaction.id);
            
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`Aucune commande correspondant à ${interaction.commandName} n'a été trouvée.`);
                processingInteractions.delete(interaction.id);
                return interaction.reply({ 
                    content: getMessage('errors.commandNotFoundDetailed', { commandName: interaction.commandName }), 
                    ephemeral: true 
                });
            }
            
            // Gestion du cooldown
            if (command.cooldown) {
                if (!cooldowns.has(command.data.name)) cooldowns.set(command.data.name, new Map());
                const now = Date.now();
                const timestamps = cooldowns.get(command.data.name);
                const cooldownAmount = (command.cooldown) * 1000;
                
                if (timestamps.has(interaction.user.id)) {
                    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
                    if (now < expirationTime) {
                        const timeLeft = (expirationTime - now) / 1000;
                        return interaction.reply({
                            content: `Veuillez attendre ${timeLeft.toFixed(1)} secondes avant de réutiliser la commande \`${command.data.name}\`.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }
                
                timestamps.set(interaction.user.id, now);
                setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
            }
            
            // Exécution de la commande
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Erreur lors de l'exécution de ${interaction.commandName}:`, error);
                await safeErrorReply(interaction, error, { sendToChannel: true });
            } finally {
                processingInteractions.delete(interaction.id);
            }
        }
        // Gestion des modals
        else if (interaction.isModalSubmit()) {
            if (interaction.replied || interaction.deferred) {
                return;
            }
            
            try {
                // Gestionnaire moderne pour les modals de configuration
                if (interaction.customId.startsWith('config_modal_')) {
                    const handled = await configInteractionHandler.handleModalSubmit(interaction);
                    if (handled) return;
                }
                
                // Autres gestionnaires de modals
                if (interaction.customId.startsWith('refusal_reason_modal_')) {
                    await handleRefusalModal(interaction);
                }
                else if (interaction.customId.startsWith('ticket_close_reason_modal_') || interaction.customId.startsWith('ticket_delete_reason_modal_')) {
                    await ticketHandler.handleTicketModal(interaction);
                }
                else if (interaction.customId === 'access_request_modal') {
                    await accessRequestHandler.handleAccessRequestModal(interaction);
                }
                else {
                    console.log(`Modal non géré: ${interaction.customId}`);
                }
            } catch (error) {
                console.error(`Erreur lors du traitement du modal ${interaction.customId}:`, error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Une erreur est survenue lors du traitement de votre demande.',
                        ephemeral: true
                    });
                }
            }
        }
        // Gestion des boutons
        else if (interaction.isButton()) {
            try {
                // Vérifier si c'est un bouton de configuration
                if (interaction.customId.startsWith('config_')) {
                    const handled = await configInteractionHandler.handleButtonInteraction(interaction);
                    if (handled) return;
                }
                
                // Gestionnaire général des boutons
                await handleButtonInteraction(interaction);
            } catch (error) {
                console.error(`Erreur lors du traitement du bouton ${interaction.customId}:`, error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Une erreur est survenue lors du traitement de votre demande.',
                        ephemeral: true
                    });
                }
            }
        }
        // Gestion des select menus
        else if (interaction.isStringSelectMenu()) {
            try {
                // Gestionnaire général des select menus
                await handleButtonInteraction(interaction);
            } catch (error) {
                console.error(`Erreur lors du traitement du select menu ${interaction.customId}:`, error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Une erreur est survenue lors du traitement de votre demande.',
                        ephemeral: true
                    });
                }
            }
        }
    }
};