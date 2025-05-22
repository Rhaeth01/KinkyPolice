const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const { createAccessRequestModal } = require('../modals/accessRequestModal');
const { entryRequestCategoryId, logChannelId, ticketCategoryId, staffRoleId, acceptedEntryCategoryId, reglesValidesId, memberRoleId } = require('../config.json');
// const { Player } = require('discord-player'); // Supprimer cet import
// const { YouTubeExtractor } = require('@discord-player/extractor'); // Supprimer cet import

// Supprimer la variable globale player si elle n'est pas utilisée ailleurs que pour la musique
// let player;

const mots = require('../data/mots.json');

// Collection pour gérer les cooldowns des commandes
const cooldowns = new Map();

// Ajouté pour le ModMail si vous l'utilisez (basé sur votre code précédent)
// Déplacée ici pour une portée correcte si utilisée dans ce fichier ou liée à interactionCreate
const modMailSessions = new Map(); // Si cette map est utilisée dans messageCreate, elle devrait être là où messageCreate l'attend.
// Si elle est globale et partagée entre messageCreate et interactionCreate, elle devrait être dans un fichier séparé ou dans index.js


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

            // Gestion du cooldown
            if (command.cooldown) {
                if (!cooldowns.has(command.data.name)) {
                    cooldowns.set(command.data.name, new Map());
                }

                const now = Date.now();
                const timestamps = cooldowns.get(command.data.name);
                const cooldownAmount = (command.cooldown) * 1000;

                if (timestamps.has(interaction.user.id)) {
                    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

                    if (now < expirationTime) {
                        const timeLeft = (expirationTime - now) / 1000;
                        return interaction.reply({
                            content: `Veuillez attendre ${timeLeft.toFixed(1)} secondes avant de réutiliser la commande \`${command.data.name}\`.`,
                            flags: MessageFlags.Ephemeral // MODIFIÉ
                        });
                    }
                }

                timestamps.set(interaction.user.id, now);
                setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

                // --- Le bloc catch mal placé a été supprimé ici ---
            }

            // Ce try...catch gère l'exécution de la commande elle-même.
            try {
                // La commande /lofi accèdera maintenant au player via interaction.client.player
                await command.execute(interaction);
            } catch (error) {
                console.error(`Erreur l'exécution de ${interaction.commandName}:`, error);
                const errorMessage = `Une erreur s'est produite lors de l'utilisation de la commande /${interaction.commandName}. Si le problème persiste, veuillez contacter un administrateur.`;
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
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
                    return interaction.reply({ content: 'Une erreur de configuration empêche cette action. Veuillez contacter un administrateur.', flags: MessageFlags.Ephemeral }); // MODIFIÉ
                }
                const role = interaction.guild.roles.cache.get(reglesValidesId);
                if (!role) {
                    console.error(`Erreur critique: Rôle de validation du règlement introuvable avec l'ID ${reglesValidesId}`);
                    return interaction.reply({ content: 'Une erreur de configuration du rôle de validation du règlement empêche cette action.', flags: MessageFlags.Ephemeral }); // MODIFIÉ
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
                    await interaction.reply({ content: replyMessage, flags: MessageFlags.Ephemeral }); // MODIFIÉ
                } catch (error) {
                    console.error(`Erreur lors de l'attribution/retrait du rôle ${role.name} à ${member.user.tag}:`, error);
                    await interaction.reply({ content: `Une erreur est survenue lors de la gestion de votre rôle. Code: ${error.code}`, flags: MessageFlags.Ephemeral }); // MODIFIÉ
                }
            }
            // Logique pour les boutons "Accepter" et "Refuser" la demande d'accès
            else if (interaction.customId.startsWith('accept_access_') || interaction.customId.startsWith('refuse_access_')) {
                // Vérifier si l'utilisateur a le rôle staff
                if (!interaction.member.roles.cache.has(staffRoleId)) {
                    return interaction.reply({ content: "Vous n'avez pas la permission d'effectuer cette action.", flags: MessageFlags.Ephemeral }); // MODIFIÉ
                }

                const parts = interaction.customId.split('_');
                const action = parts[0]; // 'accept' ou 'refuse'
                // refuse_access_USERID_MESSAGEID or accept_access_USERID_MESSAGEID
                const userId = parts[parts.length - 2]; // User ID is now the second to last
                const messageId = parts[parts.length - 1]; // Message ID is the last
                const originalRequester = await interaction.guild.members.fetch(userId).catch(() => null);

                if (!originalRequester) {
                    return interaction.reply({ content: "Impossible de trouver l'utilisateur original de la demande.", flags: MessageFlags.Ephemeral }); // MODIFIÉ
                }

                const originalEmbed = interaction.message.embeds[0];
                if (!originalEmbed) {
                    return interaction.reply({ content: "Impossible de trouver l'embed original de la demande.", flags: MessageFlags.Ephemeral }); // MODIFIÉ
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

                        // Création du bouton "Fermer" en rouge (ButtonStyle.Danger)
                        const closeButton = new ButtonBuilder()
                            .setCustomId(`close_ticket_${ticketChannel.id}`)
                            .setLabel('Fermer')
                            .setStyle(ButtonStyle.Danger);
                        const closeRow = new ActionRowBuilder().addComponents(closeButton);

                        await ticketChannel.send({
                            content: `Bienvenue ${originalRequester} ! Votre demande d'accès a été acceptée. Vous pouvez discuter ici avec le staff.`, // MODIFIÉ: "Papadopoulos" retiré
                            embeds: [new EmbedBuilder(originalEmbed.toJSON()).setTitle("Demande d'accès acceptée").setColor(0x00FF00)], // Vert
                            components: [closeRow] // Bouton "Fermer" en rouge
                        });

                        // Modifier l'embed original pour indiquer que la demande a été traitée
                        const processedEmbed = new EmbedBuilder(originalEmbed.toJSON())
                            .setColor(0x00FF00) // Vert
                            .setFooter({ text: `Accepté par ${interaction.user.tag} le ${new Date().toLocaleDateString()}` });
                        await interaction.message.edit({ embeds: [processedEmbed], components: [] }); // Supprimer les boutons

                        await interaction.reply({ content: `La demande de ${originalRequester.user.tag} a été acceptée. Un salon privé a été créé : ${ticketChannel}`, flags: MessageFlags.Ephemeral }); // MODIFIÉ

                    } catch (error) {
                        console.error("Erreur lors de l'acceptation de la demande :", error);
                        await interaction.reply({ content: "Une erreur est survenue lors de l'acceptation de la demande.", flags: MessageFlags.Ephemeral }); // MODIFIÉ
                    }
                } else if (action === 'refuse') {
                    // Créer et afficher le modal de refus
                    const refusalModal = new ModalBuilder()
                        .setCustomId(`refusal_reason_modal_${userId}_${messageId}`) // Inclure l'ID de l'utilisateur et du message
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
                    return interaction.reply({ content: "Une erreur de configuration empêche la création de ticket. Veuillez contacter un administrateur.", flags: MessageFlags.Ephemeral }); // MODIFIÉ
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
                        return interaction.reply({ content: `Vous avez déjà un ticket ouvert : ${existingTicket}. Veuillez le fermer avant d'en ouvrir un nouveau.`, flags: MessageFlags.Ephemeral }); // MODIFIÉ
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
                        .setDescription(`Bienvenue dans votre ticket, ${interaction.user}. Un membre du staff va vous prendre en charge dès que possible.

Veuillez décrire votre problème ou question en détail.`)
                        .setTimestamp();

                    const closeButton = new ButtonBuilder()
                        .setCustomId(`close_ticket_${ticketChannel.id}`) // ID unique pour fermer ce ticket spécifique
                        .setLabel('Fermer le ticket')
                        .setStyle(ButtonStyle.Danger);
                    const row = new ActionRowBuilder().addComponents(closeButton);


                    await ticketChannel.send({ embeds: [welcomeEmbed], components: [row], content: `${interaction.user} ${interaction.guild.roles.cache.get(staffRoleId) || ''}` }); // Mentionne l'utilisateur et le rôle staff
                    await interaction.reply({ content: `Votre ticket a été créé : ${ticketChannel}`, flags: MessageFlags.Ephemeral }); // MODIFIÉ

                } catch (error) {
                    console.error(`Erreur lors de la création du ticket pour ${interaction.user.tag}:`, error);
                    await interaction.reply({ content: "Une erreur est survenue lors de la création de votre ticket. Veuillez réessayer ou contacter un administrateur si le problème persiste.", flags: MessageFlags.Ephemeral }); // MODIFIÉ
                }
            }
            // Gestion du bouton de fermeture de ticket
            else if (interaction.customId.startsWith('close_ticket_')) {
                const ticketChannelId = interaction.customId.split('_').pop();
                const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);

                if (!ticketChannel) {
                    return interaction.reply({ content: "Impossible de trouver le salon du ticket à fermer.", flags: MessageFlags.Ephemeral }); // MODIFIÉ
                }

                // Vérifier si l'utilisateur est le créateur du ticket ou a un rôle autorisé
                const ticketCreatorId = ticketChannel.topic; // On a stocké l'ID du créateur dans le topic
                const allowedCloseRoles = [staffRoleId]; // Uniquement le rôle staff peut fermer les tickets

                if (interaction.user.id !== ticketCreatorId && !allowedCloseRoles.some(roleId => interaction.member.roles.cache.has(roleId))) {
                    return interaction.reply({ 
                        content: 'Vous n\'avez pas la permission de fermer ce ticket. Seuls les membres avec les rôles autorisés peuvent le faire.',
                        flags: MessageFlags.Ephemeral // MODIFIÉ
                    });
                }

                try {
                    await interaction.reply({ content: `Le ticket ${ticketChannel.name} va être fermé dans 5 secondes...`, ephemeral: false }); // ephemeral: false est intentionnel ici
                    setTimeout(async () => {
                        await ticketChannel.delete("Ticket fermé par l'utilisateur.");
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
                    await interaction.followUp({ content: 'Une erreur est survenue lors de la fermeture du ticket.', flags: MessageFlags.Ephemeral }); // MODIFIÉ
                }
            }
            // Gestion du bouton de fermeture de ModMail
            else if (interaction.customId.startsWith('close_modmail_')) {
                if (!interaction.member.roles.cache.has(staffRoleId)) {
                    return interaction.reply({ content: "Seul un membre du staff peut fermer un ticket ModMail.", flags: MessageFlags.Ephemeral }); // MODIFIÉ
                }

                const parts = interaction.customId.split('_');
                const userId = parts[parts.length - 2]; // Avant-dernier élément
                const channelIdToClose = parts[parts.length - 1]; // Dernier élément

                const modmailChannelToClose = interaction.guild.channels.cache.get(channelIdToClose);

                if (!modmailChannelToClose) {
                    return interaction.reply({ content: "Impossible de trouver le salon ModMail à fermer.", flags: MessageFlags.Ephemeral }); // MODIFIÉ
                }
                const userToNotify = await interaction.client.users.fetch(userId).catch(() => null);
                if (!userToNotify) {
                    console.warn(`Impossible de trouver l'utilisateur ${userId} pour notifier la fermeture du ModMail.`);
                    // Continuer même si l'utilisateur n'est pas trouvé pour fermer le salon
                }

                try {
                    await interaction.reply({ content: `Le salon ModMail ${modmailChannelToClose.name} va être fermé...`, ephemeral: false }); // ephemeral: false est intentionnel ici

                    if (userToNotify) {
                        await userToNotify.send({ content: "Votre session ModMail a été fermée par un membre du staff." }).catch(err => {
                            console.warn(`Impossible d'envoyer un DM à l'utilisateur ${userId} pour la fermeture du ModMail: ${err.message}`);
                        });
                    }

                    await modmailChannelToClose.delete(`ModMail fermé par ${interaction.user.tag}.`);
                    modMailSessions.delete(userId); // Supprimer la session

                    // Log de la fermeture
                    const logChannel = interaction.guild.channels.cache.get(logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor(0xFFA500) // Orange
                            .setTitle('ModMail Fermé')
                            .setDescription(`Le salon ModMail pour ${userToNotify ? userToNotify.tag : `Utilisateur ID ${userId}`} (Salon: ${modmailChannelToClose.name}) a été fermé par ${interaction.user.tag}.`)
                            .setTimestamp();
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                    // Pas de followUp ici car le reply initial n'est pas éphémère.
                } catch (error) {
                    console.error(`Erreur lors de la fermeture du salon ModMail ${modmailChannelToClose.name}:`, error);
                    // Si le reply initial a échoué ou si on veut notifier une erreur spécifique
                    if (interaction.replied || interaction.deferred) {
                         await interaction.followUp({ content: 'Une erreur est survenue lors de la fermeture du salon ModMail.', flags: MessageFlags.Ephemeral }); // MODIFIÉ
                    } else {
                         await interaction.reply({ content: 'Une erreur est survenue lors de la fermeture du salon ModMail.', flags: MessageFlags.Ephemeral }); // MODIFIÉ
                    }
                }
            }
        }
        // Gestion de la soumission des Modals
        else if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('refusal_reason_modal_')) {
                const parts = interaction.customId.split('_');
                const userId = parts[parts.length - 2]; // User ID is second to last
                const messageId = parts[parts.length - 1]; // Message ID is last
                const originalRequester = await interaction.guild.members.fetch(userId).catch(() => null);

                if (!originalRequester) {
                    return interaction.reply({ content: "Impossible de trouver l'utilisateur original de la demande.", flags: MessageFlags.Ephemeral }); // MODIFIÉ
                }

                const reason = interaction.fields.getTextInputValue('refusal_reason_input');
                const sanction = interaction.fields.getTextInputValue('refusal_sanction_input').toLowerCase();

                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                let originalMessage;

                if (logChannel) {
                    try {
                        originalMessage = await logChannel.messages.fetch(messageId);
                    } catch (error) {
                        console.error(`Impossible de retrouver le message original avec l'ID ${messageId}:`, error);
                        // Ne pas return ici, on peut toujours notifier l'utilisateur et appliquer la sanction
                        // Mais on ne pourra pas modifier l'embed original.
                    }
                } else {
                    console.error("logChannel non trouvé. Impossible de récupérer ou modifier le message original.");
                }

                // Modifier l'embed original pour indiquer que la demande a été traitée
                if (originalMessage && originalMessage.embeds.length > 0) {
                    const processedEmbed = new EmbedBuilder(originalMessage.embeds[0].toJSON())
                        .setColor(0xFF0000) // Rouge
                        .setFooter({ text: `Refusé par ${interaction.user.tag} le ${new Date().toLocaleDateString()}. Motif: ${reason}. Sanction: ${sanction}` });
                    await originalMessage.edit({ embeds: [processedEmbed], components: [] }).catch(err => {
                        console.error("Erreur lors de la modification de l'embed du message original:", err);
                        // Continuer même si l'édition échoue
                    });
                } else {
                    console.log(`Message original (ID: ${messageId}) non trouvé ou sans embed, impossible de le modifier.`);
                }

                // Envoyer un DM à l'utilisateur
                try {
                    await originalRequester.send(`Votre demande d'accès a été refusée par ${interaction.user.tag}. Motif : ${reason}. Sanction appliquée : ${sanction}.`);
                } catch (dmError) {
                    console.warn(`Impossible d'envoyer un DM de refus à ${originalRequester.user.tag}: ${dmError.message}`);
                    await interaction.reply({ content: `La demande de ${originalRequester.user.tag} a été refusée. Impossible de lui envoyer un DM. Motif: ${reason}. Sanction: ${sanction}.`, flags: MessageFlags.Ephemeral }); // MODIFIÉ
                    // Ne pas return ici pour appliquer la sanction si possible
                }

                // Appliquer la sanction
                if (sanction === 'kick') {
                    try {
                        await originalRequester.kick(`Demande d'accès refusée par ${interaction.user.tag}. Motif: ${reason}`);
                    } catch (kickError) {
                        console.error(`Erreur lors du kick de ${originalRequester.user.tag}:`, kickError);
                        return interaction.reply({ content: `La demande de ${originalRequester.user.tag} a été refusée. Motif: ${reason}. Erreur lors du kick: ${kickError.message}`, flags: MessageFlags.Ephemeral }); // MODIFIÉ
                    }
                } else if (sanction === 'ban') {
                    try {
                        await originalRequester.ban({ reason: `Demande d'accès refusée par ${interaction.user.tag}. Motif: ${reason}` });
                    } catch (banError) {
                        console.error(`Erreur lors du ban de ${originalRequester.user.tag}:`, banError);
                        return interaction.reply({ content: `La demande de ${originalRequester.user.tag} a été refusée. Motif: ${reason}. Erreur lors du ban: ${banError.message}`, flags: MessageFlags.Ephemeral }); // MODIFIÉ
                    }
                }

                // Si on n'a pas déjà répondu à cause d'une erreur de DM qui n'était pas fatale
                if (!interaction.replied) {
                    await interaction.reply({ content: `La demande de ${originalRequester.user.tag} a été refusée. Motif: ${reason}. Sanction: ${sanction}. L'utilisateur a été notifié (si possible).`, flags: MessageFlags.Ephemeral }); // MODIFIÉ
                }

                // Logguer le refus
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(0xFF0000) // Rouge
                        .setTitle('Demande d\'accès Refusée')
                        .setDescription(`La demande d'accès de ${originalRequester.user.tag} (ID: ${originalRequester.id}) a été refusée par ${interaction.user.tag}.`)
                        .addFields(
                            { name: 'Motif', value: reason },
                            { name: 'Sanction appliquée', value: sanction }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }


            } else if (interaction.customId.startsWith('modmail_reply_modal_')) {
                const parts = interaction.customId.split('_');
                const userId = parts[parts.length -1]; // L'ID de l'utilisateur est le dernier élément

                const userToReply = await interaction.client.users.fetch(userId).catch(() => null);
                const replyText = interaction.fields.getTextInputValue('modmail_reply_text');

                if (!userToReply) {
                    return interaction.reply({ content: "Impossible de trouver l'utilisateur à qui répondre.", flags: MessageFlags.Ephemeral }); // MODIFIÉ
                }

                const modmailChannel = interaction.channel; // Le modal est soumis depuis le salon ModMail
                if (!modmailChannel || !modMailSessions.has(userId) || modMailSessions.get(userId) !== modmailChannel.id) {
                     return interaction.reply({ content: "Erreur: Ce salon ModMail ne semble pas correspondre à l'utilisateur ou la session est invalide.", flags: MessageFlags.Ephemeral }); // MODIFIÉ
                }

                try {
                    await userToReply.send(`**Réponse du Staff (${interaction.user.tag}) :**\n${replyText}`);

                    const staffReplyEmbed = new EmbedBuilder()
                        .setColor(0x5865F2) // Discord Blurple
                        .setAuthor({ name: `${interaction.user.tag} (Staff)`, iconURL: interaction.user.displayAvatarURL() })
                        .setDescription(replyText)
                        .setTimestamp();
                    await modmailChannel.send({ embeds: [staffReplyEmbed] });

                    await interaction.reply({ content: "Votre réponse a été envoyée à l'utilisateur et enregistrée dans ce salon.", flags: MessageFlags.Ephemeral }); // MODIFIÉ

                } catch (error) {
                    console.error(`Erreur lors de l'envoi de la réponse ModMail à ${userToReply.tag}:`, error);
                    await interaction.reply({ content: "Une erreur est survenue lors de l'envoi de votre réponse.", flags: MessageFlags.Ephemeral }); // MODIFIÉ
                }
            }
            // Gérer la soumission du modal de demande d'accès
            else if (interaction.customId === 'access_request_modal') {
                const age = interaction.fields.getTextInputValue('ageInput');
                const presentation = interaction.fields.getTextInputValue('presentationInput');
                const kinks = interaction.fields.getTextInputValue('kinksInput');
                const limits = interaction.fields.getTextInputValue('limitsInput');
                const motivation = interaction.fields.getTextInputValue('motivationInput');

                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (!logChannel) {
                    console.error('Erreur critique: logChannelId non configuré pour les demandes d\'accès.');
                    return interaction.reply({ content: "Une erreur de configuration empêche le traitement de votre demande. Veuillez contacter un administrateur.", flags: MessageFlags.Ephemeral }); // MODIFIÉ
                }

                const requestEmbed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle(`Nouvelle demande d'accès de ${interaction.user.tag}`)
                    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                    .addFields(
                        { name: 'Pseudo Discord', value: `${interaction.user.tag} (ID: ${interaction.user.id})` },
                        { name: 'Âge', value: age },
                        { name: 'Présentation', value: presentation },
                        { name: 'Kinks', value: kinks },
                        { name: 'Limites', value: limits },
                        { name: 'Motivation', value: motivation }
                    )
                    .setTimestamp()
                    .setFooter({ text: `ID Utilisateur: ${interaction.user.id}` });

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`accept_access_${interaction.user.id}_DUMMY_MSG_ID`) // Placeholder, will be updated
                            .setLabel('Accepter')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`refuse_access_${interaction.user.id}_DUMMY_MSG_ID`) // Placeholder, will be updated
                            .setLabel('Refuser')
                            .setStyle(ButtonStyle.Danger)
                    );

                try {
                    const sentMessage = await logChannel.send({ embeds: [requestEmbed], components: [] }); // Send without buttons first
                    // Now update the row with the correct message ID
                    const updatedRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`accept_access_${interaction.user.id}_${sentMessage.id}`)
                                .setLabel('Accepter')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId(`refuse_access_${interaction.user.id}_${sentMessage.id}`)
                                .setLabel('Refuser')
                                .setStyle(ButtonStyle.Danger)
                        );
                    await sentMessage.edit({ components: [updatedRow] });
                    await interaction.reply({ content: 'Votre demande a été soumise et sera examinée par le staff. Merci !', flags: MessageFlags.Ephemeral }); // MODIFIÉ
                } catch (error) {
                    console.error("Erreur lors de l'envoi de la demande d'accès au salon de log:", error);
                    await interaction.reply({ content: "Une erreur est survenue lors de la soumission de votre demande. Veuillez réessayer ou contacter un administrateur si le problème persiste.", flags: MessageFlags.Ephemeral }); // MODIFIÉ
                }
            }
        }
    },
};