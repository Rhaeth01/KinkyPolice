const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');

/**
 * @file commands/config/menus/ticketsMenu.js
 * @description Menu de configuration des tickets
 */

class TicketsMenu {
    /**
     * Crée l'embed de configuration des tickets
     * @param {Object} config - Configuration actuelle
     * @param {import('discord.js').Guild} guild - Le serveur Discord
     * @returns {import('discord.js').EmbedBuilder} L'embed de configuration
     */
    static createEmbed(config, guild) {
        const ticketsConfig = config.tickets || {};
        const loggingConfig = config.logging || {};
        const receptionChannels = ticketsConfig.receptionChannels || [];
        const authorizedRoles = ticketsConfig.authorizedRoles || [];
        
        // Calculer le statut de configuration
        let configured = 0;
        let total = 6; // Augmenté pour inclure les nouvelles fonctionnalités
        if (ticketsConfig.ticketCategory) configured++;
        if (ticketsConfig.supportRole) configured++;
        if (ticketsConfig.ticketLogs) configured++;
        if (loggingConfig.ticketsWebhookUrl) configured++;
        if (receptionChannels.length > 0) configured++;
        if (authorizedRoles.length > 0) configured++;
        
        const percentage = Math.round((configured / total) * 100);
        const statusIcon = percentage === 100 ? '🟢' : percentage > 0 ? '🟡' : '🔴';
        const progressBar = '▰'.repeat(Math.round(percentage / 10)) + '▱'.repeat(10 - Math.round(percentage / 10));
        
        const embed = new EmbedBuilder()
            .setTitle(`🎫 Configuration des Tickets ${statusIcon}`)
            .setDescription(
                `**Système de support par tickets**\n\n` +
                `**Progression :** ${percentage}% ${progressBar}\n` +
                `**Paramètres configurés :** ${configured}/${total}\n\n` +
                `*Configurez votre système de tickets complet avec embeds personnalisés.*`
            )
            .setColor(percentage === 100 ? 0x4ECDC4 : percentage > 0 ? 0xFFE66D : 0xFF6B6B)
            .addFields([
                {
                    name: '📁 Catégorie des Tickets',
                    value: ticketsConfig.ticketCategory ? 
                        `✅ **Configurée :** <#${ticketsConfig.ticketCategory}>\nTous les tickets seront créés dans cette catégorie` : 
                        '❌ **Non configurée** - Choisissez une catégorie',
                    inline: false
                },
                {
                    name: '🛡️ Rôle Support Principal',
                    value: ticketsConfig.supportRole ? 
                        `✅ **Configuré :** <@&${ticketsConfig.supportRole}>\nRôle principal d'administration` : 
                        '❌ **Non configuré** - Choisissez un rôle support',
                    inline: true
                },
                {
                    name: '📝 Logs des Tickets',
                    value: ticketsConfig.ticketLogs ? 
                        `✅ **Configuré :** <#${ticketsConfig.ticketLogs}>\nActions des tickets loggées ici` : 
                        '❌ **Non configuré** - Choisissez un salon de logs',
                    inline: true
                },
                {
                    name: '📨 Salons de Réception',
                    value: receptionChannels.length > 0 ? 
                        `✅ **${receptionChannels.length} salon(s) configuré(s)**\n${receptionChannels.slice(0, 3).map(id => `<#${id}>`).join(', ')}${receptionChannels.length > 3 ? '...' : ''}` : 
                        '❌ **Aucun salon configuré** - Où envoyer les embeds',
                    inline: true
                },
                {
                    name: '👥 Rôles Autorisés',
                    value: authorizedRoles.length > 0 ? 
                        `✅ **${authorizedRoles.length} rôle(s) autorisé(s)**\n${authorizedRoles.slice(0, 3).map(id => `<@&${id}>`).join(', ')}${authorizedRoles.length > 3 ? '...' : ''}` : 
                        '❌ **Aucun rôle configuré** - Support flexible',
                    inline: true
                },
                {
                    name: '🔗 Webhook des Logs',
                    value: loggingConfig.ticketsWebhookUrl ? 
                        '✅ **Configuré** - Webhook actif pour les logs' : 
                        '❌ **Non configuré** - Webhook automatique disponible',
                    inline: true
                }
            ])
            .setThumbnail(guild.iconURL() || null)
            .setFooter({ 
                text: `Configuration › Tickets | Serveur: ${guild.name}`,
                iconURL: guild.iconURL() || null
            })
            .setTimestamp();

        return embed;
    }

