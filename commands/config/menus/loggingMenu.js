const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, StringSelectMenuBuilder } = require('discord.js');

/**
 * @file commands/config/menus/loggingMenu.js
 * @description Menu de configuration des logs et de la modération
 */

class LoggingMenu {
    /**
     * Crée l'embed de configuration des logs
     * @param {Object} config - Configuration actuelle
     * @param {import('discord.js').Guild} guild - Le serveur Discord
     * @returns {import('discord.js').EmbedBuilder} L'embed de configuration
     */
    static createEmbed(config, guild) {
        const loggingConfig = config.logging || {};
        
        const embed = new EmbedBuilder()
            .setTitle('📝 Configuration des Logs')
            .setDescription('Gestion des logs de modération et d\'activité')
            .setColor(0x5865F2)
            .addFields([
                {
                    name: '🛡️ Logs de Modération',
                    value: loggingConfig.modLogs ? `<#${loggingConfig.modLogs}>` : 'Non défini',
                    inline: true
                },
                {
                    name: '💬 Logs de Messages',
                    value: loggingConfig.messageLogs ? `<#${loggingConfig.messageLogs}>` : 'Non défini',
                    inline: true
                },
                {
                    name: '🔊 Logs Vocaux',
                    value: loggingConfig.voiceLogs ? `<#${loggingConfig.voiceLogs}>` : 'Non défini',
                    inline: true
                },
                {
                    name: '👥 Logs de Membres',
                    value: loggingConfig.memberLogs ? `<#${loggingConfig.memberLogs}>` : 'Non défini',
                    inline: true
                },
                {
                    name: '🎭 Logs de Rôles',
                    value: loggingConfig.roleLogChannelId ? `<#${loggingConfig.roleLogChannelId}>` : 'Non défini',
                    inline: true
                },
                {
                    name: '🚫 Exclusions',
                    value: this.getExclusionsText(loggingConfig),
                    inline: false
                }
            ])
            .setFooter({ text: 'Configuration > Logs' });

        return embed;
    }

    /**
     * Crée le texte des exclusions
     * @param {Object} loggingConfig - Configuration des logs
     * @returns {string} Le texte des exclusions
     */
    static getExclusionsText(loggingConfig) {
        const excludedChannels = loggingConfig.excludedChannels || [];
        const excludedRoles = loggingConfig.excludedRoles || [];
        const excludedUsers = loggingConfig.excludedUsers || [];
        const roleLogsExcludedRoles = loggingConfig.roleLogsExcludedRoles || [];

        let text = '';
        
        if (excludedChannels.length > 0) {
            text += `**Salons exclus:** ${excludedChannels.length} salon(s)\n`;
        }
        
        if (excludedRoles.length > 0) {
            text += `**Rôles exclus:** ${excludedRoles.length} rôle(s)\n`;
        }
        
        if (excludedUsers.length > 0) {
            text += `**Utilisateurs exclus:** ${excludedUsers.length} utilisateur(s)\n`;
        }
        
        if (roleLogsExcludedRoles.length > 0) {
            text += `**Rôles exclus (logs de rôles):** ${roleLogsExcludedRoles.length} rôle(s)\n`;
        }

        return text || 'Aucune exclusion configurée';
    }

