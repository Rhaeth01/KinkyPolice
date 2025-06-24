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
const { touretteUsers } = require('../commands/tourette.js');
const ConfigInteractionManager = require('../commands/config/handlers/configInteractionManager');
const interactionRouter = require('../handlers/interactionRouter');

const cooldowns = new Map();
const processingInteractions = new Set();

// Fonction pour gérer la modification de champ modal
async function handleEditModalField(interaction) {
    try {
        const fieldIndex = parseInt(interaction.customId.replace('edit_modal_field_', ''));
        
        const label = interaction.fields.getTextInputValue('field_label');
        const customId = interaction.fields.getTextInputValue('field_custom_id');
        const placeholder = interaction.fields.getTextInputValue('field_placeholder') || '';
        const style = interaction.fields.getTextInputValue('field_style');
        const required = interaction.fields.getTextInputValue('field_required').toLowerCase() === 'true';

        // Validation
        if (!['Short', 'Paragraph'].includes(style)) {
            return interaction.reply({
                content: '❌ Le type de champ doit être "Short" ou "Paragraph".',
                ephemeral: true
            });
        }

        // Récupérer la configuration
        const config = configManager.getConfig();
        const entryData = config.entry || {};
        const entryModal = entryData.modal || { fields: [] };
        
        // Vérifier que l'index est valide
        if (!entryModal.fields || fieldIndex < 0 || fieldIndex >= entryModal.fields.length) {
            return interaction.reply({
                content: '❌ Champ introuvable.',
                ephemeral: true
            });
        }
        
        // Vérifier l'unicité de l'ID (sauf pour le champ actuel)
        if (entryModal.fields.some((field, idx) => idx !== fieldIndex && field.customId === customId)) {
            return interaction.reply({
                content: '❌ Cet ID personnalisé existe déjà. Choisissez un ID unique.',
                ephemeral: true
            });
        }

        // Modifier le champ
        entryModal.fields[fieldIndex] = {
            customId,
            label,
            style,
            required,
            ...(placeholder && { placeholder })
        };

        // Sauvegarder
        entryData.modal = entryModal;
        await configManager.updateConfig('entry', entryData);

        await interaction.reply({
            content: `✅ **Champ modifié avec succès !**\n\n📝 **${label}**\n🔧 ID: \`${customId}\`\n📊 Type: ${style}\n${required ? '🔴' : '⚪'} ${required ? 'Obligatoire' : 'Optionnel'}`,
            ephemeral: true
        });

    } catch (error) {
        console.error('[CONFIG] Erreur lors de la modification du champ modal:', error);
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de la modification du champ.',
                ephemeral: true
            });
        }
    }
}

// Fonction pour gérer l'ajout de champ modal
async function handleAddModalField(interaction) {
    try {
        const label = interaction.fields.getTextInputValue('field_label');
        const customId = interaction.fields.getTextInputValue('field_custom_id');
        const placeholder = interaction.fields.getTextInputValue('field_placeholder') || '';
        const style = interaction.fields.getTextInputValue('field_style');
        const required = interaction.fields.getTextInputValue('field_required').toLowerCase() === 'true';

        // Validation
        if (!['Short', 'Paragraph'].includes(style)) {
            return interaction.reply({
                content: '❌ Le type de champ doit être "Short" ou "Paragraph".',
                ephemeral: true
            });
        }

        // Valider l'ID personnalisé (doit être unique)
        const config = configManager.getConfig();
        const entryData = config.entry || {};
        const entryModal = entryData.modal || { fields: [] };
        
        if (entryModal.fields && entryModal.fields.some(field => field.customId === customId)) {
            return interaction.reply({
                content: '❌ Cet ID personnalisé existe déjà. Choisissez un ID unique.',
                ephemeral: true
            });
        }

        // Ajouter le nouveau champ
        const newField = {
            customId,
            label,
            style,
            required,
            ...(placeholder && { placeholder })
        };

        if (!entryModal.fields) entryModal.fields = [];
        entryModal.fields.push(newField);

        // Sauvegarder dans la bonne structure
        entryData.modal = entryModal;
        await configManager.updateConfig('entry', entryData);

        await interaction.reply({
            content: `✅ **Champ ajouté avec succès !**\n\n📝 **${label}**\n🔧 ID: \`${customId}\`\n📊 Type: ${style}\n${required ? '🔴' : '⚪'} ${required ? 'Obligatoire' : 'Optionnel'}`,
            ephemeral: true
        });

    } catch (error) {
        console.error('[CONFIG] Erreur lors de l\'ajout du champ modal:', error);
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de l\'ajout du champ.',
                ephemeral: true
            });
        }
    }
}

