const { EmbedBuilder, WebhookClient } = require('discord.js');
const configManager = require('./configManager');

/**
 * Système de logs moderne avec webhooks pour KinkyPolice
 * Offre de meilleures performances, flexibilité et design professionnel
 */
class WebhookLogger {
    constructor() {
        this.webhooks = new Map();
        this.fallbackMode = false;
        
        // Configuration des types de logs avec leurs designs spécifiques
        this.logTypes = {
            moderation: {
                name: '🛡️ Modération',
                avatar: null, // Sera remplacé par l'avatar du bot
                color: '#DC143C', // Rouge crimson pour modération
                fallbackChannel: () => configManager.modLogChannelId
            },
            messages: {
                name: '💬 Messages',
                avatar: null,
                color: '#4682B4', // Bleu acier pour messages
                fallbackChannel: () => configManager.messageLogChannelId
            },
            messagesEdited: {
                name: '✏️ Messages Édités',
                avatar: null,
                color: '#FF8C00', // Orange foncé pour messages édités
                fallbackChannel: () => configManager.messageLogChannelId
            },
            messagesDeleted: {
                name: '🗑️ Messages Supprimés',
                avatar: null,
                color: '#B22222', // Rouge brique pour messages supprimés
                fallbackChannel: () => configManager.messageLogChannelId
            },
            voice: {
                name: '🔊 Vocal',
                avatar: null,
                color: '#228B22', // Vert forêt pour vocal
                fallbackChannel: () => configManager.voiceLogChannelId
            },
            roles: {
                name: '👥 Rôles',
                avatar: null,
                color: '#8A2BE2', // Violet bleu pour rôles
                fallbackChannel: () => configManager.roleLogChannelId
            },
            member: {
                name: '👤 Membres',
                avatar: null,
                color: '#DDA0DD', // Prune pour membres
                fallbackChannel: () => configManager.logChannelId
            },
            tickets: {
                name: '🎫 Tickets',
                avatar: null,
                color: '#C71585', // Violet rouge pour tickets
                fallbackChannel: () => configManager.logsTicketsChannelId
            }
        };
        
        this.botAvatar = null; // Stockera l'avatar du bot
    }

    /**
     * Initialise les webhooks pour tous les types de logs
     */
    async initialize(client) {
        try {
            console.log('🚀 [WebhookLogger] Initialisation du système de webhooks...');
            
            // Stocker l'avatar du bot pour tous les webhooks
            this.botAvatar = client.user.displayAvatarURL({ size: 256 });
            
            // Mettre à jour les avatars de tous les types de logs avec l'avatar du bot
            for (const [type, config] of Object.entries(this.logTypes)) {
                config.avatar = this.botAvatar;
            }
            
            // Récupérer les URLs de webhooks depuis la configuration
            const webhookConfig = configManager.getWebhookConfig();
            
            if (!webhookConfig || Object.keys(webhookConfig).length === 0) {
                console.log('⚠️ [WebhookLogger] Aucun webhook configuré, création automatique...');
                await this.setupWebhooks(client);
                return;
            }

            // Initialiser les clients webhooks existants
            for (const [type, url] of Object.entries(webhookConfig)) {
                if (url && this.logTypes[type]) {
                    try {
                        this.webhooks.set(type, new WebhookClient({ url }));
                        console.log(`✅ [WebhookLogger] Webhook ${type} initialisé`);
                    } catch (error) {
                        console.error(`❌ [WebhookLogger] Erreur webhook ${type}:`, error.message);
                    }
                }
            }

            // Vérifier si on a les nouveaux webhooks pour messages édités/supprimés
            const hasMessageWebhooks = webhookConfig.messagesEdited && webhookConfig.messagesDeleted;
            if (!hasMessageWebhooks && webhookConfig.messages) {
                console.log('⚠️ [WebhookLogger] Migration nécessaire pour les webhooks de messages...');
                // On ne fait pas la migration automatique, on laisse l'admin utiliser /webhook-config
            }

            console.log(`🎉 [WebhookLogger] ${this.webhooks.size} webhooks initialisés avec succès`);
            
        } catch (error) {
            console.error('❌ [WebhookLogger] Erreur lors de l\'initialisation:', error);
            this.fallbackMode = true;
        }
    }

