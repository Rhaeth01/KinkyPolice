const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, StringSelectMenuBuilder } = require('discord.js');

class LoggingMenu {
    static createEmbed(config, guild) {
        const loggingConfig = config.logging || {};
        const getStatus = (logType) => {
            const log = loggingConfig[logType];
            if (log && log.enabled) {
                return `✅ Activé dans <#${log.channelId}>`;
            }
            return '❌ Désactivé';
        };

        const embed = new EmbedBuilder()
            .setTitle('📝 Configuration des Logs')
            .setDescription('Activez ou désactivez les logs pour chaque catégorie.')
            .setColor(0x5865F2)
            .addFields(
                { name: '🛡️ Logs de Modération', value: getStatus('modLogs'), inline: true },
                { name: '💬 Logs de Messages', value: getStatus('messageLogs'), inline: true },
                { name: '🔊 Logs Vocaux', value: getStatus('voiceLogs'), inline: true },
                { name: '👥 Logs de Membres', value: getStatus('memberLogs'), inline: true },
                { name: '🎭 Logs de Rôles', value: getStatus('roleLogs'), inline: true },
                { name: '🎟️ Logs de Tickets', value: getStatus('ticketLogs'), inline: true },
                { name: '🚫 Exclusions', value: this.getExclusionsText(loggingConfig), inline: false }
            )
            .setFooter({ text: 'Configuration > Logs' });

        return embed;
    }

    static createComponents(config) {
        const loggingConfig = config.logging || {};
        const createButton = (logType, label, emoji) => {
            const log = loggingConfig[logType];
            const enabled = log && log.enabled;
            return new ButtonBuilder()
                .setCustomId(`config_logging_toggle_${logType}`)
                .setLabel(label)
                .setEmoji(emoji)
                .setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Danger);
        };

        const row1 = new ActionRowBuilder().addComponents(
            createButton('modLogs', 'Modération', '🛡️'),
            createButton('messageLogs', 'Messages', '💬'),
            createButton('voiceLogs', 'Vocaux', '🔊')
        );

        const row2 = new ActionRowBuilder().addComponents(
            createButton('memberLogs', 'Membres', '👥'),
            createButton('roleLogs', 'Rôles', '🎭'),
            createButton('ticketLogs', 'Tickets', '🎟️')
        );

        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('config_logging_manage_exclusions')
                .setLabel('🚫 Gérer les Exclusions')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('config_webhook_manage')
                .setLabel('🔗 Gérer les Webhooks')
                .setStyle(ButtonStyle.Secondary)
        );

        return [row1, row2, row3];
    }

    static getExclusionsText(loggingConfig) {
        const { excludedChannels = [], excludedRoles = [], excludedUsers = [], roleLogsExcludedRoles = [] } = loggingConfig;
        let text = '';
        if (excludedChannels.length > 0) text += `**Salons:** ${excludedChannels.length}\n`;
        if (excludedRoles.length > 0) text += `**Rôles (général):** ${excludedRoles.length}\n`;
        if (roleLogsExcludedRoles.length > 0) text += `**Rôles (spécifique):** ${roleLogsExcludedRoles.length}\n`;
        if (excludedUsers.length > 0) text += `**Utilisateurs:** ${excludedUsers.length}\n`;
        return text || 'Aucune exclusion.';
    }

    static createExclusionMenu(loggingConfig) {
        const embed = new EmbedBuilder()
            .setTitle('🚫 Gestion des Exclusions de Logs')
            .setDescription('Sélectionnez les canaux, rôles ou utilisateurs à exclure des logs.')
            .setColor(0x5865F2)
            .addFields(
                { name: 'Salons Exclus', value: this.getChannelsList(loggingConfig.excludedChannels) || 'Aucun', inline: false },
                { name: 'Rôles Exclus (Général)', value: this.getRolesList(loggingConfig.excludedRoles) || 'Aucun', inline: false },
                { name: 'Rôles Exclus (Spécifique aux Rôles)', value: this.getRolesList(loggingConfig.roleLogsExcludedRoles) || 'Aucun', inline: false },
                { name: 'Utilisateurs Exclus', value: this.getUsersList(loggingConfig.excludedUsers) || 'Aucun', inline: false }
            );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('config_logging_exclusion_type')
            .setPlaceholder('Choisir le type d\'exclusion...')
            .addOptions([
                { label: 'Salons', value: 'excludedChannels', emoji: '📝' },
                { label: 'Rôles (Général)', value: 'excludedRoles', emoji: '🎭' },
                { label: 'Rôles (Spécifique)', value: 'roleLogsExcludedRoles', emoji: '🎭' },
                { label: 'Utilisateurs', value: 'excludedUsers', emoji: '👤' }
            ]);

        return { embed, components: [new ActionRowBuilder().addComponents(selectMenu)] };
    }

    static getChannelsList(channelIds) {
        return (channelIds && channelIds.length > 0) ? channelIds.map(id => `<#${id}>`).join(', ') : null;
    }

    static getRolesList(roleIds) {
        return (roleIds && roleIds.length > 0) ? roleIds.map(id => `<@&${id}>`).join(', ') : null;
    }

    static getUsersList(userIds) {
        return (userIds && userIds.length > 0) ? userIds.map(id => `<@${id}>`).join(', ') : null;
    }
}

module.exports = LoggingMenu;
