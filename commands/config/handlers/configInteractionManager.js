const { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const configHandler = require('../configInteractionHandler');
const GeneralMenu = require('../menus/generalMenu');
const LoggingMenu = require('../menus/loggingMenu');
const EconomyMenu = require('../menus/economyMenu');
const EntryMenu = require('../menus/entryMenu');
const WebhookMenu = require('../menus/webhookMenu');

/**
 * @file commands/config/handlers/configInteractionManager.js
 * @description Gestionnaire principal pour toutes les interactions de configuration
 * Route les interactions vers les bons menus et gère les réponses
 */

class ConfigInteractionManager {
    // Protection contre les interactions en double
    static processingInteractions = new Set();

    /**
     * Traite une interaction de configuration
     * @param {import('discord.js').Interaction} interaction - L'interaction à traiter
     */
    static async handleInteraction(interaction) {
        // Protection contre les interactions en double
        const interactionKey = `${interaction.user.id}_${interaction.customId}_${interaction.id}`;
        if (this.processingInteractions.has(interactionKey)) {
            console.log(`[CONFIG] Interaction déjà en traitement: ${interaction.customId}`);
            return;
        }

        // Vérifier si l'interaction a déjà été traitée
        if (interaction.replied || interaction.deferred) {
            console.log(`[CONFIG] Interaction déjà traitée: ${interaction.customId}`);
            return;
        }

        this.processingInteractions.add(interactionKey);

        try {
            console.log(`[CONFIG] Interaction reçue: ${interaction.customId} par ${interaction.user.tag}`);

            // Vérifier si l'utilisateur a une session active
            const session = configHandler.getSession(interaction.user.id);
            if (!session) {
                console.log(`[CONFIG] Session manquante pour ${interaction.user.tag}`);
                return interaction.reply({
                    content: '❌ Aucune session de configuration active. Utilisez `/config` pour en démarrer une.',
                    ephemeral: true
                });
            }

            // Router l'interaction selon son type et ID
            if (interaction.isStringSelectMenu()) {
                await this.handleSelectMenu(interaction);
            } else if (interaction.isChannelSelectMenu()) {
                await this.handleChannelSelect(interaction);
            } else if (interaction.isRoleSelectMenu()) {
                await this.handleRoleSelect(interaction);
            } else if (interaction.isButton()) {
                await this.handleButton(interaction);
            } else if (interaction.isModalSubmit()) {
                await this.handleModal(interaction);
            }

            console.log(`[CONFIG] Interaction traitée avec succès: ${interaction.customId}`);

        } catch (error) {
            console.error(`[CONFIG] Erreur lors du traitement de ${interaction.customId}:`, error);

            const errorMessage = error.message || 'Une erreur inattendue est survenue.';

            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: `❌ ${errorMessage}`,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: `❌ ${errorMessage}`,
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error(`[CONFIG] Erreur de réponse pour ${interaction.customId}:`, replyError);
            }
        } finally {
            // Nettoyer la protection après 5 secondes
            setTimeout(() => {
                this.processingInteractions.delete(interactionKey);
            }, 5000);
        }
    }

    /**
     * Traite les menus de sélection
     * @param {import('discord.js').StringSelectMenuInteraction} interaction - L'interaction
     */
    static async handleSelectMenu(interaction) {
        const customId = interaction.customId;
        const value = interaction.values[0];

        switch (customId) {
            case 'config_category_select':
                await this.handleCategorySelect(interaction, value);
                break;
            
            case 'config_logging_exclusion_type':
                await this.handleExclusionTypeSelect(interaction, value);
                break;
            
            case 'config_entry_field_select_edit':
            case 'config_entry_field_select_remove':
            case 'config_entry_field_select_move_up':
            case 'config_entry_field_select_move_down':
                await this.handleFieldSelect(interaction, value);
                break;
            
            default:
                throw new Error('Menu de sélection non reconnu.');
        }
    }

    /**
     * Traite la sélection de catégorie
     * @param {import('discord.js').StringSelectMenuInteraction} interaction - L'interaction
     * @param {string} category - La catégorie sélectionnée
     */
    static async handleCategorySelect(interaction, category) {
        configHandler.updateNavigation(interaction.user.id, category, this.getCategoryDisplayName(category));
        
        const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
        let embed, components;

        switch (category) {
            case 'general':
                embed = GeneralMenu.createEmbed(config, interaction.guild);
                components = [
                    ...GeneralMenu.createComponents(),
                    configHandler.createControlButtons(interaction.user.id, true)
                ];
                break;

            case 'logging':
                embed = LoggingMenu.createEmbed(config, interaction.guild);
                components = [
                    ...LoggingMenu.createComponents(),
                    configHandler.createControlButtons(interaction.user.id, true)
                ];
                break;

            case 'economy':
                embed = EconomyMenu.createEmbed(config, interaction.guild);
                components = [
                    ...EconomyMenu.createComponents(config.economy),
                    configHandler.createControlButtons(interaction.user.id, true)
                ];
                break;

            case 'entry':
                embed = EntryMenu.createEmbed(config, interaction.guild);
                components = [
                    ...EntryMenu.createComponents(),
                    configHandler.createControlButtons(interaction.user.id, true)
                ];
                break;

            case 'games':
                try {
                    const GamesMenu = require('../menus/gamesMenu');
                    const gamesContent = await GamesMenu.show(interaction);
                    await interaction.update(gamesContent);
                    return; // Sortir directement car GamesMenu gère ses propres composants
                } catch (gamesError) {
                    console.error('[CONFIG] Erreur dans le menu des jeux:', gamesError);
                    // Fallback vers le menu "En développement"
                    const { EmbedBuilder } = require('discord.js');
                    embed = new EmbedBuilder()
                        .setTitle(`🚧 ${this.getCategoryDisplayName(category)} - Erreur`)
                        .setDescription(`Une erreur est survenue lors du chargement du menu des jeux.\n\nErreur: ${gamesError.message}\n\nPour l'instant, vous pouvez utiliser les commandes existantes :\n${this.getAlternativeCommands(category)}`)
                        .setColor('#E74C3C');
                    
                    components = [
                        configHandler.createControlButtons(interaction.user.id, true)
                    ];
                    break;
                }

            case 'confession':
                try {
                    const ConfessionMenu = require('../menus/confessionMenu');
                    const confessionContent = await ConfessionMenu.show(interaction);
                    await interaction.update(confessionContent);
                    return; // Sortir directement car ConfessionMenu gère ses propres composants
                } catch (confessionError) {
                    console.error('[CONFIG] Erreur dans le menu confession:', confessionError);
                    const { EmbedBuilder } = require('discord.js');
                    embed = new EmbedBuilder()
                        .setTitle(`🚧 ${this.getCategoryDisplayName(category)} - Erreur`)
                        .setDescription(`Une erreur est survenue lors du chargement du menu confession.\n\nErreur: ${confessionError.message}`)
                        .setColor('#E74C3C');
                    
                    components = [
                        configHandler.createControlButtons(interaction.user.id, true)
                    ];
                    break;
                }

            case 'levels':
            case 'tickets':
            case 'modmail':
                const { EmbedBuilder } = require('discord.js');
                embed = new EmbedBuilder()
                    .setTitle(`🚧 ${this.getCategoryDisplayName(category)} - En Développement`)
                    .setDescription(`Cette section est actuellement en cours de développement.\n\nPour l'instant, vous pouvez utiliser les commandes existantes :\n${this.getAlternativeCommands(category)}`)
                    .setColor('#FFA500');
                
                components = [
                    configHandler.createControlButtons(interaction.user.id, true)
                ];
                break;

            default:
                throw new Error('Catégorie non implémentée.');
        }

        await interaction.update({
            embeds: [embed],
            components: components
        });
    }

    /**
     * Traite les sélections de salons
     * @param {import('discord.js').ChannelSelectMenuInteraction} interaction - L'interaction
     */
    static async handleChannelSelect(interaction) {
        const customId = interaction.customId;
        
        try {
            // Déférer la réponse pour éviter les timeouts
            await interaction.deferUpdate();
            
            // Déterminer le type de canal et la catégorie
            if (customId.startsWith('config_general_')) {
                // Pas de sélection de canal pour général actuellement
                throw new Error('Sélection de canal non supportée pour la catégorie générale.');
                
            } else if (customId.startsWith('config_logging_')) {
                const logType = this.extractLogType(customId);
                const changes = LoggingMenu.handleLogChannelSelect(
                    interaction, 
                    logType, 
                    configHandler.saveChanges.bind(configHandler)
                );
                
                // Afficher une confirmation avec plus de détails
                const selectedChannel = interaction.channels.first();
                await interaction.editReply({
                    content: `✅ **Canal de logs mis à jour !**\n\n🔧 **Type :** ${this.getLogTypeDisplayName(logType)}\n📍 **Canal :** ${selectedChannel}\n\n💡 *Vous pouvez fermer ce message et retourner à la configuration principale.*`,
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('config_close_channel_select')
                                .setLabel('✅ Fermer')
                                .setStyle(ButtonStyle.Success)
                        )
                    ]
                });
                
            } else if (customId.startsWith('config_entry_')) {
                const channelType = this.extractChannelType(customId);
                EntryMenu.handleChannelSelect(
                    interaction, 
                    channelType, 
                    configHandler.saveChanges.bind(configHandler)
                );
                
                await interaction.followUp({
                    content: `✅ Canal mis à jour !`,
                    ephemeral: true
                });
                
                // Fermer le menu de sélection
                await interaction.deleteReply();
            }
        } catch (error) {
            console.error('[CONFIG] Erreur lors de la sélection de canal:', error);
            if (!interaction.replied) {
                await interaction.followUp({
                    content: `❌ ${error.message}`,
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Traite les sélections de rôles
     * @param {import('discord.js').RoleSelectMenuInteraction} interaction - L'interaction
     */
    static async handleRoleSelect(interaction) {
        const customId = interaction.customId;
        
        try {
            // Déférer la réponse pour éviter les timeouts
            await interaction.deferUpdate();
            
            if (customId.startsWith('config_general_')) {
                if (customId.includes('admin_role')) {
                    GeneralMenu.handleAdminRoleSelect(
                        interaction, 
                        configHandler.saveChanges.bind(configHandler)
                    );
                } else if (customId.includes('mod_role')) {
                    GeneralMenu.handleModRoleSelect(
                        interaction, 
                        configHandler.saveChanges.bind(configHandler)
                    );
                }
                
                await interaction.followUp({
                    content: `✅ Rôle mis à jour !`,
                    ephemeral: true
                });
                
                // Fermer le menu de sélection
                await interaction.deleteReply();
                
            } else if (customId.startsWith('config_entry_')) {
                EntryMenu.handleRoleSelect(
                    interaction, 
                    configHandler.saveChanges.bind(configHandler)
                );
                
                await interaction.followUp({
                    content: `✅ Rôle mis à jour !`,
                    ephemeral: true
                });
                
                // Fermer le menu de sélection
                await interaction.deleteReply();
                
            } else if (customId === 'games_forbidden_roles_select') {
                const GamesMenu = require('../menus/gamesMenu');
                await GamesMenu.handleForbiddenRolesSelect(
                    interaction,
                    configHandler.saveChanges.bind(configHandler)
                );
            } else if (customId === 'confession_channel_select') {
                const ConfessionMenu = require('../menus/confessionMenu');
                await ConfessionMenu.handleChannelSelect(
                    interaction,
                    configHandler.saveChanges.bind(configHandler)
                );
                
                // Fermer le menu de sélection
                await interaction.deleteReply();
            } else if (customId === 'confession_logs_channel_select') {
                const ConfessionMenu = require('../menus/confessionMenu');
                await ConfessionMenu.handleLogsChannelSelect(
                    interaction,
                    configHandler.saveChanges.bind(configHandler)
                );
                
                // Fermer le menu de sélection
                await interaction.deleteReply();
            } else if (customId === 'games_quiz_channel_select') {
                // Gestionnaire pour la sélection du salon du quiz
                const selectedChannels = interaction.values;
                if (selectedChannels && selectedChannels.length > 0) {
                    const channelId = selectedChannels[0];
                    
                    // Sauvegarder le salon sélectionné
                    await configHandler.saveChanges(interaction.user.id, {
                        games: {
                            gameChannel: channelId
                        }
                    });
                    
                    // Retourner aux paramètres du quiz
                    const GamesMenu = require('../menus/gamesMenu');
                    await GamesMenu.showQuizSettings(interaction);
                }
            }
        } catch (error) {
            console.error('[CONFIG] Erreur lors de la sélection de rôle:', error);
            if (!interaction.replied) {
                await interaction.followUp({
                    content: `❌ ${error.message}`,
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Traite les boutons
     * @param {import('discord.js').ButtonInteraction} interaction - L'interaction
     */
    static async handleButton(interaction) {
        const customId = interaction.customId;

        // Boutons de contrôle généraux
        if (customId === 'config_back') {
            await this.handleBackButton(interaction);
        } else if (customId === 'config_home') {
            await this.handleHomeButton(interaction);
        } else if (customId === 'config_help') {
            await this.handleHelpButton(interaction);
        } else if (customId === 'config_save') {
            await this.handleSaveButton(interaction);
        } else if (customId === 'config_cancel') {
            await this.handleCancelButton(interaction);
        } else if (customId === 'config_close') {
            await this.handleCloseButton(interaction);
        } else if (customId === 'config_close_channel_select') {
            // Fermer le message de confirmation de sélection de canal
            await interaction.update({
                content: '✅ Canal configuré avec succès !',
                components: []
            });
        }
        
        // Boutons de catégorie modernes
        else if (customId.startsWith('config_category_')) {
            const category = customId.replace('config_category_', '');
            await this.handleCategorySelect(interaction, category);
        }
        
        // Boutons spécifiques aux catégories
        else if (customId.startsWith('config_general_')) {
            await this.handleGeneralButton(interaction);
        } else if (customId.startsWith('config_logging_')) {
            await this.handleLoggingButton(interaction);
        } else if (customId.startsWith('config_economy_')) {
            await this.handleEconomyButton(interaction);
        } else if (customId.startsWith('config_entry_')) {
            await this.handleEntryButton(interaction);
        } else if (customId.startsWith('config_webhook_')) {
            await this.handleWebhookButton(interaction);
        } else if (customId.startsWith('games_')) {
            await this.handleGamesButton(interaction);
        } else if (customId.startsWith('confession_')) {
            await this.handleConfessionButton(interaction);
        }
        
        else {
            throw new Error('Bouton non reconnu.');
        }
    }

    /**
     * Traite les modals
     * @param {import('discord.js').ModalSubmitInteraction} interaction - L'interaction
     */
    static async handleModal(interaction) {
        const customId = interaction.customId;

        try {
            if (customId.startsWith('config_general_')) {
                await this.handleGeneralModal(interaction);
            } else if (customId.startsWith('config_economy_')) {
                await this.handleEconomyModal(interaction);
            } else if (customId.startsWith('config_entry_')) {
                await this.handleEntryModal(interaction);
            } else if (customId.startsWith('games_quiz_')) {
                await this.handleGamesQuizModal(interaction);
            } else {
                throw new Error('Modal non reconnu.');
            }
        } catch (error) {
            // Si l'interaction n'a pas encore reçu de réponse, répondre avec l'erreur
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `❌ ${error.message || 'Une erreur est survenue'}`,
                    ephemeral: true
                });
            }
            throw error; // Re-throw pour la gestion d'erreur globale
        }
    }

    /**
     * Traite les boutons généraux
     * @param {import('discord.js').ButtonInteraction} interaction - L'interaction
     */
    static async handleGeneralButton(interaction) {
        const customId = interaction.customId;

        if (customId === 'config_general_edit_prefix') {
            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            const modal = GeneralMenu.createPrefixModal(config.general?.prefix);
            await interaction.showModal(modal);
            
        } else if (customId === 'config_general_select_admin_role') {
            const roleMenu = configHandler.createRoleSelectMenu(
                'config_general_admin_role', 
                'Sélectionnez le rôle administrateur'
            );
            await interaction.reply({
                content: '**Sélection du rôle administrateur**\nChoisissez le rôle qui aura les permissions d\'administrateur sur le bot.',
                components: [roleMenu],
                ephemeral: true
            });
            
        } else if (customId === 'config_general_select_mod_role') {
            const roleMenu = configHandler.createRoleSelectMenu(
                'config_general_mod_role', 
                'Sélectionnez le rôle modérateur'
            );
            await interaction.reply({
                content: '**Sélection du rôle modérateur**\nChoisissez le rôle qui aura les permissions de modération sur le bot.',
                components: [roleMenu],
                ephemeral: true
            });
        }
    }

    /**
     * Traite les boutons de logging
     * @param {import('discord.js').ButtonInteraction} interaction - L'interaction
     */
    static async handleLoggingButton(interaction) {
        const customId = interaction.customId;

        if (customId.includes('select_')) {
            const logType = this.extractLogType(customId);
            const channelMenu = configHandler.createChannelSelectMenu(
                `config_logging_${logType}`,
                `Sélectionnez le salon pour ${this.getLogTypeDisplayName(logType)}`,
                [ChannelType.GuildText]
            );
            
            await interaction.reply({
                content: `**Configuration des ${this.getLogTypeDisplayName(logType)}**\nSélectionnez le salon où seront envoyés ces logs.`,
                components: [channelMenu],
                ephemeral: true
            });
            
        } else if (customId === 'config_logging_manage_exclusions') {
            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            const { embed, components } = LoggingMenu.createExclusionMenu(config.logging || {});
            
            await interaction.reply({
                embeds: [embed],
                components: [...components, configHandler.createControlButtons(interaction.user.id, true)],
                ephemeral: true
            });
        } else if (customId === 'config_logging_webhook_setup') {
            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            const embed = WebhookMenu.createEmbed(config, interaction.guild);
            const components = WebhookMenu.createComponents(config.logging || {});
            
            await interaction.reply({
                embeds: [embed],
                components: [...components, configHandler.createControlButtons(interaction.user.id, true)],
                ephemeral: true
            });
        }
    }

    /**
     * Traite les boutons d'économie
     * @param {import('discord.js').ButtonInteraction} interaction - L'interaction
     */
    static async handleEconomyButton(interaction) {
        const customId = interaction.customId;
        
        if (customId.includes('toggle_')) {
            const field = this.extractEconomyField(customId);
            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            
            EconomyMenu.handleToggle(
                field, 
                config, 
                configHandler.saveChanges.bind(configHandler),
                interaction.user.id
            );
            
            await this.updateCurrentView(interaction, 'economy');
            
        } else if (customId.includes('settings')) {
            await this.handleEconomySettingsButton(interaction);
            
        } else if (customId.includes('edit_')) {
            await this.handleEconomyEditButton(interaction);
        }
    }

    /**
     * Traite les boutons d'entrée
     * @param {import('discord.js').ButtonInteraction} interaction - L'interaction
     */
    static async handleEntryButton(interaction) {
        const customId = interaction.customId;

        if (customId.includes('select_')) {
            await this.handleEntrySelectButton(interaction);
        } else if (customId.includes('modal')) {
            await this.handleEntryModalButton(interaction);
        }
    }

    /**
     * Met à jour la vue actuelle
     * @param {import('discord.js').Interaction} interaction - L'interaction
     * @param {string} category - La catégorie actuelle
     * @param {boolean} useEditReply - Si true, utilise editReply au lieu de update
     */
    static async updateCurrentView(interaction, category, useEditReply = false) {
        const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
        let embed, components;

        switch (category) {
            case 'general':
                embed = GeneralMenu.createEmbed(config, interaction.guild);
                components = [
                    ...GeneralMenu.createComponents(),
                    configHandler.createControlButtons(interaction.user.id, true)
                ];
                break;

            case 'logging':
                embed = LoggingMenu.createEmbed(config, interaction.guild);
                components = [
                    ...LoggingMenu.createComponents(),
                    configHandler.createControlButtons(interaction.user.id, true)
                ];
                break;

            case 'economy':
                embed = EconomyMenu.createEmbed(config, interaction.guild);
                components = [
                    ...EconomyMenu.createComponents(config.economy),
                    configHandler.createControlButtons(interaction.user.id, true)
                ];
                break;

            case 'entry':
                embed = EntryMenu.createEmbed(config, interaction.guild);
                components = [
                    ...EntryMenu.createComponents(),
                    configHandler.createControlButtons(interaction.user.id, true)
                ];
                break;

            case 'games':
                // Pour les jeux, on doit utiliser la méthode show qui est async
                try {
                    const GamesMenu = require('../menus/gamesMenu');
                    const gamesContent = await GamesMenu.show(interaction);
                    if (useEditReply || interaction.deferred || interaction.replied) {
                        await interaction.editReply(gamesContent);
                    } else {
                        await interaction.update(gamesContent);
                    }
                    return; // Sortir car on a déjà mis à jour
                } catch (error) {
                    console.error('[CONFIG] Erreur lors de la mise à jour de la vue games:', error);
                    // Fallback
                    const { EmbedBuilder } = require('discord.js');
                    embed = new EmbedBuilder()
                        .setTitle('🎮 Jeux - Erreur')
                        .setDescription('Une erreur est survenue lors du chargement du menu.')
                        .setColor('#E74C3C');
                    components = [
                        configHandler.createControlButtons(interaction.user.id, true)
                    ];
                }
                break;

            case 'levels':
            case 'tickets':
            case 'modmail':
                const { EmbedBuilder } = require('discord.js');
                embed = new EmbedBuilder()
                    .setTitle(`🚧 ${this.getCategoryDisplayName(category)} - En Développement`)
                    .setDescription(`Cette section est actuellement en cours de développement.\n\nPour l'instant, vous pouvez utiliser les commandes existantes :\n${this.getAlternativeCommands(category)}`)
                    .setColor('#FFA500');
                
                components = [
                    configHandler.createControlButtons(interaction.user.id, true)
                ];
                break;
                
            default:
                // Retour à la vue principale si catégorie inconnue
                embed = configHandler.createMainConfigEmbed(interaction.user.id, interaction.guild);
                const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
                const categoryButtons = configHandler.createCategoryButtons(interaction.user.id, config);
                components = [
                    ...categoryButtons,
                    configHandler.createControlButtons(interaction.user.id)
                ];
                break;
        }

        const payload = {
            embeds: [embed],
            components: components
        };

        if (useEditReply || interaction.deferred || interaction.replied) {
            await interaction.editReply(payload);
        } else {
            await interaction.update(payload);
        }
    }

    /**
     * Traite le bouton retour
     * @param {import('discord.js').ButtonInteraction} interaction - L'interaction
     */
    static async handleBackButton(interaction) {
        configHandler.navigateBack(interaction.user.id);
        
        const session = configHandler.getSession(interaction.user.id);
        if (session.currentCategory === 'main') {
            const embed = configHandler.createMainConfigEmbed(interaction.user.id, interaction.guild);
            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            const categoryButtons = configHandler.createCategoryButtons(interaction.user.id, config);
            const controlButtons = configHandler.createControlButtons(interaction.user.id);

            await interaction.update({
                embeds: [embed],
                components: [...categoryButtons, controlButtons]
            });
        } else {
            await this.updateCurrentView(interaction, session.currentCategory);
        }
    }

    /**
     * Traite le bouton accueil
     * @param {import('discord.js').ButtonInteraction} interaction - L'interaction
     */
    static async handleHomeButton(interaction) {
        // Réinitialiser la navigation à l'accueil
        configHandler.updateNavigation(interaction.user.id, 'main', 'Configuration');
        
        const embed = configHandler.createMainConfigEmbed(interaction.user.id, interaction.guild);
        const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
        const categoryButtons = configHandler.createCategoryButtons(interaction.user.id, config);
        const controlButtons = configHandler.createControlButtons(interaction.user.id);

        await interaction.update({
            embeds: [embed],
            components: [...categoryButtons, controlButtons]
        });
    }

    /**
     * Traite le bouton aide
     * @param {import('discord.js').ButtonInteraction} interaction - L'interaction
     */
    static async handleHelpButton(interaction) {
        const { EmbedBuilder } = require('discord.js');
        
        const helpEmbed = new EmbedBuilder()
            .setTitle('❓ Aide - Configuration du Bot')
            .setDescription(
                '**Guide d\'utilisation du panneau de configuration**\n\n' +
                '🟢 **Vert** : Section entièrement configurée\n' +
                '🟡 **Jaune** : Section partiellement configurée\n' +
                '🔴 **Rouge** : Section non configurée\n\n' +
                '**Navigation :**\n' +
                '• Cliquez sur les boutons colorés pour accéder aux sections\n' +
                '• Utilisez "Retour" pour revenir en arrière\n' +
                '• Utilisez "Accueil" pour retourner au menu principal\n\n' +
                '**Modifications :**\n' +
                '• Vos changements sont temporaires jusqu\'à la sauvegarde\n' +
                '• Cliquez "Sauvegarder" pour appliquer définitivement\n' +
                '• Cliquez "Annuler" pour supprimer les modifications\n\n' +
                '**Conseils :**\n' +
                '• Configurez d\'abord les sections "Général" et "Entrée"\n' +
                '• Les logs sont optionnels mais recommandés\n' +
                '• L\'économie et les jeux peuvent être activés selon vos besoins'
            )
            .setColor(0x3498DB)
            .setFooter({ 
                text: 'Utilisez les boutons ci-dessous pour continuer la configuration',
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [helpEmbed],
            ephemeral: true
        });
    }

    /**
     * Traite le bouton de sauvegarde
     * @param {import('discord.js').ButtonInteraction} interaction - L'interaction
     */
    static async handleSaveButton(interaction) {
        await interaction.reply({
            content: '✅ **Sauvegarde automatique activée !**\n\n💾 Tous vos changements sont désormais sauvegardés immédiatement. Plus besoin de bouton de sauvegarde !',
            ephemeral: true
        });
    }

    /**
     * Traite le bouton d'annulation
     * @param {import('discord.js').ButtonInteraction} interaction - L'interaction
     */
    static async handleCancelButton(interaction) {
        await interaction.reply({
            content: '✅ **Sauvegarde automatique activée !**\n\n🔄 Les changements sont maintenant sauvegardés immédiatement, il n\'y a plus rien à annuler !',
            ephemeral: true
        });
    }

    /**
     * Traite le bouton de fermeture
     * @param {import('discord.js').ButtonInteraction} interaction - L'interaction
     */
    static async handleCloseButton(interaction) {
        configHandler.endSession(interaction.user.id);
        await interaction.update({
            content: '✅ Session de configuration fermée.',
            embeds: [],
            components: []
        });
    }

    // Méthodes utilitaires

    static getCategoryDisplayName(category) {
        const names = {
            'general': 'Général',
            'entry': 'Entrée',
            'logging': 'Logs',
            'economy': 'Économie',
            'levels': 'Niveaux',
            'games': 'Jeux',
            'tickets': 'Tickets',
            'modmail': 'Modmail',
            'confession': 'Confession'
        };
        return names[category] || category;
    }

    static getAlternativeCommands(category) {
        const commands = {
            'levels': '• `/levels` - Gérer les niveaux des utilisateurs\n• `/rank` - Voir son rang\n• `/leaderboard` - Classement',
            'games': '• `/kinky` - Jeux NSFW\n• `/quiz-kinky` - Quiz NSFW\n• `/pendu` - Jeu du pendu\n• `/pile-ou-face` - Pile ou face\n• `/black-jack` - Blackjack',
            'tickets': '• `/embed-ticket` - Créer un embed de ticket\n• Configuration manuelle via les embeds',
            'modmail': '• Système modmail intégré\n• `/modmail-close` - Fermer un modmail'
        };
        return commands[category] || 'Aucune alternative disponible pour le moment.';
    }

    static extractLogType(customId) {
        // Extraire la partie après 'config_logging_'
        if (customId.startsWith('config_logging_')) {
            const logType = customId.replace('config_logging_', '');
            
            // Correspondances directes
            if (logType === 'modLogs') return 'modLogs';
            if (logType === 'messageLogs') return 'messageLogs';
            if (logType === 'voiceLogs') return 'voiceLogs';
            if (logType === 'memberLogs') return 'memberLogs';
            if (logType === 'roleLogChannelId') return 'roleLogChannelId';
            
            // Patterns alternatifs pour compatibilité
            if (logType.includes('mod_logs') || logType === 'moderation') return 'modLogs';
            if (logType.includes('message_logs') || logType === 'messages') return 'messageLogs';
            if (logType.includes('voice_logs') || logType === 'voice') return 'voiceLogs';
            if (logType.includes('member_logs') || logType === 'members') return 'memberLogs';
            if (logType.includes('role_logs') || logType === 'roles') return 'roleLogChannelId';
        }
        
        console.error(`[ConfigInteractionManager] Type de log non reconnu dans customId: ${customId}`);
        throw new Error(`Type de log non reconnu: ${customId}`);
    }

    static getLogTypeDisplayName(logType) {
        const names = {
            'modLogs': 'logs de modération',
            'messageLogs': 'logs de messages',
            'voiceLogs': 'logs vocaux',
            'memberLogs': 'logs de membres',
            'roleLogChannelId': 'logs de rôles'
        };
        return names[logType] || logType;
    }

    static extractChannelType(customId) {
        if (customId.includes('welcome_channel')) return 'welcomeChannel';
        if (customId.includes('rules_channel')) return 'rulesChannel';
        if (customId.includes('request_channel')) return 'entryRequestChannelId';
        if (customId.includes('entry_category')) return 'acceptedEntryCategoryId';
        return null;
    }

    static extractEconomyField(customId) {
        if (customId.includes('toggle_main')) return 'enabled';
        if (customId.includes('toggle_voice')) return 'voiceActivity.enabled';
        if (customId.includes('toggle_messages')) return 'messageActivity.enabled';
        return null;
    }

    /**
     * Actualise la vue de gestion des champs si elle est ouverte
     * @param {string} userId - ID de l'utilisateur
     */
    static async refreshFieldManagementView(userId) {
        try {
            const session = configHandler.getSession(userId);
            if (!session || !session.lastInteraction) {
                return;
            }

            // Vérifier si l'utilisateur est dans la vue de gestion des champs
            const lastMessage = session.lastInteraction;
            if (lastMessage && lastMessage.embeds && lastMessage.embeds[0] &&
                lastMessage.embeds[0].title && lastMessage.embeds[0].title.includes('Gestion des Champs')) {

                console.log(`[CONFIG] Actualisation de la vue de gestion des champs pour ${userId}`);

                const config = configHandler.getCurrentConfigWithPending(userId);
                const { embed, components } = EntryMenu.createFieldManagementEmbed(config.entryModal || {});

                await lastMessage.edit({
                    embeds: [embed],
                    components: [...components, configHandler.createControlButtons(userId, true)]
                });
            }
        } catch (error) {
            console.error('[CONFIG] Erreur lors de l\'actualisation de la vue de gestion des champs:', error);
        }
    }

    // Gestion des modals (à implémenter selon les besoins)
    static async handleGeneralModal(interaction) {
        if (interaction.customId === 'config_general_prefix_modal') {
            try {
                GeneralMenu.handlePrefixModal(
                    interaction, 
                    configHandler.saveChanges.bind(configHandler)
                );
                
                await interaction.reply({
                    content: '✅ Préfixe mis à jour !',
                    ephemeral: true
                });
                
                // Mettre à jour la vue après un court délai
                setTimeout(async () => {
                    try {
                        await this.updateCurrentView(interaction, 'general', true);
                    } catch (error) {
                        console.error('[CONFIG] Erreur lors de la mise à jour de la vue:', error);
                    }
                }, 100);
            } catch (error) {
                // L'erreur sera gérée par handleModal
                throw error;
            }
        }
    }

    static async handleEconomyModal(interaction) {
        // À implémenter selon les modals d'économie
        await interaction.reply({
            content: '✅ Paramètre économique mis à jour !',
            ephemeral: true
        });
    }

    static async handleEntryModal(interaction) {
        const customId = interaction.customId;

        if (customId === 'config_entry_title_modal') {
            EntryMenu.handleTitleModal(
                interaction,
                configHandler.saveChanges.bind(configHandler)
            );
            
            await interaction.reply({
                content: '✅ Titre du formulaire mis à jour !',
                ephemeral: true
            });
            
        } else if (customId === 'config_entry_add_field_modal') {
            console.log(`[CONFIG] Ajout d'un nouveau champ par ${interaction.user.tag}`);

            try {
                EntryMenu.handleFieldModal(
                    interaction,
                    false, // isEdit = false
                    null, // fieldIndex = null
                    configHandler.saveChanges.bind(configHandler)
                );

                await interaction.reply({
                    content: '✅ Champ ajouté au formulaire avec succès !',
                    ephemeral: true
                });

                // Actualiser la vue de gestion des champs si elle est ouverte
                setTimeout(async () => {
                    try {
                        await this.refreshFieldManagementView(interaction.user.id);
                    } catch (error) {
                        console.error('[CONFIG] Erreur lors de l\'actualisation de la vue:', error);
                    }
                }, 500);

            } catch (error) {
                console.error(`[CONFIG] Erreur lors de l'ajout du champ:`, error);
                throw error;
            }

        } else if (customId.startsWith('config_entry_edit_field_modal_')) {
            const fieldIndex = parseInt(customId.split('_').pop());
            console.log(`[CONFIG] Modification du champ ${fieldIndex} par ${interaction.user.tag}`);

            try {
                EntryMenu.handleFieldModal(
                    interaction,
                    true, // isEdit = true
                    fieldIndex,
                    configHandler.saveChanges.bind(configHandler)
                );

                await interaction.reply({
                    content: '✅ Champ modifié avec succès !',
                    ephemeral: true
                });

                // Actualiser la vue de gestion des champs si elle est ouverte
                setTimeout(async () => {
                    try {
                        await this.refreshFieldManagementView(interaction.user.id);
                    } catch (error) {
                        console.error('[CONFIG] Erreur lors de l\'actualisation de la vue:', error);
                    }
                }, 500);

            } catch (error) {
                console.error(`[CONFIG] Erreur lors de la modification du champ:`, error);
                throw error;
            }
            
        } else if (customId === 'config_entry_preview_modal_display') {
            // Modal de prévisualisation - ne rien faire, juste confirmer la réception
            await interaction.reply({
                content: '👁️ Ceci était un aperçu du formulaire. Il n\'est pas fonctionnel dans ce contexte.',
                ephemeral: true
            });
            
        } else {
            throw new Error('Modal d\'entrée non reconnu.');
        }
    }

    // Méthodes pour les sous-boutons (à implémenter)
    static async handleEconomySettingsButton(interaction) {
        // À implémenter
    }

    static async handleEconomyEditButton(interaction) {
        // À implémenter
    }

    static async handleEntrySelectButton(interaction) {
        const customId = interaction.customId;
        const { ChannelType } = require('discord.js');

        if (customId === 'config_entry_select_welcome_channel') {
            const channelMenu = configHandler.createChannelSelectMenu(
                'config_entry_welcome_channel',
                'Sélectionnez le salon d\'accueil',
                [ChannelType.GuildText]
            );
            
            await interaction.reply({
                content: '**📌 Sélection du salon d\'accueil**\nChoisissez le salon où seront envoyés les messages d\'accueil.',
                components: [channelMenu],
                ephemeral: true
            });
            
        } else if (customId === 'config_entry_select_rules_channel') {
            const channelMenu = configHandler.createChannelSelectMenu(
                'config_entry_rules_channel',
                'Sélectionnez le salon des règles',
                [ChannelType.GuildText]
            );
            
            await interaction.reply({
                content: '**📋 Sélection du salon des règles**\nChoisissez le salon où sont affichées les règles du serveur.',
                components: [channelMenu],
                ephemeral: true
            });
            
        } else if (customId === 'config_entry_select_request_channel') {
            const channelMenu = configHandler.createChannelSelectMenu(
                'config_entry_request_channel',
                'Sélectionnez le salon des demandes d\'accès',
                [ChannelType.GuildText]
            );
            
            await interaction.reply({
                content: '**📨 Sélection du salon des demandes d\'accès**\nChoisissez le salon où seront envoyées les demandes d\'accès des nouveaux membres.',
                components: [channelMenu],
                ephemeral: true
            });
            
        } else if (customId === 'config_entry_select_verification_role') {
            const roleMenu = configHandler.createRoleSelectMenu(
                'config_entry_verification_role',
                'Sélectionnez le rôle de vérification'
            );
            
            await interaction.reply({
                content: '**✅ Sélection du rôle de vérification**\nChoisissez le rôle qui sera attribué aux membres après vérification.',
                components: [roleMenu],
                ephemeral: true
            });
            
        } else if (customId === 'config_entry_select_entry_category') {
            const channelMenu = configHandler.createChannelSelectMenu(
                'config_entry_entry_category',
                'Sélectionnez la catégorie pour les canaux d\'entrée',
                [ChannelType.GuildCategory]
            );
            
            await interaction.reply({
                content: '**📁 Sélection de la catégorie d\'entrée**\nChoisissez la catégorie où seront créés les canaux d\'entrée après acceptation des demandes.',
                components: [channelMenu],
                ephemeral: true
            });
            
        } else {
            throw new Error('Bouton de sélection d\'entrée non reconnu.');
        }
    }

    static async handleEntryModalButton(interaction) {
        const customId = interaction.customId;

        if (customId === 'config_entry_edit_modal_title') {
            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            const currentTitle = config.entryModal?.title || '';
            const modal = EntryMenu.createTitleModal(currentTitle);
            
            await interaction.showModal(modal);
            
        } else if (customId === 'config_entry_manage_modal_fields') {
            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            const { embed, components } = EntryMenu.createFieldManagementEmbed(config.entryModal || {});
            
            await interaction.reply({
                embeds: [embed],
                components: [...components, configHandler.createControlButtons(interaction.user.id, true)],
                ephemeral: true
            });
            
        } else if (customId === 'config_entry_preview_modal') {
            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            const modalConfig = config.entryModal || {};
            
            if (!modalConfig.title || !modalConfig.fields || modalConfig.fields.length === 0) {
                await interaction.reply({
                    content: '❌ Le formulaire n\'est pas configuré. Ajoutez un titre et au moins un champ.',
                    ephemeral: true
                });
                return;
            }
            
            // Créer un modal de prévisualisation (non fonctionnel, juste pour montrer le rendu)
            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
            const previewModal = new ModalBuilder()
                .setCustomId('config_entry_preview_modal_display')
                .setTitle(modalConfig.title);
            
            modalConfig.fields.slice(0, 5).forEach(field => {
                const input = new TextInputBuilder()
                    .setCustomId(field.customId)
                    .setLabel(field.label)
                    .setStyle(field.style === 'Short' ? TextInputStyle.Short : TextInputStyle.Paragraph)
                    .setRequired(field.required);
                
                if (field.placeholder) {
                    input.setPlaceholder(field.placeholder);
                }
                
                previewModal.addComponents(
                    new ActionRowBuilder().addComponents(input)
                );
            });
            
            await interaction.showModal(previewModal);
            
        } else if (customId === 'config_entry_add_field') {
            const modal = EntryMenu.createFieldModal();
            await interaction.showModal(modal);
            
        } else if (customId === 'config_entry_edit_field') {
            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            const fields = config.entryModal?.fields || [];
            
            if (fields.length === 0) {
                await interaction.reply({
                    content: '❌ Aucun champ à modifier.',
                    ephemeral: true
                });
                return;
            }
            
            const selectMenu = EntryMenu.createFieldSelectMenu(fields, 'edit');
            await interaction.reply({
                content: '**✏️ Modifier un champ**\nSélectionnez le champ à modifier :',
                components: [selectMenu],
                ephemeral: true
            });
            
        } else if (customId === 'config_entry_remove_field') {
            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            const fields = config.entryModal?.fields || [];
            
            if (fields.length === 0) {
                await interaction.reply({
                    content: '❌ Aucun champ à supprimer.',
                    ephemeral: true
                });
                return;
            }
            
            const selectMenu = EntryMenu.createFieldSelectMenu(fields, 'remove');
            await interaction.reply({
                content: '**🗑️ Supprimer un champ**\nSélectionnez le champ à supprimer :',
                components: [selectMenu],
                ephemeral: true
            });
            
        } else if (customId === 'config_entry_move_field_up') {
            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            const fields = config.entryModal?.fields || [];
            
            if (fields.length <= 1) {
                await interaction.reply({
                    content: '❌ Impossible de déplacer les champs (moins de 2 champs).',
                    ephemeral: true
                });
                return;
            }
            
            const selectMenu = EntryMenu.createFieldSelectMenu(fields, 'move_up');
            await interaction.reply({
                content: '**⬆️ Monter un champ**\nSélectionnez le champ à déplacer vers le haut :',
                components: [selectMenu],
                ephemeral: true
            });
            
        } else if (customId === 'config_entry_move_field_down') {
            const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
            const fields = config.entryModal?.fields || [];
            
            if (fields.length <= 1) {
                await interaction.reply({
                    content: '❌ Impossible de déplacer les champs (moins de 2 champs).',
                    ephemeral: true
                });
                return;
            }
            
            const selectMenu = EntryMenu.createFieldSelectMenu(fields, 'move_down');
            await interaction.reply({
                content: '**⬇️ Descendre un champ**\nSélectionnez le champ à déplacer vers le bas :',
                components: [selectMenu],
                ephemeral: true
            });
            
        } else {
            throw new Error('Bouton de modal d\'entrée non reconnu.');
        }
    }

    static async handleExclusionTypeSelect(interaction, value) {
        // À implémenter
    }

    static async handleFieldSelect(interaction, value) {
        const [action, indexStr] = value.split('_');
        const fieldIndex = parseInt(indexStr);
        const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
        const fields = config.entryModal?.fields || [];

        if (isNaN(fieldIndex) || fieldIndex < 0 || fieldIndex >= fields.length) {
            await interaction.reply({
                content: '❌ Index de champ invalide.',
                ephemeral: true
            });
            return;
        }

        try {
            if (action === 'edit') {
                const field = fields[fieldIndex];
                const modal = EntryMenu.createFieldModal(field, fieldIndex);
                await interaction.showModal(modal);
                
            } else if (action === 'remove') {
                console.log(`[CONFIG] Suppression du champ ${fieldIndex} par ${interaction.user.tag}`);
                EntryMenu.removeField(fieldIndex, configHandler.saveChanges.bind(configHandler), interaction.user.id);

                // Mettre à jour avec la nouvelle liste de champs
                const updatedConfig = configHandler.getCurrentConfigWithPending(interaction.user.id);
                const { embed, components } = EntryMenu.createFieldManagementEmbed(updatedConfig.entryModal || {});

                await interaction.update({
                    content: '✅ Champ supprimé avec succès !',
                    embeds: [embed],
                    components: [...components, configHandler.createControlButtons(interaction.user.id, true)]
                });

            } else if (action === 'move_up') {
                console.log(`[CONFIG] Déplacement vers le haut du champ ${fieldIndex} par ${interaction.user.tag}`);
                EntryMenu.moveField(fieldIndex, 'up', configHandler.saveChanges.bind(configHandler), interaction.user.id);

                // Mettre à jour avec la nouvelle liste de champs
                const updatedConfig = configHandler.getCurrentConfigWithPending(interaction.user.id);
                const { embed, components } = EntryMenu.createFieldManagementEmbed(updatedConfig.entryModal || {});

                await interaction.update({
                    content: '✅ Champ déplacé vers le haut !',
                    embeds: [embed],
                    components: [...components, configHandler.createControlButtons(interaction.user.id, true)]
                });

            } else if (action === 'move_down') {
                console.log(`[CONFIG] Déplacement vers le bas du champ ${fieldIndex} par ${interaction.user.tag}`);
                EntryMenu.moveField(fieldIndex, 'down', configHandler.saveChanges.bind(configHandler), interaction.user.id);

                // Mettre à jour avec la nouvelle liste de champs
                const updatedConfig = configHandler.getCurrentConfigWithPending(interaction.user.id);
                const { embed, components } = EntryMenu.createFieldManagementEmbed(updatedConfig.entryModal || {});

                await interaction.update({
                    content: '✅ Champ déplacé vers le bas !',
                    embeds: [embed],
                    components: [...components, configHandler.createControlButtons(interaction.user.id, true)]
                });
                
            } else {
                throw new Error('Action non reconnue pour la sélection de champ.');
            }
            
        } catch (error) {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `❌ ${error.message}`,
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: `❌ ${error.message}`,
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Traite les boutons de webhook
     * @param {import('discord.js').ButtonInteraction} interaction - L'interaction
     */
    static async handleWebhookButton(interaction) {
        const customId = interaction.customId;

        if (customId === 'config_webhook_auto_setup') {
            await interaction.deferReply({ ephemeral: true });
            
            try {
                const result = await WebhookMenu.autoSetupWebhooks(
                    interaction,
                    configHandler.saveChanges.bind(configHandler)
                );
                
                let message = `✅ **Configuration automatique terminée**\n\n`;
                message += `📊 **Webhooks créés:** ${result.webhooksCreated}\n`;
                
                if (result.errors.length > 0) {
                    message += `\n⚠️ **Erreurs:**\n${result.errors.map(e => `• ${e}`).join('\n')}`;
                }
                
                await interaction.editReply({
                    content: message
                });
                
                // Actualiser la vue après un court délai
                setTimeout(async () => {
                    try {
                        // Fermer le message de réponse
                        await interaction.deleteReply();
                    } catch (error) {
                        console.error('[WEBHOOK] Erreur lors de la suppression de la réponse:', error);
                    }
                }, 3000);
                
            } catch (error) {
                console.error('[WEBHOOK] Erreur lors de la configuration automatique:', error);
                await interaction.editReply({
                    content: `❌ Erreur lors de la configuration: ${error.message}`
                });
            }
            
        } else if (customId === 'config_webhook_test_all') {
            await interaction.deferReply({ ephemeral: true });
            
            try {
                const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
                const results = await WebhookMenu.testAllWebhooks(config.logging || {});
                
                let message = '🧪 **Résultats des tests:**\n\n';
                
                for (const result of results) {
                    if (result.success) {
                        message += `✅ **${result.name}** - Fonctionnel\n`;
                    } else {
                        message += `❌ **${result.name}** - Erreur: ${result.error}\n`;
                    }
                }
                
                await interaction.editReply({
                    content: message
                });
                
            } catch (error) {
                console.error('[WEBHOOK] Erreur lors des tests:', error);
                await interaction.editReply({
                    content: `❌ Erreur lors des tests: ${error.message}`
                });
            }
            
        } else if (customId === 'config_webhook_remove_all') {
            await interaction.deferReply({ ephemeral: true });
            
            try {
                const result = await WebhookMenu.removeAllWebhooks(
                    interaction.guild,
                    configHandler.saveChanges.bind(configHandler),
                    interaction.user.id
                );
                
                let message = `🗑️ **Suppression terminée**\n\n`;
                message += `📊 **Webhooks supprimés:** ${result.removed}\n`;
                
                if (result.errors.length > 0) {
                    message += `\n⚠️ **Erreurs:**\n${result.errors.map(e => `• ${e}`).join('\n')}`;
                }
                
                await interaction.editReply({
                    content: message
                });
                
                // Actualiser la vue
                setTimeout(async () => {
                    try {
                        await interaction.deleteReply();
                    } catch (error) {
                        console.error('[WEBHOOK] Erreur lors de la suppression de la réponse:', error);
                    }
                }, 3000);
                
            } catch (error) {
                console.error('[WEBHOOK] Erreur lors de la suppression:', error);
                await interaction.editReply({
                    content: `❌ Erreur lors de la suppression: ${error.message}`
                });
            }
            
        } else if (customId === 'config_webhook_clean_old') {
            await interaction.deferReply({ ephemeral: true });
            
            try {
                const result = await WebhookMenu.cleanOldWebhooks(interaction.guild);
                
                let message = `🧹 **Nettoyage terminé**\n\n`;
                message += `📊 **Webhooks supprimés:** ${result.cleaned}\n`;
                
                if (result.errors.length > 0) {
                    message += `\n⚠️ **Erreurs:**\n${result.errors.map(e => `• ${e}`).join('\n')}`;
                }
                
                if (result.cleaned === 0) {
                    message += `\n✅ Aucun webhook obsolète trouvé.`;
                }
                
                await interaction.editReply({
                    content: message
                });
                
            } catch (error) {
                console.error('[WEBHOOK] Erreur lors du nettoyage:', error);
                await interaction.editReply({
                    content: `❌ Erreur lors du nettoyage: ${error.message}`
                });
            }
            
        } else if (customId === 'config_webhook_manual_setup') {
            // TODO: Implémenter la configuration manuelle
            await interaction.reply({
                content: '🚧 Configuration manuelle en cours de développement',
                ephemeral: true
            });
        }
    }

    /**
     * Traite les boutons de jeux
     * @param {import('discord.js').ButtonInteraction} interaction - L'interaction
     */
    static async handleGamesButton(interaction) {
        const customId = interaction.customId;
        const GamesMenu = require('../menus/gamesMenu');

        if (customId === 'games_forbidden_roles') {
            await GamesMenu.handleForbiddenRoles(interaction);
        } else if (customId === 'games_quiz_toggle') {
            await GamesMenu.handleQuizToggle(
                interaction,
                configHandler.saveChanges.bind(configHandler)
            );
        } else if (customId === 'games_quiz_settings') {
            await GamesMenu.showQuizSettings(interaction);
        } else if (customId === 'games_back_to_main') {
            // Retour au menu principal des jeux
            const gamesContent = await GamesMenu.show(interaction);
            await interaction.update(gamesContent);
        } else if (customId === 'games_quiz_select_channel') {
            // Afficher le menu de sélection de salon pour le quiz
            const { ChannelType } = require('discord.js');
            const channelMenu = configHandler.createChannelSelectMenu(
                'games_quiz_channel_select',
                'Sélectionnez le salon pour le quiz quotidien',
                [ChannelType.GuildText]
            );
            
            await interaction.update({
                content: '📺 **Sélection du salon pour le quiz quotidien**\n\nChoisissez le salon où seront envoyées les questions du quiz quotidien.',
                embeds: [],
                components: [channelMenu, new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setCustomId('games_back_to_quiz_settings')
                        .setLabel('◀️ Retour')
                        .setStyle(ButtonStyle.Secondary)
                ])]
            });
        } else if (customId === 'games_back_to_quiz_settings') {
            // Retour aux paramètres du quiz
            const GamesMenu = require('../menus/gamesMenu');
            await GamesMenu.showQuizSettings(interaction);
        } else if (customId.startsWith('games_quiz_edit_')) {
            await this.handleGamesQuizEdit(interaction);
        }
    }

    /**
     * Traite les boutons d'édition du quiz
     * @param {import('discord.js').ButtonInteraction} interaction - L'interaction
     */
    static async handleGamesQuizEdit(interaction) {
        const customId = interaction.customId;
        const GamesMenu = require('../menus/gamesMenu');
        const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
        const quizConfig = config.games?.quiz || {};

        if (customId === 'games_quiz_edit_points') {
            const modal = GamesMenu.createQuizNumericModal(
                'points',
                quizConfig.pointsPerCorrectAnswer || 100,
                'Points par bonne réponse',
                'Ex: 100'
            );
            await interaction.showModal(modal);
        } else if (customId === 'games_quiz_edit_max_points') {
            const modal = GamesMenu.createQuizNumericModal(
                'max_points',
                quizConfig.maxPointsPerDay || 500,
                'Maximum de points par jour',
                'Ex: 500'
            );
            await interaction.showModal(modal);
        } else if (customId === 'games_quiz_edit_time') {
            const modal = GamesMenu.createQuizNumericModal(
                'time',
                quizConfig.hour || 13,
                'Heure de publication (0-23)',
                'Ex: 13 pour 13h00'
            );
            await interaction.showModal(modal);
        }
    }

    /**
     * Traite les modals du quiz des jeux
     * @param {import('discord.js').ModalSubmitInteraction} interaction - L'interaction
     */
    static async handleGamesQuizModal(interaction) {
        const customId = interaction.customId;
        const GamesMenu = require('../menus/gamesMenu');
        
        try {
            const valueStr = interaction.fields.getTextInputValue('numeric_value').trim();
            const value = parseFloat(valueStr);
            
            if (isNaN(value) || value < 0) {
                throw new Error('La valeur doit être un nombre positif.');
            }
            
            let field, finalValue;
            
            if (customId.includes('points')) {
                field = 'pointsPerCorrectAnswer';
                finalValue = Math.floor(value);
            } else if (customId.includes('max_points')) {
                field = 'maxPointsPerDay';
                finalValue = Math.floor(value);
            } else if (customId.includes('time')) {
                if (value < 0 || value > 23) {
                    throw new Error('L\'heure doit être comprise entre 0 et 23.');
                }
                field = 'hour';
                finalValue = Math.floor(value);
            }
            
            const changes = {
                games: {
                    quiz: {
                        [field]: finalValue
                    }
                }
            };
            
            await configHandler.saveChanges(interaction.user.id, changes);
            
            await interaction.reply({
                content: '✅ Valeur mise à jour !',
                ephemeral: true
            });
            
            // Actualiser le menu de configuration du quiz
            setTimeout(async () => {
                try {
                    const config = configHandler.getCurrentConfigWithPending(interaction.user.id);
                    const quizConfig = config.games?.quiz || {};
                    const { embed, components } = GamesMenu.createQuizConfigEmbed(quizConfig);
                    
                    await interaction.message.edit({
                        embeds: [embed],
                        components: components
                    });
                } catch (error) {
                    console.error('[CONFIG] Erreur lors de la mise à jour de la vue quiz:', error);
                }
            }, 100);
            
        } catch (error) {
            throw error;
        }
    }

    /**
     * Traite les boutons de confession
     * @param {import('discord.js').ButtonInteraction} interaction - L'interaction
     */
    static async handleConfessionButton(interaction) {
        const customId = interaction.customId;
        const ConfessionMenu = require('../menus/confessionMenu');

        if (customId === 'confession_select_channel') {
            const channelMenu = configHandler.createChannelSelectMenu(
                'confession_channel_select',
                'Sélectionnez le salon des confessions',
                [ChannelType.GuildText]
            );
            
            await interaction.reply({
                content: '**Configuration du salon des confessions**\nSélectionnez le salon où seront envoyées les confessions anonymes.',
                components: [channelMenu],
                ephemeral: true
            });
        } else if (customId === 'confession_toggle_logs') {
            await ConfessionMenu.handleToggleLogs(
                interaction,
                configHandler.saveChanges.bind(configHandler)
            );
        } else if (customId === 'confession_select_logs_channel') {
            const channelMenu = configHandler.createChannelSelectMenu(
                'confession_logs_channel_select',
                'Sélectionnez le salon de logs',
                [ChannelType.GuildText]
            );
            
            await interaction.reply({
                content: '**Configuration du salon de logs**\nSélectionnez le salon où seront enregistrées les informations des confessions (ID utilisateur, timestamp).',
                components: [channelMenu],
                ephemeral: true
            });
        }
    }
}

module.exports = ConfigInteractionManager;