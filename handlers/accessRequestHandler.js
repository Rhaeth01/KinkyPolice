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

// Creates a clean embed for ticket without workflow elements
function createCleanTicketEmbed(originalEmbed, originalRequester) {
    const originalData = originalEmbed.toJSON();

    // Create a new embed with only essential information
    const cleanEmbed = new EmbedBuilder()
        .setColor(0x00FF00) // Green for accepted
        .setTitle("✅ Demande d'accès acceptée")
        .setAuthor({
            name: `${originalRequester.user.tag} • ${originalRequester.user.id}`,
            iconURL: originalRequester.user.displayAvatarURL({ dynamic: true })
        })
        .setDescription(`**Membre accepté :** <@${originalRequester.user.id}>`)
        .addFields(
            { name: '👤 Informations Utilisateur', value: `**Pseudo :** ${originalRequester.user.tag}\n**ID :** \`${originalRequester.user.id}\`\n**Compte créé :** <t:${Math.floor(originalRequester.user.createdTimestamp / 1000)}:R>`, inline: true }
        );

    // Add only the user response fields, excluding workflow fields
    if (originalData.fields) {
        const userResponseFields = originalData.fields.filter(field =>
            field.name.startsWith('❓') && // Only question fields
            !field.name.includes('Actions Requises') && // Exclude workflow fields
            !field.name.includes('Horodatage') // Exclude timestamp fields
        );

        if (userResponseFields.length > 0) {
            cleanEmbed.addFields(...userResponseFields);
        }
    }

    cleanEmbed
        .setFooter({
            text: `Demande acceptée • Salon d'entrée créé`,
            iconURL: originalRequester.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

    return cleanEmbed;
}

// Création d'un salon d'entrée après acceptation de la demande d'accès
async function acceptAccessRequest(interaction, originalRequester, originalEmbed, userId) {
    const acceptedEntryCategoryId = configManager.acceptedEntryCategoryId;
    const staffRoleIds = configManager.getValidStaffRoleIds();
    
    // Log pour diagnostic - vérifier les valeurs de configuration utilisées
    console.log(`[CONFIG DEBUG] acceptedEntryCategoryId utilisé: ${acceptedEntryCategoryId}`);
    console.log(`[CONFIG DEBUG] staffRoleIds utilisés: ${JSON.stringify(staffRoleIds)}`);
    
    // Créer les permissions de base
    const permissionOverwrites = [
        { id: interaction.guild.id, deny: ['ViewChannel'] },
        { id: userId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] },
        { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'EmbedLinks', 'AttachFiles', 'ManageChannels'] }
    ];
    
    // Ajouter des permissions pour chaque rôle staff valide seulement s'ils existent
    for (const roleId of staffRoleIds) {
        try {
            // Vérifier que le rôle existe dans le serveur
            const role = await interaction.guild.roles.fetch(roleId);
            if (role) {
                permissionOverwrites.push({
                    id: roleId,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages', 'AttachFiles']
                });
            } else {
                console.warn(`[ACCESS REQUEST] Rôle staff ${roleId} non trouvé dans le serveur`);
            }
        } catch (error) {
            console.warn(`[ACCESS REQUEST] Impossible de récupérer le rôle ${roleId}:`, error.message);
        }
    }

    // Configuration du canal
    const channelConfig = {
        name: `entrée-${originalRequester.user.username.slice(0, 20)}`,
        type: ChannelType.GuildText,
        permissionOverwrites: permissionOverwrites
    };
    
    // Ajouter la catégorie seulement si elle existe et est configurée
    if (acceptedEntryCategoryId && acceptedEntryCategoryId.trim() !== '') {
        try {
            const category = await interaction.guild.channels.fetch(acceptedEntryCategoryId);
            if (category && category.type === ChannelType.GuildCategory) {
                channelConfig.parent = acceptedEntryCategoryId;
            } else {
                console.warn(`[ACCESS REQUEST] Catégorie ${acceptedEntryCategoryId} non trouvée ou invalide`);
            }
        } catch (error) {
            console.warn(`[ACCESS REQUEST] Impossible de récupérer la catégorie ${acceptedEntryCategoryId}:`, error.message);
        }
    }
    
    const ticketChannel = await interaction.guild.channels.create(channelConfig);
    const softCloseButtonEntry = new ButtonBuilder().setCustomId(`soft_close_ticket_entry_${ticketChannel.id}_${userId}`).setLabel('Fermer').setEmoji('🚪').setStyle(ButtonStyle.Secondary);
    const deleteButtonEntry = new ButtonBuilder().setCustomId(`delete_ticket_entry_${ticketChannel.id}`).setLabel('Supprimer').setEmoji('🗑️').setStyle(ButtonStyle.Danger);
    const transcriptButtonEntry = new ButtonBuilder().setCustomId(`transcript_ticket_entry_${ticketChannel.id}`).setLabel('Transcrire').setEmoji('📜').setStyle(ButtonStyle.Primary);
    const entryTicketActionRow = new ActionRowBuilder().addComponents(softCloseButtonEntry, deleteButtonEntry, transcriptButtonEntry);
    // Create a clean embed for the ticket without workflow elements
    const cleanTicketEmbed = createCleanTicketEmbed(originalEmbed, originalRequester);

    await ticketChannel.send({
        content: `Bienvenue ${originalRequester} ! Votre demande d'accès a été acceptée. Vous pouvez discuter ici avec le staff.`,
        embeds: [cleanTicketEmbed],
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
        
        // Note: Invitation information removed as per optimization requirements
        
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
                { name: '👤 Informations Utilisateur', value: `**Pseudo :** ${interaction.user.tag}\n**ID :** \`${interaction.user.id}\`\n**Compte créé :** <t:${Math.floor(interaction.user.createdTimestamp / 1000)}:R>`, inline: true }
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