// Fonction supprimée - gestion des boutons tourette déplacée vers moderationInteractionHandler

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
                const replyOptions = {
                    content: getMessage('errors.commandNotFoundDetailed', { commandName: interaction.commandName }), 
                    ephemeral: true 
                };
                if (interaction.deferred) {
                    return interaction.editReply(replyOptions);
                } else {
                    return interaction.reply(replyOptions);
                }
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
                        const replyOptions = {
                            content: `Veuillez attendre ${timeLeft.toFixed(1)} secondes avant de réutiliser la commande \`${command.data.name}\`.`,
                            ephemeral: true
                        };
                        if (interaction.deferred) {
                            return interaction.editReply(replyOptions);
                        } else {
                            return interaction.reply(replyOptions);
                        }
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
                // Vérifier si c'est un modal de configuration
                if (interaction.customId.startsWith('config_') || 
                    interaction.customId.startsWith('games_') ||
                    interaction.customId.startsWith('economy_') ||
                    interaction.customId.startsWith('general_') ||
                    interaction.customId.startsWith('logging_') ||
                    interaction.customId.startsWith('webhook_') ||
                    interaction.customId.startsWith('confession_')) {
                    await ConfigInteractionManager.handleInteraction(interaction);
                }
                // Autres gestionnaires de modals
                else if (interaction.customId.startsWith('refusal_reason_modal_')) {
                    await handleRefusalModal(interaction);
                }
                else if (interaction.customId.startsWith('ticket_close_reason_modal_') || interaction.customId.startsWith('ticket_delete_reason_modal_')) {
                    await ticketHandler.handleTicketModal(interaction);
                }
                else if (interaction.customId === 'access_request_modal') {
                    await accessRequestHandler.handleAccessRequestModal(interaction);
                }
                // Gestion du modal d'ajout de champ pour entryModal (ancien système)
                else if (interaction.customId === 'add_modal_field') {
                    await handleAddModalField(interaction);
                }
                // Gestion du modal de modification de champ (ancien système)
                else if (interaction.customId.startsWith('edit_modal_field_')) {
                    await handleEditModalField(interaction);
                }
                // Le modal de preview n'a pas besoin d'être géré (juste affiché)
                else if (interaction.customId === 'preview_modal') {
                    await interaction.reply({
                        content: '✅ C\'était un aperçu du modal d\'entrée. Les données n\'ont pas été sauvegardées.',
                        ephemeral: true
                    });
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
        // Gestion des boutons via le router
        else if (interaction.isButton()) {
            try {
                await interactionRouter.routeInteraction(interaction);
            } catch (error) {
                console.error(`[INTERACTION CREATE] Erreur lors du traitement du bouton ${interaction.customId}:`, error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Une erreur est survenue lors du traitement de votre demande.',
                        ephemeral: true
                    });
                }
            }
        }
        // Gestion des select menus via le router
        else if (interaction.isStringSelectMenu() || interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu()) {
            try {
                await interactionRouter.routeInteraction(interaction);
            } catch (error) {
                console.error(`[INTERACTION CREATE] Erreur lors du traitement du select menu ${interaction.customId}:`, error);
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