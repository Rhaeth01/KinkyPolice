// Module spécialisé pour la gestion des tickets

const { ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const configManager = require('../utils/configManager');
const webhookLogger = require('../utils/webhookLogger');

// Création d'un ticket standard
async function createStandardTicket(interaction, customStaffRoles = null) {
    // Obtenir la configuration actuelle
    const ticketCategoryId = configManager.ticketCategoryId;
    const staffRoleIds = customStaffRoles || configManager.getValidStaffRoleIds();
    
    console.log(`[TICKET DEBUG] Configuration chargée pour création ticket:`, {
        ticketCategoryId,
        staffRoleIds
    });
    
    const userName = interaction.user.username;
    const userDiscriminator = interaction.user.discriminator;
    const channelName = `ticket-${userName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)}${userDiscriminator === "0" ? '' : '-' + userDiscriminator }`;
    // Vérifier si un ticket existe déjà pour cet utilisateur
    const existingTicket = interaction.guild.channels.cache.find(
        ch => ch.parentId === ticketCategoryId && ch.name.startsWith(`ticket-${userName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0,20)}`) && ch.topic === interaction.user.id
    );
    if (existingTicket) {
        return interaction.reply({ content: `Vous avez déjà un ticket ouvert : ${existingTicket}. Veuillez le fermer avant d'en ouvrir un nouveau.`, flags: MessageFlags.Ephemeral });
    }
    // Vérifier et valider les rôles avant création du canal
    console.log('[TICKET DEBUG] Vérification des rôles staff:');
    const validRoles = [];
    
    // Rafraîchir le cache des rôles pour s'assurer d'avoir les données les plus récentes
    try {
        await interaction.guild.roles.fetch();
        console.log('[TICKET DEBUG] Cache des rôles rafraîchi');
    } catch (fetchError) {
        console.error('[TICKET DEBUG] Erreur lors du rafraîchissement des rôles:', fetchError);
    }
    
    for (const roleId of staffRoleIds) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (role) {
            validRoles.push(roleId);
            console.log(`[TICKET DEBUG] Rôle valide trouvé: ${role.name} (${roleId})`);
        } else {
            console.log(`[TICKET DEBUG] Rôle INVALIDE ignoré: ${roleId} - non trouvé dans le serveur`);
        }
    }
    
    if (validRoles.length === 0) {
        console.log(`[TICKET DEBUG] ATTENTION: Aucun rôle staff valide trouvé !`);
    }

    const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: ticketCategoryId,
        topic: interaction.user.id,
        permissionOverwrites: [
            { id: interaction.guild.id, deny: ['ViewChannel'] },
            { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'EmbedLinks'] },
            // Utiliser seulement les rôles valides
            ...validRoles.map(roleId => ({
                id: roleId,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages', 'AttachFiles', 'EmbedLinks', 'ManageChannels']
            })),
            { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'EmbedLinks', 'AttachFiles', 'ManageChannels'] }
        ],
    });
    const welcomeEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`Ticket ouvert par ${interaction.user.tag}`)
        .setDescription(`Bienvenue dans votre ticket, ${interaction.user}. Un membre du staff va vous prendre en charge dès que possible.\n\nVeuillez décrire votre problème ou question en détail.`)
        .setTimestamp();
    const softCloseButtonStandard = new ButtonBuilder()
        .setCustomId(`soft_close_ticket_std_${ticketChannel.id}`)
        .setLabel('Fermer')
        .setEmoji('🚪')
        .setStyle(ButtonStyle.Secondary);
    const deleteButtonStandard = new ButtonBuilder()
        .setCustomId(`delete_ticket_std_${ticketChannel.id}`)
        .setLabel('Supprimer')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger);
    const transcriptButtonStandard = new ButtonBuilder()
        .setCustomId(`transcript_ticket_std_${ticketChannel.id}`)
        .setLabel('Transcrire')
        .setEmoji('📜')
        .setStyle(ButtonStyle.Primary);
    const ticketActionRow = new ActionRowBuilder().addComponents(softCloseButtonStandard, deleteButtonStandard, transcriptButtonStandard);
    // Mentionner tous les rôles staff valides
    const staffRoleMentions = staffRoleIds
        .map(roleId => interaction.guild.roles.cache.get(roleId))
        .filter(role => role) // Filtrer les rôles qui existent
        .map(role => role.toString())
        .join(' ');
    
    await ticketChannel.send({
        embeds: [welcomeEmbed],
        components: [ticketActionRow],
        content: `${interaction.user} ${staffRoleMentions}`
    });
    
    // Gestion sécurisée de la réponse à l'interaction
    try {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `Votre ticket a été créé : ${ticketChannel}`, flags: MessageFlags.Ephemeral });
        } else {
            console.log(`[TICKET DEBUG] Interaction déjà traitée pour la création du ticket ${ticketChannel.id}`);
        }
    } catch (replyError) {
        console.error(`[TICKET DEBUG] Impossible de répondre à l'interaction pour le ticket ${ticketChannel.id}:`, replyError);
        
        // Si l'interaction a expiré, envoyer un message dans le canal du ticket
        if (replyError.code === 10062) {
            console.log(`[TICKET DEBUG] Interaction expirée, envoi d'un message dans le canal du ticket`);
            try {
                await ticketChannel.send({
                    content: `${interaction.user}, votre ticket a été créé avec succès ! (L'interaction a expiré mais le ticket fonctionne normalement)`,
                    flags: MessageFlags.Ephemeral
                });
            } catch (channelError) {
                console.error(`[TICKET DEBUG] Impossible d'envoyer dans le canal du ticket:`, channelError);
            }
        }
    }
}