    /**
     * Crée automatiquement les webhooks pour tous les canaux de logs
     */
    async setupWebhooks(client) {
        try {
            const webhookUrls = {};
            const processedChannels = new Set();

            for (const [type, config] of Object.entries(this.logTypes)) {
                const channelId = config.fallbackChannel();
                if (!channelId) continue;

                const channel = client.channels.cache.get(channelId);
                if (!channel) {
                    console.error(`❌ [WebhookLogger] Canal ${type} introuvable: ${channelId}`);
                    continue;
                }

                try {
                    // Pour les webhooks de messages, on vérifie si on a déjà créé des webhooks sur ce canal
                    if (type === 'messagesEdited' || type === 'messagesDeleted') {
                        // On crée un webhook séparé pour chaque type même s'ils sont sur le même canal
                        const webhook = await channel.createWebhook({
                            name: config.name,
                            avatar: this.botAvatar,
                            reason: 'Système de logs moderne KinkyPolice - Messages spécifiques'
                        });

                        this.webhooks.set(type, new WebhookClient({ url: webhook.url }));
                        webhookUrls[type] = webhook.url;
                        
                        console.log(`✅ [WebhookLogger] Webhook créé pour ${type}: ${webhook.name}`);
                    } else if (!processedChannels.has(channelId)) {
                        // Pour les autres types, on évite de créer plusieurs webhooks sur le même canal
                        const webhook = await channel.createWebhook({
                            name: config.name,
                            avatar: this.botAvatar,
                            reason: 'Système de logs moderne KinkyPolice'
                        });

                        this.webhooks.set(type, new WebhookClient({ url: webhook.url }));
                        webhookUrls[type] = webhook.url;
                        processedChannels.add(channelId);
                        
                        console.log(`✅ [WebhookLogger] Webhook créé pour ${type}: ${webhook.name}`);
                    }
                } catch (error) {
                    console.error(`❌ [WebhookLogger] Impossible de créer webhook ${type}:`, error.message);
                }
            }

            // Sauvegarder les URLs dans la configuration
            if (Object.keys(webhookUrls).length > 0) {
                configManager.updateWebhookConfig(webhookUrls);
                console.log('💾 [WebhookLogger] Configuration webhook sauvegardée');
            }

        } catch (error) {
            console.error('❌ [WebhookLogger] Erreur setup webhooks:', error);
            this.fallbackMode = true;
        }
    }

    /**
     * Envoie un log via webhook avec fallback automatique
     */
    async log(type, embed, options = {}) {
        try {
            let webhook = this.webhooks.get(type);
            let logConfig = this.logTypes[type];

            // Fallback pour les messages édités/supprimés vers le webhook général messages
            if (!webhook && (type === 'messagesEdited' || type === 'messagesDeleted')) {
                webhook = this.webhooks.get('messages');
                if (webhook) {
                    console.log(`🔄 [WebhookLogger] Fallback ${type} vers webhook messages général`);
                }
            }

            if (!webhook || this.fallbackMode) {
                return this.fallbackLog(type, embed, options);
            }

            // Appliquer le style du type de log
            if (!embed.data.color && logConfig.color) {
                embed.setColor(logConfig.color);
            }

            const webhookOptions = {
                embeds: [embed],
                username: logConfig.name,
                avatarURL: this.botAvatar || logConfig.avatar,
                ...options
            };

            await webhook.send(webhookOptions);
            console.log(`✅ [WebhookLogger] Log ${type} envoyé via webhook`);

        } catch (error) {
            console.error(`❌ [WebhookLogger] Erreur webhook ${type}:`, error.message);
            
            // Fallback automatique en cas d'erreur
            if (error.code === 10015 || error.code === 50027) {
                console.log(`🔄 [WebhookLogger] Webhook ${type} invalide, fallback activé`);
                this.webhooks.delete(type);
            }
            
            return this.fallbackLog(type, embed, options);
        }
    }

    /**
     * Méthode de fallback utilisant les canaux classiques
     */
    async fallbackLog(type, embed, options = {}) {
        try {
            const logConfig = this.logTypes[type];
            const channelId = logConfig.fallbackChannel();
            
            if (!channelId) {
                console.error(`❌ [WebhookLogger] Aucun canal fallback pour ${type}`);
                return;
            }

            // Note: Pour utiliser client.channels, on devra passer le client en paramètre
            // ou le stocker dans une variable globale. Pour l'instant, on log juste l'erreur.
            console.log(`🔄 [WebhookLogger] Fallback vers canal ${channelId} pour ${type}`);
            
        } catch (error) {
            console.error(`❌ [WebhookLogger] Erreur fallback ${type}:`, error);
        }
    }

