const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { createAccessRequestModal } = require('../modals/accessRequestModal');
const { entryRequestCategoryId, logChannelId, ticketCategoryId, staffRoleId, acceptedEntryCategoryId, reglesValidesId, memberRoleId } = require('../config.json'); // Ajout de memberRoleId au cas où il serait utilisé ailleurs, même si reglesValidesId est pour le bouton.

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Gestion des commandes Slash
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`Aucune commande correspondant à ${interaction.commandName} n'a été trouvée.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Erreur lors de l'exécution de ${interaction.commandName}:`, error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'Une erreur s\'est produite lors de l\'exécution de cette commande !', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'Une erreur s\'est produite lors de l\'exécution de cette commande !', ephemeral: true });
                }
            }
        }
        // Gestion des clics sur les boutons
        else if (interaction.isButton()) {
            if (interaction.customId === 'request_access_button') {
                const modal = createAccessRequestModal();
                await interaction.showModal(modal);
            }
            // Gestion du bouton d'acceptation du règlement
            else if (interaction.customId === 'accept_rules_button') {
                if (!reglesValidesId) {
                    console.error('Erreur critique: reglesValidesId non configuré pour accept_rules_button.');
                    return interaction.reply({ content: 'Une erreur de configuration empêche cette action. Veuillez contacter un administrateur.', ephemeral: true });
                }
                const role = interaction.guild.roles.cache.get(reglesValidesId);
                if (!role) {
                    console.error(`Erreur critique: Rôle de validation du règlement introuvable avec l'ID ${reglesValidesId}`);
                    return interaction.reply({ content: 'Une erreur de configuration du rôle de validation du règlement empêche cette action.', ephemeral: true });
                }

                const member = interaction.member;
                let replyMessage = '';

                try {
                    if (member.roles.cache.has(reglesValidesId)) {
                        await member.roles.remove(role);
                        replyMessage = `Le rôle "${role.name}" vous a été retiré.`;
                    } else {
                        await member.roles.add(role);
                        replyMessage = `Le rôle "${role.name}" vous a été attribué. Merci d'avoir accepté le règlement !`;
                    }
                    await interaction.reply({ content: replyMessage, ephemeral: true });
                } catch (error) {
                    console.error(`Erreur lors de l'attribution/retrait du rôle ${role.name} à ${member.user.tag}:`, error);
                    await interaction.reply({ content: `Une erreur est survenue lors de la gestion de votre rôle. Code: ${error.code}`, ephemeral: true });
                }
            }
            // Logique pour les boutons "Accepter" et "Refuser" la demande d'accès
            else if (interaction.customId.startsWith('accept_access_') || interaction.customId.startsWith('refuse_access_')) {
                // Vérifier si l'utilisateur a le rôle staff
                if (!interaction.member.roles.cache.has(staffRoleId)) {
                    return interaction.reply({ content: 'Vous n\'avez pas la permission d\'effectuer cette action.', ephemeral: true });
                }

                const parts = interaction.customId.split('_');
                const action = parts[0]; // 'accept' ou 'refuse'
                const userId = parts[parts.length -1]; // L'ID de l'utilisateur est le dernier élément
                const originalRequester = await interaction.guild.members.fetch(userId).catch(() => null);

                if (!originalRequester) {
                    return interaction.reply({ content: 'Impossible de trouver l\'utilisateur original de la demande.', ephemeral: true });
                }

                const originalEmbed = interaction.message.embeds[0];
                if (!originalEmbed) {
                    return interaction.reply({ content: 'Impossible de trouver l\'embed original de la demande.', ephemeral: true });
                }


                if (action === 'accept') {
                    try {
                        // Créer un salon privé (ticket)
                        const ticketChannel = await interaction.guild.channels.create({
                            name: `entrée-${originalRequester.user.username.slice(0, 20)}`, // Limite la longueur du nom
                            type: ChannelType.GuildText,
                            parent: acceptedEntryCategoryId, // CORRIGÉ: Utilise la bonne catégorie pour les entrées acceptées
                            permissionOverwrites: [
                                {
                                    id: interaction.guild.id, // @everyone
                                    deny: ['ViewChannel'],
                                },
                                {
                                    id: userId, // L'utilisateur qui a fait la demande
                                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'],
                                },
                                {
                                    id: staffRoleId, // Rôle Staff
                                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages', 'AttachFiles'],
                                },
                                // Potentiellement ajouter le bot lui-même si besoin
                                {
                                    id: interaction.client.user.id,
                                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'EmbedLinks', 'AttachFiles', 'ManageChannels']
                                }
                            ],
                        });

                        await ticketChannel.send({
                            content: `Bienvenue ${originalRequester} ! Votre demande d'accès a été acceptée. Vous pouvez discuter ici avec le staff.`,
                            embeds: [new EmbedBuilder(originalEmbed.toJSON()).setTitle("Demande d'accès acceptée").setColor(0x00FF00)] // Vert
                        });

                        // Modifier l'embed original pour indiquer que la demande a été traitée
                        const processedEmbed = new EmbedBuilder(originalEmbed.toJSON())
                            .setColor(0x00FF00) // Vert
                            .setFooter({ text: `Accepté par ${interaction.user.tag} le ${new Date().toLocaleDateString()}` });
                        await interaction.message.edit({ embeds: [processedEmbed], components: [] }); // Supprimer les boutons

                        await interaction.reply({ content: `La demande de ${originalRequester.user.tag} a été acceptée. Un salon privé a été créé : ${ticketChannel}`, ephemeral: true });

                    } catch (error) {
                        console.error("Erreur lors de l'acceptation de la demande :", error);
                        await interaction.reply({ content: 'Une erreur est survenue lors de l\'acceptation de la demande.', ephemeral: true });
                    }
                } else if (action === 'refuse') {
                    // Créer et afficher le modal de refus
                    const refusalModal = new ModalBuilder()
                        .setCustomId(`refusal_reason_modal_${userId}`) // Inclure l'ID de l'utilisateur pour le retrouver
                        .setTitle('Motif du refus et sanction');

                    const reasonInput = new TextInputBuilder()
                        .setCustomId('refusal_reason_input')
                        .setLabel('Motif du refus')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true);

                    const sanctionInput = new TextInputBuilder()
                        .setCustomId('refusal_sanction_input')
                        .setLabel('Sanction (aucune, kick, ban)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setPlaceholder('aucune / kick / ban');

                    refusalModal.addComponents(new ActionRowBuilder().addComponents(reasonInput), new ActionRowBuilder().addComponents(sanctionInput));
                    await interaction.showModal(refusalModal);
                }
            }
            // Gestion du bouton de création de ticket
            else if (interaction.customId === 'create_ticket_button') {
                if (!ticketCategoryId || !staffRoleId) {
                    console.error('Erreur critique: ticketCategoryId ou staffRoleId non configuré pour create_ticket_button.');
                    return interaction.reply({ content: 'Une erreur de configuration empêche la création de ticket. Veuillez contacter un administrateur.', ephemeral: true });
                }

                const userName = interaction.user.username;
                const userDiscriminator = interaction.user.discriminator;
                const channelName = `ticket-${userName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)}${userDiscriminator === "0" ? '' : '-' + userDiscriminator }`;

                try {
                    // Vérifier si un ticket existe déjà pour cet utilisateur (optionnel, mais bonne pratique)
                    const existingTicket = interaction.guild.channels.cache.find(
                        ch => ch.parentId === ticketCategoryId && ch.name.startsWith(`ticket-${userName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0,20)}`) && ch.topic === interaction.user.id
                    );

                    if (existingTicket) {
                        return interaction.reply({ content: `Vous avez déjà un ticket ouvert : ${existingTicket}. Veuillez le fermer avant d'en ouvrir un nouveau.`, ephemeral: true });
                    }

                    const ticketChannel = await interaction.guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        parent: ticketCategoryId,
                        topic: interaction.user.id, // Stocke l'ID de l'utilisateur dans le topic pour référence
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id, // @everyone
                                deny: ['ViewChannel'],
                            },
                            {
                                id: interaction.user.id, // Créateur du ticket
                                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'EmbedLinks'],
                            },
                            {
                                id: staffRoleId, // Rôle Staff
                                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages', 'AttachFiles', 'EmbedLinks', 'ManageChannels'], // Staff peut gérer le salon
                            },
                             { // Le bot lui-même
                                id: interaction.client.user.id,
                                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'EmbedLinks', 'AttachFiles', 'ManageChannels']
                            }
                        ],
                    });

                    const welcomeEmbed = new EmbedBuilder()
                        .setColor(0x57F287) // Vert clair
                        .setTitle(`Ticket ouvert par ${interaction.user.tag}`)
                        .setDescription(`Bienvenue dans votre ticket, ${interaction.user}. Un membre du staff va vous prendre en charge dès que possible.\n\nVeuillez décrire votre problème ou question en détail.`)
                        .setTimestamp();

                    const closeButton = new ButtonBuilder()
                        .setCustomId(`close_ticket_${ticketChannel.id}`) // ID unique pour fermer ce ticket spécifique
                        .setLabel('Fermer le ticket')
                        .setStyle(ButtonStyle.Danger);
                    const row = new ActionRowBuilder().addComponents(closeButton);


                    await ticketChannel.send({ embeds: [welcomeEmbed], components: [row], content: `${interaction.user} ${interaction.guild.roles.cache.get(staffRoleId) || ''}` }); // Mentionne l'utilisateur et le rôle staff
                    await interaction.reply({ content: `Votre ticket a été créé : ${ticketChannel}`, ephemeral: true });

                } catch (error) {
                    console.error(`Erreur lors de la création du ticket pour ${interaction.user.tag}:`, error);
                    await interaction.reply({ content: 'Une erreur est survenue lors de la création de votre ticket.', ephemeral: true });
                }
            }
            // Gestion du bouton de fermeture de ticket
            else if (interaction.customId.startsWith('close_ticket_')) {
                const ticketChannelId = interaction.customId.split('_').pop();
                const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);

                if (!ticketChannel) {
                    return interaction.reply({ content: 'Impossible de trouver le salon du ticket à fermer.', ephemeral: true });
                }

                // Vérifier si l'utilisateur est le créateur du ticket ou un membre du staff
                const ticketCreatorId = ticketChannel.topic; // On a stocké l'ID du créateur dans le topic
                const isStaff = interaction.member.roles.cache.has(staffRoleId);

                if (interaction.user.id !== ticketCreatorId && !isStaff) {
                    return interaction.reply({ content: 'Vous n\'avez pas la permission de fermer ce ticket.', ephemeral: true });
                }

                try {
                    await interaction.reply({ content: `Le ticket ${ticketChannel.name} va être fermé dans 5 secondes...`, ephemeral: false });
                    setTimeout(async () => {
                        await ticketChannel.delete('Ticket fermé par l\'utilisateur.');
                        // Optionnel: logguer la fermeture du ticket
                        const logChannel = interaction.guild.channels.cache.get(logChannelId);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setColor(0xFFA500)
                                .setTitle('Ticket Fermé')
                                .setDescription(`Le ticket ${ticketChannel.name} (ID: ${ticketChannel.id}) a été fermé par ${interaction.user.tag}.`)
                                .setTimestamp();
                            await logChannel.send({ embeds: [logEmbed] });
                        }
                    }, 5000);
                } catch (error) {
                    console.error(`Erreur lors de la fermeture du ticket ${ticketChannel.name}:`, error);
                    await interaction.followUp({ content: 'Une erreur est survenue lors de la fermeture du ticket.', ephemeral: true });
                }
            }
            // Gestion du bouton de fermeture de ModMail
            else if (interaction.customId.startsWith('close_modmail_')) {
                if (!interaction.member.roles.cache.has(staffRoleId)) {
                    return interaction.reply({ content: 'Seul un membre du staff peut fermer un ticket ModMail.', ephemeral: true });
                }

                const parts = interaction.customId.split('_');
                const userId = parts[parts.length - 2]; // Avant-dernier élément
                const channelIdToClose = parts[parts.length - 1]; // Dernier élément
                
                const modmailChannelToClose = interaction.guild.channels.cache.get(channelIdToClose);

                if (!modmailChannelToClose) {
                    return interaction.reply({ content: 'Impossible de trouver le salon ModMail à fermer.', ephemeral: true });
                }

                try {
                    await interaction.reply({ content: `Le salon ModMail ${modmailChannelToClose.name} va être fermé dans 5 secondes...`, ephemeral: false });
                    
                    const user = await interaction.client.users.fetch(userId).catch(() => null);
                    if (user) {
                        await user.send(`Votre session de support avec ${interaction.guild.name} a été fermée par ${interaction.user.tag}.`).catch(console.error);
                    }

                    setTimeout(async () => {
                        await modmailChannelToClose.delete('Session ModMail fermée par le staff.');
                        modMailSessions.delete(userId); // Nettoie la session de la map
                        
                        const logChannel = interaction.guild.channels.cache.get(logChannelId);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setColor(0xFFA500)
                                .setTitle('Session ModMail Fermée')
                                .setDescription(`La session ModMail pour l'utilisateur ID ${userId} (salon: ${modmailChannelToClose.name}) a été fermée par ${interaction.user.tag}.`)
                                .setTimestamp();
                            await logChannel.send({ embeds: [logEmbed] });
                        }
                    }, 5000);

                } catch (error) {
                    console.error(`Erreur lors de la fermeture du salon ModMail ${modmailChannelToClose.name}:`, error);
                    await interaction.followUp({ content: 'Une erreur est survenue lors de la fermeture du salon ModMail.', ephemeral: true });
                }
            }
        }
        // Gestion des soumissions de Modals
        else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'access_request_modal') {
                const pseudo = interaction.fields.getTextInputValue('pseudo_input');
                const motivation = interaction.fields.getTextInputValue('motivation_input');
                const experience = interaction.fields.getTextInputValue('experience_input') || 'Non spécifié';
                const rules = interaction.fields.getTextInputValue('rules_input');
                const anythingElse = interaction.fields.getTextInputValue('anything_else_input') || 'Aucune';

                const summaryEmbed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle(`Nouvelle demande d'accès de ${interaction.user.tag}`)
                    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                    .addFields(
                        { name: 'Pseudo Principal', value: pseudo },
                        { name: 'Motivations', value: motivation },
                        { name: 'Expérience Similaire', value: experience },
                        { name: 'Règlement Lu et Compris', value: rules },
                        { name: 'Autre Chose à Ajouter', value: anythingElse },
                        { name: 'Utilisateur', value: `${interaction.user} (\`${interaction.user.id}\`)` }
                    )
                    .setTimestamp()
                    .setFooter({ text: `ID Utilisateur: ${interaction.user.id}` });

                console.log(`[DEBUG] Tentative de récupération du salon staff avec entryRequestCategoryId: ${entryRequestCategoryId}`);
                console.log(`[DEBUG] Guild ID: ${interaction.guild?.id}`);
                const staffChannel = interaction.guild?.channels.cache.get(entryRequestCategoryId);
                console.log(`[DEBUG] Salon staff trouvé: ${staffChannel ? staffChannel.name : 'Non trouvé'}, Type: ${staffChannel ? staffChannel.type : 'N/A'}`);


                if (staffChannel && staffChannel.type === ChannelType.GuildText) {
                    const acceptButton = new ButtonBuilder()
                        .setCustomId(`accept_access_${interaction.user.id}`)
                        .setLabel('Accepter')
                        .setStyle(ButtonStyle.Success);

                    const refuseButton = new ButtonBuilder()
                        .setCustomId(`refuse_access_${interaction.user.id}`)
                        .setLabel('Refuser')
                        .setStyle(ButtonStyle.Danger);

                    const row = new ActionRowBuilder().addComponents(acceptButton, refuseButton);

                    await staffChannel.send({ embeds: [summaryEmbed], components: [row] });
                    await interaction.reply({ content: 'Votre demande d\'accès a été soumise et sera examinée par le staff. Merci !', ephemeral: true });
                } else {
                    console.error(`Salon staff pour les demandes d'entrée non trouvé ou incorrect (ID: ${entryRequestCategoryId})`);
                    await interaction.reply({ content: 'Erreur lors de la soumission de votre demande. Veuillez contacter un administrateur.', ephemeral: true });
                }
            }
            // Gérer la soumission du modal de refus
            else if (interaction.customId.startsWith('refusal_reason_modal_')) {
                 // Vérifier si l'utilisateur a le rôle staff
                if (!interaction.member.roles.cache.has(staffRoleId)) {
                    return interaction.reply({ content: 'Vous n\'avez pas la permission d\'effectuer cette action.', ephemeral: true });
                }

                const userId = interaction.customId.split('_').pop();
                const targetUser = await interaction.guild.members.fetch(userId).catch(() => null);

                if (!targetUser) {
                    return interaction.reply({ content: 'Impossible de trouver l\'utilisateur original de la demande.', ephemeral: true });
                }

                const refusalReason = interaction.fields.getTextInputValue('refusal_reason_input');
                const sanctionChoice = interaction.fields.getTextInputValue('refusal_sanction_input').toLowerCase();

                // DM à l'utilisateur
                const dmEmbed = new EmbedBuilder()
                    .setColor(0xFF0000) // Rouge
                    .setTitle('Demande d\'accès refusée')
                    .setDescription(`Votre demande d'accès au serveur **${interaction.guild.name}** a été refusée.`)
                    .addFields({ name: 'Raison du refus', value: refusalReason });

                let sanctionAppliedMessage = "Aucune sanction appliquée.";

                if (sanctionChoice === 'kick') {
                    try {
                        await targetUser.kick(`Demande d'accès refusée: ${refusalReason}`);
                        sanctionAppliedMessage = "Vous avez été expulsé(e) du serveur.";
                    } catch (e) {
                        console.error("Erreur lors du kick après refus:", e);
                        sanctionAppliedMessage = "Tentative de kick échouée (permissions manquantes ou autre erreur).";
                    }
                } else if (sanctionChoice === 'ban') {
                    try {
                        await targetUser.ban({ reason: `Demande d'accès refusée: ${refusalReason}` });
                        sanctionAppliedMessage = "Vous avez été banni(e) du serveur.";
                    } catch (e) {
                        console.error("Erreur lors du ban après refus:", e);
                        sanctionAppliedMessage = "Tentative de ban échouée (permissions manquantes ou autre erreur).";
                    }
                }
                dmEmbed.addFields({ name: 'Sanction', value: sanctionAppliedMessage });

                try {
                    await targetUser.send({ embeds: [dmEmbed] });
                } catch (e) {
                    console.warn(`Impossible d'envoyer le DM de refus à ${targetUser.user.tag}`);
                }

                // Log de l'action
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(0xFFA500) // Orange
                        .setTitle('Demande d\'accès refusée')
                        .setDescription(`La demande de ${targetUser.user.tag} (\`${targetUser.id}\`) a été refusée par ${interaction.user.tag}.`)
                        .addFields(
                            { name: 'Raison', value: refusalReason },
                            { name: 'Sanction appliquée', value: sanctionChoice }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }

                // Modifier l'embed original dans le salon staff
                // Il faut retrouver le message original. Cela peut être complexe si on ne stocke pas l'ID du message.
                // Pour simplifier, on va juste répondre à l'interaction du modal.
                // L'idéal serait de stocker l'ID du message de la demande pour le modifier.
                // Pour l'instant, on va supposer que le modérateur a cliqué sur le bouton du message original.
                const originalStaffMessage = interaction.message; // Le message sur lequel le bouton "Refuser" a été cliqué (qui a ouvert le modal)
                 if (originalStaffMessage && originalStaffMessage.embeds.length > 0) {
                    const originalEmbed = originalStaffMessage.embeds[0];
                    const processedEmbed = new EmbedBuilder(originalEmbed.toJSON())
                        .setColor(0xFF0000) // Rouge
                        .setFooter({ text: `Refusé par ${interaction.user.tag} (Raison: ${refusalReason}, Sanction: ${sanctionChoice}) le ${new Date().toLocaleDateString()}` });
                    await originalStaffMessage.edit({ embeds: [processedEmbed], components: [] });
                }


                await interaction.reply({ content: `La demande de ${targetUser.user.tag} a été refusée. Raison: ${refusalReason}, Sanction: ${sanctionChoice}.`, ephemeral: true });
            }
        }
    },
};
