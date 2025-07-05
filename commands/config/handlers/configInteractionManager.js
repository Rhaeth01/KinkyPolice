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
        } else if (customId === 'config_tickets_remove_reception_select') {
            await this.handleTicketsRemoveReceptionSelect(interaction, value);
        } else if (customId === 'config_tickets_remove_role_select') {
            await this.handleTicketsRemoveRoleSelect(interaction, value);
        }
    }

    async handleChannelSelect(interaction) {
        const customId = interaction.customId;
        if (customId.startsWith('config_logging_channel_select_')) {
            await this.handleLogChannelSelection(interaction);
        } else if (customId === 'config_tickets_category_select') {
            await this.handleTicketsCategorySelect(interaction);
        } else if (customId === 'config_tickets_logs_channel_select') {
            await this.handleTicketsLogsChannelSelect(interaction);
        } else if (customId === 'config_tickets_reception_channel_select') {
            await this.handleTicketsReceptionChannelSelect(interaction);
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
        } else if (customId.startsWith('config_logging_toggle_')) {
            await this.handleLogToggleButton(interaction);
        } else if (customId === 'config_logging_manage_exclusions') {
            await this.handleLogExclusionsButton(interaction);
        } else if (customId.startsWith('config_tickets_')) {
            await this.handleTicketsButton(interaction);
        } else if (customId === 'config_close') {
            await this.handleCloseButton(interaction);
        } else if (customId === 'config_help') {
            await this.handleHelpButton(interaction);
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
            const channelMenu = configHandler.createChannelSelectMenu(
                `config_logging_channel_select_${logType}`, 
                'Choisir un salon', 
                [ChannelType.GuildText]
            );
            await interaction.reply({ 
                content: `Veuillez sélectionner un salon pour les logs de **${this.getLogTypeName(logType)}**`, 
                components: [channelMenu], 
                ephemeral: true 
            });
        }
    }

    /**
     * Obtient le nom d'affichage d'un type de log
     */
    getLogTypeName(logType) {
        const names = {
            modLogs: 'Modération',
            messageLogs: 'Messages', 
            voiceLogs: 'Vocal',
            memberLogs: 'Membres',
            roleLogs: 'Rôles',
            ticketLogs: 'Tickets'
        };
        return names[logType] || logType;
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
            case 'tickets':
                const TicketsMenu = require('../menus/ticketsMenu');
                embed = TicketsMenu.createEmbed(config, interaction.guild);
                components = [
                    ...TicketsMenu.createComponents(),
                    configHandler.createControlButtons(interaction.user.id, true)
                ];
                break;
            case 'general':
                embed = GeneralMenu.createEmbed(config, interaction.guild);
                components = [
                    ...GeneralMenu.createComponents(config),
                    configHandler.createControlButtons(interaction.user.id, true)
                ];
                break;
            case 'economy':
                embed = EconomyMenu.createEmbed(config, interaction.guild);
                components = [
                    ...EconomyMenu.createComponents(config),
                    configHandler.createControlButtons(interaction.user.id, true)
                ];
                break;
            case 'entry':
                embed = EntryMenu.createEmbed(config, interaction.guild);
                components = [
                    ...EntryMenu.createComponents(config),
                    configHandler.createControlButtons(interaction.user.id, true)
                ];
                break;
            case 'webhooks':
                embed = WebhookMenu.createEmbed(config);
                components = [
                    ...WebhookMenu.createComponents(config),
                    configHandler.createControlButtons(interaction.user.id, true)
                ];
                break;
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
        } else if (customId === 'config_tickets_support_role_select') {
            await this.handleTicketsSupportRoleSelect(interaction);
        } else if (customId === 'config_tickets_authorized_role_select') {
            await this.handleTicketsAuthorizedRoleSelect(interaction);
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
        } else if (customId === 'config_tickets_embed_modal') {
            await this.handleTicketsEmbedModal(interaction);
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

    /**
     * Gère le bouton de gestion des exclusions de logs
     */
    async handleLogExclusionsButton(interaction) {
        const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
        const LoggingMenu = require('../menus/loggingMenu');
        const exclusionMenu = LoggingMenu.createExclusionMenu(config.logging || {});
        
        await interaction.reply({
            embeds: [exclusionMenu.embed],
            components: exclusionMenu.components,
            ephemeral: true
        });
    }

    /**
     * Gère les boutons liés aux tickets
     */
    async handleTicketsButton(interaction) {
        const customId = interaction.customId;
        const TicketsMenu = require('../menus/ticketsMenu');

        if (customId === 'config_tickets_select_category') {
            const channelMenu = configHandler.createChannelSelectMenu(
                'config_tickets_category_select',
                'Sélectionner la catégorie des tickets',
                [ChannelType.GuildCategory]
            );
            await interaction.reply({
                content: 'Veuillez sélectionner la catégorie où seront créés les tickets :',
                components: [channelMenu],
                ephemeral: true
            });
        } else if (customId === 'config_tickets_select_support_role') {
            const roleMenu = configHandler.createRoleSelectMenu(
                'config_tickets_support_role_select',
                'Sélectionner le rôle support'
            );
            await interaction.reply({
                content: 'Veuillez sélectionner le rôle qui aura accès aux tickets :',
                components: [roleMenu],
                ephemeral: true
            });
        } else if (customId === 'config_tickets_select_logs_channel') {
            const channelMenu = configHandler.createChannelSelectMenu(
                'config_tickets_logs_channel_select',
                'Sélectionner le salon de logs',
                [ChannelType.GuildText]
            );
            await interaction.reply({
                content: 'Veuillez sélectionner le salon où seront loggées les actions des tickets :',
                components: [channelMenu],
                ephemeral: true
            });
        } else if (customId === 'config_tickets_setup_webhook') {
            await interaction.deferReply({ ephemeral: true });
            try {
                await TicketsMenu.handleWebhookSetup(interaction, configHandler.saveChanges.bind(configHandler));
                await interaction.editReply({
                    content: '✅ Webhook des tickets configuré avec succès !'
                });
                await this.updateCurrentView(interaction, 'tickets', true);
            } catch (error) {
                await interaction.editReply({
                    content: `❌ Erreur: ${error.message}`
                });
            }
        } else if (customId === 'config_tickets_test_system') {
            await interaction.reply({
                content: '🧪 Fonction de test à implémenter...',
                ephemeral: true
            });
        } else if (customId === 'config_tickets_create_embed') {
            await this.handleCreateEmbedButton(interaction);
        } else if (customId === 'config_tickets_manage_embeds') {
            await this.handleManageEmbedsButton(interaction);
        } else if (customId === 'config_tickets_reception_channels') {
            await this.handleReceptionChannelsButton(interaction);
        } else if (customId === 'config_tickets_add_reception_channel') {
            await this.handleAddReceptionChannelButton(interaction);
        } else if (customId === 'config_tickets_remove_reception_channel') {
            await this.handleRemoveReceptionChannelButton(interaction);
        } else if (customId === 'config_tickets_add_authorized_role') {
            await this.handleAddAuthorizedRoleButton(interaction);
        } else if (customId === 'config_tickets_remove_authorized_role') {
            await this.handleRemoveAuthorizedRoleButton(interaction);
        } else if (customId.startsWith('config_tickets_send_embed_')) {
            await this.handleSendEmbedButton(interaction);
        } else if (customId === 'config_tickets_configure_roles') {
            await this.handleConfigureRolesButton(interaction);
        } else if (customId === 'config_tickets_cancel_embed') {
            await this.handleCancelEmbedButton(interaction);
        }
    }

    /**
     * Gère la sélection de catégorie pour les tickets
     */
    async handleTicketsCategorySelect(interaction) {
        await interaction.deferUpdate();
        try {
            const TicketsMenu = require('../menus/ticketsMenu');
            await TicketsMenu.handleCategorySelect(interaction, configHandler.saveChanges.bind(configHandler));
            await interaction.editReply({
                content: '✅ Catégorie des tickets configurée avec succès !',
                components: []
            });
            await this.updateCurrentView(interaction, 'tickets', true);
        } catch (error) {
            await interaction.editReply({
                content: `❌ Erreur: ${error.message}`,
                components: []
            });
        }
    }

    /**
     * Gère la sélection du rôle support pour les tickets
     */
    async handleTicketsSupportRoleSelect(interaction) {
        await interaction.deferUpdate();
        try {
            const TicketsMenu = require('../menus/ticketsMenu');
            await TicketsMenu.handleSupportRoleSelect(interaction, configHandler.saveChanges.bind(configHandler));
            await interaction.editReply({
                content: '✅ Rôle support configuré avec succès !',
                components: []
            });
            await this.updateCurrentView(interaction, 'tickets', true);
        } catch (error) {
            await interaction.editReply({
                content: `❌ Erreur: ${error.message}`,
                components: []
            });
        }
    }

    /**
     * Gère la sélection du salon de logs pour les tickets
     */
    async handleTicketsLogsChannelSelect(interaction) {
        await interaction.deferUpdate();
        try {
            const TicketsMenu = require('../menus/ticketsMenu');
            await TicketsMenu.handleLogsChannelSelect(interaction, configHandler.saveChanges.bind(configHandler));
            await interaction.editReply({
                content: '✅ Salon de logs des tickets configuré avec succès !',
                components: []
            });
            await this.updateCurrentView(interaction, 'tickets', true);
        } catch (error) {
            await interaction.editReply({
                content: `❌ Erreur: ${error.message}`,
                components: []
            });
        }
    }

    /**
     * Gère le bouton de fermeture de la configuration
     */
    async handleCloseButton(interaction) {
        try {
            // Fermer la session
            configHandler.endSession(interaction.user.id);
            
            // Répondre avec message de confirmation
            await interaction.update({
                content: '✅ Configuration fermée. Utilisez `/config` pour rouvrir le panneau.',
                embeds: [],
                components: []
            });
        } catch (error) {
            console.error('[CONFIG] Erreur lors de la fermeture:', error);
            await interaction.reply({
                content: '❌ Erreur lors de la fermeture de la configuration.',
                ephemeral: true
            });
        }
    }

    /**
     * Gère le bouton d'aide de la configuration
     */
    async handleHelpButton(interaction) {
        const { EmbedBuilder } = require('discord.js');
        
        const helpEmbed = new EmbedBuilder()
            .setTitle('🆘 Aide - Configuration du Bot')
            .setDescription('**Guide d\'utilisation du panneau de configuration**')
            .setColor(0x5865F2)
            .addFields([
                {
                    name: '🎯 Navigation',
                    value: `• **Boutons catégories** - Accédez aux différents modules\n• **Bouton Retour** - Revenez au menu précédent\n• **Bouton Accueil** - Retournez au menu principal`,
                    inline: false
                },
                {
                    name: '⚙️ Configuration',
                    value: `• **Boutons verts** - Paramètre configuré et actif\n• **Boutons rouges** - Paramètre non configuré\n• **Boutons bleus** - Action de configuration`,
                    inline: false
                },
                {
                    name: '💾 Sauvegarde',
                    value: `• Les changements sont **automatiquement sauvegardés**\n• Pas besoin de bouton "Sauvegarder"\n• Les sauvegardes sont créées automatiquement`,
                    inline: false
                },
                {
                    name: '🔧 Modules disponibles',
                    value: `• **Général** - Préfixe, rôles admin/mod\n• **Logs** - Configuration des logs système\n• **Tickets** - Système de support\n• **Économie** - Système de points\n• **Et plus...**`,
                    inline: false
                },
                {
                    name: '❓ Problèmes',
                    value: `• Si un bouton ne répond pas, fermez et rouvrez \`/config\`\n• Les sessions expirent après 3 minutes d'inactivité\n• En cas d'erreur, vérifiez les permissions du bot`,
                    inline: false
                }
            ])
            .setFooter({ 
                text: 'Configuration › Aide | Tip: Utilisez les boutons pour naviguer',
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [helpEmbed],
            ephemeral: true
        });
    }

    /**
     * Gère le bouton de création d'embed de ticket
     */
    async handleCreateEmbedButton(interaction) {
        const TicketsMenu = require('../menus/ticketsMenu');
        const modal = TicketsMenu.createEmbedModal();
        await interaction.showModal(modal);
    }

    /**
     * Gère le modal de création d'embed de ticket
     */
    async handleTicketsEmbedModal(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const TicketsMenu = require('../menus/ticketsMenu');
            const embedData = await TicketsMenu.handleEmbedModal(interaction);
            
            // Créer une preview de l'embed
            const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            
            const previewEmbed = new EmbedBuilder()
                .setTitle(embedData.title)
                .setDescription(embedData.description)
                .setColor(embedData.color);

            const previewButton = new ButtonBuilder()
                .setCustomId('preview_ticket_button')
                .setLabel(embedData.buttonText)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true);

            const previewRow = new ActionRowBuilder().addComponents(previewButton);

            // Options pour l'utilisateur
            const actionRow = new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setCustomId(`config_tickets_send_embed_${Buffer.from(JSON.stringify(embedData)).toString('base64')}`)
                    .setLabel('📤 Envoyer dans les Salons')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('config_tickets_configure_roles')
                    .setLabel('🛡️ Configurer Rôles')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('config_tickets_cancel_embed')
                    .setLabel('❌ Annuler')
                    .setStyle(ButtonStyle.Secondary)
            ]);

            await interaction.editReply({
                content: '**📋 Aperçu de votre embed de ticket :**',
                embeds: [previewEmbed],
                components: [previewRow, actionRow]
            });

        } catch (error) {
            console.error('[CONFIG] Erreur création embed ticket:', error);
            await interaction.editReply({
                content: `❌ Erreur lors de la création de l'embed: ${error.message}`
            });
        }
    }

    /**
     * Gère le bouton de gestion des embeds
     */
    async handleManageEmbedsButton(interaction) {
        const TicketsMenu = require('../menus/ticketsMenu');
        const managementInterface = await TicketsMenu.createEmbedManagementInterface(interaction.guild);
        
        await interaction.reply({
            embeds: [managementInterface.embed],
            components: managementInterface.components,
            ephemeral: true
        });
    }

    /**
     * Gère le bouton de configuration des salons de réception
     */
    async handleReceptionChannelsButton(interaction) {
        const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
        const TicketsMenu = require('../menus/ticketsMenu');
        const channelsInterface = TicketsMenu.createReceptionChannelsInterface(config);
        
        await interaction.reply({
            embeds: [channelsInterface.embed],
            components: channelsInterface.components,
            ephemeral: true
        });
    }

    /**
     * Gère le bouton d'ajout de salon de réception
     */
    async handleAddReceptionChannelButton(interaction) {
        const channelMenu = configHandler.createChannelSelectMenu(
            'config_tickets_reception_channel_select',
            'Sélectionner un salon de réception',
            [ChannelType.GuildText]
        );
        
        await interaction.reply({
            content: 'Veuillez sélectionner le salon qui recevra les embeds de tickets :',
            components: [channelMenu],
            ephemeral: true
        });
    }

    /**
     * Gère le bouton de suppression de salon de réception
     */
    async handleRemoveReceptionChannelButton(interaction) {
        const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
        const receptionChannels = config.tickets?.receptionChannels || [];
        
        if (receptionChannels.length === 0) {
            return interaction.reply({
                content: '❌ Aucun salon de réception configuré.',
                ephemeral: true
            });
        }

        const { StringSelectMenuBuilder } = require('discord.js');
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('config_tickets_remove_reception_select')
            .setPlaceholder('Choisir le salon à retirer...')
            .addOptions(
                receptionChannels.map(channelId => ({
                    label: `#${interaction.guild.channels.cache.get(channelId)?.name || 'salon-supprimé'}`,
                    value: channelId,
                    description: `ID: ${channelId}`
                }))
            );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        
        await interaction.reply({
            content: 'Veuillez sélectionner le salon à retirer des salons de réception :',
            components: [selectRow],
            ephemeral: true
        });
    }

    /**
     * Gère le bouton d'ajout de rôle autorisé
     */
    async handleAddAuthorizedRoleButton(interaction) {
        const roleMenu = configHandler.createRoleSelectMenu(
            'config_tickets_authorized_role_select',
            'Sélectionner un rôle autorisé'
        );
        
        await interaction.reply({
            content: 'Veuillez sélectionner le rôle qui aura accès aux tickets :',
            components: [roleMenu],
            ephemeral: true
        });
    }

    /**
     * Gère le bouton de suppression de rôle autorisé
     */
    async handleRemoveAuthorizedRoleButton(interaction) {
        const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
        const authorizedRoles = config.tickets?.authorizedRoles || [];
        
        if (authorizedRoles.length === 0) {
            return interaction.reply({
                content: '❌ Aucun rôle autorisé configuré.',
                ephemeral: true
            });
        }

        const { StringSelectMenuBuilder } = require('discord.js');
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('config_tickets_remove_role_select')
            .setPlaceholder('Choisir le rôle à retirer...')
            .addOptions(
                authorizedRoles.map(roleId => ({
                    label: `@${interaction.guild.roles.cache.get(roleId)?.name || 'rôle-supprimé'}`,
                    value: roleId,
                    description: `ID: ${roleId}`
                }))
            );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        
        await interaction.reply({
            content: 'Veuillez sélectionner le rôle à retirer des rôles autorisés :',
            components: [selectRow],
            ephemeral: true
        });
    }

    /**
     * Gère la sélection d'un salon de réception pour les tickets
     */
    async handleTicketsReceptionChannelSelect(interaction) {
        await interaction.deferUpdate();
        try {
            const TicketsMenu = require('../menus/ticketsMenu');
            await TicketsMenu.handleAddReceptionChannel(interaction, configHandler.saveChanges.bind(configHandler));
            await interaction.editReply({
                content: '✅ Salon de réception ajouté avec succès !',
                components: []
            });
        } catch (error) {
            await interaction.editReply({
                content: `❌ Erreur: ${error.message}`,
                components: []
            });
        }
    }

    /**
     * Gère la sélection d'un rôle autorisé pour les tickets
     */
    async handleTicketsAuthorizedRoleSelect(interaction) {
        await interaction.deferUpdate();
        try {
            const selectedRole = interaction.roles.first();
            
            if (!selectedRole) {
                throw new Error('Aucun rôle sélectionné.');
            }

            if (selectedRole.id === interaction.guild.id) {
                throw new Error('Le rôle @everyone ne peut pas être utilisé.');
            }

            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            const ticketsConfig = config.tickets || {};
            const authorizedRoles = ticketsConfig.authorizedRoles || [];

            if (authorizedRoles.includes(selectedRole.id)) {
                throw new Error('Ce rôle est déjà autorisé.');
            }

            const newAuthorizedRoles = [...authorizedRoles, selectedRole.id];

            const changes = {
                tickets: {
                    ...ticketsConfig,
                    authorizedRoles: newAuthorizedRoles
                }
            };

            await configHandler.saveChanges(interaction.user.id, changes);
            await interaction.editReply({
                content: `✅ Rôle <@&${selectedRole.id}> ajouté aux rôles autorisés !`,
                components: []
            });
        } catch (error) {
            await interaction.editReply({
                content: `❌ Erreur: ${error.message}`,
                components: []
            });
        }
    }

    /**
     * Gère la suppression d'un salon de réception
     */
    async handleTicketsRemoveReceptionSelect(interaction, channelId) {
        await interaction.deferUpdate();
        try {
            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            const ticketsConfig = config.tickets || {};
            const receptionChannels = ticketsConfig.receptionChannels || [];

            const newReceptionChannels = receptionChannels.filter(id => id !== channelId);

            const changes = {
                tickets: {
                    ...ticketsConfig,
                    receptionChannels: newReceptionChannels
                }
            };

            await configHandler.saveChanges(interaction.user.id, changes);
            await interaction.editReply({
                content: `✅ Salon <#${channelId}> retiré des salons de réception !`,
                components: []
            });
        } catch (error) {
            await interaction.editReply({
                content: `❌ Erreur: ${error.message}`,
                components: []
            });
        }
    }

    /**
     * Gère la suppression d'un rôle autorisé
     */
    async handleTicketsRemoveRoleSelect(interaction, roleId) {
        await interaction.deferUpdate();
        try {
            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            const ticketsConfig = config.tickets || {};
            const authorizedRoles = ticketsConfig.authorizedRoles || [];

            const newAuthorizedRoles = authorizedRoles.filter(id => id !== roleId);

            const changes = {
                tickets: {
                    ...ticketsConfig,
                    authorizedRoles: newAuthorizedRoles
                }
            };

            await configHandler.saveChanges(interaction.user.id, changes);
            await interaction.editReply({
                content: `✅ Rôle <@&${roleId}> retiré des rôles autorisés !`,
                components: []
            });
        } catch (error) {
            await interaction.editReply({
                content: `❌ Erreur: ${error.message}`,
                components: []
            });
        }
    }

    /**
     * Gère l'envoi de l'embed dans les salons de réception
     */
    async handleSendEmbedButton(interaction) {
        await interaction.deferUpdate();
        
        try {
            // Décoder les données de l'embed depuis le customId
            const encodedData = interaction.customId.replace('config_tickets_send_embed_', '');
            const embedData = JSON.parse(Buffer.from(encodedData, 'base64').toString());
            
            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            const TicketsMenu = require('../menus/ticketsMenu');
            
            // Envoyer l'embed dans tous les salons de réception configurés
            const results = await TicketsMenu.sendEmbedToReceptionChannels(embedData, interaction.guild, config);
            
            // Créer le rapport d'envoi
            const report = TicketsMenu.formatSendReport(results);
            
            await interaction.editReply({
                content: report,
                embeds: [],
                components: []
            });
            
        } catch (error) {
            console.error('[CONFIG] Erreur envoi embed ticket:', error);
            await interaction.editReply({
                content: `❌ Erreur lors de l'envoi de l'embed: ${error.message}`,
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Gère le bouton de configuration des rôles autorisés
     */
    async handleConfigureRolesButton(interaction) {
        const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
        const TicketsMenu = require('../menus/ticketsMenu');
        const currentRoles = config.tickets?.authorizedRoles || [];
        
        const roleInterface = TicketsMenu.createRoleSelectionInterface(currentRoles);
        
        await interaction.update({
            content: '**🛡️ Configuration des rôles autorisés**',
            embeds: [roleInterface.embed],
            components: roleInterface.components
        });
    }

    /**
     * Gère l'annulation de la création d'embed
     */
    async handleCancelEmbedButton(interaction) {
        await interaction.update({
            content: '❌ **Création d\'embed annulée**\n\nVous pouvez créer un nouvel embed à tout moment via le menu de configuration des tickets.',
            embeds: [],
            components: []
        });
    }
}

module.exports = ConfigInteractionManager;
