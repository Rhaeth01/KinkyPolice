// Module spécialisé pour la gestion des demandes d'accès

const { ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const configManager = require('../utils/configManager');

// Configuration par défaut si aucune configuration n'est trouvée
function getDefaultEntryModalConfig() {
    return {
        title: "Formulaire de demande d'accès",
        fields: [
            {
                customId: 'pseudo_input',
                label: "Quel est votre pseudo principal ?",
                style: 'Short',
                required: true,
                placeholder: 'Ex: SuperJoueur123'
            },
            {
                customId: 'motivation_input',
                label: "Quelles sont vos motivations à rejoindre ?",
                style: 'Paragraph',
                required: true,
                placeholder: 'Décrivez en quelques mots pourquoi vous souhaitez nous rejoindre.'
            },
            {
                customId: 'experience_input',
                label: "Expérience similaire (serveurs, jeux) ?",
                style: 'Paragraph',
                required: false,
                placeholder: 'Si oui, laquelle ?'
            },
            {
                customId: 'rules_input',
                label: "Avez-vous lu et compris le règlement ?",
                style: 'Short',
                required: true,
                placeholder: 'Oui/Non'
            },
            {
                customId: 'anything_else_input',
                label: "Avez-vous quelque chose à ajouter ?",
                style: 'Paragraph',
                required: false,
                placeholder: 'Remarques, questions, etc.'
            }
        ]
    };
}

// Création d'un salon d'entrée après acceptation de la demande d'accès
async function acceptAccessRequest(interaction, originalRequester, originalEmbed, userId) {
    const acceptedEntryCategoryId = configManager.acceptedEntryCategoryId;
    const staffRoleIds = configManager.getValidStaffRoleIds();
    
    // Log pour diagnostic - vérifier les valeurs de configuration utilisées
    console.log(`[CONFIG DEBUG] acceptedEntryCategoryId utilisé: ${acceptedEntryCategoryId}`);
    console.log(`[CONFIG DEBUG] staffRoleIds utilisés: ${JSON.stringify(staffRoleIds)}`);
    
    const ticketChannel = await interaction.guild.channels.create({
        name: `entrée-${originalRequester.user.username.slice(0, 20)}`,
        type: ChannelType.GuildText,
        parent: acceptedEntryCategoryId,
        permissionOverwrites: [
            { id: interaction.guild.id, deny: ['ViewChannel'] },
            { id: userId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] },
            // Ajouter des permissions pour chaque rôle staff valide
            ...staffRoleIds.map(roleId => ({
                id: roleId,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages', 'AttachFiles']
            })),
            { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'EmbedLinks', 'AttachFiles', 'ManageChannels'] }
        ],
    });
    const softCloseButtonEntry = new ButtonBuilder().setCustomId(`soft_close_ticket_entry_${ticketChannel.id}_${userId}`).setLabel('Fermer').setEmoji('🚪').setStyle(ButtonStyle.Secondary);
    const deleteButtonEntry = new ButtonBuilder().setCustomId(`delete_ticket_entry_${ticketChannel.id}`).setLabel('Supprimer').setEmoji('🗑️').setStyle(ButtonStyle.Danger);
    const transcriptButtonEntry = new ButtonBuilder().setCustomId(`transcript_ticket_entry_${ticketChannel.id}`).setLabel('Transcrire').setEmoji('📜').setStyle(ButtonStyle.Primary);
    const entryTicketActionRow = new ActionRowBuilder().addComponents(softCloseButtonEntry, deleteButtonEntry, transcriptButtonEntry);
    await ticketChannel.send({
        content: `Bienvenue ${originalRequester} ! Votre demande d'accès a été acceptée. Vous pouvez discuter ici avec le staff.`,
        embeds: [new EmbedBuilder(originalEmbed.toJSON()).setTitle("Demande d'accès acceptée").setColor(0x00FF00)],
        components: [entryTicketActionRow]
    });
    const processedEmbed = new EmbedBuilder(originalEmbed.toJSON()).setColor(0x00FF00).setFooter({ text: `Accepté par ${interaction.user.tag} le ${new Date().toLocaleDateString()}` });
    await interaction.message.edit({ embeds: [processedEmbed], components: [] });
    await interaction.reply({ content: `La demande de ${originalRequester.user.tag} a été acceptée. Un salon privé a été créé : ${ticketChannel}`, flags: 64 });
}

