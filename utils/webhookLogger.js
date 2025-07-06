const { EmbedBuilder, WebhookClient } = require('discord.js');
const configManager = require('./configManager');

class WebhookLogger {
    constructor() {
        this.webhooks = new Map();
        this.client = null;
        this.logTypeNames = {
            modLogs: 'Modération',
            messageLogs: 'Messages',
            voiceLogs: 'Vocaux',
            memberLogs: 'Membres',
            roleLogs: 'Rôles',
            ticketLogs: 'Tickets'
        };
    }

    initialize(client) {
        this.client = client;
        const loggingConfig = configManager.getConfig().logging || {};

        for (const [logType, config] of Object.entries(loggingConfig)) {
            if (config && config.enabled && config.webhookUrl) {
                try {
                    const webhookClient = new WebhookClient({ url: config.webhookUrl });
                    this.webhooks.set(logType, webhookClient);
                } catch (error) {
                    console.error(`[WebhookLogger] Erreur initialisation webhook pour ${logType}:`, error.message);
                }
            }
        }
        console.log(`[WebhookLogger] Initialisé avec ${this.webhooks.size} webhook(s) actif(s).`);
    }

    async log(logType, embed, options = {}) {
        const webhook = this.webhooks.get(logType);
        if (!webhook) {
            return this.fallbackLog(logType, embed);
        }

        try {
            const webhookOptions = {
                embeds: [embed],
                username: `KinkyPolice ${this.logTypeNames[logType] || 'Logs'}`,
                avatarURL: this.client.user.displayAvatarURL(),
                ...options
            };
            await webhook.send(webhookOptions);
        } catch (error) {
            console.error(`[WebhookLogger] Erreur envoi webhook pour ${logType}:`, error.message);
            if (error.code === 10015) { // Unknown Webhook
                console.warn(`[WebhookLogger] Webhook pour ${logType} invalide. Suppression.`);
                this.webhooks.delete(logType);
                // Optionnel: tenter de recréer ou notifier
            }
            await this.fallbackLog(logType, embed);
        }
    }

