
const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags, AttachmentBuilder } = require('discord.js');
const { createAccessRequestModal } = require('../modals/accessRequestModal');
const configManager = require('../utils/configManager');
const mots = require('../data/mots.json');
const { closeModmail } = require('../handlers/modmailHandler');
const accessRequestHandler = require('../handlers/accessRequestHandler');
const { handleRefusalModal } = require('../handlers/refusalHandler');
const ticketHandler = require('../handlers/ticketHandler');
const { handleButtonInteraction } = require('../handlers/buttonHandler');
const { safeErrorReply } = require('../utils/interactionUtils');

const cooldowns = new Map();
const processingInteractions = new Set();

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            if (processingInteractions.has(interaction.id)) {
                return;
            }
            
            processingInteractions.add(interaction.id);
            
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`Aucune commande correspondant à ${interaction.commandName} n'a été trouvée.`);
                processingInteractions.delete(interaction.id);
                return interaction.reply({ content: getMessage('errors.commandNotFoundDetailed', { commandName: interaction.commandName }), ephemeral: true });
            }
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
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Erreur l'exécution de ${interaction.commandName}:`, error);
                await safeErrorReply(interaction, error, { sendToChannel: true });
            } finally {
                processingInteractions.delete(interaction.id);
            }
        }
        else if (interaction.isModalSubmit()) {
            if (interaction.replied || interaction.deferred) {
                return;
            }
            
            if (interaction.customId.startsWith('refusal_reason_modal_')) {
                await handleRefusalModal(interaction);
            }
            else if (interaction.customId.startsWith('ticket_close_reason_modal_') || interaction.customId.startsWith('ticket_delete_reason_modal_')) {
                await ticketHandler.handleTicketModal(interaction);
            }
            else if (interaction.customId === 'access_request_modal') {
                await accessRequestHandler.handleAccessRequestModal(interaction);
            }
        }
        else if (interaction.isButton()) {
            await handleButtonInteraction(interaction);
        }
    }
}