    /**
     * Logs spécialisés avec templates prédéfinis
     */

    // 🛡️ LOGS DE MODÉRATION
    async logModeration(action, target, moderator, reason, options = {}) {
        // Formater le modérateur en mention si c'est un objet User/GuildMember
        let moderatorDisplay;
        if (moderator && moderator.id) {
            moderatorDisplay = `<@${moderator.id}>`;
        } else {
            moderatorDisplay = moderator || '*Inconnu*';
        }

        const embed = new EmbedBuilder()
            .setTitle(`🛡️ ${action}`)
            .setDescription(`**${action}** effectué sur ${target}`)
            .addFields(
                { name: '🎯 Cible', value: `${target}`, inline: true },
                { name: '👮 Modérateur', value: moderatorDisplay, inline: true },
                { name: '📝 Raison', value: reason || '*Aucune raison fournie*', inline: false }
            )
            .setTimestamp();

        if (options.color) embed.setColor(options.color);
        
        // Si la cible a une photo de profil et qu'aucune thumbnail n'est spécifiée
        if (!options.thumbnail && target && target.displayAvatarURL) {
            embed.setThumbnail(target.displayAvatarURL({ dynamic: true }));
        } else if (options.thumbnail) {
            embed.setThumbnail(options.thumbnail);
        }

        return this.log('moderation', embed, options);
    }