    async fallbackLog(logType, embed) {
        const loggingConfig = configManager.getConfig().logging || {};
        const logConfig = loggingConfig[logType];

        if (!logConfig || !logConfig.channelId) {
            // console.error(`[WebhookLogger] Fallback impossible: channelId non configuré pour ${logType}`);
            return;
        }

        try {
            const channel = await this.client.channels.fetch(logConfig.channelId);
            if (channel && channel.isTextBased()) {
                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error(`[WebhookLogger] Erreur fallback pour ${logType} dans le salon ${logConfig.channelId}:`, error.message);
        }
    }

    async logRoleChange(member, role, action, moderator) {
        try {
            const { EmbedBuilder } = require('discord.js');
            
            const actionEmoji = action === 'ajouté' ? '✅' : '❌';
            const actionColor = action === 'ajouté' ? '#00FF00' : '#FF4500';
            
            const embed = new EmbedBuilder()
                .setTitle(`${actionEmoji} Rôle ${action}`)
                .setColor(actionColor)
                .addFields([
                    { name: '👤 Membre', value: `${member}`, inline: true },
                    { name: '🏷️ Rôle', value: `${role}`, inline: true },
                    { name: '🛠️ Modérateur', value: moderator && typeof moderator === 'object' ? `${moderator}` : moderator || 'Système', inline: true }
                ])
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ 
                    text: `ID: ${member.id}`,
                    iconURL: member.guild.iconURL({ dynamic: true })
                });

            await this.log('roleLogs', embed);
        } catch (error) {
            console.error('[WebhookLogger] Erreur lors du log de changement de rôle:', error);
        }
    }

    async logModeration(actionType, targetUser, moderator, reason, options = {}) {
        try {
            const { EmbedBuilder } = require('discord.js');
            
            const embed = new EmbedBuilder()
                .setTitle(`🛡️ ${actionType}`)
                .setColor(options.color || '#FF6B6B')
                .addFields([
                    { name: '🎯 Utilisateur', value: `${targetUser}`, inline: true },
                    { name: '🛠️ Modérateur', value: moderator && typeof moderator === 'object' ? `${moderator}` : moderator || 'Système', inline: true },
                    { name: '📝 Raison', value: reason || 'Aucune raison fournie', inline: false }
                ])
                .setTimestamp()
                .setFooter({ 
                    text: `ID: ${targetUser.id}`,
                    iconURL: options.footerIcon
                });

            if (options.thumbnail) {
                embed.setThumbnail(options.thumbnail);
            }

            await this.log('modLogs', embed);
        } catch (error) {
            console.error('[WebhookLogger] Erreur lors du log de modération:', error);
        }
    }

    async logMessageEdit(oldMessage, newMessage) {
        try {
            const { EmbedBuilder } = require('discord.js');
            
            const embed = new EmbedBuilder()
                .setTitle('📝 Message Modifié')
                .setColor('#FFA500')
                .addFields([
                    { name: '👤 Auteur', value: `${newMessage.author}`, inline: true },
                    { name: '📍 Salon', value: `<#${newMessage.channelId}>`, inline: true },
                    { name: '🔗 Lien', value: `[Voir le message](${newMessage.url})`, inline: true },
                    { name: '📋 Ancien contenu', value: oldMessage.content || '*Message vide*', inline: false },
                    { name: '📝 Nouveau contenu', value: newMessage.content || '*Message vide*', inline: false }
                ])
                .setThumbnail(newMessage.author?.displayAvatarURL ? newMessage.author.displayAvatarURL({ dynamic: true }) : null)
                .setTimestamp()
                .setFooter({ 
                    text: `ID Message: ${newMessage.id} | ID Auteur: ${newMessage.author.id}`,
                    iconURL: newMessage.guild?.iconURL({ dynamic: true }) || null
                });

            await this.log('messageLogs', embed);
        } catch (error) {
            console.error('[WebhookLogger] Erreur lors du log de message modifié:', error);
        }
    }

    async logMessageDelete(message) {
        try {
            const { EmbedBuilder } = require('discord.js');
            
            const embed = new EmbedBuilder()
                .setTitle('🗑️ Message Supprimé')
                .setColor('#FF0000')
                .addFields([
                    { name: '👤 Auteur', value: message.author ? `${message.author}` : 'Auteur inconnu', inline: true },
                    { name: '📍 Salon', value: `<#${message.channelId}>`, inline: true },
                    { name: '📅 Envoyé le', value: message.createdAt ? `<t:${Math.floor(message.createdAt.getTime() / 1000)}:F>` : 'Date inconnue', inline: true },
                    { name: '📋 Contenu', value: message.content || '*Message vide ou contenu non disponible*', inline: false }
                ])
                .setThumbnail(message.author?.displayAvatarURL ? message.author.displayAvatarURL({ dynamic: true }) : null)
                .setTimestamp()
                .setFooter({ 
                    text: `ID Message: ${message.id}${message.author ? ` | ID Auteur: ${message.author.id}` : ''}`,
                    iconURL: message.guild?.iconURL({ dynamic: true }) || null
                });

            // Ajouter les pièces jointes s'il y en avait
            if (message.attachments && message.attachments.size > 0) {
                const attachmentList = message.attachments.map(att => `• [${att.name}](${att.url})`).join('\n');
                embed.addFields({ name: '📎 Pièces jointes', value: attachmentList, inline: false });
            }

            await this.log('messageLogs', embed);
        } catch (error) {
            console.error('[WebhookLogger] Erreur lors du log de message supprimé:', error);
        }
    }

    async logMemberJoin(member) {
        try {
            const { EmbedBuilder } = require('discord.js');
            
            const embed = new EmbedBuilder()
                .setTitle('👋 Membre Rejoint')
                .setColor('#00FF00')
                .addFields([
                    { name: '👤 Utilisateur', value: `${member.user}`, inline: true },
                    { name: '🏷️ Tag', value: `${member.user.tag}`, inline: true },
                    { name: '📅 Compte créé', value: `<t:${Math.floor(member.user.createdAt.getTime() / 1000)}:R>`, inline: true },
                    { name: '🆔 ID', value: `\`${member.user.id}\``, inline: false }
                ])
                .setThumbnail(member.user?.displayAvatarURL({ dynamic: true }) || null)
                .setTimestamp()
                .setFooter({ 
                    text: `Membre #${member.guild.memberCount}`,
                    iconURL: member.guild?.iconURL({ dynamic: true }) || null
                });

            await this.log('memberLogs', embed);
        } catch (error) {
            console.error('[WebhookLogger] Erreur lors du log d\'arrivée de membre:', error);
        }
    }

    async logMemberLeave(member) {
        try {
            const { EmbedBuilder } = require('discord.js');
            
            const embed = new EmbedBuilder()
                .setTitle('👋 Membre Parti')
                .setColor('#FF4500')
                .addFields([
                    { name: '👤 Utilisateur', value: `${member.user}`, inline: true },
                    { name: '🏷️ Tag', value: `${member.user.tag}`, inline: true },
                    { name: '📅 A rejoint', value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : 'Date inconnue', inline: true },
                    { name: '🎭 Rôles', value: member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.toString()).join(', ') || 'Aucun rôle', inline: false },
                    { name: '🆔 ID', value: `\`${member.user.id}\``, inline: false }
                ])
                .setThumbnail(member.user?.displayAvatarURL({ dynamic: true }) || null)
                .setTimestamp()
                .setFooter({ 
                    text: `Membres restants: ${member.guild.memberCount}`,
                    iconURL: member.guild?.iconURL({ dynamic: true }) || null
                });

            await this.log('memberLogs', embed);
        } catch (error) {
            console.error('[WebhookLogger] Erreur lors du log de départ de membre:', error);
        }
    }

    refreshConfig() {
        // Détruire les anciens clients
        for (const webhook of this.webhooks.values()) {
            webhook.destroy();
        }
        this.webhooks.clear();
        // Ré-initialiser avec la nouvelle config
        this.initialize(this.client);
    }

    getStatus() {
        return {
            webhooksActive: this.webhooks.size,
            fallbackMode: this.webhooks.size === 0,
            types: Array.from(this.webhooks.keys())
        };
    }
}

module.exports = new WebhookLogger();