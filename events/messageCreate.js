const { Events, EmbedBuilder, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const configManager = require('../utils/configManager');
const { addCurrency, isSourceEnabled } = require('../utils/currencyManager');
const { processTouretteMessage } = require('../commands/tourette.js');
const { 
    getMessageCooldown, 
    updateMessageCooldown, 
    getMessageCount, 
    updateMessageCount, 
    resetMessageCount 
} = require('../utils/persistentState');
const { handleMessageXp } = require('../utils/levelEventHandler');

// Fonction pour obtenir la configuration des messages
function getMessageConfig() {
    const config = configManager.getConfig();
    return config.economy?.messageActivity || {
        enabled: true,
        pointsPerReward: 10,
        messagesRequired: 10,
        minimumWordCount: 3,
        cooldownMinutes: 5
    };
}

// Fonctions AFK partagées
async function getAfkUsers() {
    try {
        const afkFilePath = path.join(__dirname, '..', 'data', 'afk.json');
        if (!fs.existsSync(afkFilePath)) {
            return {};
        }
        const data = await fs.promises.readFile(afkFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur lors de la lecture de afk.json:', error);
        return {};
    }
}

async function saveAfkUsers(data) {
    try {
        const afkFilePath = path.join(__dirname, '..', 'data', 'afk.json');
        await fs.promises.writeFile(afkFilePath, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error(`Erreur lors de l'écriture de afk.json:`, error);
    }
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignorer les messages du bot lui-même et les messages privés (DM)
        if (message.author.bot || !message.guild) return;

        // Gestion AFK avec fonctions async
        const afkFilePath = path.join(__dirname, '..', 'data', 'afk.json');
        const afkUsers = await getAfkUsers();
        const userId = message.author.id;

        // AFK Status Removal
        if (afkUsers[userId]) {
            delete afkUsers[userId];
            await saveAfkUsers(afkUsers);

            try {
                const member = await message.guild.members.fetch(userId);
                if (member.nickname?.startsWith('[AFK]')) {
                    const newNickname = member.nickname.replace(/^\[AFK\]\s*/, '');
                    await member.setNickname(newNickname || member.user.username);
                }
            } catch (error) {
                console.error(`Impossible de réinitialiser le pseudo pour ${message.author.tag}: ${error}`);
            }

            const welcomeBackMessage = await message.reply('Bon retour ! J\'ai retiré votre statut AFK.');
            setTimeout(() => welcomeBackMessage.delete(), 5000);
            return; // On arrête le traitement ici pour ne pas donner de récompenses pour le message de retour.
        }

        // AFK Mention Handling
        const mentionedUser = message.mentions.users.first();
        if (mentionedUser && afkUsers[mentionedUser.id]) {
            const afkInfo = afkUsers[mentionedUser.id];
            const afkSince = new Date(afkInfo.timestamp);

            const afkEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`\`${mentionedUser.username}\` est AFK`)
                .setDescription(`**Raison:** ${afkInfo.reason}`)
                .setTimestamp(afkSince)
                .setFooter({ text: `AFK depuis` });

            message.channel.send({ embeds: [afkEmbed] });
        }

        // Vérifier et traiter les messages de tourette en premier
        const wasProcessedByTourette = processTouretteMessage(message);
        if (wasProcessedByTourette) {
            return; // Le message a été traité par la tourette, on arrête ici
        }

        // Logique pour les Kinky Points par message (avec configuration et stockage persistant)
        if (isSourceEnabled('message')) {
            const messageConfig = getMessageConfig();
            const words = message.content.split(/\s+/).filter(word => word.length > 0);
            
            if (words.length >= messageConfig.minimumWordCount) {
                const userId = message.author.id;
                const now = Date.now();
                
                // Vérifier le cooldown (stockage persistant)
                const lastReward = await getMessageCooldown(userId);
                const cooldownMs = messageConfig.cooldownMinutes * 60 * 1000;
                
                if (now - lastReward >= cooldownMs) {
                    const currentCount = await getMessageCount(userId);
                    const newCount = currentCount + 1;
                    await updateMessageCount(userId, newCount);

                    if (newCount >= messageConfig.messagesRequired) {
                        console.log(`[MessageRewards] Attribution de ${messageConfig.pointsPerReward} Kinky Points à ${userId} pour l'activité de message.`);
                        const success = await addCurrency(userId, messageConfig.pointsPerReward, 'message');
                        
                        if (success) {
                            await resetMessageCount(userId); // Réinitialiser le compteur
                            await updateMessageCooldown(userId, now); // Mettre à jour le cooldown
                        }
                    }
                }
            }
        }

        // Système de niveaux et XP pour les messages
        await handleMessageXp(message);

        // Vérifier si c'est un message privé (DM)
        if (!message.guild) {
            console.log(`[ModMail] Message privé reçu de ${message.author.tag} (${message.author.id}).`);
            // C'est un message privé, on va créer un ticket modmail
            try {
                // Récupérer le serveur principal via configManager
                const guildId = configManager.guildId;
                const mainGuild = message.client.guilds.cache.get(guildId);
                
                if (!mainGuild) {
                    console.log(`[ModMail] Erreur: Serveur principal (ID: ${guildId}) introuvable.`);
                    return message.reply("Je ne peux pas créer de ticket car je ne suis pas connecté à un serveur.");
                }
                console.log(`[ModMail] Serveur principal trouvé: ${mainGuild.name} (ID: ${mainGuild.id}).`);

                // Vérifier si un ticket existe déjà pour cet utilisateur
                const existingTicket = mainGuild.channels.cache.find(
                    channel => channel.name === `modmail-${message.author.id}`
                );

                if (existingTicket) {
                    console.log(`[ModMail] Ticket existant trouvé pour ${message.author.tag} (${message.author.id}).`);
                    // Si un ticket existe déjà, on y transmet le message
                    const userEmbed = new EmbedBuilder()
                        .setColor(0x3498DB)
                        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                        .setDescription(message.content)
                        .setTimestamp();
                    
                    if (message.attachments.size > 0) {
                        userEmbed.setImage(message.attachments.first().url);
                    }
                    
                    await existingTicket.send({ embeds: [userEmbed] });
                    await message.react('✅');
                    return;
                }

                // Utiliser la catégorie prédéfinie pour les tickets modmail
                const modmailCategoryId = configManager.modmailCategory;
                console.log(`[ModMail] modmailCategoryId: ${modmailCategoryId}`);
                if (!modmailCategoryId) {
                    console.log(`[ModMail] Erreur: modmail.categoryId non configuré.`);
                    return message.reply("La catégorie ModMail n'est pas configurée. Veuillez contacter un administrateur.");
                }
                
                const modmailCategory = mainGuild.channels.cache.get(modmailCategoryId);
                console.log(`[ModMail] modmailCategory: ${modmailCategory ? modmailCategory.name : 'Non trouvé'}`);
                if (!modmailCategory) {
                    console.log(`[ModMail] Erreur: Catégorie ModMail (ID: ${modmailCategoryId}) introuvable.`);
                    return message.reply("La catégorie ModMail configurée est introuvable. Veuillez contacter un administrateur.");
                }

                // Créer un nouveau salon pour ce ticket
                const ticketChannel = await mainGuild.channels.create({
                    name: `modmail-${message.author.id}`,
                    type: ChannelType.GuildText,
                    parent: modmailCategory.id,
                    topic: message.author.id,
                    permissionOverwrites: [
                        {
                            id: mainGuild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        // Ajouter les permissions pour chaque rôle staff configuré
                        ...(configManager.getValidStaffRoleIds() || []).map(roleId => ({
                            id: roleId,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]
                        }))
                    ]
                });

                // Créer les boutons de gestion du ticket ModMail
                const closeButton = new ButtonBuilder()
                    .setCustomId(`modmail_close_${ticketChannel.id}`)
                    .setLabel('Fermer')
                    .setEmoji('🚪')
                    .setStyle(ButtonStyle.Secondary);

                const deleteButton = new ButtonBuilder()
                    .setCustomId(`modmail_delete_${ticketChannel.id}`)
                    .setLabel('Supprimer')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Danger);

                const transcriptButton = new ButtonBuilder()
                    .setCustomId(`modmail_transcript_${ticketChannel.id}`)
                    .setLabel('Transcrire')
                    .setEmoji('📜')
                    .setStyle(ButtonStyle.Primary);

                const modmailActionRow = new ActionRowBuilder().addComponents(closeButton, deleteButton, transcriptButton);

                // Envoyer un message d'information dans le nouveau salon
                const infoEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('Nouveau ticket ModMail')
                    .setDescription(`Ticket créé par ${message.author.tag} (${message.author.id})`)
                    .setThumbnail(message.author.displayAvatarURL())
                    .setTimestamp();
                
                await ticketChannel.send({ embeds: [infoEmbed], components: [modmailActionRow] });

                // Envoyer le message de l'utilisateur
                const userEmbed = new EmbedBuilder()
                    .setColor(0x3498DB)
                    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                    .setDescription(message.content)
                    .setTimestamp();
                
                if (message.attachments.size > 0) {
                    userEmbed.setImage(message.attachments.first().url);
                }
                
                await ticketChannel.send({ embeds: [userEmbed] });

                // Confirmer à l'utilisateur que son message a été reçu
                const confirmEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('Message reçu')
                    .setDescription('Votre message a été transmis à l\'équipe de modération. Nous vous répondrons dès que possible.')
                    .setTimestamp();
                
                await message.author.send({ embeds: [confirmEmbed] });

                // Log l'action
                const logChannelId = configManager.ticketLogChannelId;
                const logChannel = mainGuild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(0x3498DB)
                        .setTitle('Nouveau ticket ModMail')
                        .setDescription(`Un nouveau ticket ModMail a été créé par ${message.author.tag} (${message.author.id})`)
                        .addFields({ name: 'Salon', value: `<#${ticketChannel.id}>` })
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (error) {
                console.error('Erreur lors de la création du ticket ModMail:', error);
                await message.reply("Une erreur s'est produite lors de la création de votre ticket. Veuillez réessayer plus tard.");
            }
        } else if (message.channel.name.startsWith('modmail-')) {
            // C'est un message dans un canal de modmail, on le transmet à l'utilisateur
            try {
                // Extraire l'ID de l'utilisateur du nom du canal
                const userId = message.channel.name.split('-')[1];
                const user = await message.client.users.fetch(userId);
                
                if (!user) return;
                
                // Ignorer les messages des bots (sauf le message initial)
                if (message.author.bot) return;
                
                // Créer un embed pour le message du staff
                const staffEmbed = new EmbedBuilder()
                    .setColor(0xE74C3C)
                    .setAuthor({ name: `${message.author.tag} (Staff)`, iconURL: message.author.displayAvatarURL() })
                    .setDescription(message.content)
                    .setTimestamp();
                
                if (message.attachments.size > 0) {
                    staffEmbed.setImage(message.attachments.first().url);
                }
                
                // Envoyer le message à l'utilisateur
                await user.send({ embeds: [staffEmbed] });
                
                // Réagir au message pour confirmer l'envoi
                await message.react('✅');
            } catch (error) {
                console.error('Erreur lors de la transmission du message ModMail:', error);
                await message.reply("Une erreur s'est produite lors de l'envoi de votre message à l'utilisateur.");
            }
        }
    },
};
