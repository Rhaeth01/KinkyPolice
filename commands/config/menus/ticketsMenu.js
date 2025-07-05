const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType } = require('discord.js');

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
        
        // Calculer le statut de configuration
        let configured = 0;
        let total = 4;
        if (ticketsConfig.ticketCategory) configured++;
        if (ticketsConfig.supportRole) configured++;
        if (ticketsConfig.ticketLogs) configured++;
        if (loggingConfig.ticketsWebhookUrl) configured++;
        
        const percentage = Math.round((configured / total) * 100);
        const statusIcon = percentage === 100 ? '🟢' : percentage > 0 ? '🟡' : '🔴';
        const progressBar = '▰'.repeat(Math.round(percentage / 10)) + '▱'.repeat(10 - Math.round(percentage / 10));
        
        const embed = new EmbedBuilder()
            .setTitle(`🎫 Configuration des Tickets ${statusIcon}`)
            .setDescription(
                `**Système de support par tickets**\n\n` +
                `**Progression :** ${percentage}% ${progressBar}\n` +
                `**Paramètres configurés :** ${configured}/${total}\n\n` +
                `*Configurez votre système de tickets pour le support utilisateur.*`
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
                    name: '🛡️ Rôle Support',
                    value: ticketsConfig.supportRole ? 
                        `✅ **Configuré :** <@&${ticketsConfig.supportRole}>\nCe rôle aura accès aux tickets` : 
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
                    name: '🔗 Webhook des Logs',
                    value: loggingConfig.ticketsWebhookUrl ? 
                        '✅ **Configuré** - Webhook actif pour les logs' : 
                        '❌ **Non configuré** - Webhook automatique disponible',
                    inline: false
                }
            ])
            .setThumbnail(guild.iconURL())
            .setFooter({ 
                text: `Configuration › Tickets | Serveur: ${guild.name}`,
                iconURL: guild.iconURL()
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

        return [configRow, webhookRow];
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
}

module.exports = TicketsMenu;