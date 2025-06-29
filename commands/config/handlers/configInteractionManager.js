const { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const configHandler = require('../configInteractionHandler');
const GeneralMenu = require('../menus/generalMenu');
const LoggingMenu = require('../menus/loggingMenu');
const EconomyMenu = require('../menus/economyMenu');
const EntryMenu = require('../menus/entryMenu');
const WebhookMenu = require('../menus/webhookMenu');
const { createValidationReport, validateCustomId, validateCustomIdFormat } = require('../utils/customIdValidator');
const { restartDailyQuizScheduler } = require('../../../utils/dailyQuizScheduler');

class ConfigInteractionManager {
    constructor() {
        this.configHandler = require('../configInteractionHandler');
        this.GeneralMenu = require('../menus/generalMenu');
        this.LoggingMenu = require('../menus/loggingMenu');
        this.EconomyMenu = require('../menus/economyMenu');
        this.EntryMenu = require('../menus/entryMenu');
        this.WebhookMenu = require('../menus/webhookMenu');
    }

    async handleInteraction(interaction) {
        if (interaction.replied || interaction.deferred) return;

        try {
            const session = configHandler.getSession(interaction.user.id);
            if (!session) {
                return interaction.reply({ content: '❌ Session expirée. Utilisez /config.', ephemeral: true });
            }

            if (interaction.isStringSelectMenu()) {
                await this.handleSelectMenu(interaction);
            } else if (interaction.isChannelSelectMenu()) {
                await this.handleChannelSelect(interaction);
            } else if (interaction.isButton()) {
                await this.handleButton(interaction);
            } else if (interaction.isModalSubmit()) {
                await this.handleModal(interaction);
            }

        } catch (error) {
            console.error(`[CONFIG] Erreur: ${interaction.customId}:`, error);
            const errorMessage = error.message || 'Erreur inattendue.';
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: `❌ ${errorMessage}`, ephemeral: true });
            } else {
                await interaction.reply({ content: `❌ ${errorMessage}`, ephemeral: true });
            }
        }
    }

    async handleSelectMenu(interaction) {
        const [customId, value] = [interaction.customId, interaction.values[0]];

        if (customId === 'config_category_select') {
            await this.handleCategorySelect(interaction, value);
        } else if (customId === 'config_logging_exclusion_type') {
            await this.handleExclusionTypeSelect(interaction, value);
        }
    }

    async handleChannelSelect(interaction) {
        const customId = interaction.customId;
        if (customId.startsWith('config_logging_channel_select_')) {
            await this.handleLogChannelSelection(interaction);
        }
    }

    async handleButton(interaction) {
        const customId = interaction.customId;
        if (customId.startsWith('config_logging_toggle_')) {
            await this.handleLogToggleButton(interaction);
        } else if (customId === 'config_webhook_manage') {
            await this.showWebhookMenu(interaction);
        } else if (customId.startsWith('config_webhook_')) {
            await this.handleWebhookButton(interaction);
        } else if (customId.startsWith('config_category_')) {
            await this.handleCategorySelect(interaction, customId.replace('config_category_', ''));
        } else if (customId === 'config_back') {
            await this.handleBackButton(interaction);
        } else if (customId === 'config_home') {
            await this.handleHomeButton(interaction);
        }
    }

    async handleLogToggleButton(interaction) {
        const logType = interaction.customId.replace('config_logging_toggle_', '');
        const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
        const logConfig = config.logging?.[logType] || {};

        if (logConfig.enabled) {
            // Désactiver
            const changes = { logging: { [logType]: { enabled: false, channelId: null, webhookUrl: null } } };
            await configHandler.saveChanges(interaction.user.id, changes);
            await this.updateCurrentView(interaction, 'logging');
        } else {
            // Activer -> demander le salon
            const channelMenu = new ActionRowBuilder().addComponents(
                configHandler.createChannelSelectMenu(`config_logging_channel_select_${logType}`, 'Choisir un salon', [ChannelType.GuildText])
            );
            await interaction.reply({ 
                content: `Veuillez sélectionner un salon pour les logs de **${WebhookMenu.getLogTypeName(logType)}**`, 
                components: [channelMenu], 
                ephemeral: true 
            });
        }
    }

    async handleLogChannelSelection(interaction) {
        await interaction.deferUpdate();
        const logType = interaction.customId.replace('config_logging_channel_select_', '');
        const channel = interaction.channels.first();

        if (!channel) throw new Error('Aucun salon sélectionné.');
        if (channel.type !== ChannelType.GuildText) throw new Error('Le salon doit être textuel.');

        const botMember = interaction.guild.members.me;
        if (!channel.permissionsFor(botMember).has(PermissionsBitField.Flags.ManageWebhooks)) {
            throw new Error(`Permissions manquantes dans <#${channel.id}>: Gérer les webhooks.`);
        }

        try {
            const webhook = await channel.createWebhook({ 
                name: `KinkyPolice ${WebhookMenu.getLogTypeName(logType)}`,
                avatar: interaction.client.user.displayAvatarURL(),
                reason: 'Configuration automatique des logs'
            });

            const changes = { logging: { [logType]: { enabled: true, channelId: channel.id, webhookUrl: webhook.url } } };
            await configHandler.saveChanges(interaction.user.id, changes);
            
            await interaction.editReply({ content: `✅ Log activé et webhook créé dans <#${channel.id}>.`, components: [] });
            await this.updateCurrentView(interaction, 'logging', true);

        } catch (error) {
            console.error('Erreur création webhook:', error);
            throw new Error('Impossible de créer le webhook. Vérifiez les permissions et la limite de webhooks (15 par salon).');
        }
    }

    async showWebhookMenu(interaction) {
        configHandler.updateNavigation(interaction.user.id, 'webhooks', 'Gestion Webhooks');
        const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
        const embed = WebhookMenu.createEmbed(config);
        const components = [
            ...WebhookMenu.createComponents(config),
            configHandler.createControlButtons(interaction.user.id, true)
        ];
        await interaction.update({ embeds: [embed], components });
    }

    async handleWebhookButton(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
        let resultMessage = 'Action terminée.';

        try {
            if (interaction.customId === 'config_webhook_test_all') {
                const results = await WebhookMenu.testAllWebhooks(config.logging || {});
                resultMessage = results.map(r => `${r.success ? '✅' : '❌'} **${r.name}**: ${r.success ? 'Succès' : r.error}`).join('\n');
            } else if (interaction.customId === 'config_webhook_clean_old') {
                const { cleaned, errors } = await WebhookMenu.cleanOldWebhooks(interaction.guild);
                resultMessage = `🧹 ${cleaned} webhook(s) nettoyé(s).`;
                if (errors.length > 0) resultMessage += `\n⚠️ Erreurs: ${errors.join(', ')}`;
            } else if (interaction.customId === 'config_webhook_recreate_all') {
                // Implémenter la logique pour recréer tous les webhooks
                resultMessage = '🔄 Logique de recréation à implémenter.';
            }
            await interaction.editReply({ content: resultMessage });
        } catch (error) {
            await interaction.editReply({ content: `❌ Erreur: ${error.message}` });
        }
    }

    async updateCurrentView(interaction, category, useEditReply = false) {
        const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
        let embed, components;

        switch (category) {
            case 'logging':
                embed = LoggingMenu.createEmbed(config, interaction.guild);
                components = [
                    ...LoggingMenu.createComponents(config),
                    configHandler.createControlButtons(interaction.user.id, true)
                ];
                break;
            // ... autres catégories
            default:
                embed = configHandler.createMainConfigEmbed(interaction.user.id, interaction.guild);
                components = [
                    ...configHandler.createCategoryButtons(interaction.user.id, config),
                    configHandler.createControlButtons(interaction.user.id)
                ];
                break;
        }

        const payload = { embeds: [embed], components, content: '' };
        if (useEditReply || interaction.replied || interaction.deferred) {
            await interaction.editReply(payload);
        } else {
            await interaction.update(payload);
        }
    }

    async handleBackButton(interaction) {
        configHandler.navigateBack(interaction.user.id);
        const session = configHandler.getSession(interaction.user.id);
        await this.updateCurrentView(interaction, session.currentCategory);
    }

    async handleHomeButton(interaction) {
        configHandler.updateNavigation(interaction.user.id, 'main', 'Configuration');
        await this.updateCurrentView(interaction, 'main');
    }
    
    // ... (garder les autres méthodes comme handleCategorySelect, handleModal, etc.)
}

module.exports = ConfigInteractionManager;
