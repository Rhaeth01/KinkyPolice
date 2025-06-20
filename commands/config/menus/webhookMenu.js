const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, WebhookClient, ChannelType, PermissionFlagsBits } = require('discord.js');
const configManager = require('../../../utils/configManager');

/**
 * @file commands/config/menus/webhookMenu.js
 * @description Menu de configuration des webhooks pour les logs
 */

class WebhookMenu {
    /**
     * Crée l'embed de configuration des webhooks
     * @param {Object} config - Configuration actuelle
     * @param {import('discord.js').Guild} guild - Le serveur Discord
     * @returns {import('discord.js').EmbedBuilder} L'embed de configuration
     */
    static createEmbed(config, guild) {
        const loggingConfig = config.logging || {};
        const fullConfig = configManager.getConfig();
        
        const embed = new EmbedBuilder()
            .setTitle('🔗 Configuration des Webhooks')
            .setDescription('Configurez les webhooks pour un meilleur système de logs\n\n⚠️ **Limite Discord:** 15 webhooks maximum par canal')
            .setColor(0x5865F2)
            .addFields([
                {
                    name: '⚡ Avantages des Webhooks',
                    value: '• Meilleure performance\n• Design personnalisé\n• Évite les limites de rate\n• Avatars et noms personnalisés',
                    inline: false
                },
                {
                    name: '🛡️ Webhook Modération',
                    value: this.getWebhookStatus(loggingConfig.moderationWebhookUrl, fullConfig.logging?.modLogs),
                    inline: true
                },
                {
                    name: '💬 Webhook Messages',
                    value: this.getWebhookStatus(loggingConfig.messagesWebhookUrl, fullConfig.logging?.messageLogs),
                    inline: true
                },
                {
                    name: '👥 Webhook Rôles',
                    value: this.getWebhookStatus(loggingConfig.rolesWebhookUrl, fullConfig.logging?.roleLogChannelId),
                    inline: true
                },
                {
                    name: '🔊 Webhook Vocal',
                    value: this.getWebhookStatus(loggingConfig.voiceWebhookUrl, fullConfig.logging?.voiceLogs),
                    inline: true
                }
            ])
            .setFooter({ text: 'Configuration > Logs > Webhooks' });

        return embed;
    }

    /**
     * Crée les composants de configuration des webhooks
     * @param {Object} loggingConfig - Configuration actuelle des logs
     * @returns {Array<import('discord.js').ActionRowBuilder>} Les composants
     */
    static createComponents(loggingConfig = {}) {
        const autoSetupRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_webhook_auto_setup')
                .setLabel('🚀 Configuration Automatique')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('config_webhook_test_all')
                .setLabel('🧪 Tester Tous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!this.hasAnyWebhook(loggingConfig))
        ]);