// Fermeture d'un ticket standard avec demande de raison
async function closeTicket(interaction, ticketChannel, creatorMember) {
    // Obtenir la configuration actuelle
    const staffRoleIds = configManager.getValidStaffRoleIds();
    
    // Vérifier les permissions (seul le staff peut fermer)
    const hasStaffRole = staffRoleIds.some(roleId => interaction.member.roles.cache.has(roleId));
    if (!hasStaffRole) {
        return interaction.reply({ content: "Vous n'avez pas la permission de fermer ce ticket.", flags: 64 });
    }
    
    // Afficher un modal pour la raison de fermeture
    const reasonModal = new ModalBuilder()
        .setCustomId(`ticket_close_reason_modal_${ticketChannel.id}`)
        .setTitle('Raison de la fermeture');
    const reasonInput = new TextInputBuilder()
        .setCustomId('ticket_close_reason_input')
        .setLabel('Pourquoi fermez-vous ce ticket ?')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);
    reasonModal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    await interaction.showModal(reasonModal);
}

// Suppression d'un ticket standard (sans demander de raison)
async function deleteTicket(interaction, ticketChannel) {
    // Obtenir la configuration actuelle
    const logChannelId = configManager.modLogChannelId;
    const staffRoleIds = configManager.getValidStaffRoleIds();
    
    // Vérifier les permissions (seul le staff peut supprimer)
    const hasStaffRole = staffRoleIds.some(roleId => interaction.member.roles.cache.has(roleId));
    if (!hasStaffRole) {
        return interaction.reply({ content: "Vous n'avez pas la permission de supprimer ce ticket.", flags: 64 });
    }
    
    // Récupérer l'ID du créateur stocké dans le topic
    const creatorId = ticketChannel.topic;
    
    // Extraire le nom du créateur à partir du nom du canal si le ticket a été fermé
    let creatorName = 'Inconnu';
    if (ticketChannel.name.startsWith('closed-')) {
        creatorName = ticketChannel.name.replace('closed-', '');
    }
    
    // Essayer de récupérer le tag du créateur s'il est toujours sur le serveur
    let creatorTag;
    if (creatorId) {
        const creatorMember = await interaction.guild.members.fetch(creatorId).catch(() => null);
        creatorTag = creatorMember?.user?.tag || `${creatorName} (ID: ${creatorId})`;
    } else {
        creatorTag = creatorName;
    }

    try {
        // Répondre à l'interaction avant de supprimer le salon
        await interaction.reply({ content: `Suppression du ticket ${ticketChannel.name} en cours...`, flags: MessageFlags.Ephemeral });

        // Log l'action via webhook
        await webhookLogger.logTicketAction('supprimé', ticketChannel.name, creatorTag, interaction.user, `Ticket supprimé par ${interaction.user.tag}`);

        // Supprimer le salon
        await ticketChannel.delete(`Supprimé par ${interaction.user.tag}`);

    } catch (error) {
        console.error(`Erreur lors de la suppression du ticket ${ticketChannel.id}:`, error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Une erreur est survenue lors de la suppression du ticket.', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: 'Une erreur est survenue lors de la suppression du ticket.', flags: MessageFlags.Ephemeral });
        }
    }
}

