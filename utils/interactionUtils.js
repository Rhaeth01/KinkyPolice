const { MessageFlags } = require('discord.js'); // Assurez-vous que MessageFlags est importé

// Fonction de logging simple, peut être remplacée par un logger plus sophistiqué
function logError(message, error) {
    console.error(message, error);
}

const { getMessage } = require('./messageManager');

async function safeErrorReply(interaction, error, options = {}) {
    const {
        errorMessage = getMessage('errors.generic'),
        log = true,
        sendToChannel = false,
        channelErrorMessage = getMessage('errors.commandError', { commandName: interaction.commandName })
    } = options;

    if (log) {
        logError(`Erreur lors de l'exécution de la commande ${interaction.commandName}:`, error);
    }

    try {
        const timeElapsed = Date.now() - interaction.createdTimestamp;
        if (timeElapsed > 15 * 60 * 1000) {
            logError(`Interaction expirée (${timeElapsed}ms > 15min) pour ${interaction.commandName} - Pas de tentative de réponse.`);
            return;
        }
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: errorMessage,
                flags: MessageFlags.Ephemeral
            });
        } else if (interaction.deferred && !interaction.replied) {
            await interaction.editReply({
                content: errorMessage
            });
        } else {
            logError(`Interaction ${interaction.commandName} déjà traitée, pas de réponse d'erreur envoyée.`);
            
            if (sendToChannel && interaction.channel && error.code !== 10062 && error.code !== 40060 && timeElapsed < 5000) {
                try {
                    await interaction.channel.send({
                        content: channelErrorMessage
                    });
                } catch (channelError) {
                    logError(`Impossible d'envoyer un message d'erreur dans le canal pour ${interaction.commandName}:`, channelError);
                }
            }
        }
    } catch (replyError) {
        logError(`Impossible de répondre à l'interaction ${interaction.commandName}:`, replyError);
        
        if (replyError.code === 10062) {
            logError(`Interaction expirée (10062) pour ${interaction.commandName} - Temps écoulé: ${Date.now() - interaction.createdTimestamp}ms`);
        } else if (replyError.code === 40060) {
            logError(`Interaction déjà acquittée (40060) pour ${interaction.commandName}`);
        } else {
            logError(`Erreur inattendue lors de la réponse à l'interaction ${interaction.commandName}:`, replyError);
        }
    }
    
} // Fermeture de safeErrorReply

async function safeUpdateInteraction(interaction, options, isDeferred = false) {
    try {
        if (isDeferred) {
            await interaction.editReply(options);
        } else {
            await interaction.update(options);
        }
    } catch (error) {
        logError(`Impossible de mettre à jour l'interaction:`, error);
        // Fallback pour envoyer un nouveau message si l'interaction originale est expirée
        if (error.code === 10062 || error.code === 40060) {
            if (interaction.channel) {
                await interaction.channel.send(options).catch(e => logError('Fallback send failed:', e));
            }
        }
    }
}

async function safeSendMessage(interaction, options) {
    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(options);
        } else {
            await interaction.reply(options);
        }
    } catch (error) {
        logError(`Impossible d'envoyer un message:`, error);
    }
}


module.exports = {
    safeErrorReply,
    safeUpdateInteraction,
    safeSendMessage
};
