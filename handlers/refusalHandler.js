// Module spécialisé pour la gestion des refus de demandes d'accès

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const configManager = require('../utils/configManager');

async function handleRefusalModal(interaction) {
    if (!interaction.customId.startsWith('refusal_reason_modal_')) {
        return;
    }

    // Déférer immédiatement l'interaction pour éviter l'expiration
    await interaction.deferReply({ ephemeral: true });

    const parts = interaction.customId.split('_');
    const userId = parts[parts.length - 2]; // L'avant-dernier élément est userId
    const messageId = parts[parts.length - 1]; // Le dernier élément est messageId
    const originalRequester = await interaction.guild.members.fetch(userId).catch(() => null);

    if (!originalRequester) {
        return interaction.editReply({ content: "Impossible de trouver l'utilisateur original de la demande." });
    }

    // Récupérer les valeurs des champs du modal
    const refusalReason = interaction.fields.getTextInputValue('refusal_reason_input');
    const sanction = interaction.fields.getTextInputValue('refusal_sanction_input').toLowerCase();

    // Récupérer l'embed original du message de demande
    const originalMessage = await interaction.channel.messages.fetch(messageId).catch(() => null);
    const originalEmbed = originalMessage ? originalMessage.embeds[0] : null;

    if (!originalEmbed) {
        console.error(`Impossible de trouver l'embed original pour le message ${messageId}`);
        return interaction.editReply({ content: "Impossible de trouver l'embed original de la demande pour le refus." });
    }

    // Appliquer la sanction si nécessaire
    let sanctionMessage = '';
    try {
        if (sanction === 'kick') {
            await originalRequester.kick(`Refus de demande d'accès: ${refusalReason}`);
            sanctionMessage = `L'utilisateur a été kické.`;
        } else if (sanction === 'ban') {
            await originalRequester.ban({ reason: `Refus de demande d'accès: ${refusalReason}` });
            sanctionMessage = `L'utilisateur a été banni.`;
        }
    } catch (error) {
        console.error(`Erreur lors de l'application de la sanction (${sanction}) à ${originalRequester.user.tag}:`, error);
        sanctionMessage = `Erreur lors de l'application de la sanction (${sanction}).`;
    }

    // Modifier l'embed original pour indiquer le refus
    const refusedEmbed = new EmbedBuilder(originalEmbed.toJSON())
        .setColor(0xFF0000)
        .setTitle("Demande d'accès refusée")
        .addFields(
            { name: 'Motif du refus', value: refusalReason },
            { name: 'Sanction appliquée', value: sanction || 'aucune' }
        )
        .setFooter({ text: `Refusé par ${interaction.user.tag} le ${new Date().toLocaleDateString()}` });

    if (originalMessage) {
        await originalMessage.edit({ embeds: [refusedEmbed], components: [] });
    }

    // Envoyer un MP élégant à l'utilisateur refusé (similaire aux commandes kick/ban)
    let dmSent = false;
    let dmErrorMessage = '';
    
    try {
        let dmEmbed;
        if (sanction === 'kick') {
            dmEmbed = new EmbedBuilder()
                .setColor(0xFF8C00) // Orange foncé comme la commande kick
                .setTitle('⚠️ Expulsion du serveur')
                .setDescription(`Vous avez été expulsé du serveur **${interaction.guild.name}** suite au refus de votre demande d'accès.`)
                .addFields(
                    { name: 'Motif du refus', value: refusalReason },
                    { name: 'Que faire ?', value: 'Si vous pensez que c\'est une erreur, vous pouvez essayer de contacter un administrateur ou ouvrir un ticket si possible.' }
                )
                .setTimestamp();
        } else if (sanction === 'ban') {
            dmEmbed = new EmbedBuilder()
                .setColor(0xDC143C) // Rouge crimson comme la commande ban
                .setTitle('🚫 Bannissement du serveur')
                .setDescription(`Vous avez été banni du serveur **${interaction.guild.name}** suite au refus de votre demande d'accès.`)
                .addFields(
                    { name: 'Motif du refus', value: refusalReason },
                    { name: 'Que faire ?', value: 'Si vous pensez que c\'est une erreur, vous pouvez essayer de contacter un administrateur.' }
                )
                .setTimestamp();
        } else {
            dmEmbed = new EmbedBuilder()
                .setColor(0xFF0000) // Rouge
                .setTitle('❌ Demande d\'accès refusée')
                .setDescription(`Votre demande d'accès au serveur **${interaction.guild.name}** a été refusée.`)
                .addFields(
                    { name: 'Motif du refus', value: refusalReason },
                    { name: 'Que faire ?', value: 'Vous pouvez renouveler votre demande plus tard en tenant compte des remarques.' }
                )
                .setTimestamp();
        }
        
        await originalRequester.send({ embeds: [dmEmbed] });
        dmSent = true;
        console.log(`[REFUSAL] DM envoyé avec succès à ${originalRequester.user.tag}`);
    } catch (dmError) {
        console.warn(`[REFUSAL] Impossible d'envoyer un message privé à ${originalRequester.user.tag} concernant le refus.`, dmError);
        
        // Déterminer le type d'erreur pour un message plus précis
        if (dmError.code === 50007) {
            dmErrorMessage = ' (DM fermés)';
        } else if (dmError.code === 50013) {
            dmErrorMessage = ' (permissions insuffisantes)';
        } else {
            dmErrorMessage = ` (erreur: ${dmError.code || 'inconnue'})`;
        }
    }

    // Répondre à l'interaction du modal avec information sur le statut du DM
    const dmStatus = dmSent ? '✅ Utilisateur notifié par MP' : `❌ Notification MP échouée${dmErrorMessage}`;
    await interaction.editReply({
        content: `La demande de ${originalRequester.user.tag} a été refusée.\n**Motif:** ${refusalReason}\n**Sanction:** ${sanction || 'aucune'}\n**Statut:** ${sanctionMessage}\n**DM:** ${dmStatus}`
    });

    // Log l'action dans le salon de logs avec le même format que les commandes kick/ban
    const logActionModId = configManager.modLogChannelId;
    const logChannel = interaction.guild.channels.cache.get(logActionModId);
    if (logChannel) {
        let logEmbed;
        
        if (sanction === 'kick') {
            logEmbed = new EmbedBuilder()
                .setColor('#FF8C00') // Orange foncé pour cohérence avec kick
                .setTitle('👢 Expulsion Appliquée')
                .setDescription(`Un membre a été expulsé suite au refus de sa demande d'accès`)
                .addFields(
                    { name: '👤 Membre Expulsé', value: `<@${originalRequester.user.id}>`, inline: true },
                    { name: '👮 Modérateur', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📝 Motif', value: `\`\`\`${refusalReason}\`\`\``, inline: false },
                    { name: '🕐 Heure', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setThumbnail(originalRequester.user.displayAvatarURL({ dynamic: true }))
                .setFooter({
                    text: `Modération • ${originalRequester.user.tag}`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();
        } else if (sanction === 'ban') {
            logEmbed = new EmbedBuilder()
                .setColor('#DC143C') // Rouge crimson pour cohérence avec ban
                .setTitle('🔨 Bannissement Appliqué')
                .setDescription(`Un membre a été banni suite au refus de sa demande d'accès`)
                .addFields(
                    { name: '👤 Membre Banni', value: `<@${originalRequester.user.id}>`, inline: true },
                    { name: '👮 Modérateur', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📝 Motif', value: `\`\`\`${refusalReason}\`\`\``, inline: false },
                    { name: '🕐 Heure', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '⚠️ Statut', value: `🚫 **Bannissement permanent**`, inline: true }
                )
                .setThumbnail(originalRequester.user.displayAvatarURL({ dynamic: true }))
                .setFooter({
                    text: `Modération • ${originalRequester.user.tag}`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();
        } else {
            // Log simple pour refus sans sanction
            logEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Demande d\'accès refusée')
                .setDescription(`Demande de ${originalRequester.user.tag} refusée par ${interaction.user.tag}`)
                .addFields(
                    { name: '👤 Demandeur', value: `<@${originalRequester.user.id}>`, inline: true },
                    { name: '👮 Modérateur', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📝 Motif', value: `\`\`\`${refusalReason}\`\`\``, inline: false },
                    { name: '🕐 Heure', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setThumbnail(originalRequester.user.displayAvatarURL({ dynamic: true }))
                .setFooter({
                    text: `Modération • ${originalRequester.user.tag}`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();
        }
        
        await logChannel.send({ embeds: [logEmbed] });
    }
}

module.exports = {
    handleRefusalModal
};