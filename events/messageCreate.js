const { Events, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { logChannelId } = require('../config.json');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignorer les messages du bot lui-même
        if (message.author.bot) return;

        // Vérifier si c'est un message privé (DM)
        if (!message.guild) {
            // C'est un message privé, on va créer un ticket modmail
            try {
                // Récupérer le serveur principal (vous devrez ajouter l'ID de votre serveur dans config.json)
                // Exemple: const mainGuild = message.client.guilds.cache.get('VOTRE_ID_DE_SERVEUR');
                const mainGuild = message.client.guilds.cache.first(); // Prend le premier serveur (à modifier)
                
                if (!mainGuild) {
                    return message.reply("Je ne peux pas créer de ticket car je ne suis pas connecté à un serveur.");
                }

                // Vérifier si un ticket existe déjà pour cet utilisateur
                const existingTicket = mainGuild.channels.cache.find(
                    channel => channel.name === `modmail-${message.author.id}`
                );

                if (existingTicket) {
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

                // Créer une catégorie pour les tickets modmail si elle n'existe pas
                let modmailCategory = mainGuild.channels.cache.find(
                    channel => channel.type === ChannelType.GuildCategory && channel.name === 'MODMAIL'
                );

                if (!modmailCategory) {
                    modmailCategory = await mainGuild.channels.create({
                        name: 'MODMAIL',
                        type: ChannelType.GuildCategory,
                        permissionOverwrites: [
                            {
                                id: mainGuild.roles.everyone.id,
                                deny: [PermissionFlagsBits.ViewChannel]
                            }
                        ]
                    });
                }

                // Créer un nouveau salon pour ce ticket
                const ticketChannel = await mainGuild.channels.create({
                    name: `modmail-${message.author.id}`,
                    type: ChannelType.GuildText,
                    parent: modmailCategory.id,
                    permissionOverwrites: [
                        {
                            id: mainGuild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        // Ajoutez ici les rôles qui devraient avoir accès aux tickets modmail
                        // Exemple pour un rôle "Modérateur" :
                        // {
                        //     id: 'ID_DU_ROLE_MODERATEUR',
                        //     allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                        // }
                    ]
                });

                // Envoyer un message d'information dans le nouveau salon
                const infoEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('Nouveau ticket ModMail')
                    .setDescription(`Ticket créé par ${message.author.tag} (${message.author.id})`)
                    .setThumbnail(message.author.displayAvatarURL())
                    .setTimestamp();
                
                await ticketChannel.send({ embeds: [infoEmbed] });

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
