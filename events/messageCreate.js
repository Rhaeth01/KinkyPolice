const { Events, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const { forbiddenRoleIds, supportCategoryId, staffRoleId, logChannelId } = require('../config.json');
const { getRandomMot } = require('../utils/jsonManager');

const modMailSessions = new Map(); // Pour stocker les sessions ModMail: userId -> channelId

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;

        // Système de ModMail (Support par MP)
        if (message.channel.type === ChannelType.DM) {
            if (!supportCategoryId || !staffRoleId) {
                console.warn("ModMail: supportCategoryId ou staffRoleId non configuré.");
                // Optionnel: répondre à l'utilisateur qu'il ne peut pas être aidé pour le moment.
                // await message.author.send("Désolé, le système de support est actuellement indisponible. Veuillez réessayer plus tard.").catch(console.error);
                return;
            }

            const guild = message.client.guilds.cache.first(); // Prend le premier serveur où le bot est. Adaptez si le bot est sur plusieurs serveurs.
            if (!guild) {
                console.error("ModMail: Bot non présent sur un serveur pour gérer le ModMail.");
                return;
            }

            let supportChannel;
            const existingChannelId = modMailSessions.get(message.author.id);

            if (existingChannelId) {
                supportChannel = guild.channels.cache.get(existingChannelId);
                if (!supportChannel) { // Le salon a pu être supprimé manuellement
                    modMailSessions.delete(message.author.id); // Nettoie la session
                    // On recrée un salon plus bas
                }
            }

            if (!supportChannel) {
                try {
                    supportChannel = await guild.channels.create({
                        name: `support-${message.author.username.slice(0,20)}-${message.author.discriminator === "0" ? message.author.id.slice(-4) : message.author.discriminator}`,
                        type: ChannelType.GuildText,
                        parent: supportCategoryId,
                        topic: `Ticket de support pour ${message.author.tag} (ID: ${message.author.id})`,
                        permissionOverwrites: [
                            {
                                id: guild.id, // @everyone
                                deny: [PermissionsBitField.Flags.ViewChannel],
                            },
                            {
                                id: staffRoleId,
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks],
                            },
                            { // Le bot lui-même
                                id: message.client.user.id,
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.ManageChannels] // ManageChannels pour supprimer
                            }
                            // Pas besoin de donner la permission à l'utilisateur ici, car c'est un relais.
                        ],
                    });
                    modMailSessions.set(message.author.id, supportChannel.id);

                    const initialEmbed = new EmbedBuilder()
                        .setColor(0x0099FF)
                        .setTitle(`Nouveau ticket de support: ${message.author.tag}`)
                        .setDescription(`Utilisateur: ${message.author} (\`${message.author.id}\`)\n\nLeurs messages apparaîtront ici. Répondez dans ce salon pour leur envoyer un message privé.`)
                        .setTimestamp();

                    const closeModmailButton = new ButtonBuilder()
                        .setCustomId(`close_modmail_${message.author.id}_${supportChannel.id}`) // Ajout de l'ID du salon pour le retrouver
                        .setLabel('Fermer ce ModMail')
                        .setStyle(ButtonStyle.Danger);
                    const row = new ActionRowBuilder().addComponents(closeModmailButton);

                    await supportChannel.send({ embeds: [initialEmbed], components: [row], content: `<@&${staffRoleId}>` }); // Mentionne le rôle staff

                    await message.author.send({ content: "Votre message a été transmis au staff. Ils vous répondront dès que possible. Toutes vos réponses ici seront également transmises." }).catch(console.error);

                } catch (error) {
                    console.error("ModMail: Erreur lors de la création du salon de support:", error);
                    await message.author.send("Désolé, une erreur est survenue lors de la création de votre ticket de support.").catch(console.error);
                    return;
                }
            }

            // Relayer le message de l'utilisateur vers le salon de support
            const userMsgEmbed = new EmbedBuilder()
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                .setDescription(message.content || "*Aucun texte (peut-être une image/pièce jointe)*")
                .setColor(0x3498DB) // Bleu
                .setTimestamp();
            if (message.attachments.size > 0) {
                userMsgEmbed.setImage(message.attachments.first().url);
            }
            await supportChannel.send({ embeds: [userMsgEmbed] });
            // Confirmer à l'utilisateur que son message a été relayé (optionnel, peut devenir spammy)
            // await message.react('✅').catch(console.error); 

            return; // Fin du traitement ModMail pour les DMs
        }

        // Relayer la réponse du staff depuis le salon de support vers l'utilisateur en DM
        if (message.guild && message.channel.parentId === supportCategoryId && message.member.roles.cache.has(staffRoleId)) {
            const userIdFromTopic = message.channel.topic?.match(/ID: (\d+)/)?.[1];
            if (userIdFromTopic) {
                const targetUser = await message.client.users.fetch(userIdFromTopic).catch(() => null);
                if (targetUser) {
                    const staffMsgEmbed = new EmbedBuilder()
                        .setAuthor({ name: `${message.author.tag} (Staff)`, iconURL: message.author.displayAvatarURL() })
                        .setDescription(message.content || "*Aucun texte (peut-être une image/pièce jointe)*")
                        .setColor(0x2ECC71) // Vert
                        .setTimestamp();
                     if (message.attachments.size > 0) {
                        staffMsgEmbed.setImage(message.attachments.first().url);
                    }
                    try {
                        await targetUser.send({ embeds: [staffMsgEmbed] });
                        await message.react('📨').catch(console.error); // Réaction pour confirmer l'envoi
                    } catch (dmError) {
                        console.error(`ModMail: Impossible d'envoyer un DM à ${targetUser.tag}:`, dmError);
                        await message.reply({ content: `Impossible d'envoyer le message à ${targetUser.tag}. L'utilisateur a peut-être bloqué le bot ou désactivé ses MPs.`, ephemeral: true });
                    }
                }
            }
            return; // Fin du traitement ModMail pour les réponses du staff
        }


        // Modération automatique par rôle (code existant)
        if (!message.guild) return; // Déjà vérifié au début pour les DMs, mais redondance pour la clarté de cette section

        if (!forbiddenRoleIds || !Array.isArray(forbiddenRoleIds) || forbiddenRoleIds.length === 0) {
            return;
        }
        const member = message.member;
        if (!member) return;
        const hasForbiddenRole = member.roles.cache.some(role => forbiddenRoleIds.includes(role.id));

        if (hasForbiddenRole) {
            if (!message.channel.permissionsFor(message.client.user).has(PermissionsBitField.Flags.ManageMessages)) {
                console.warn(`Permissions manquantes pour supprimer le message de ${message.author.tag} dans ${message.channel.name}.`);
                return;
            }
            try {
                await message.delete();
                const randomWord = getRandomMot();
                if (randomWord) {
                    await message.channel.send({ content: `${message.author}, ${randomWord}` });
                } else {
                    await message.channel.send({ content: `${message.author}, attention à ce que vous dites !` });
                }
                console.log(`Message de ${message.author.tag} (avec rôle interdit) supprimé et remplacé par un mot aléatoire.`);
            } catch (error) {
                console.error(`Erreur lors de la suppression du message de ${message.author.tag}:`, error);
            }
        }
    },
};