// Gère la soumission du modal de demande d'accès
async function handleAccessRequestModal(interaction) {
    if (!interaction.isModalSubmit() || interaction.customId !== 'access_request_modal') {
        return;
    }

    console.log(`[ACCESS REQUEST] Début du traitement pour ${interaction.user.tag} - ID: ${interaction.id}`);

    try {
        // Déférer immédiatement l'interaction pour éviter l'expiration
        await interaction.deferReply({ ephemeral: true });
        console.log(`[ACCESS REQUEST] DeferReply effectué pour ${interaction.user.tag}`);

        // Récupérer la configuration du modal depuis configManager
        const entryModal = configManager.entryModal || getDefaultEntryModalConfig();
        
        // Log de diagnostic pour vérifier la configuration utilisée
        console.log('[ACCESS REQUEST] Configuration entryModal utilisée:', JSON.stringify(entryModal, null, 2));
        
        // Récupérer les informations sur qui a invité l'utilisateur (version simplifiée pour éviter les erreurs)
        let inviterInfo = 'Non disponible';
        try {
            const invites = await interaction.guild.invites.fetch();
            
            // Chercher l'invitation utilisée (cette méthode est approximative car Discord ne fournit pas directement cette info)
            const guildInvites = Array.from(invites.values());
            if (guildInvites.length > 0) {
                // Prendre la première invitation trouvée comme exemple
                const recentInvite = guildInvites.find(invite => invite.inviter && invite.uses > 0);
                if (recentInvite && recentInvite.inviter) {
                    inviterInfo = `<@${recentInvite.inviter.id}> (${recentInvite.inviter.tag})`;
                }
            }
        } catch (error) {
            console.warn('[ACCESS REQUEST] Impossible de récupérer les informations d\'invitation:', error);
            inviterInfo = 'Impossible à déterminer';
        }
        
        // Créer un embed amélioré pour la demande d'accès au staff
        const requestEmbed = new EmbedBuilder()
            .setColor('#00D4AA') // Vert turquoise élégant
            .setTitle('📋 Nouvelle Demande d\'Accès')
            .setAuthor({
                name: `${interaction.user.tag} • ${interaction.user.id}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setDescription(`**Demande d'accès soumise par ** • <@${interaction.user.id}>`)
            .addFields(
                { name: '👤 Informations Utilisateur', value: `**Pseudo :** ${interaction.user.tag}\n**ID :** \`${interaction.user.id}\`\n**Compte créé :** <t:${Math.floor(interaction.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '📊 Statut du Compte', value: `**Invité par :** ${inviterInfo}\n**Avatar :** ${interaction.user.displayAvatarURL() ? '✅ Défini' : '❌ Par défaut'}\n**Bot :** ${interaction.user.bot ? '🤖 Oui' : '👤 Non'}`, inline: true }
            );

        // Ajouter les champs dynamiquement selon la configuration
        const embedFields = [];
        for (const fieldConfig of entryModal.fields) {
            try {
                const fieldValue = interaction.fields.getTextInputValue(fieldConfig.customId);
                embedFields.push({
                    name: `❓ ${fieldConfig.label}`,
                    value: `\`\`\`${fieldValue || (fieldConfig.required ? 'Non spécifié' : 'Aucune réponse')}\`\`\``,
                    inline: false
                });
            } catch (error) {
                // Si le champ n'existe pas dans la soumission, l'ignorer
                console.warn(`[ACCESS REQUEST] Champ ${fieldConfig.customId} non trouvé dans la soumission`);
            }
        }
        
        requestEmbed.addFields(...embedFields)
            .addFields(
                { name: '⏰ Horodatage', value: `**Soumise le :** <t:${Math.floor(Date.now() / 1000)}:F>\n**Il y a :** <t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                { name: '🎯 Actions Requises', value: '✅ **Accepter** - Créer un salon d\'entrée\n❌ **Refuser** - Envoyer un message de refus', inline: true }
            )
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setFooter({
                text: `Demande d'accès • Répondez rapidement pour une meilleure expérience utilisateur`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        // Ajouter des boutons pour accepter/refuser la demande
        const acceptButton = new ButtonBuilder()
            .setCustomId(`accept_access_${interaction.user.id}`)
            .setLabel('Accepter')
            .setStyle(ButtonStyle.Success);

        const refuseButton = new ButtonBuilder()
            .setCustomId(`refuse_access_${interaction.user.id}`)
            .setLabel('Refuser')
            .setStyle(ButtonStyle.Danger);

        const actionRow = new ActionRowBuilder().addComponents(acceptButton, refuseButton);

        // Envoyer l'embed dans le salon dédié aux demandes d'entrée
        const entryRequestChannel = interaction.guild.channels.cache.get(configManager.entryRequestChannelId);
        if (entryRequestChannel) {
            console.log(`[ACCESS REQUEST] Envoi de l'embed dans le salon des demandes: ${entryRequestChannel.name}`);
            
            // Créer la mention des rôles staff
            const staffRoleIds = configManager.getValidStaffRoleIds();
            const staffMentions = staffRoleIds.map(id => `<@&${id}>`).join(' ');
            
            await entryRequestChannel.send({ 
                content: staffMentions ? `${staffMentions} Nouvelle demande d'accès !` : 'Nouvelle demande d\'accès !',
                embeds: [requestEmbed], 
                components: [actionRow] 
            });
            console.log(`[ACCESS REQUEST] Embed envoyé avec succès dans le salon des demandes`);
        } else {
            // Fallback sur le salon de log si le salon des demandes n'est pas configuré
            const logChannel = interaction.guild.channels.cache.get(configManager.logChannelId);
            if (logChannel) {
                console.log(`[ACCESS REQUEST] Salon des demandes non configuré, envoi dans le salon de log: ${logChannel.name}`);
                
                // Créer la mention des rôles staff
                const staffRoleIds = configManager.getValidStaffRoleIds();
                const staffMentions = staffRoleIds.map(id => `<@&${id}>`).join(' ');
                
                await logChannel.send({ 
                    content: staffMentions ? `${staffMentions} Nouvelle demande d'accès !` : 'Nouvelle demande d\'accès !',
                    embeds: [requestEmbed], 
                    components: [actionRow] 
                });
                console.log(`[ACCESS REQUEST] Embed envoyé avec succès dans le salon de log (fallback)`);
            } else {
                console.error(`[ACCESS REQUEST] Aucun salon disponible pour envoyer la demande`);
            }
        }

        // Répondre à l'utilisateur qui a soumis le modal
        await interaction.editReply({
            content: 'Votre demande d\'accès a bien été reçue et sera examinée par le staff.'
        });
        console.log(`[ACCESS REQUEST] Réponse envoyée à ${interaction.user.tag}`);
        
    } catch (error) {
        console.error('[ACCESS REQUEST] Erreur lors du traitement de la demande d\'accès:', error);
        console.error('[ACCESS REQUEST] Stack trace:', error.stack);
        
        // Gestion d'erreur robuste
        try {
            if (interaction.deferred && !interaction.replied) {
                await interaction.editReply({
                    content: 'Une erreur est survenue lors du traitement de votre demande. Veuillez réessayer.'
                });
            } else if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Une erreur est survenue lors du traitement de votre demande. Veuillez réessayer.',
                    flags: MessageFlags.Ephemeral
                });
            }
        } catch (replyError) {
            console.error('[ACCESS REQUEST] Impossible de répondre à l\'erreur:', replyError);
        }
    }
}

module.exports = {
    acceptAccessRequest,
    handleAccessRequestModal
    // D'autres fonctions liées aux demandes d'accès pourront être ajoutées ici
};