// Transcription d'un ticket standard
async function transcriptTicket(interaction, ticketChannel) {
    // Obtenir la configuration actuelle
    const logsTicketsChannelId = configManager.logsTicketsChannelId;
    const staffRoleIds = configManager.getValidStaffRoleIds();
    
    // Vérifier les permissions (seul le staff peut transcrire)
    const hasStaffRole = staffRoleIds.some(roleId => interaction.member.roles.cache.has(roleId));
    if (!hasStaffRole) {
        return interaction.reply({ content: "Vous n'avez pas la permission de transcrire ce ticket.", flags: 64 });
    }
    if (!logsTicketsChannelId) {
        return interaction.reply({ content: 'Le salon de logs pour les transcriptions n\'est pas configuré.', flags: 64 });
    }
    const targetLogsChannel = interaction.guild.channels.cache.get(logsTicketsChannelId);
    if (!targetLogsChannel) {
        return interaction.reply({ content: 'Le salon de logs pour les transcriptions est introuvable.', flags: 64 });
    }
    await interaction.deferReply({ ephemeral: true });
    let fetchedMessages = await ticketChannel.messages.fetch({ limit: 100 });
    fetchedMessages = [...fetchedMessages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    let transcriptContent = fetchedMessages.map(m => `[${new Date(m.createdTimestamp).toLocaleString('fr-FR')}] ${m.author.tag}: ${m.content}${m.attachments.size > 0 ? ' ' + m.attachments.map(a => a.url).join(' ') : ''}`).join('\n');
    if (transcriptContent.length === 0) {
        transcriptContent = "Aucun message dans ce ticket.";
    }
    const fileName = `transcript-${ticketChannel.name}-${Date.now()}.txt`;
    const embedTitle = `📜 Transcription du Ticket: ${ticketChannel.name}`;
    const attachment = new AttachmentBuilder(Buffer.from(transcriptContent, 'utf-8'), { name: fileName });
    const transcriptEmbed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(embedTitle)
        .setDescription(`Transcription du ticket **${ticketChannel.name}**`)
        .addFields(
            { name: '📜 Générée par', value: `${interaction.user}`, inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
        )
        .setFooter({ text: `ID du ticket: ${ticketChannel.id}` })
        .setTimestamp();
    await targetLogsChannel.send({ embeds: [transcriptEmbed], files: [attachment] });
    await interaction.editReply({ content: `La transcription a été envoyée dans ${targetLogsChannel}.`, files: [attachment] });
}

// Gestion des soumissions de modales liées aux tickets
async function handleTicketModal(interaction) {
    if (!interaction.isModalSubmit()) {
        return;
    }

    // Obtenir la configuration actuelle
    const logChannelId = configManager.modLogChannelId;

    // Gestion du modal de fermeture de ticket
    if (interaction.customId.startsWith('ticket_close_reason_modal_')) {
        const parts = interaction.customId.split('_');
        const ticketChannelId = parts[parts.length - 1];
        const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);

        if (!ticketChannel) {
            return interaction.reply({ content: "Le salon de ticket est introuvable pour la fermeture.", flags: MessageFlags.Ephemeral });
        }

        const closeReason = interaction.fields.getTextInputValue('ticket_close_reason_input') || 'Aucune raison fournie.';
        
        // Récupérer l'ID du créateur stocké dans le topic
        const creatorId = ticketChannel.topic;
        let creatorMember = null;
        
        if (creatorId) {
            creatorMember = await interaction.guild.members.fetch(creatorId).catch(() => null);
        }

        if (!creatorMember) {
            const newChannelName = `closed-${ticketChannel.name.replace('entrée-', '').replace('ticket-', '').substring(0,20)}-${creatorId?.slice(-4) || 'unknown'}`;
            await ticketChannel.setName(newChannelName);
            return interaction.reply({ content: `Le créateur du ticket n'est plus sur le serveur. Le salon a été renommé en ${newChannelName}.`, flags: MessageFlags.Ephemeral });
        }

        try {
            // Retirer la permission de voir le salon au créateur
            await ticketChannel.permissionOverwrites.edit(creatorMember.id, {
                ViewChannel: false
            });

            // Renommer le salon
            const newChannelName = `closed-${creatorMember.user.username.substring(0, 25)}`;
            await ticketChannel.setName(newChannelName);

            // Envoyer un MP embed à l'utilisateur
            const closureEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🚪 Ticket Fermé')
                .setDescription(`Votre ticket sur le serveur **${interaction.guild.name}** a été fermé.`)
                .addFields(
                    { name: '📝 Raison', value: closeReason, inline: false },
                    { name: '🛠️ Fermé par', value: interaction.user.tag, inline: true },
                    { name: '📅 Date', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
                )
                .setFooter({ text: `Si vous avez des questions, n'hésitez pas à nous contacter.` })
                .setTimestamp();

            try {
                await creatorMember.user.send({ embeds: [closureEmbed] });
            } catch (dmError) {
                console.log(`Impossible d'envoyer un MP à ${creatorMember.user.tag}: ${dmError.message}`);
            }

            await interaction.reply({
                content: `Le ticket a été fermé pour ${creatorMember.user.tag}. Le salon a été renommé en "${newChannelName}".`,
                flags: MessageFlags.Ephemeral
            });

            // Log l'action via webhook
            await webhookLogger.logTicketAction('fermé', ticketChannel.name, creatorMember.user, interaction.user, closeReason);
        } catch (error) {
            console.error('Erreur lors de la fermeture du ticket:', error);
            await interaction.reply({
                content: 'Une erreur est survenue lors de la fermeture du ticket.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

// Gestion centralisée des interactions de tickets
async function handleTicketInteraction(interaction, customRoles = null) {
    const { customId } = interaction;
    
    // Obtenir la configuration actuelle
    const ticketCategoryId = configManager.ticketCategoryId;
    let staffRoleIds = configManager.getValidStaffRoleIds();
    
    // Si des rôles personnalisés sont fournis, les utiliser à la place
    if (customRoles && customRoles.length > 0) {
        staffRoleIds = customRoles;
    }
    
    // Vérification des configurations requises
    if (!ticketCategoryId || staffRoleIds.length === 0) {
        console.error('Erreur critique: ticketCategoryId ou staffRoleIds non configuré.');
        console.error('Configuration actuelle:', { ticketCategoryId, staffRoleIds });
        return interaction.reply({ content: "Une erreur de configuration empêche la gestion des tickets. Veuillez contacter un administrateur.", flags: MessageFlags.Ephemeral });
    }
    
    if (customId.startsWith('create_ticket_button')) {
        let rolesFromCustomId = null;
        if (customId.startsWith('create_ticket_button_')) {
            try {
                const encodedRoles = customId.substring('create_ticket_button_'.length);
                const decodedRoles = Buffer.from(encodedRoles, 'base64').toString('utf8');
                rolesFromCustomId = decodedRoles.split(',').map(roleId => roleId.trim()).filter(roleId => roleId.length > 0);
                console.log(`[TICKET DEBUG] Rôles décodés du customId:`, rolesFromCustomId);
            } catch (error) {
                console.error(`[TICKET DEBUG] Erreur lors du décodage des rôles du customId:`, error);
            }
        }
        return createStandardTicket(interaction, rolesFromCustomId || staffRoleIds);
    }
    
    if (customId.startsWith('soft_close_ticket_')) {
        const parts = customId.split('_');
        const type = parts[3];
        const ticketChannelId = parts[4];
        const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);
        
        if (!ticketChannel) {
            return interaction.reply({ content: "Le salon de ticket est introuvable.", flags: MessageFlags.Ephemeral });
        }
        
        let creatorId;
        if (type === 'entry') {
            creatorId = parts[5];
        } else {
            creatorId = ticketChannel.topic;
        }
        
        if (!creatorId) {
            console.error(`Impossible de trouver l'ID du créateur pour le salon ${ticketChannel.name} (${ticketChannel.id})`);
            return interaction.reply({ content: "Impossible de déterminer le créateur du ticket pour le fermer.", flags: MessageFlags.Ephemeral });
        }
        
        const creatorMember = await interaction.guild.members.fetch(creatorId).catch(() => null);
        if (!creatorMember) {
            const newChannelName = `closed-${ticketChannel.name.replace('entrée-', '').replace('ticket-', '').substring(0,20)}-${creatorId.slice(-4)}`;
            await ticketChannel.setName(newChannelName);
            
            // Log l'action via webhook
            await webhookLogger.logTicketAction('fermé', ticketChannel.name, `Utilisateur parti (ID: ${creatorId})`, interaction.user, 'Créateur du ticket a quitté le serveur');
            
            return interaction.reply({ content: `Le créateur du ticket (ID: ${creatorId}) n'est plus sur le serveur. Le salon a été renommé en ${newChannelName}.`, flags: MessageFlags.Ephemeral });
        }
        
        return closeTicket(interaction, ticketChannel, creatorMember);
    }
    
    if (customId.startsWith('delete_ticket_')) {
        const ticketChannelId = customId.split('_').pop();
        const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);
        
        if (!ticketChannel) {
            return interaction.reply({ content: "Le salon de ticket est introuvable.", flags: MessageFlags.Ephemeral });
        }
        
        return deleteTicket(interaction, ticketChannel);
    }
    
    if (customId.startsWith('transcript_ticket_')) {
        const ticketChannelId = customId.split('_').pop();
        const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);
        
        if (!ticketChannel) {
            return interaction.reply({ content: "Le salon de ticket est introuvable.", flags: MessageFlags.Ephemeral });
        }
        
        return transcriptTicket(interaction, ticketChannel);
    }
}

module.exports = {
    createStandardTicket,
    closeTicket,
    deleteTicket,
    transcriptTicket,
    handleTicketInteraction,
    handleTicketModal
};