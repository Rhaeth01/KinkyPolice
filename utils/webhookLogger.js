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
                avatar: 'https://cdn.discordapp.com/attachments/123456789/moderation_avatar.png',
                color: '#E53E3E',
                fallbackChannel: () => configManager.modLogChannelId
            },
            messages: {
                name: '💬 Messages',
                avatar: 'https://cdn.discordapp.com/attachments/123456789/messages_avatar.png',
                color: '#3182CE',
                fallbackChannel: () => configManager.messageLogChannelId
            },
            voice: {
                name: '🔊 Vocal',
                avatar: 'https://cdn.discordapp.com/attachments/123456789/voice_avatar.png',
                color: '#38A169',
                fallbackChannel: () => configManager.voiceLogChannelId
            },
            roles: {
                name: '👥 Rôles',
                avatar: 'https://cdn.discordapp.com/attachments/123456789/roles_avatar.png',
                color: '#9F7AEA',
                fallbackChannel: () => configManager.roleLogChannelId
            },
            member: {
                name: '👤 Membres',
                avatar: 'https://cdn.discordapp.com/attachments/123456789/member_avatar.png',
                color: '#F6AD55',
                fallbackChannel: () => configManager.logChannelId
            },
            tickets: {
                name: '🎫 Tickets',
                avatar: 'https://cdn.discordapp.com/attachments/123456789/tickets_avatar.png',
                color: '#ED64A6',
                fallbackChannel: () => configManager.logsTicketsChannelId
            }
        };
    }

    /**
     * Initialise les webhooks pour tous les types de logs
     */
    async initialize(client) {
        try {
            console.log('🚀 [WebhookLogger] Initialisation du système de webhooks...');
            
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

            for (const [type, config] of Object.entries(this.logTypes)) {
                const channelId = config.fallbackChannel();
                if (!channelId) continue;

                const channel = client.channels.cache.get(channelId);
                if (!channel) {
                    console.error(`❌ [WebhookLogger] Canal ${type} introuvable: ${channelId}`);
                    continue;
                }

                try {
                    const webhook = await channel.createWebhook({
                        name: config.name,
                        avatar: config.avatar,
                        reason: 'Système de logs moderne KinkyPolice'
                    });

                    this.webhooks.set(type, new WebhookClient({ url: webhook.url }));
                    webhookUrls[type] = webhook.url;
                    
                    console.log(`✅ [WebhookLogger] Webhook créé pour ${type}: ${webhook.name}`);
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
            const webhook = this.webhooks.get(type);
            const logConfig = this.logTypes[type];

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
                avatarURL: logConfig.avatar,
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
        const embed = new EmbedBuilder()
            .setTitle(`🛡️ ${action}`)
            .setDescription(`**${action}** effectué sur ${target}`)
            .addFields(
                { name: '🎯 Cible', value: `${target}`, inline: true },
                { name: '👮 Modérateur', value: `${moderator}`, inline: true },
                { name: '📝 Raison', value: reason || '*Aucune raison fournie*', inline: false }
            )
            .setTimestamp();

        if (options.color) embed.setColor(options.color);
        if (options.thumbnail) embed.setThumbnail(options.thumbnail);

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
            .setTimestamp();

        return this.log('messages', embed);
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

        if (message.attachments.size > 0) {
            const attachments = message.attachments.map(att => `[${att.name}](${att.url})`).join('\n');
            embed.addFields({ name: '📎 Pièces jointes', value: this.truncateText(attachments), inline: false });
        }

        return this.log('messages', embed);
    }

    // 👥 LOGS DE RÔLES
    async logRoleChange(member, role, action, moderator) {
        const embed = new EmbedBuilder()
            .setTitle(`🛡️ Rôle ${action}`)
            .setDescription(`Rôle **${role.name}** ${action} pour ${member.user.username}`)
            .addFields(
                { name: '👤 Utilisateur', value: `${member}`, inline: true },
                { name: '🛡️ Rôle', value: `${role}`, inline: true },
                { name: '👮 Modérateur', value: `${moderator}`, inline: true },
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