    // 💬 LOGS DE MESSAGES
    async logMessageEdit(oldMessage, newMessage) {
        const embed = new EmbedBuilder()
            .setTitle('✏️ Message Édité')
            .setDescription(`Message édité dans ${oldMessage.channel}`)
            .addFields(
                { name: '👤 Auteur', value: `${oldMessage.author}`, inline: true },
                { name: '📍 Canal', value: `${oldMessage.channel}`, inline: true },
                { name: '🕐 Modifié', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true },
                { name: '📜 Ancien contenu', value: this.truncateText(oldMessage.content) || '*Contenu vide*', inline: false },
                { name: '📝 Nouveau contenu', value: this.truncateText(newMessage.content) || '*Contenu vide*', inline: false }
            )
            .setThumbnail(oldMessage.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        // Use the specific webhook type for edited messages
        return this.log('messagesEdited', embed);
    }

    async logMessageDelete(message) {
        const embed = new EmbedBuilder()
            .setTitle('🗑️ Message Supprimé')
            .setDescription(`Message supprimé dans ${message.channel}`)
            .addFields(
                { name: '👤 Auteur', value: message.author ? `${message.author}` : '*Auteur inconnu*', inline: true },
                { name: '📍 Canal', value: `${message.channel}`, inline: true },
                { name: '🕐 Supprimé', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true },
                { name: '📜 Contenu', value: this.truncateText(message.content) || '*Contenu vide*', inline: false }
            )
            .setTimestamp();

        // Ajouter la photo de profil si l'auteur est disponible
        if (message.author) {
            try {
                embed.setThumbnail(message.author.displayAvatarURL({ dynamic: true }));
            } catch (error) {
                console.warn('⚠️ [WebhookLogger] Impossible de récupérer l\'avatar:', error.message);
            }
        }

        if (message.attachments.size > 0) {
            const attachments = message.attachments.map(att => `[${att.name}](${att.url})`).join('\n');
            embed.addFields({ name: '📎 Pièces jointes', value: this.truncateText(attachments), inline: false });
        }

        // Use the specific webhook type for deleted messages
        return this.log('messagesDeleted', embed);
    }

    // 👥 LOGS DE RÔLES
    async logRoleChange(member, role, action, moderator) {
        // Formater le modérateur : si c'est un User/GuildMember, utiliser la mention, sinon garder le texte
        let moderatorDisplay;
        if (moderator && moderator.id) {
            // C'est un objet User ou GuildMember
            moderatorDisplay = `<@${moderator.id}>`;
        } else {
            // C'est un string ou autre
            moderatorDisplay = moderator || '*Inconnu*';
        }

        const embed = new EmbedBuilder()
            .setTitle(`🛡️ Rôle ${action}`)
            .setDescription(`Rôle **${role.name}** ${action} pour ${member.user.username}`)
            .addFields(
                { name: '👤 Utilisateur', value: `${member}`, inline: true },
                { name: '🛡️ Rôle', value: `${role}`, inline: true },
                { name: '👮 Modérateur', value: moderatorDisplay, inline: true },
                { name: '🕐 Action', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: false }
            )
            .setColor(action === 'ajouté' ? '#38A169' : '#E53E3E')
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        return this.log('roles', embed);
    }

    // 🔊 LOGS VOCAUX
    async logVoiceActivity(member, action, channel, details = {}) {
        const embed = new EmbedBuilder()
            .setTitle(`🔊 ${action}`)
            .setDescription(`${member.user.username} ${action.toLowerCase()}`)
            .addFields(
                { name: '👤 Utilisateur', value: `${member}`, inline: true },
                { name: '🔊 Canal', value: channel ? `${channel}` : '*Canal inconnu*', inline: true },
                { name: '🕐 Action', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        if (details.duration) {
            embed.addFields({ name: '⏱️ Durée', value: details.duration, inline: true });
        }

        return this.log('voice', embed);
    }

    // 👤 LOGS DE MEMBRES
    async logMemberJoin(member) {
        const embed = new EmbedBuilder()
            .setTitle('📥 Nouveau Membre')
            .setDescription(`${member.user.username} a rejoint le serveur`)
            .addFields(
                { name: '👤 Utilisateur', value: `${member}`, inline: true },
                { name: '📅 Compte créé', value: `<t:${Math.floor(member.user.createdTimestamp/1000)}:R>`, inline: true },
                { name: '🕐 A rejoint', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true },
                { name: '📊 Total membres', value: `${member.guild.memberCount}`, inline: true }
            )
            .setColor('#38A169')
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        return this.log('member', embed);
    }

    async logMemberLeave(member) {
        const embed = new EmbedBuilder()
            .setTitle('📤 Membre Parti')
            .setDescription(`${member.user.username} a quitté le serveur`)
            .addFields(
                { name: '👤 Utilisateur', value: `${member.user.tag}`, inline: true },
                { name: '🕐 A quitté', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true },
                { name: '📊 Total membres', value: `${member.guild.memberCount}`, inline: true }
            )
            .setColor('#E53E3E')
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        if (member.roles.cache.size > 1) {
            const roles = member.roles.cache
                .filter(role => role.name !== '@everyone')
                .map(role => role.name)
                .join(', ');
            embed.addFields({ name: '🛡️ Rôles', value: this.truncateText(roles), inline: false });
        }

        return this.log('member', embed);
    }

    // 🎫 LOGS DE TICKETS
    async logTicketAction(action, ticketName, user, moderator, reason) {
        const embed = new EmbedBuilder()
            .setTitle(`🎫 Ticket ${action}`)
            .setDescription(`Ticket **${ticketName}** ${action.toLowerCase()}`)
            .addFields(
                { name: '👤 Utilisateur', value: `${user}`, inline: true },
                { name: '👮 Modérateur', value: `${moderator}`, inline: true },
                { name: '🕐 Action', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
            )
            .setTimestamp();

        if (reason) {
            embed.addFields({ name: '📝 Raison', value: reason, inline: false });
        }

        const actionColors = {
            'créé': '#38A169',
            'fermé': '#E53E3E',
            'supprimé': '#9F7AEA'
        };

        embed.setColor(actionColors[action.toLowerCase()] || '#3182CE');

        return this.log('tickets', embed);
    }

    /**
     * Utilitaires
     */
    truncateText(text, maxLength = 1024) {
        if (!text) return text;
        return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
    }

    /**
     * Méthodes de gestion
     */
    async refreshWebhook(type) {
        try {
            this.webhooks.delete(type);
            console.log(`🔄 [WebhookLogger] Webhook ${type} supprimé du cache`);
        } catch (error) {
            console.error(`❌ [WebhookLogger] Erreur refresh webhook ${type}:`, error);
        }
    }

    getStatus() {
        return {
            webhooksActive: this.webhooks.size,
            fallbackMode: this.fallbackMode,
            types: Object.keys(this.logTypes)
        };
    }
}

// Export singleton
module.exports = new WebhookLogger();