    /**
     * Crée les composants de configuration des tickets
     * @returns {Array<import('discord.js').ActionRowBuilder>} Les composants
     */
    static createComponents() {
        const configRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_tickets_select_category')
                .setLabel('📁 Catégorie')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('config_tickets_select_support_role')
                .setLabel('🛡️ Rôle Support')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('config_tickets_select_logs_channel')
                .setLabel('📝 Logs')
                .setStyle(ButtonStyle.Secondary)
        ]);

        const embedRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_tickets_create_embed')
                .setLabel('📋 Créer Embed')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('config_tickets_manage_embeds')
                .setLabel('🎛️ Gérer Embeds')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('config_tickets_reception_channels')
                .setLabel('📨 Salons de Réception')
                .setStyle(ButtonStyle.Secondary)
        ]);

        const webhookRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_tickets_setup_webhook')
                .setLabel('🔗 Configurer Webhook')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('config_tickets_test_system')
                .setLabel('🧪 Tester le Système')
                .setStyle(ButtonStyle.Secondary)
        ]);

        return [configRow, embedRow, webhookRow];
    }

    /**
     * Traite la sélection d'une catégorie de tickets
     * @param {import('discord.js').ChannelSelectMenuInteraction} interaction - L'interaction de sélection
     * @param {Function} saveChanges - Fonction pour sauvegarder les changements
     * @returns {Promise<Object>} Les changements à appliquer
     */
    static async handleCategorySelect(interaction, saveChanges) {
        const selectedChannel = interaction.channels.first();
        
        if (!selectedChannel) {
            throw new Error('Aucune catégorie sélectionnée.');
        }

        if (selectedChannel.type !== ChannelType.GuildCategory) {
            throw new Error('Vous devez sélectionner une catégorie, pas un salon.');
        }

        const changes = {
            tickets: {
                ticketCategory: selectedChannel.id
            }
        };

        await saveChanges(interaction.user.id, changes);
        return changes;
    }

    /**
     * Traite la sélection d'un rôle support
     * @param {import('discord.js').RoleSelectMenuInteraction} interaction - L'interaction de sélection
     * @param {Function} saveChanges - Fonction pour sauvegarder les changements
     * @returns {Promise<Object>} Les changements à appliquer
     */
    static async handleSupportRoleSelect(interaction, saveChanges) {
        const selectedRole = interaction.roles.first();
        
        if (!selectedRole) {
            throw new Error('Aucun rôle sélectionné.');
        }

        if (selectedRole.id === interaction.guild.id) {
            throw new Error('Le rôle @everyone ne peut pas être utilisé comme rôle support.');
        }

        const changes = {
            tickets: {
                supportRole: selectedRole.id
            }
        };

        await saveChanges(interaction.user.id, changes);
        return changes;
    }

    /**
     * Traite la sélection d'un salon de logs
     * @param {import('discord.js').ChannelSelectMenuInteraction} interaction - L'interaction de sélection
     * @param {Function} saveChanges - Fonction pour sauvegarder les changements
     * @returns {Promise<Object>} Les changements à appliquer
     */
    static async handleLogsChannelSelect(interaction, saveChanges) {
        const selectedChannel = interaction.channels.first();
        
        if (!selectedChannel) {
            throw new Error('Aucun salon sélectionné.');
        }

        if (selectedChannel.type !== ChannelType.GuildText) {
            throw new Error('Vous devez sélectionner un salon textuel.');
        }

        const changes = {
            tickets: {
                ticketLogs: selectedChannel.id
            }
        };

        await saveChanges(interaction.user.id, changes);
        return changes;
    }

    /**
     * Configure le webhook pour les logs de tickets
     * @param {import('discord.js').Interaction} interaction - L'interaction
     * @param {Function} saveChanges - Fonction pour sauvegarder les changements
     * @returns {Promise<Object>} Les changements à appliquer
     */
    static async handleWebhookSetup(interaction, saveChanges) {
        const config = interaction.client.configManager?.getConfig() || {};
        const ticketsConfig = config.tickets || {};
        
        if (!ticketsConfig.ticketLogs) {
            throw new Error('Vous devez d\'abord configurer un salon de logs pour les tickets.');
        }

        const logsChannel = interaction.guild.channels.cache.get(ticketsConfig.ticketLogs);
        if (!logsChannel) {
            throw new Error('Le salon de logs configuré n\'existe plus.');
        }

        // Vérifier les permissions
        const botMember = interaction.guild.members.me;
        if (!logsChannel.permissionsFor(botMember).has('ManageWebhooks')) {
            throw new Error(`Permissions manquantes dans <#${logsChannel.id}>: Gérer les webhooks.`);
        }

        try {
            const webhook = await logsChannel.createWebhook({
                name: 'KinkyPolice Tickets',
                avatar: interaction.client.user.displayAvatarURL(),
                reason: 'Configuration automatique des logs de tickets'
            });

            const changes = {
                logging: {
                    ticketsWebhookUrl: webhook.url
                }
            };

            await saveChanges(interaction.user.id, changes);
            return changes;
        } catch (error) {
            console.error('Erreur création webhook tickets:', error);
            throw new Error('Impossible de créer le webhook. Vérifiez les permissions et la limite de webhooks (15 par salon).');
        }
    }

    /**
     * Crée le modal pour créer un embed de ticket
     * @returns {import('discord.js').ModalBuilder} Le modal de création
     */
    static createEmbedModal() {
        const modal = new ModalBuilder()
            .setCustomId('config_tickets_embed_modal')
            .setTitle('Créer un Embed de Ticket');

        const titleInput = new TextInputBuilder()
            .setCustomId('embed_title')
            .setLabel('Titre de l\'embed')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Support & Assistance')
            .setMaxLength(256)
            .setRequired(true);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('embed_description')
            .setLabel('Description de l\'embed')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Ex: Cliquez ci-dessous pour ouvrir un ticket et recevoir de l\'aide.')
            .setMaxLength(4000)
            .setRequired(true);

        const buttonTextInput = new TextInputBuilder()
            .setCustomId('button_text')
            .setLabel('Texte du bouton')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Créer un ticket')
            .setValue('Créer un ticket')
            .setMaxLength(80)
            .setRequired(true);

        const colorInput = new TextInputBuilder()
            .setCustomId('embed_color')
            .setLabel('Couleur de l\'embed (optionnel)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: #3498DB ou bleu')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descriptionInput),
            new ActionRowBuilder().addComponents(buttonTextInput),
            new ActionRowBuilder().addComponents(colorInput)
        );

        return modal;
    }

    /**
     * Traite la soumission du modal d'embed
     * @param {import('discord.js').ModalSubmitInteraction} interaction - L'interaction modal
     * @returns {Promise<Object>} Les données de l'embed
     */
    static async handleEmbedModal(interaction) {
        const title = interaction.fields.getTextInputValue('embed_title');
        const description = interaction.fields.getTextInputValue('embed_description');
        const buttonText = interaction.fields.getTextInputValue('button_text');
        const colorInput = interaction.fields.getTextInputValue('embed_color') || '';

        // Parser la couleur
        let color = 0x3498DB; // Bleu par défaut
        if (colorInput) {
            if (colorInput.startsWith('#')) {
                color = parseInt(colorInput.slice(1), 16);
            } else {
                const colors = {
                    'rouge': 0xE74C3C, 'red': 0xE74C3C,
                    'vert': 0x2ECC71, 'green': 0x2ECC71,
                    'bleu': 0x3498DB, 'blue': 0x3498DB,
                    'jaune': 0xF1C40F, 'yellow': 0xF1C40F,
                    'violet': 0x9B59B6, 'purple': 0x9B59B6,
                    'orange': 0xE67E22,
                    'noir': 0x2F3136, 'black': 0x2F3136
                };
                color = colors[colorInput.toLowerCase()] || 0x3498DB;
            }
        }

        return {
            title,
            description,
            buttonText,
            color
        };
    }

    /**
     * Crée l'interface de sélection des salons de réception
     * @param {Object} config - Configuration actuelle
     * @returns {Object} Embed et composants
     */
    static createReceptionChannelsInterface(config) {
        const ticketsConfig = config.tickets || {};
        const receptionChannels = ticketsConfig.receptionChannels || [];

        const embed = new EmbedBuilder()
            .setTitle('📨 Configuration des Salons de Réception')
            .setDescription(
                '**Salons où seront envoyés les embeds de tickets**\n\n' +
                'Ces salons recevront les embeds avec les boutons pour créer des tickets.\n' +
                'Vous pouvez configurer plusieurs salons selon vos besoins.'
            )
            .setColor(0x5865F2);

        if (receptionChannels.length > 0) {
            const channelsList = receptionChannels.map(channelId => `<#${channelId}>`).join('\n');
            embed.addFields([{
                name: `📍 Salons configurés (${receptionChannels.length})`,
                value: channelsList,
                inline: false
            }]);
        } else {
            embed.addFields([{
                name: '📍 Salons configurés',
                value: 'Aucun salon configuré',
                inline: false
            }]);
        }

        const actionRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_tickets_add_reception_channel')
                .setLabel('➕ Ajouter Salon')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('config_tickets_remove_reception_channel')
                .setLabel('➖ Retirer Salon')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(receptionChannels.length === 0)
        ]);

        return { embed, components: [actionRow] };
    }

    /**
     * Crée l'interface de gestion des embeds existants
     * @param {import('discord.js').Guild} guild - Le serveur Discord
     * @returns {Object} Embed et composants
     */
    static async createEmbedManagementInterface(guild) {
        const embed = new EmbedBuilder()
            .setTitle('🎛️ Gestion des Embeds de Tickets')
            .setDescription(
                '**Gérez vos embeds de tickets existants**\n\n' +
                '• **Voir les embeds** - Listez tous les embeds de tickets\n' +
                '• **Modifier** - Éditez le contenu d\'un embed\n' +
                '• **Supprimer** - Retirez un embed des salons\n' +
                '• **Dupliquer** - Copiez un embed dans d\'autres salons'
            )
            .setColor(0x5865F2);

        const actionRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_tickets_list_embeds')
                .setLabel('📋 Lister Embeds')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('config_tickets_edit_embed')
                .setLabel('✏️ Modifier Embed')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('config_tickets_delete_embed')
                .setLabel('🗑️ Supprimer Embed')
                .setStyle(ButtonStyle.Danger)
        ]);

        return { embed, components: [actionRow] };
    }

    /**
     * Crée l'interface de sélection des rôles autorisés
     * @param {Array} currentRoles - Rôles actuellement configurés
     * @returns {Object} Embed et composants
     */
    static createRoleSelectionInterface(currentRoles = []) {
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Configuration des Rôles Autorisés')
            .setDescription(
                '**Rôles qui auront accès aux tickets**\n\n' +
                'Ces rôles pourront voir et interagir avec tous les tickets créés.\n' +
                'Le rôle support principal est configuré séparément.'
            )
            .setColor(0x5865F2);

        if (currentRoles.length > 0) {
            const rolesList = currentRoles.map(roleId => `<@&${roleId}>`).join('\n');
            embed.addFields([{
                name: `👥 Rôles autorisés (${currentRoles.length})`,
                value: rolesList,
                inline: false
            }]);
        } else {
            embed.addFields([{
                name: '👥 Rôles autorisés',
                value: 'Aucun rôle configuré',
                inline: false
            }]);
        }

        const actionRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_tickets_add_authorized_role')
                .setLabel('➕ Ajouter Rôle')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('config_tickets_remove_authorized_role')
                .setLabel('➖ Retirer Rôle')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(currentRoles.length === 0)
        ]);

        return { embed, components: [actionRow] };
    }

    /**
     * Traite l'ajout d'un salon de réception
     * @param {import('discord.js').ChannelSelectMenuInteraction} interaction - L'interaction
     * @param {Function} saveChanges - Fonction de sauvegarde
     * @returns {Promise<Object>} Les changements
     */
    static async handleAddReceptionChannel(interaction, saveChanges) {
        const selectedChannel = interaction.channels.first();
        
        if (!selectedChannel) {
            throw new Error('Aucun salon sélectionné.');
        }

        if (selectedChannel.type !== ChannelType.GuildText) {
            throw new Error('Vous devez sélectionner un salon textuel.');
        }

        const config = interaction.client.configManager?.getConfig() || {};
        const ticketsConfig = config.tickets || {};
        const receptionChannels = ticketsConfig.receptionChannels || [];

        if (receptionChannels.includes(selectedChannel.id)) {
            throw new Error('Ce salon est déjà configuré comme salon de réception.');
        }

        const newReceptionChannels = [...receptionChannels, selectedChannel.id];

        const changes = {
            tickets: {
                ...ticketsConfig,
                receptionChannels: newReceptionChannels
            }
        };

        await saveChanges(interaction.user.id, changes);
        return changes;
    }

    /**
     * Traite la suppression d'un salon de réception
     * @param {import('discord.js').StringSelectMenuInteraction} interaction - L'interaction
     * @param {Function} saveChanges - Fonction de sauvegarde
     * @returns {Promise<Object>} Les changements
     */
    static async handleRemoveReceptionChannel(interaction, saveChanges) {
        const channelId = interaction.values[0];
        
        const config = interaction.client.configManager?.getConfig() || {};
        const ticketsConfig = config.tickets || {};
        const receptionChannels = ticketsConfig.receptionChannels || [];

        const newReceptionChannels = receptionChannels.filter(id => id !== channelId);

        const changes = {
            tickets: {
                ...ticketsConfig,
                receptionChannels: newReceptionChannels
            }
        };

        await saveChanges(interaction.user.id, changes);
        return changes;
    }

    /**
     * Parse une couleur depuis une chaîne
     * @param {string} colorInput - La couleur en entrée
     * @returns {number} La couleur en hexadécimal
     */
    static parseColor(colorInput) {
        if (!colorInput) return 0x3498DB;

        if (colorInput.startsWith('#')) {
            return parseInt(colorInput.slice(1), 16);
        }

        const colors = {
            'rouge': 0xE74C3C, 'red': 0xE74C3C,
            'vert': 0x2ECC71, 'green': 0x2ECC71,
            'bleu': 0x3498DB, 'blue': 0x3498DB,
            'jaune': 0xF1C40F, 'yellow': 0xF1C40F,
            'violet': 0x9B59B6, 'purple': 0x9B59B6,
            'orange': 0xE67E22,
            'noir': 0x2F3136, 'black': 0x2F3136
        };

        return colors[colorInput.toLowerCase()] || 0x3498DB;
    }

    /**
     * Envoie un embed de ticket dans les salons de réception configurés
     * @param {Object} embedData - Données de l'embed
     * @param {import('discord.js').Guild} guild - Le serveur Discord
     * @param {Object} config - Configuration actuelle
     * @returns {Promise<Object>} Résultat de l'envoi
     */
    static async sendEmbedToReceptionChannels(embedData, guild, config) {
        const ticketsConfig = config.tickets || {};
        const receptionChannels = ticketsConfig.receptionChannels || [];
        const authorizedRoles = ticketsConfig.authorizedRoles || [];
        
        if (receptionChannels.length === 0) {
            throw new Error('Aucun salon de réception configuré. Utilisez le menu de configuration pour ajouter des salons.');
        }

        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        // Créer l'embed
        const ticketEmbed = new EmbedBuilder()
            .setTitle(embedData.title)
            .setDescription(embedData.description)
            .setColor(embedData.color)
            .setTimestamp();

        // Encoder les rôles autorisés dans l'ID du bouton
        let buttonCustomId = 'create_ticket_button';
        if (authorizedRoles.length > 0) {
            buttonCustomId = `create_ticket_button_${Buffer.from(authorizedRoles.join(',')).toString('base64')}`;
        }

        // Créer le bouton
        const createTicketButton = new ButtonBuilder()
            .setCustomId(buttonCustomId)
            .setLabel(embedData.buttonText)
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(createTicketButton);

        // Envoyer dans tous les salons de réception
        const results = {
            success: [],
            failed: [],
            total: receptionChannels.length
        };

        for (const channelId of receptionChannels) {
            const channel = guild.channels.cache.get(channelId);
            
            if (!channel) {
                results.failed.push({
                    channelId,
                    error: 'Salon introuvable (possiblement supprimé)'
                });
                continue;
            }

            if (channel.type !== 0) { // GuildText
                results.failed.push({
                    channelId,
                    channelName: channel.name,
                    error: 'Le salon n\'est pas un salon textuel'
                });
                continue;
            }

            try {
                // Vérifier les permissions
                const botMember = guild.members.me;
                if (!channel.permissionsFor(botMember).has(['SendMessages', 'EmbedLinks'])) {
                    results.failed.push({
                        channelId,
                        channelName: channel.name,
                        error: 'Permissions manquantes (Envoyer des messages, Intégrer des liens)'
                    });
                    continue;
                }

                const sentMessage = await channel.send({ 
                    embeds: [ticketEmbed], 
                    components: [row] 
                });

                results.success.push({
                    channelId,
                    channelName: channel.name,
                    messageId: sentMessage.id
                });

            } catch (error) {
                console.error(`[TICKETS] Erreur envoi embed dans ${channel.name}:`, error);
                results.failed.push({
                    channelId,
                    channelName: channel.name,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Formate un rapport d'envoi d'embeds
     * @param {Object} results - Résultats de l'envoi
     * @returns {string} Rapport formaté
     */
    static formatSendReport(results) {
        let report = `📊 **Rapport d'envoi des embeds**\n\n`;
        
        if (results.success.length > 0) {
            report += `✅ **Envoyés avec succès (${results.success.length}):**\n`;
            for (const success of results.success) {
                report += `• <#${success.channelId}> - Message ID: ${success.messageId}\n`;
            }
            report += '\n';
        }

        if (results.failed.length > 0) {
            report += `❌ **Échecs (${results.failed.length}):**\n`;
            for (const failure of results.failed) {
                report += `• ${failure.channelName ? `#${failure.channelName}` : `<#${failure.channelId}>`} - ${failure.error}\n`;
            }
            report += '\n';
        }

        report += `📈 **Résumé:** ${results.success.length}/${results.total} embeds envoyés avec succès`;
        
        return report;
    }
}

module.exports = TicketsMenu;