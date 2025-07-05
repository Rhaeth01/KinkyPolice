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

        this.handleInteraction = this.handleInteraction.bind(this);
        this.handleSelectMenu = this.handleSelectMenu.bind(this);
        this.handleChannelSelect = this.handleChannelSelect.bind(this);
        this.handleButton = this.handleButton.bind(this);
        this.handleLogToggleButton = this.handleLogToggleButton.bind(this);
        this.handleLogChannelSelection = this.handleLogChannelSelection.bind(this);
        this.showWebhookMenu = this.showWebhookMenu.bind(this);
        this.handleWebhookButton = this.handleWebhookButton.bind(this);
        this.updateCurrentView = this.updateCurrentView.bind(this);
        this.handleBackButton = this.handleBackButton.bind(this);
        this.handleHomeButton = this.handleHomeButton.bind(this);
        this.handleCategorySelect = this.handleCategorySelect.bind(this);
    }

    async handleCategorySelect(interaction, category) {
        configHandler.updateNavigation(interaction.user.id, category, `Configuration > ${category}`);
        await this.updateCurrentView(interaction, category);
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
            } else if (interaction.isRoleSelectMenu()) {
                await this.handleRoleSelect(interaction);
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
        } else if (customId === 'config_general_edit_prefix') {
            await this.handleEditPrefixButton(interaction);
        } else if (customId === 'config_general_select_admin_role') {
            await this.handleSelectAdminRoleButton(interaction);
        } else if (customId === 'config_general_select_mod_role') {
            await this.handleSelectModRoleButton(interaction);
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

    /**
     * Gère les interactions de sélection de rôles
     */
    async handleRoleSelect(interaction) {
        const customId = interaction.customId;
        
        if (customId === 'config_general_select_admin_role') {
            await GeneralMenu.handleAdminRoleSelect(interaction, configHandler.saveChanges.bind(configHandler));
            await this.updateCurrentView(interaction, 'general', true);
        } else if (customId === 'config_general_select_mod_role') {
            await GeneralMenu.handleModRoleSelect(interaction, configHandler.saveChanges.bind(configHandler));
            await this.updateCurrentView(interaction, 'general', true);
        }
    }

    /**
     * Gère les interactions de modals
     */
    async handleModal(interaction) {
        const customId = interaction.customId;
        
        if (customId === 'config_general_prefix_modal') {
            await GeneralMenu.handlePrefixModal(interaction, configHandler.saveChanges.bind(configHandler));
            await interaction.reply({
                content: '✅ Préfixe mis à jour avec succès!',
                ephemeral: true
            });
            await this.updateCurrentView(interaction, 'general', true);
        } else if (customId === 'add_modal_field') {
            await this.handleAddModalField(interaction);
        } else if (customId.startsWith('edit_modal_field_')) {
            await this.handleEditModalField(interaction);
        } else if (customId === 'preview_modal') {
            await interaction.reply({
                content: '✅ C\'était un aperçu du modal d\'entrée. Les données n\'ont pas été sauvegardées.',
                ephemeral: true
            });
        }
    }

    /**
     * Gère l'ajout de champ modal
     */
    async handleAddModalField(interaction) {
        try {
            const label = interaction.fields.getTextInputValue('field_label');
            const customId = interaction.fields.getTextInputValue('field_custom_id');
            const placeholder = interaction.fields.getTextInputValue('field_placeholder') || '';
            const style = interaction.fields.getTextInputValue('field_style');
            const required = interaction.fields.getTextInputValue('field_required').toLowerCase() === 'true';

            if (!['Short', 'Paragraph'].includes(style)) {
                return interaction.reply({
                    content: '❌ Le type de champ doit être "Short" ou "Paragraph".',
                    ephemeral: true
                });
            }

            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            const entryData = config.entry || {};
            const entryModal = entryData.modal || { fields: [] };
            
            if (entryModal.fields && entryModal.fields.some(field => field.customId === customId)) {
                return interaction.reply({
                    content: '❌ Cet ID personnalisé existe déjà. Choisissez un ID unique.',
                    ephemeral: true
                });
            }

            const newField = {
                customId,
                label,
                style,
                required,
                ...(placeholder && { placeholder })
            };

            if (!entryModal.fields) entryModal.fields = [];
            entryModal.fields.push(newField);

            entryData.modal = entryModal;
            await configHandler.saveChanges(interaction.user.id, { entry: entryData });

            await interaction.reply({
                content: `✅ **Champ ajouté avec succès !**\n\n📝 **${label}**\n🔧 ID: \`${customId}\`\n📊 Type: ${style}\n${required ? '🔴' : '⚪'} ${required ? 'Obligatoire' : 'Optionnel'}`,
                ephemeral: true
            });

        } catch (error) {
            console.error('[CONFIG] Erreur lors de l\'ajout du champ modal:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors de l\'ajout du champ.',
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Gère la modification de champ modal
     */
    async handleEditModalField(interaction) {
        try {
            const fieldIndex = parseInt(interaction.customId.replace('edit_modal_field_', ''));
            
            const label = interaction.fields.getTextInputValue('field_label');
            const customId = interaction.fields.getTextInputValue('field_custom_id');
            const placeholder = interaction.fields.getTextInputValue('field_placeholder') || '';
            const style = interaction.fields.getTextInputValue('field_style');
            const required = interaction.fields.getTextInputValue('field_required').toLowerCase() === 'true';

            if (!['Short', 'Paragraph'].includes(style)) {
                return interaction.reply({
                    content: '❌ Le type de champ doit être "Short" ou "Paragraph".',
                    ephemeral: true
                });
            }

            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            const entryData = config.entry || {};
            const entryModal = entryData.modal || { fields: [] };
            
            if (!entryModal.fields || fieldIndex < 0 || fieldIndex >= entryModal.fields.length) {
                return interaction.reply({
                    content: '❌ Champ introuvable.',
                    ephemeral: true
                });
            }
            
            if (entryModal.fields.some((field, idx) => idx !== fieldIndex && field.customId === customId)) {
                return interaction.reply({
                    content: '❌ Cet ID personnalisé existe déjà. Choisissez un ID unique.',
                    ephemeral: true
                });
            }

            entryModal.fields[fieldIndex] = {
                customId,
                label,
                style,
                required,
                ...(placeholder && { placeholder })
            };

            entryData.modal = entryModal;
            await configHandler.saveChanges(interaction.user.id, { entry: entryData });

            await interaction.reply({
                content: `✅ **Champ modifié avec succès !**\n\n📝 **${label}**\n🔧 ID: \`${customId}\`\n📊 Type: ${style}\n${required ? '🔴' : '⚪'} ${required ? 'Obligatoire' : 'Optionnel'}`,
                ephemeral: true
            });

        } catch (error) {
            console.error('[CONFIG] Erreur lors de la modification du champ modal:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors de la modification du champ.',
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Gère le bouton d'édition du préfixe
     */
    async handleEditPrefixButton(interaction) {
        const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
        const currentPrefix = config.general?.prefix || '!';
        const modal = GeneralMenu.createPrefixModal(currentPrefix);
        await interaction.showModal(modal);
    }

    /**
     * Gère le bouton de sélection du rôle admin
     */
    async handleSelectAdminRoleButton(interaction) {
        const roleMenu = configHandler.createRoleSelectMenu(
            'config_general_select_admin_role',
            'Sélectionner le rôle administrateur'
        );
        await interaction.reply({
            content: 'Veuillez sélectionner le rôle qui aura les permissions d\'administrateur :',
            components: [roleMenu],
            ephemeral: true
        });
    }

    /**
     * Gère le bouton de sélection du rôle mod
     */
    async handleSelectModRoleButton(interaction) {
        const roleMenu = configHandler.createRoleSelectMenu(
            'config_general_select_mod_role',
            'Sélectionner le rôle modérateur'
        );
        await interaction.reply({
            content: 'Veuillez sélectionner le rôle qui aura les permissions de modérateur :',
            components: [roleMenu],
            ephemeral: true
        });
    }
}

module.exports = ConfigInteractionManager;