        const manualSetupRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_webhook_manual_setup')
                .setLabel('✏️ Configuration Manuelle')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('config_webhook_clean_old')
                .setLabel('🧹 Nettoyer Anciens')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('config_webhook_remove_all')
                .setLabel('🗑️ Supprimer Tous')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!this.hasAnyWebhook(loggingConfig))
        ]);

        return [autoSetupRow, manualSetupRow];
    }

    /**
     * Configure automatiquement tous les webhooks
     * @param {import('discord.js').Interaction} interaction - L'interaction
     * @param {Function} saveChanges - Fonction pour sauvegarder les changements
     * @returns {Promise<Object>} Les changements appliqués
     */
    static async autoSetupWebhooks(interaction, saveChanges) {
        const guild = interaction.guild;
        const config = configManager.getConfig();
        const loggingConfig = config.logging || {};
        
        const webhookUrls = {};
        const errors = [];

        // Récupérer l'avatar du bot
        const botAvatar = interaction.client.user.displayAvatarURL({ format: 'png', size: 256 });
        
        // Définir les webhooks à créer (réduit à 4)
        const webhooksToCreate = [
            { 
                type: 'moderationWebhookUrl', 
                channelId: loggingConfig.modLogs || config.tickets?.ticketLogs, 
                name: 'KinkyPolice Modération',
                avatar: botAvatar,
                fallbackChannels: [config.tickets?.ticketLogs] // Tickets et modération ensemble
            },
            { 
                type: 'messagesWebhookUrl', 
                channelId: loggingConfig.messageLogs, 
                name: 'KinkyPolice Messages',
                avatar: botAvatar
            },
            { 
                type: 'rolesWebhookUrl', 
                channelId: loggingConfig.roleLogChannelId || loggingConfig.memberLogs, 
                name: 'KinkyPolice Rôles',
                avatar: botAvatar,
                fallbackChannels: [loggingConfig.memberLogs] // Rôles et membres ensemble
            },
            { 
                type: 'voiceWebhookUrl', 
                channelId: loggingConfig.voiceLogs, 
                name: 'KinkyPolice Vocal',
                avatar: botAvatar
            }
        ];

        for (const webhookConfig of webhooksToCreate) {
            if (!webhookConfig.channelId || webhookConfig.channelId === '') {
                continue; // Ignorer si pas de canal configuré
            }

            try {
                let channel;
                try {
                    channel = await guild.channels.fetch(webhookConfig.channelId);
                } catch (fetchError) {
                    // DiscordAPIError.Codes.MissingAccess is 50001
                    if (fetchError && fetchError.code === 50001) { 
                        errors.push(`📝 ${this.getWebhookTypeName(webhookConfig.type)}: Accès manquant au canal <#${webhookConfig.channelId}>. Vérifiez les permissions de lecture du bot pour ce salon.`);
                    } else {
                        errors.push(`📝 ${this.getWebhookTypeName(webhookConfig.type)}: Erreur lors de la récupération du canal <#${webhookConfig.channelId}>: ${fetchError.message}`);
                    }
                    console.error(`[WEBHOOK SETUP] Erreur fetch pour ${webhookConfig.type} sur canal ${webhookConfig.channelId}:`, fetchError);
                    continue;
                }

                if (!channel) { // Should not happen if fetch succeeded, but good practice
                    errors.push(`📝 ${this.getWebhookTypeName(webhookConfig.type)}: Canal <#${webhookConfig.channelId}> non trouvé après récupération.`);
                    continue;
                }

                if (channel.type !== ChannelType.GuildText) {
                    errors.push(`📝 ${this.getWebhookTypeName(webhookConfig.type)}: Le canal <#${webhookConfig.channelId}> n'est pas un salon textuel.`);
                    continue;
                }

                // Vérifier les permissions
                const botMember = guild.members.me;
                const permissions = channel.permissionsFor(botMember);

                if (!permissions) { // Should not happen if channel and botMember are valid
                    errors.push(`📝 ${this.getWebhookTypeName(webhookConfig.type)}: Impossible de déterminer les permissions pour le canal <#${channel.id}>.`);
                    continue;
                }
                
                // Check for ViewChannel first, as it's fundamental
                if (!permissions.has(PermissionFlagsBits.ViewChannel)) {
                    errors.push(`📝 ${this.getWebhookTypeName(webhookConfig.type)}: Permission "Voir le salon" manquante pour <#${channel.id}>.`);
                    continue;
                }

                if (!permissions.has(PermissionFlagsBits.ManageWebhooks)) {
                    errors.push(`📝 ${this.getWebhookTypeName(webhookConfig.type)}: Permission "Gérer les webhooks" manquante pour <#${channel.id}>.`);
                    continue;
                }

                // Vérifier si un webhook existe déjà avec ce nom spécifique
                const existingWebhooks = await channel.fetchWebhooks();
                let webhook = existingWebhooks.find(w => w.name === webhookConfig.name);

                if (!webhook) {
                    // Vérifier la limite de webhooks (15 max par canal)
                    if (existingWebhooks.size >= 15) {
                        errors.push(`📝 ${this.getWebhookTypeName(webhookConfig.type)}: Limite de webhooks atteinte (15/15) dans <#${channel.id}>`);
                        continue;
                    }

                    // Créer un webhook unique pour ce type
                    webhook = await channel.createWebhook({
                        name: webhookConfig.name,
                        avatar: webhookConfig.avatar,
                        reason: 'Configuration automatique des webhooks KinkyPolice'
                    });
                    console.log(`[WEBHOOK SETUP] Webhook créé "${webhook.name}" pour ${webhookConfig.type}`);
                } else {
                    console.log(`[WEBHOOK SETUP] Webhook "${webhook.name}" existe déjà pour ${webhookConfig.type}`);
                }

                webhookUrls[webhookConfig.type] = webhook.url;
                
                // Assigner le même webhook aux types liés
                if (webhookConfig.type === 'moderationWebhookUrl' && config.tickets?.ticketLogs) {
                    webhookUrls['ticketsWebhookUrl'] = webhook.url;
                }
                if (webhookConfig.type === 'rolesWebhookUrl' && loggingConfig.memberLogs) {
                    webhookUrls['memberWebhookUrl'] = webhook.url;
                }
            } catch (error) {
                console.error(`[WEBHOOK SETUP] Erreur pour ${webhookConfig.type}:`, error);
                
                // Messages d'erreur plus clairs
                let errorMessage = '';
                if (error.code === 30007) {
                    errorMessage = `📝 ${this.getWebhookTypeName(webhookConfig.type)}: Limite de webhooks atteinte (15 max par canal)`;
                } else if (error.code === 50001) {
                    errorMessage = `📝 ${this.getWebhookTypeName(webhookConfig.type)}: Accès refusé au canal`;
                } else if (error.code === 50013) {
                    errorMessage = `📝 ${this.getWebhookTypeName(webhookConfig.type)}: Permissions insuffisantes`;
                } else {
                    errorMessage = `📝 ${this.getWebhookTypeName(webhookConfig.type)}: ${error.message}`;
                }
                
                errors.push(errorMessage);
            }
        }

        // Ajouter les changements
        if (Object.keys(webhookUrls).length > 0) {
            const changes = {
                logging: {
                    ...webhookUrls
                }
            };
            await saveChanges(interaction.user.id, changes);
        }

        return {
            webhooksCreated: Object.keys(webhookUrls).length,
            errors: errors
        };
    }

    /**
     * Teste tous les webhooks configurés
     * @param {Object} loggingConfig - Configuration des logs
     * @returns {Promise<Array>} Résultats des tests
     */
    static async testAllWebhooks(loggingConfig) {
        const results = [];
        const webhooksToTest = [
            { name: 'Modération', url: loggingConfig.moderationWebhookUrl },
            { name: 'Messages', url: loggingConfig.messagesWebhookUrl },
            { name: 'Rôles', url: loggingConfig.rolesWebhookUrl },
            { name: 'Vocal', url: loggingConfig.voiceWebhookUrl }
        ];

        for (const webhook of webhooksToTest) {
            if (!webhook.url) continue;

            try {
                const webhookClient = new WebhookClient({ url: webhook.url });
                
                await webhookClient.send({
                    content: `🧪 Test du webhook **${webhook.name}**`,
                    embeds: [{
                        title: '✅ Test Réussi',
                        description: `Le webhook ${webhook.name} fonctionne correctement !`,
                        color: 0x00FF00,
                        timestamp: new Date().toISOString()
                    }]
                });

                results.push({ name: webhook.name, success: true });
                
                // Détruire le client après utilisation
                webhookClient.destroy();
            } catch (error) {
                results.push({ name: webhook.name, success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * Supprime tous les webhooks configurés
     * @param {import('discord.js').Guild} guild - Le serveur Discord
     * @param {Function} saveChanges - Fonction pour sauvegarder les changements
     * @returns {Promise<Object>} Résultat de la suppression
     */
    static async removeAllWebhooks(guild, saveChanges, userId) {
        const config = configManager.getConfig();
        const loggingConfig = config.logging || {};
        let removed = 0;
        const errors = [];

        // Liste des webhooks à supprimer
        const webhookUrls = [
            loggingConfig.moderationWebhookUrl,
            loggingConfig.messagesWebhookUrl,
            loggingConfig.rolesWebhookUrl,
            loggingConfig.voiceWebhookUrl
        ].filter(url => url);

        for (const url of webhookUrls) {
            try {
                const webhookClient = new WebhookClient({ url });
                await webhookClient.delete('Suppression des webhooks KinkyPolice');
                removed++;
            } catch (error) {
                errors.push(error.message);
            }
        }

        // Mettre à jour la configuration
        const changes = {
            logging: {
                moderationWebhookUrl: '',
                messagesWebhookUrl: '',
                rolesWebhookUrl: '',
                voiceWebhookUrl: ''
            }
        };

        await saveChanges(userId, changes);

        return { removed, errors };
    }

    /**
     * Nettoie les anciens webhooks inutilisés dans les canaux de logs
     * @param {import('discord.js').Guild} guild - Le serveur Discord
     * @returns {Promise<Object>} Résultat du nettoyage
     */
    static async cleanOldWebhooks(guild) {
        const config = configManager.getConfig();
        const loggingConfig = config.logging || {};
        let cleaned = 0;
        const errors = [];

        // Canaux à vérifier
        const channelsToCheck = [
            loggingConfig.modLogs,
            loggingConfig.messageLogs,
            loggingConfig.voiceLogs,
            loggingConfig.memberLogs,
            loggingConfig.roleLogChannelId,
            config.tickets?.ticketLogs
        ].filter(channelId => channelId && channelId !== '');

        // Supprimer les doublons
        const uniqueChannels = [...new Set(channelsToCheck)];

        for (const channelId of uniqueChannels) {
            try {
                const channel = await guild.channels.fetch(channelId);
                if (!channel || channel.type !== ChannelType.GuildText) continue;

                const webhooks = await channel.fetchWebhooks();
                
                // Chercher les webhooks du bot qui ne sont plus utilisés
                const botWebhooks = webhooks.filter(w => 
                    w.owner?.id === guild.members.me.id || 
                    w.name?.startsWith('KinkyPolice')
                );

                // Garder seulement le webhook le plus récent pour ce canal
                if (botWebhooks.size > 1) {
                    // Trier par date de création (plus récent en premier)
                    const sortedWebhooks = Array.from(botWebhooks.values())
                        .sort((a, b) => b.createdTimestamp - a.createdTimestamp);
                    
                    // Supprimer tous sauf le plus récent
                    for (let i = 1; i < sortedWebhooks.length; i++) {
                        try {
                            await sortedWebhooks[i].delete('Nettoyage automatique - webhook dupliqué');
                            cleaned++;
                        } catch (deleteError) {
                            errors.push(`Erreur lors de la suppression d'un webhook dans <#${channelId}>: ${deleteError.message}`);
                        }
                    }
                }

            } catch (error) {
                errors.push(`Erreur lors de la vérification du canal <#${channelId}>: ${error.message}`);
            }
        }

        return { cleaned, errors };
    }

    /**
     * Vérifie si au moins un webhook est configuré
     * @param {Object} loggingConfig - Configuration des logs
     * @returns {boolean} True si au moins un webhook existe
     */
    static hasAnyWebhook(loggingConfig) {
        return !!(
            loggingConfig.moderationWebhookUrl ||
            loggingConfig.messagesWebhookUrl ||
            loggingConfig.rolesWebhookUrl ||
            loggingConfig.voiceWebhookUrl
        );
    }

    /**
     * Obtient le statut d'un webhook avec vérification du canal
     * @param {string} webhookUrl - URL du webhook
     * @param {string} channelId - ID du canal de log
     * @returns {string} Statut formaté
     */
    static getWebhookStatus(webhookUrl, channelId) {
        if (webhookUrl) {
            return '✅ Configuré';
        } else if (!channelId || channelId === '') {
            return '⚠️ Canal non défini';
        } else {
            return '❌ Non configuré';
        }
    }

    /**
     * Obtient le nom lisible d'un type de webhook
     * @param {string} webhookType - Type de webhook
     * @returns {string} Nom lisible
     */
    static getWebhookTypeName(webhookType) {
        const typeNames = {
            'moderationWebhookUrl': 'Modération',
            'messagesWebhookUrl': 'Messages',
            'rolesWebhookUrl': 'Rôles',
            'voiceWebhookUrl': 'Vocal'
        };
        return typeNames[webhookType] || webhookType;
    }

    /**
     * Crée l'embed pour la configuration manuelle
     * @param {Object} loggingConfig - Configuration des logs
     * @returns {import('discord.js').EmbedBuilder} L'embed
     */
    static createManualConfigEmbed(loggingConfig) {
        const embed = new EmbedBuilder()
            .setTitle('✏️ Configuration Manuelle des Webhooks')
            .setDescription('Sélectionnez un webhook à configurer manuellement')
            .setColor(0x5865F2)
            .addFields([
                {
                    name: '🛡️ Modération',
                    value: loggingConfig.moderationWebhookUrl ? '✅ Configuré' : '❌ Non configuré',
                    inline: true
                },
                {
                    name: '💬 Messages',
                    value: loggingConfig.messagesWebhookUrl ? '✅ Configuré' : '❌ Non configuré',
                    inline: true
                },
                {
                    name: '👥 Rôles',
                    value: loggingConfig.rolesWebhookUrl ? '✅ Configuré' : '❌ Non configuré',
                    inline: true
                },
                {
                    name: '🔊 Vocal',
                    value: loggingConfig.voiceWebhookUrl ? '✅ Configuré' : '❌ Non configuré',
                    inline: true
                }
            ])
            .setFooter({ text: 'Configuration > Logs > Webhooks > Manuel' });

        return embed;
    }
}

module.exports = WebhookMenu;