    /**
     * Crée les composants de configuration des logs
     * @returns {Array<import('discord.js').ActionRowBuilder>} Les composants
     */
    static createComponents() {
        const channelRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_logging_select_mod_logs')
                .setLabel('🛡️ Logs Modération')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('config_logging_select_message_logs')
                .setLabel('💬 Logs Messages')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('config_logging_select_voice_logs')
                .setLabel('🔊 Logs Vocaux')
                .setStyle(ButtonStyle.Primary)
        ]);

        const channelRow2 = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_logging_select_member_logs')
                .setLabel('👥 Logs Membres')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('config_logging_select_role_logs')
                .setLabel('🎭 Logs Rôles')
                .setStyle(ButtonStyle.Primary)
        ]);

        const exclusionRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_logging_manage_exclusions')
                .setLabel('🚫 Gérer les exclusions')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('config_logging_webhook_setup')
                .setLabel('🔗 Configuration Webhooks')
                .setStyle(ButtonStyle.Secondary)
        ]);

        return [channelRow, channelRow2, exclusionRow];
    }

    /**
     * Crée le menu de gestion des exclusions
     * @param {Object} loggingConfig - Configuration actuelle des logs
     * @returns {Object} Embed et composants pour les exclusions
     */
    static createExclusionMenu(loggingConfig) {
        const embed = new EmbedBuilder()
            .setTitle('🚫 Gestion des Exclusions')
            .setDescription('Configurez les éléments à exclure des logs')
            .setColor(0x5865F2)
            .addFields([
                {
                    name: '📝 Salons exclus',
                    value: this.getChannelsList(loggingConfig.excludedChannels) || 'Aucun salon exclu',
                    inline: false
                },
                {
                    name: '🎭 Rôles exclus (général)',
                    value: this.getRolesList(loggingConfig.excludedRoles) || 'Aucun rôle exclu',
                    inline: false
                },
                {
                    name: '🎭 Rôles exclus (logs de rôles)',
                    value: this.getRolesList(loggingConfig.roleLogsExcludedRoles) || 'Aucun rôle exclu',
                    inline: false
                },
                {
                    name: '👤 Utilisateurs exclus',
                    value: this.getUsersList(loggingConfig.excludedUsers) || 'Aucun utilisateur exclu',
                    inline: false
                }
            ])
            .setFooter({ text: 'Configuration > Logs > Exclusions' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('config_logging_exclusion_type')
            .setPlaceholder('Sélectionnez le type d\'exclusion à gérer')
            .addOptions([
                {
                    label: 'Salons exclus',
                    description: 'Gérer les salons exclus des logs',
                    value: 'excludedChannels',
                    emoji: '📝'
                },
                {
                    label: 'Rôles exclus (général)',
                    description: 'Gérer les rôles exclus des logs généraux',
                    value: 'excludedRoles',
                    emoji: '🎭'
                },
                {
                    label: 'Rôles exclus (logs de rôles)',
                    description: 'Gérer les rôles exclus spécifiquement des logs de rôles',
                    value: 'roleLogsExcludedRoles',
                    emoji: '🎭'
                },
                {
                    label: 'Utilisateurs exclus',
                    description: 'Gérer les utilisateurs exclus des logs',
                    value: 'excludedUsers',
                    emoji: '👤'
                }
            ]);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        return { embed, components: [selectRow] };
    }

    static getLogConfigKey(logType) {
        const map = {
            'mod_logs': 'modLogs',
            'message_logs': 'messageLogs',
            'voice_logs': 'voiceLogs',
            'member_logs': 'memberLogs',
            'role_logs': 'roleLogChannelId'
        };
        return map[logType];
    }

    /**
     * Traite la sélection d'un salon de logs
     * @param {import('discord.js').ChannelSelectMenuInteraction} interaction - L'interaction de sélection
     * @param {string} logType - Type de log (modLogs, messageLogs, etc.)
     * @param {Function} addPendingChanges - Fonction pour ajouter des changements
     * @returns {Object} Les changements à appliquer
     */
    static handleLogChannelSelect(interaction, logType, addPendingChanges) {
        const selectedChannel = interaction.channels.first();
        
        if (!selectedChannel) {
            throw new Error('Aucun salon sélectionné.');
        }

        // Vérifier que c'est un salon textuel
        if (selectedChannel.type !== ChannelType.GuildText) {
            throw new Error('Seuls les salons textuels peuvent être utilisés pour les logs.');
        }

        // Vérifier les permissions du bot
        const botMember = interaction.guild.members.me;
        if (!selectedChannel.permissionsFor(botMember).has(['SendMessages', 'EmbedLinks'])) {
            throw new Error('Le bot n\'a pas les permissions nécessaires dans ce salon (Envoyer des messages, Intégrer des liens).');
        }

        const changes = {
            logging: {
                [logType]: selectedChannel.id
            }
        };

        addPendingChanges(interaction.user.id, changes);
        return changes;
    }

    /**
     * Gère l'ajout/suppression d'éléments dans les listes d'exclusion
     * @param {import('discord.js').Interaction} interaction - L'interaction
     * @param {string} listType - Type de liste (excludedChannels, excludedRoles, etc.)
     * @param {string} itemId - ID de l'élément à ajouter/supprimer
     * @param {string} action - Action (add/remove)
     * @param {Function} addPendingChanges - Fonction pour ajouter des changements
     * @returns {Object} Les changements à appliquer
     */
    static handleExclusionListUpdate(interaction, listType, itemId, action, addPendingChanges) {
        const currentConfig = require('../../../utils/configManager').getConfig();
        const currentList = currentConfig.logging?.[listType] || [];
        
        let newList = [...currentList];

        if (action === 'add') {
            if (!newList.includes(itemId)) {
                newList.push(itemId);
            }
        } else if (action === 'remove') {
            newList = newList.filter(id => id !== itemId);
        }

        const changes = {
            logging: {
                [listType]: newList
            }
        };

        addPendingChanges(interaction.user.id, changes);
        return changes;
    }

    /**
     * Formate la liste des salons
     * @param {Array} channelIds - IDs des salons
     * @returns {string} Liste formatée
     */
    static getChannelsList(channelIds) {
        if (!channelIds || channelIds.length === 0) return null;
        return channelIds.map(id => `<#${id}>`).join(', ');
    }

    /**
     * Formate la liste des rôles
     * @param {Array} roleIds - IDs des rôles
     * @returns {string} Liste formatée
     */
    static getRolesList(roleIds) {
        if (!roleIds || roleIds.length === 0) return null;
        return roleIds.map(id => `<@&${id}>`).join(', ');
    }

    /**
     * Formate la liste des utilisateurs
     * @param {Array} userIds - IDs des utilisateurs
     * @returns {string} Liste formatée
     */
    static getUsersList(userIds) {
        if (!userIds || userIds.length === 0) return null;
        return userIds.map(id => `<@${id}>`).join(', ');
    }
}

module.exports = LoggingMenu;