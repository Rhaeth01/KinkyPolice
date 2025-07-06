// Module spécialisé pour la gestion du ModMail

const { ChannelType, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');

const modMailSessions = new Map(); // Déplacé ici

async function closeModmail(interaction, channelIdToClose, userId) {
    const modmailChannelToClose = interaction.guild.channels.cache.get(channelIdToClose);
    if (!modmailChannelToClose) {
        return interaction.reply({ content: "Impossible de trouver le salon ModMail à fermer.", flags: 64 });
    }
    let userToNotify;
    try {
        userToNotify = await interaction.client.users.fetch(userId);
    } catch (err) {
        userToNotify = null;
    }
    if (userToNotify) {
        try {
            await userToNotify.send({ content: "Votre session ModMail a été fermée par un membre du staff." });
        } catch (err) {
            // On ignore l'échec d'envoi de DM
        }
    }
    await interaction.reply({ content: `Le salon ModMail ${modmailChannelToClose.name} va être fermé...`, ephemeral: false });
    await modmailChannelToClose.delete(`ModMail fermé par ${interaction.user.tag}.`);

    // Supprimer la session de la Map
    modMailSessions.delete(userId); // Supprime la session par l'ID de l'utilisateur
    modMailSessions.delete(channelIdToClose); // Supprime la session par l'ID du canal (si vous l'utilisez comme clé)

    // Log
    const logChannel = interaction.guild.channels.cache.get(configManager.modLogChannelId);
    if (logChannel) {
        const logEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('ModMail Fermé')
            .setDescription(`Le salon ModMail pour ${userToNotify ? userToNotify.tag : `Utilisateur ID ${userId}`} (Salon: ${modmailChannelToClose.name}) a été fermé par ${interaction.user.tag}.`)
            .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
    }
}

// Fonctions pour gérer les sessions ModMail
function addModmailSession(userId, channelId) {
    modMailSessions.set(userId, channelId);
    modMailSessions.set(channelId, userId); // Pour une recherche bidirectionnelle
}

function getModmailSession(id) {
    return modMailSessions.get(id);
}

function removeModmailSession(userId, channelId) {
    modMailSessions.delete(userId);
    modMailSessions.delete(channelId);
}

module.exports = {
    closeModmail,
    addModmailSession,
    getModmailSession,
    removeModmailSession,
};