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
        this.client = null; // Stockera le client Discord pour le fallback
        
        // Configuration des 4 webhooks principaux avec couleurs distinctes
        this.logTypes = {
            moderation: {
                name: '🛡️ Modération',
                avatar: null, // Sera remplacé par l'avatar du bot
                color: '#E53E3E', // Rouge par défaut pour modération
                channelPath: 'logging.modLogs',
                variants: {
                    warn: { name: '⚠️ Modération', color: '#FF8C00' }, // Orange pour warn
                    ticket: { name: '🎫 Modération', color: '#C71585' } // Violet pour tickets
                }
            },
            messages: {
                name: '💬 Messages',
                avatar: null,
                color: '#4682B4', // Bleu par défaut
                channelPath: 'logging.messageLogs',
                variants: {
                    edited: { name: '✏️ Messages', color: '#FF8C00' }, // Orange pour édité
                    deleted: { name: '🗑️ Messages', color: '#B22222' }  // Rouge pour supprimé
                }
            },
            roles: {
                name: '👥 Rôles',
                avatar: null,
                color: '#8A2BE2', // Violet par défaut
                channelPath: 'logging.roleLogChannelId',
                variants: {
                    added: { name: '✅ Rôles', color: '#38A169' },    // Vert pour ajouté
                    removed: { name: '❌ Rôles', color: '#E53E3E' },   // Rouge pour supprimé
                    member_join: { name: '📥 Membres', color: '#38A169' }, // Vert pour join
                    member_leave: { name: '📤 Membres', color: '#E53E3E' } // Rouge pour leave
                }
            },
            voice: {
                name: '🔊 Vocal',
                avatar: null,
                color: '#228B22', // Vert par défaut
                channelPath: 'logging.voiceLogs',
                variants: {
                    join: { name: '📥 Vocal', color: '#32CD32' },     // Vert lime pour join
                    move: { name: '🔄 Vocal', color: '#4169E1' },     // Bleu royal pour move
                    leave: { name: '📤 Vocal', color: '#DC143C' }     // Rouge crimson pour leave
                }
            }
        };
        
        this.botAvatar = null; // Stockera l'avatar du bot
    }

    /**
     * Utilitaire pour récupérer une valeur depuis la config avec un chemin
     */
    getConfigValue(path) {
        try {
            const config = configManager.getConfig();
            const parts = path.split('.');
            let value = config;
            
            for (const part of parts) {
                if (value && typeof value === 'object' && part in value) {
                    value = value[part];
                } else {
                    return null;
                }
            }
            
            return value;
        } catch (error) {
            console.error(`❌ [WebhookLogger] Erreur récupération config ${path}:`, error);
            return null;
        }
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
            
            // Initialiser les webhooks pour chaque type de log activé
            for (const [type, config] of Object.entries(this.logTypes)) {
                const channelId = this.getConfigValue(config.channelPath);
                
                if (!channelId) {
                    console.log(`⚠️ [WebhookLogger] ${type} canal non configuré, webhook ignoré`);
                    continue;
                }

                // Pas de réutilisation car chaque type a son webhook dédié

                // Vérifier que le canal existe avant d'essayer de créer le webhook
                const channel = client.channels.cache.get(channelId);
                if (!channel) {
                    console.error(`❌ [WebhookLogger] Canal ${type} introuvable: ${channelId} - Vérifiez que le canal existe et que le bot y a accès`);
                    continue;
                }
                
                // Récupérer ou créer le webhook pour ce type (mapping des noms)
                let webhookConfigKey = `logging.${type}WebhookUrl`;
                let webhookUrl;
                
                // Pour les messages, utiliser l'URL principale pour tous les variants
                if (type === 'messages') {
                    // Essayer d'abord messagesWebhookUrl, puis les variants spécifiques
                    const mainMessagesUrl = this.getConfigValue('logging.messagesWebhookUrl');
                    const editedUrl = this.getConfigValue('logging.messagesEditedWebhookUrl');
                    const deletedUrl = this.getConfigValue('logging.messagesDeletedWebhookUrl');
                    
                    // Utiliser l'URL principale si les variants sont vides
                    webhookUrl = mainMessagesUrl || editedUrl || deletedUrl;
                    
                    if (mainMessagesUrl) {
                        console.log(`ℹ️ [WebhookLogger] Utilisation de messagesWebhookUrl pour tous les logs de messages`);
                    }
                } else {
                    webhookUrl = this.getConfigValue(webhookConfigKey);
                }
                
                if (webhookUrl) {
                    try {
                        this.webhooks.set(type, new WebhookClient({ url: webhookUrl }));
                        console.log(`✅ [WebhookLogger] Webhook ${type} initialisé depuis config (URL: ${webhookUrl.substring(0, 50)}...)`);
                    } catch (error) {
                        console.error(`❌ [WebhookLogger] Erreur webhook ${type}:`, error.message);
                        // Créer un nouveau webhook si l'ancien est invalide
                        await this.createWebhookForType(client, type, config);
                    }
                } else {
                    // Créer un nouveau webhook
                    await this.createWebhookForType(client, type, config);
                }
            }


            console.log(`🎉 [WebhookLogger] ${this.webhooks.size} webhooks initialisés avec succès`);
            
        } catch (error) {
            console.error('❌ [WebhookLogger] Erreur lors de l\'initialisation:', error);
            console.log('🔄 [WebhookLogger] Activation du mode fallback pour tous les logs');
            this.fallbackMode = true;
        }
        
        // Si aucun webhook n'a été initialisé, utiliser le fallback
        if (this.webhooks.size === 0) {
            console.log('⚠️ [WebhookLogger] Aucun webhook disponible, mode fallback activé');
            this.fallbackMode = true;
        } else {
            console.log(`✅ [WebhookLogger] Mode webhook actif avec ${this.webhooks.size} webhooks configurés`);
        }
    }

    /**
     * Crée un webhook pour un type de log spécifique
     */
    async createWebhookForType(client, type, config) {
        try {
            const channelId = this.getConfigValue(config.channelPath);
            if (!channelId) {
                console.error(`❌ [WebhookLogger] Aucun canal configuré pour ${type}`);
                return;
            }

            const channel = client.channels.cache.get(channelId);
            if (!channel) {
                console.error(`❌ [WebhookLogger] Canal ${type} introuvable: ${channelId}`);
                return;
            }

            const webhook = await channel.createWebhook({
                name: config.name,
                avatar: this.botAvatar,
                reason: `Système de logs moderne KinkyPolice - ${config.name}`
            }).catch(error => {
                if (error.code === 30007) {
                    console.error(`❌ [WebhookLogger] Impossible de créer webhook ${type}: Maximum number of webhooks reached (15)`);
                    console.log(`💡 [WebhookLogger] Suggestion: Supprimez des webhooks inutilisés ou utilisez le fallback sur canal classique`);
                } else {
                    console.error(`❌ [WebhookLogger] Erreur création webhook ${type}:`, error.message);
                }
                return null;
            });

            if (!webhook) {
                return;
            }

            this.webhooks.set(type, new WebhookClient({ url: webhook.url }));
            
            // Sauvegarder automatiquement l'URL dans la configuration
            try {
                const currentConfig = configManager.getConfig();
                const updates = {
                    logging: {
                        ...currentConfig.logging,
                        [`${type}WebhookUrl`]: webhook.url
                    }
                };
                await configManager.updateConfig(updates);
                console.log(`✅ [WebhookLogger] Webhook créé et URL sauvegardée pour ${type}: ${webhook.name}`);
            } catch (saveError) {
                console.error(`❌ [WebhookLogger] Erreur sauvegarde URL webhook ${type}:`, saveError.message);
                console.log(`💡 [WebhookLogger] URL à sauvegarder manuellement: logging.${type}WebhookUrl = ${webhook.url}`);
            }
            
        } catch (error) {
            console.error(`❌ [WebhookLogger] Impossible de créer webhook ${type}:`, error.message);
        }
    }

    /**
     * Crée automatiquement les webhooks pour tous les canaux de logs (legacy support)
     */
    async setupWebhooks(client) {
        console.log('⚠️ [WebhookLogger] setupWebhooks est obsolète, utilisez l\'initialisation intégrée');
        // Cette méthode est maintenant obsolète car les webhooks sont gérés via la config principale
    }

    /**
     * Envoie un log via webhook avec fallback automatique
     * Nouveau système avec 4 webhooks spécialisés
     */
    async log(type, embed, options = {}) {
        try {
            // Déterminer quel webhook utiliser selon le type
            let webhookType = type;
            let variant = null;
            
            // Mapper les types vers les webhooks et extraire les variants
            if (type === 'messagesEdited' || type === 'messagesDeleted') {
                webhookType = 'messages';
                variant = type === 'messagesEdited' ? 'edited' : 'deleted';
            } else if (type.startsWith('voice_')) {
                webhookType = 'voice';
                variant = type.split('_')[1]; // voice_join -> join
            } else if (type.startsWith('roles_')) {
                webhookType = 'roles';
                variant = type.split('_')[1]; // roles_added -> added
            } else if (type === 'moderation' || type === 'tickets') {
                // Les logs de modération et tickets utilisent le webhook modération
                webhookType = 'moderation';
                if (type === 'tickets') variant = 'ticket';
            } else if (type === 'member_join' || type === 'member_leave') {
                // Les logs de membre utilisent le webhook rôles
                webhookType = 'roles';
                variant = type.replace('member_', 'member_'); // member_join -> member_join
            }

            const logConfig = this.logTypes[webhookType];
            if (!logConfig) {
                console.error(`❌ [WebhookLogger] Type de webhook inconnu: ${webhookType}`);
                return this.fallbackLog(type, embed, options);
            }

            // Vérifier si le canal est configuré
            const channelId = this.getConfigValue(logConfig.channelPath);
            if (!channelId) {
                console.log(`⚠️ [WebhookLogger] Canal non configuré pour ${webhookType}, logs désactivés`);
                return;
            }

            const webhook = this.webhooks.get(webhookType);
            console.log(`🔍 [WebhookLogger] Debug pour type: ${type}`);
            console.log(`🔍 [WebhookLogger] - webhookType: ${webhookType}`);
            console.log(`🔍 [WebhookLogger] - webhook trouvé: ${!!webhook}`);
            console.log(`🔍 [WebhookLogger] - fallbackMode: ${this.fallbackMode}`);
            console.log(`🔍 [WebhookLogger] - channelId: ${channelId}`);
            
            if (!webhook || this.fallbackMode) {
                console.log(`⚠️ [WebhookLogger] Utilisation du fallback pour ${type}`);
                return this.fallbackLog(type, embed, options);
            }

            // Appliquer le style selon le variant
            const style = variant && logConfig.variants ? logConfig.variants[variant] : logConfig;
            
            if (!embed.data.color && style.color) {
                embed.setColor(style.color);
            }

            const webhookOptions = {
                embeds: [embed],
                username: style.name,
                avatarURL: this.botAvatar || style.avatar || logConfig.avatar,
                ...options
            };

            await webhook.send(webhookOptions);
            console.log(`✅ [WebhookLogger] Log ${type} envoyé via webhook ${webhookType}${variant ? ` (${variant})` : ''}`);

        } catch (error) {
            console.error(`❌ [WebhookLogger] Erreur webhook ${type}:`, error.message);
            
            // Fallback automatique en cas d'erreur
            if (error.code === 10015 || error.code === 50027) {
                console.log(`🔄 [WebhookLogger] Webhook ${webhookType} invalide, fallback activé`);
                this.webhooks.delete(webhookType);
            }
            
            return this.fallbackLog(type, embed, options);
        }
    }

    /**
     * Définit le client Discord pour le fallback
     */
    setClient(client) {
        this.client = client;
        console.log('✅ [WebhookLogger] Client Discord configuré pour le fallback');
    }

    /**
     * Méthode de fallback utilisant les canaux classiques
     */
    async fallbackLog(type, embed, options = {}) {
        try {
            // Mapper les types spécifiques aux catégories principales
            let logType = type;
            if (type === 'messagesDeleted' || type === 'messagesEdited') {
                logType = 'messages';
            } else if (type.startsWith('voice_')) {
                logType = 'voice';
            } else if (type.startsWith('roles_')) {
                logType = 'roles';
            }

            const logConfig = this.logTypes[logType];
            if (!logConfig) {
                console.error(`❌ [WebhookLogger] Type de log inconnu pour le fallback: ${type}`);
                return;
            }
            
            const channelId = this.getConfigValue(logConfig.channelPath);
            if (!channelId) {
                console.error(`❌ [WebhookLogger] Aucun canal fallback configuré pour ${logType}`);
                return;
            }

            if (!this.client) {
                console.error(`❌ [WebhookLogger] Client Discord non configuré pour le fallback`);
                return;
            }

            const channel = this.client.channels.cache.get(channelId);
            if (!channel) {
                console.error(`❌ [WebhookLogger] Canal fallback introuvable: ${channelId}`);
                return;
            }

            // Appliquer le style du type de log si pas déjà défini
            if (!embed.data.color && logConfig.color) {
                embed.setColor(logConfig.color);
            }

            await channel.send({ embeds: [embed] });
            console.log(`✅ [WebhookLogger] Message envoyé en fallback dans ${channel.name} pour ${type} (via ${logType})`);
            
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

    // 👥 LOGS DE RÔLES avec variants
    async logRoleChange(member, role, action, moderator) {
        // Formater le modérateur
        let moderatorDisplay;
        if (moderator && moderator.id) {
            moderatorDisplay = `<@${moderator.id}>`;
        } else {
            moderatorDisplay = moderator || '*Inconnu*';
        }

        // Déterminer le variant et l'icône selon l'action
        let variant = null;
        let actionIcon = '🛡️';
        
        if (action === 'ajouté' || action.toLowerCase().includes('add')) {
            variant = 'added';
            actionIcon = '✅';
        } else if (action === 'supprimé' || action.toLowerCase().includes('remove')) {
            variant = 'removed';
            actionIcon = '❌';
        }

        const embed = new EmbedBuilder()
            .setTitle(`${actionIcon} Rôle ${action}`)
            .setDescription(`Rôle **${role.name}** ${action} pour ${member.user.username}`)
            .addFields(
                { name: '👤 Utilisateur', value: `${member}`, inline: true },
                { name: '🛡️ Rôle', value: `${role}`, inline: true },
                { name: '👮 Modérateur', value: moderatorDisplay, inline: true },
                { name: '🕐 Action', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: false }
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 64 }))
            .setTimestamp();

        // Passer le variant au système de log
        const logType = `roles${variant ? '_' + variant : ''}`;
        return this.log(logType, embed);
    }

    // 🔊 LOGS VOCAUX avec variants
    async logVoiceActivity(member, action, channel, details = {}) {
        let variant = null;
        let actionIcon = '🔊';
        
        // Déterminer le variant selon l'action
        if (action.toLowerCase().includes('rejoint') || action.toLowerCase().includes('join')) {
            variant = 'join';
            actionIcon = '📥';
        } else if (action.toLowerCase().includes('déplacé') || action.toLowerCase().includes('move')) {
            variant = 'move';
            actionIcon = '🔄';
        } else if (action.toLowerCase().includes('quitté') || action.toLowerCase().includes('leave')) {
            variant = 'leave';
            actionIcon = '📤';
        }

        const embed = new EmbedBuilder()
            .setTitle(`${actionIcon} ${action}`)
            .setDescription(`${member.user.username} ${action.toLowerCase()}`)
            .addFields(
                { name: '👤 Utilisateur', value: `${member}`, inline: true },
                { name: '🔊 Canal', value: channel ? `${channel}` : '*Canal inconnu*', inline: true },
                { name: '🕐 Action', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 64 }))
            .setTimestamp();

        if (details.duration) {
            embed.addFields({ name: '⏱️ Durée', value: details.duration, inline: true });
        }

        // Passer le variant au système de log
        const logType = `voice${variant ? '_' + variant : ''}`;
        return this.log(logType, embed);
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
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        return this.log('member_join', embed);
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
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        if (member.roles.cache.size > 1) {
            const roles = member.roles.cache
                .filter(role => role.name !== '@everyone')
                .map(role => role.name)
                .join(', ');
            embed.addFields({ name: '🛡️ Rôles', value: this.truncateText(roles), inline: false });
        }

        return this.log('member_leave', embed);
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

    /**
     * Trouve un webhook existant pour un canal donné
     */
    findWebhookByChannelId(channelId) {
        for (const [type, config] of Object.entries(this.logTypes)) {
            const typeChannelId = this.getConfigValue(config.channelPath);
            if (typeChannelId === channelId && this.webhooks.has(type)) {
                return this.webhooks.get(type);
            }
        }
        return null;
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
