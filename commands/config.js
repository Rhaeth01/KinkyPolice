const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    InteractionType,
} = require('discord.js');
const configManager = require('../utils/configManager');
const modalFieldsManager = require('../utils/configModalFieldsManager');
const {
    getNestedValue,
    updateConfigField,
    formatDisplayValue,
    getPlaceholder,
    isInteractionValid,
} = require('../utils/configUtils');

/**
 * @file commands/config.js
 * @description Main command file for server configuration, providing a comprehensive UI.
 * Handles displaying configuration categories, sections, fields, and processing user interactions
 * to update the server configuration. Delegates modal field specific management to
 * `utils/configModalFieldsManager.js` and uses utility functions from `utils/configUtils.js`.
 * @version 2.3
 */

/**
 * @constant {object} CONFIG_CATEGORIES
 * @description Defines the main categories for server configuration.
 * Each category has an icon, label, description, color, and an array of section keys.
 */
const CONFIG_CATEGORIES = {
    core: { icon: '⚙️', label: 'Configuration principale', description: 'Paramètres essentiels du serveur', color: '#5865F2', sections: ['general'] },
    logs: { icon: '📊', label: 'Logs & Surveillance', description: 'Configuration des systèmes de logging', color: '#3498DB', sections: ['moderation_logs', 'message_logs', 'voice_logs', 'member_logs', 'role_logs'] },
    community: { icon: '👥', label: 'Communauté & Accueil', description: 'Gestion des nouveaux membres', color: '#57F287', sections: ['entry', 'welcome', 'entryModal'] },
    moderation: { icon: '🛡️', label: 'Modération & Support', description: 'Outils de modération et tickets', color: '#ED4245', sections: ['modmail', 'tickets'] },
    entertainment: { icon: '🎮', label: 'Divertissement', description: 'Jeux et contenu spécialisé', color: '#FEE75C', sections: ['games', 'confession', 'kink'] },
    economy: { icon: '💰', label: 'Économie & Points', description: 'Système de points et récompenses', color: '#EB459E', sections: ['economy'] },
    progression: { icon: '📈', label: 'Niveaux & Progression', description: 'Système de niveaux et d\'expérience', color: '#9B59B6', sections: ['levels'] }
};

/**
 * @constant {object} CONFIG_SECTIONS
 * @description Defines the structure and fields for each configuration section.
 * Each section has a label, icon, and a `fields` object.
 * Fields define their label, type (text, number, channel, role, toggle, etc.), and description.
 * `dataSection` can be used to point to a different top-level key in `config.json` for data storage.
 */
const CONFIG_SECTIONS = {
    general: { label: 'Général', icon: '⚙️', fields: { prefix: { label: 'Préfixe', type: 'text', description: 'Préfixe des commandes' }, adminRole: { label: 'Rôle Admin', type: 'role', description: 'Rôle admin principal' }, modRole: { label: 'Rôle Mod', type: 'role', description: 'Rôle modérateur' }}},
    moderation_logs: { label: 'Logs Modération', icon: '🛡️', dataSection: 'logging', fields: { modLogs: { label: 'Canal Logs Mod', type: 'channel', description: 'Logs de modération (bans, kicks, etc.)' }, modLogsExcludedRoles: { label: 'Rôles Exclus (Logs Mod)', type: 'multi-role', description: 'Actions de ces rôles non loggées' }}},
    message_logs: { label: 'Logs Messages', icon: '💬', dataSection: 'logging', fields: { messageLogs: { label: 'Canal Logs Msg', type: 'channel', description: 'Logs messages édités/supprimés' }, messageLogsExcludedChannels: { label: 'Canaux Exclus (Logs Msg)', type: 'multi-channel', description: 'Messages de ces canaux non loggés' }, messageLogsExcludedRoles: { label: 'Rôles Exclus (Logs Msg)', type: 'multi-role', description: 'Messages de ces rôles non loggés' }}},
    voice_logs: { label: 'Logs Vocal', icon: '🔊', dataSection: 'logging', fields: { voiceLogs: { label: 'Canal Logs Vocal', type: 'channel', description: 'Logs activité vocale' }, voiceLogsExcludedChannels: { label: 'Canaux Exclus (Logs Vocal)', type: 'multi-channel', description: 'Activité de ces canaux vocaux non loggée' }, voiceLogsExcludedRoles: { label: 'Rôles Exclus (Logs Vocal)', type: 'multi-role', description: 'Activité vocale de ces rôles non loggée' }}},
    member_logs: { label: 'Logs Membres', icon: '👥', dataSection: 'logging', fields: { memberLogs: { label: 'Canal Logs Membres', type: 'channel', description: 'Logs arrivées/départs/profils' }, memberLogsExcludedRoles: { label: 'Rôles Exclus (Logs Membres)', type: 'multi-role', description: 'Rôles non loggés lors d\'arrivées/départs' }}},
    role_logs: { label: 'Logs Rôles', icon: '🎭', dataSection: 'logging', fields: { roleLogChannelId: { label: 'Canal Logs Rôles', type: 'channel', description: 'Logs modifications de rôles' }, roleLogsExcludedRoles: { label: 'Rôles Exclus (Affichage Logs Rôles)', type: 'multi-role', description: 'Ajouts/suppressions de ces rôles non loggés' }, roleLogsExcludedMembers: { label: 'Membres Exclus (Logs Rôles)', type: 'multi-role', description: 'Changements de rôles pour ces membres non loggés' }}},
    entry: { label: 'Système d\'Entrée', icon: '🚪', fields: { welcomeChannel: { label: 'Canal Bienvenue', type: 'channel', description: 'Canal accueil nouveaux membres' }, rulesChannel: { label: 'Canal Règles', type: 'channel', description: 'Canal des règles' }, verificationRole: { label: 'Rôle Vérification', type: 'role', description: 'Rôle après vérification' }}},
    welcome: { label: 'Messages Bienvenue', icon: '👋', fields: { welcomeMessage: { label: 'Msg Public Bienvenue', type: 'text', description: 'Message public d\'accueil' }, welcomeDM: { label: 'MP Bienvenue', type: 'text', description: 'Message privé d\'accueil' }, rulesMessage: { label: 'Msg Règles', type: 'text', description: 'Message explicatif des règles' }}},
    entryModal: { label: 'Modal d\'Entrée', icon: '📝', fields: { title: { label: 'Titre Modal', type: 'text', description: 'Titre du formulaire d\'entrée' }, 'fields.manage': { label: 'Gérer Champs Modal', type: 'special', description: 'Configurer les champs du modal' }}},
    modmail: { label: 'ModMail', icon: '📧', fields: { modmailCategory: { label: 'Catégorie ModMail', type: 'category', description: 'Catégorie des tickets ModMail' }, modmailLogs: { label: 'Logs ModMail', type: 'channel', description: 'Canal logs ModMail' }}},
    tickets: { label: 'Tickets Support', icon: '🎫', fields: { ticketCategory: { label: 'Catégorie Tickets', type: 'category', description: 'Catégorie des tickets support' }, supportRole: { label: 'Rôle Support Tickets', type: 'role', description: 'Rôle gérant les tickets' }, ticketLogs: { label: 'Logs Tickets', type: 'channel', description: 'Canal logs tickets' }}},
    games: { label: 'Jeux & Quiz', icon: '🎮', fields: { gameChannel: { label: 'Canal Jeux', type: 'channel', description: 'Canal pour les jeux' }, gameLeaderboard: { label: 'Classements Jeux', type: 'channel', description: 'Canal des classements' }}},
    confession: { label: 'Confessions', icon: '😈', fields: { confessionChannel: { label: 'Canal Confessions', type: 'channel', description: 'Canal des confessions anonymes' }}},
    kink: { label: 'Contenu Adulte (NSFW)', icon: '🔞', fields: { nsfwChannel: { label: 'Canal NSFW', type: 'channel', description: 'Canal principal NSFW' }, kinkLevels: { label: 'Niveaux Kink', type: 'toggle', description: 'Activer système de niveaux NSFW' }, kinkLogs: { label: 'Logs Kink', type: 'channel', description: 'Canal logs actions NSFW' }}},
    economy: { label: 'Économie', icon: '💰', fields: { enabled: { label: 'Économie Activée', type: 'toggle', description: 'Activer/Désactiver l\'économie' }, 'voiceActivity.enabled': { label: 'Points Vocaux', type: 'toggle', description: 'Points pour activité vocale' }, 'voiceActivity.pointsPerMinute': { label: 'Points/Minute Vocal', type: 'number', description: 'Points gagnés par minute en vocal' },'messageActivity.enabled': { label: 'Points Messages', type: 'toggle', description: 'Points pour les messages' },'messageActivity.pointsPerReward': { label: 'Points/Récompense', type: 'number', description: 'Points par récompense message' },'dailyQuiz.enabled': { label: 'Quiz Quotidien', type: 'toggle', description: 'Activer le quiz quotidien' },'dailyQuiz.pointsPerCorrectAnswer': { label: 'Points Quiz', type: 'number', description: 'Points par bonne réponse' },'dailyQuiz.hour': { label: 'Heure Quiz', type: 'number', description: 'Heure du quiz quotidien (0-23)' },'dailyQuiz.minute': { label: 'Minute Quiz', type: 'number', description: 'Minute du quiz quotidien (0-59)' },'limits.maxPointsPerDay': { label: 'Limite Journalière', type: 'number', description: 'Maximum de points par jour' },'limits.maxPointsPerHour': { label: 'Limite Horaire', type: 'number', description: 'Maximum de points par heure' }}},
    levels: { label: 'Niveaux', icon: '📈', fields: { enabled: { label: 'Niveaux Activés', type: 'toggle', description: 'Activer/Désactiver les niveaux' }, levelUpChannel: { label: 'Canal Level Up', type: 'channel', description: 'Annonces de montée de niveau' }, 'xpGain.message.min': { label: 'XP Min Message', type: 'number', description: 'XP minimum par message (15-25 recommandé)' }, 'xpGain.message.max': { label: 'XP Max Message', type: 'number', description: 'XP maximum par message' }, 'xpGain.voice.perMinute': { label: 'XP/Min Vocal', type: 'number', description: 'XP par minute en vocal (10 recommandé)' }, 'multipliers.globalMultiplier': { label: 'Multiplicateur Global', type: 'number', description: 'Multiplicateur d\'XP pour tous (1.0 = normal)' }, 'multipliers.premiumMultiplier': { label: 'Bonus Premium', type: 'number', description: 'Multiplicateur pour les membres premium' }, 'messages.enabled': { label: 'Annonces Level Up', type: 'toggle', description: 'Afficher les messages de montée de niveau' }}}
};

/** Command definition for the /config slash command. */
module.exports = {
    data: new SlashCommandBuilder().setName('config').setDescription('🎛️ Interface de configuration du serveur').setDefaultMemberPermissions('0'),
    /**
     * Executes the /config command.
     * @async
     * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object.
     */
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.editReply({ content: '❌ Accès refusé (Administrateur requis).' });
        }
        await showMainDashboard(interaction);
    }
};

/**
 * Displays the main configuration dashboard.
 * Sets up an interaction collector to handle subsequent actions.
 * @async
 * @param {import('discord.js').Interaction} interaction - The interaction initiating the dashboard.
 */
async function showMainDashboard(interaction) {
    const config = configManager.getConfig();
    const stats = getConfigStats(config);
    const embed = new EmbedBuilder().setTitle('🎛️ Tableau de Bord - Configuration').setDescription('Gérez la configuration de votre serveur.').setColor('#2b2d31').setThumbnail(interaction.guild?.iconURL({ size: 256 }) || null)
        .addFields(
            { name: '📊 Statistiques', value: `\`\`\`yaml\nSections: ${stats.configuredSections}/${stats.totalSections}\nChamps: ${stats.configuredFields}/${stats.totalFields}\nComplétion: ${stats.completionPercentage}%\nStatut: ${stats.status}\`\`\`` },
            { name: '🔧 Actions', value: 'Sélectionnez une catégorie ou une action rapide.' }
        ).setFooter({ text: `💡 Interface V2.3 • ${new Date().toLocaleString('fr-FR')}`, iconURL: interaction.client.user.displayAvatarURL() }).setTimestamp();
    const components = [createCategorySelectMenu(), createQuickActionsRow()];

    const message = await interaction.editReply({ embeds: [embed], components: components });

    const collector = message.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 300000 // 5 minutes
    });

    collector.on('collect', async i => {
        try {
            if (i.replied || i.deferred) return console.log(`[CONFIG] Interaction ${i.customId} déjà traitée.`);

            // Route specific interaction types first
            if (i.type === InteractionType.ModalSubmit) {
                if (modalFieldsManager.isModalFieldSubmit(i.customId)) return await modalFieldsManager.handleModalSubmit(i);
                if (i.customId.startsWith('config_modal_')) return await handleTextModalSubmit(i);
            } else if (i.isStringSelectMenu()) {
                if (modalFieldsManager.isModalFieldSelect(i.customId)) return await modalFieldsManager.handleSelectMenuInteraction(i);
                // 'config_category_select' will be handled by the main handleInteraction
            }
            await handleInteraction(i);
        } catch (error) {
            console.error(`[CONFIG] Erreur dans le collecteur principal: ${error.message}`, error);
            let userMessage = '❌ Une erreur est survenue lors du traitement.';
            if (error.code) {
                switch (error.code) {
                    case 10008: userMessage = '❌ Le message original semble avoir été supprimé.'; break;
                    case 10062: case 40060: console.log(`[CONFIG] Interaction ${i.customId} (ID: ${i.id}) a expiré ou a déjà été traitée.`); return;
                    case 50001: userMessage = '❌ Le bot n\'a pas les permissions nécessaires pour cette action.'; break;
                    case 50013: userMessage = '❌ Vous n\'avez pas les permissions pour cette action.'; break;
                    default: userMessage = '❌ Une erreur inattendue avec Discord s\'est produite. Veuillez réessayer.';
                }
            } else if (error.name === 'ValidationError') {
                userMessage = `❌ Erreur de validation: ${error.message}`;
            }

            if (!i.replied && !i.deferred) await i.reply({ content: userMessage, flags: 64 }).catch(e=>console.error("[CONFIG] Erreur lors de i.reply dans le collecteur:",e));
            else await i.followUp({ content: userMessage, flags: 64 }).catch(e=>console.error("[CONFIG] Erreur lors de i.followUp dans le collecteur:",e));
        }
    });
    collector.on('end', async () => {
        try {
            const originalMessage = await interaction.channel?.messages?.fetch(message.id).catch(() => null);
            if (!originalMessage) {
                console.log('[CONFIG] Message original introuvable en fin de collecteur, impossible de désactiver les composants.');
                return;
            }
            const disabledComponents = components.map(row => {
                const newRow = new ActionRowBuilder();
                row.components.forEach(component => {
                    const builder = component.data.type === 3 ? StringSelectMenuBuilder.from(component) : ButtonBuilder.from(component);
                    newRow.addComponents(builder.setDisabled(true));
                });
                return newRow;
            });
            await originalMessage.edit({ components: disabledComponents }).catch(e => console.error('[CONFIG] Erreur lors de la désactivation des composants en fin de collecteur:', e.message));
        } catch (error) {
            console.error('[CONFIG] Erreur majeure en fin de collecteur:', error.message);
        }
     });
}

/**
 * Handles submissions from general text/number input modals used for configuring simple fields.
 * @async
 * @param {import('discord.js').ModalSubmitInteraction} interaction - The modal submission interaction.
 */
async function handleTextModalSubmit(interaction) {
    const parts = interaction.customId.split('_');
    const sectionKey = parts[2];
    const fieldKey = parts.slice(3).join('_');
    const value = interaction.fields.getTextInputValue('field_value');

    const section = CONFIG_SECTIONS[sectionKey];
    const field = section?.fields?.[fieldKey];

    if (!field) {
        console.error(`[CONFIG] Champ de configuration introuvable pour modal submit: ${interaction.customId}`);
        return await interaction.reply({content: "Erreur: Champ de configuration introuvable pour ce modal.", ephemeral: true});
    }

    if (field.type === 'number') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
            return await interaction.reply({ content: `❌ La valeur pour "${field.label}" doit être un nombre valide. Vous avez entré: "${value}"`, ephemeral: true });
        }
    }

    const finalValue = field.type === 'number' ? Number(value) : value;
    await handleConfirmAction(interaction, sectionKey, fieldKey, finalValue, `${field.type}ProcessedModal`);
}

/**
 * Main router for component interactions (buttons, select menus not handled by modalFieldsManager).
 * This function delegates to more specific handlers based on the customId pattern.
 * @async
 * @param {import('discord.js').Interaction} interaction - The component interaction.
 */
async function handleInteraction(interaction) {
    const { customId } = interaction;

    // 1. Modal Field Manager specific button/action interactions
    if (customId.startsWith('modal_field_') || customId.startsWith('delete_modal_field_do_') || customId.startsWith('confirm_reset_modal_fields_') || customId === 'back_to_modal_manager') {
        // These are specific button/actions after the initial modal manager display.
        // Modal submits and select menus for modal manager are routed by the main collector.
        return await modalFieldsManager.handleButtonInteraction(interaction); // Assumes a general button handler in modal manager
    }

    // 2. Dashboard-level actions
    if (customId === 'config_view_all' || customId === 'config_export' || customId === 'config_import' || customId === 'config_reset_all_config' || customId === 'confirm_reset_all_config') {
        return await handleDashboardActions(interaction);
    }

    // 3. Navigation actions (includes config_category_select from StringSelectMenu)
    if (customId === 'config_category_select' || customId.startsWith('section_') || customId.startsWith('back_to_')) {
        return await handleNavigation(interaction);
    }

    // 4. Field configuration setup (showing selectors or modals for fields)
    if (customId.startsWith('field_') || customId.startsWith('configure_')) {
        return await handleFieldConfigurationSetup(interaction);
    }

    // 5. Selections, Confirmations, Cancellations, Clears for general fields
    if (customId.startsWith('select_') || customId.startsWith('confirm_') || customId.startsWith('cancel_') || customId.startsWith('clear_')) {
        return await handleSelectionAndConfirmation(interaction);
    }

    console.warn(`[CONFIG] Unhandled customId in main handleInteraction router: ${customId}`);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({content: "Action inconnue ou non gérée.", ephemeral: true}).catch(e => console.error("Error replying to unhandled CI:", e));
    }
}

/**
 * Handles actions originating from the main configuration dashboard buttons.
 * @async
 * @param {import('discord.js').ButtonInteraction} interaction - The button interaction.
 */
async function handleDashboardActions(interaction) {
    const { customId } = interaction;
    if (customId === 'config_view_all') await showCompleteView(interaction);
    else if (customId === 'config_export') await exportConfiguration(interaction);
    else if (customId === 'config_import') await showImportModal(interaction);
    else if (customId === 'config_reset_all_config') await showResetConfirmation(interaction, 'all');
    else if (customId === 'confirm_reset_all_config') {
        await configManager.resetConfig();
        await interaction.update({ content: '✅ Toute la configuration du serveur a été réinitialisée.', embeds: [], components: [] });
        setTimeout(() => showMainDashboardUpdate(interaction).catch(console.error), 2000);
    }
}

/**
 * Handles navigation-related interactions such as category selection, section entry, and back buttons.
 * @async
 * @param {import('discord.js').Interaction} interaction - The component interaction (Button or StringSelectMenu).
 */
async function handleNavigation(interaction) {
    const { customId } = interaction;
    if (customId === 'config_category_select') {
        if (!interaction.isStringSelectMenu()) return;
        await showCategoryView(interaction, interaction.values[0]);
    }
    else if (customId.startsWith('section_')) await showSectionEditor(interaction, customId.replace('section_', ''));
    else if (customId === 'back_to_main') await showMainDashboardUpdate(interaction);
    else if (customId === 'back_to_category' || customId === 'back_to_category_community') {
        const footerText = interaction.message.embeds[0]?.footer?.text;
        const categoryKeyFromFooter = footerText?.match(/Catégorie: (\w+)/)?.[1];
        const categoryKey = customId === 'back_to_category_community' ? 'community' : categoryKeyFromFooter;

        if (categoryKey) await showCategoryView(interaction, categoryKey);
        else await showMainDashboardUpdate(interaction);
    }
    else if (customId.startsWith('back_to_section_')) await refreshSectionView(interaction, customId.replace('back_to_section_', ''));
}

/**
 * Handles interactions that initiate field configuration (e.g., showing modals for text/number/toggle, or selectors for channel/role).
 * @async
 * @param {import('discord.js').ButtonInteraction} interaction - The button interaction.
 */
async function handleFieldConfigurationSetup(interaction) {
    const { customId } = interaction;
    if (customId.startsWith('field_')) await handleFieldInteraction(interaction);
    else if (customId.startsWith('configure_channel_')) await showChannelSelector(interaction);
    else if (customId.startsWith('configure_role_')) await showRoleSelector(interaction);
    else if (customId.startsWith('configure_multi_channel_')) await showMultiChannelSelector(interaction);
    else if (customId.startsWith('configure_multi_role_')) await showMultiRoleSelector(interaction);
}

/**
 * Handles selections from channel/role select menus, confirmation/cancellation of changes, and clear actions for multi-select fields.
 * @async
 * @param {import('discord.js').Interaction} interaction - The component interaction (Button or various SelectMenu types).
 */
async function handleSelectionAndConfirmation(interaction) {
    const { customId } = interaction;
    // Selections from menus
    if (customId.startsWith('select_channel_')) await handleSpecificChannelSelection(interaction);
    else if (customId.startsWith('select_role_')) await handleSpecificRoleSelection(interaction);
    else if (customId.startsWith('select_multi_channel_')) await handleMultiChannelSelection(interaction);
    else if (customId.startsWith('select_multi_role_')) await handleMultiRoleSelection(interaction);
    // Confirmations & Cancellations
    else if (customId.startsWith('confirm_channel_')) await handleChannelConfirmation(interaction);
    else if (customId.startsWith('confirm_role_')) await handleRoleConfirmation(interaction);
    else if (customId.startsWith('confirm_toggle_')) await handleToggleConfirmation(interaction);
    else if (customId.startsWith('cancel_change_')) await handleCancelChange(interaction);
    // Clear actions
    else if (customId.startsWith('clear_multi_channel_')) await handleClearMultiChannel(interaction);
    else if (customId.startsWith('clear_multi_role_')) await handleClearMultiRole(interaction);
}

// --- Utility and View Generation Functions (JSDoc + Full implementations are assumed from previous steps) ---
/** Creates the category selection menu. @returns {ActionRowBuilder} */
function createCategorySelectMenu() { return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('config_category_select').setPlaceholder('🎯 Catégories').addOptions(Object.entries(CONFIG_CATEGORIES).map(([k,v])=>new StringSelectMenuOptionBuilder().setLabel(v.label).setDescription(v.description.substring(0,100)).setValue(k).setEmoji(v.icon))));}
/** Creates the row of quick action buttons. @returns {ActionRowBuilder} */
function createQuickActionsRow() { return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('config_view_all').setLabel('Vue Complète').setEmoji('👁️').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('config_export').setLabel('Exporter').setEmoji('📤').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('config_import').setLabel('Importer').setEmoji('📥').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('config_reset_all_config').setLabel('Réinit. TOUT').setEmoji('🔄').setStyle(ButtonStyle.Danger));}
/** Displays a specific configuration category. @async @param {import('discord.js').StringSelectMenuInteraction | import('discord.js').ButtonInteraction} i - Interaction. @param {string} k - Category key. */
async function showCategoryView(i, k) { /* ... JSDoc + Full implementation ... */ }
/** Creates an embed for a configuration section. @async @param {string} sk - Section key. @param {object} s - Section data. @param {import('discord.js').Guild} g - Guild. @returns {Promise<EmbedBuilder>} */
async function createSectionEmbed(sk, s, g) { /* ... JSDoc + Full implementation ... */ }
/** Displays section editor. @async @param {import('discord.js').ButtonInteraction} i - Interaction. @param {string} sk - Section key. */
async function showSectionEditor(i, sk) { await refreshSectionView(i, sk); }
/** Creates field components for a section. @async @param {string} sk - Section key. @param {object} flds - Fields. @param {object} sd - Section data. @param {import('discord.js').Guild} g - Guild. @returns {Promise<ActionRowBuilder[]>} */
async function createFieldComponents(sk, flds, sd, g) { /* ... JSDoc + Full implementation ... */ }
/** Handles interactions for simple field types (toggle, text, number, special). @async @param {import('discord.js').ButtonInteraction} i - Interaction. */
async function handleFieldInteraction(i) { /* ... JSDoc + Full implementation ... */ }
/** Handles 'special' field types, e.g., navigating to modal fields manager. @async @param {import('discord.js').ButtonInteraction} i - Interaction. @param {string} sk - Section key. @param {string} fk - Field key. */
async function handleSpecialField(i, sk, fk) { if (sk === 'entryModal' && fk === 'fields.manage') await modalFieldsManager.showModalFieldsManager(i); }
/** Handles selection of a single channel from a ChannelSelectMenu. @async @param {import('discord.js').ChannelSelectMenuInteraction} i - Interaction. */
async function handleSpecificChannelSelection(i) { /* ... JSDoc + Full implementation ... */ }
/** Handles selection of a single role from a RoleSelectMenu. @async @param {import('discord.js').RoleSelectMenuInteraction} i - Interaction. */
async function handleSpecificRoleSelection(i) { /* ... JSDoc + Full implementation ... */ }
/** Handles click on a toggle button, showing confirmation. @async @param {import('discord.js').ButtonInteraction} i - Interaction. @param {string} sk - Section key. @param {string} fk - Field key. */
async function handleToggleField(i, sk, fk) { /* ... JSDoc + Full implementation ... */ }
/** Shows modal for text/number input. @async @param {import('discord.js').ButtonInteraction} i - Interaction. @param {string} sk - Section key. @param {string} fk - Field key. @param {string} t - Type. */
async function showTextModal(i, sk, fk, t) { /* ... JSDoc + Full implementation ... */ }
/** Refreshes the current section view. @async @param {import('discord.js').Interaction} i - Interaction. @param {string} sk - Section key. @param {string} [msg=null] - Optional message to display. */
async function refreshSectionView(i, sk, msg = null) { /* ... JSDoc + Full implementation ... */ }
/** Generic handler for confirm actions. @async @param {import('discord.js').Interaction} i - Interaction. @param {string} sk - Section key. @param {string} fk - Field key. @param {*} v - Value. @param {string} t - Type. */
async function handleConfirmAction(i, sk, fk, v, t) { /* ... JSDoc + Full implementation ... */ }
/** Handles channel change confirmation. @async @param {import('discord.js').ButtonInteraction} i - Interaction. */
async function handleChannelConfirmation(i) { const { sectionKey, fieldKey, extraData:[id] } = parseComplexCustomId(i.customId, 'confirm_channel_', true); await handleConfirmAction(i, sectionKey, fieldKey, id, 'channel'); }
/** Handles role change confirmation. @async @param {import('discord.js').ButtonInteraction} i - Interaction. */
async function handleRoleConfirmation(i) { const { sectionKey, fieldKey, extraData:[id] } = parseComplexCustomId(i.customId, 'confirm_role_', true); await handleConfirmAction(i, sectionKey, fieldKey, id, 'role'); }
/** Handles toggle change confirmation. @async @param {import('discord.js').ButtonInteraction} i - Interaction. */
async function handleToggleConfirmation(i) { const { sectionKey, fieldKey, extraData:[val] } = parseComplexCustomId(i.customId, 'confirm_toggle_', true); await handleConfirmAction(i, sectionKey, fieldKey, val === 'true', 'toggle'); }
/** Handles cancellation of a change. @async @param {import('discord.js').ButtonInteraction} i - Interaction. */
async function handleCancelChange(i) { /* ... JSDoc + Full implementation ... */ }
/** Shows a channel selector menu. @async @param {import('discord.js').ButtonInteraction} i - Interaction. */
async function showChannelSelector(i) { /* ... JSDoc + Full implementation ... */ }
/** Shows a role selector menu. @async @param {import('discord.js').ButtonInteraction} i - Interaction. */
async function showRoleSelector(i) { /* ... JSDoc + Full implementation ... */ }
/** Shows a multi-channel selector. @async @param {import('discord.js').ButtonInteraction} i - Interaction. */
async function showMultiChannelSelector(i) { /* ... JSDoc + Full implementation ... */ }
/** Shows a multi-role selector. @async @param {import('discord.js').ButtonInteraction} i - Interaction. */
async function showMultiRoleSelector(i) { /* ... JSDoc + Full implementation ... */ }
/** Handles selection from multi-channel menu. @async @param {import('discord.js').ChannelSelectMenuInteraction} i - Interaction. */
async function handleMultiChannelSelection(i){ /* ... JSDoc + Full implementation ... */ }
/** Handles selection from multi-role menu. @async @param {import('discord.js').RoleSelectMenuInteraction} i - Interaction. */
async function handleMultiRoleSelection(i){ /* ... JSDoc + Full implementation ... */ }
/** Handles clearing multi-channel selection. @async @param {import('discord.js').ButtonInteraction} i - Interaction. */
async function handleClearMultiChannel(i){ /* ... JSDoc + Full implementation ... */ }
/** Handles clearing multi-role selection. @async @param {import('discord.js').ButtonInteraction} i - Interaction. */
async function handleClearMultiRole(i){ /* ... JSDoc + Full implementation ... */ }

/** Calculates config completion stats. @param {object} cfg - Config object. @returns {object} Stats. */
function getConfigStats(cfg) { /* ... JSDoc + Full implementation ... */ }
/** Parses complex custom IDs. @param {string} cid - Custom ID. @param {string} pfx - Prefix. @param {boolean} [ext=false] - Include extra data. @returns {object} Parsed keys. */
function parseComplexCustomId(cid, pfx, ext = false) { /* ... JSDoc + Full implementation ... */ }

/** Shows complete config view (placeholder). @async @param {import('discord.js').Interaction} i - Interaction. */
async function showCompleteView(i) { await i.update({content: "Vue complète (TODO)", embeds:[], components:[]}).catch(()=>{}); }
/** Exports config. @async @param {import('discord.js').Interaction} i - Interaction. */
async function exportConfiguration(i) { /* ... JSDoc + Full implementation ... */ }
/** Shows import modal. @async @param {import('discord.js').Interaction} i - Interaction. */
async function showImportModal(i) { /* ... JSDoc + Full implementation ... */ }
/** Shows reset confirmation. @async @param {import('discord.js').Interaction} i - Interaction. @param {string} t - Reset type. */
async function showResetConfirmation(i, t) { /* ... JSDoc + Full implementation ... */ }
/** Updates main dashboard. @async @param {import('discord.js').Interaction} i - Interaction. */
async function showMainDashboardUpdate(i) { /* ... JSDoc + Full implementation ... */ }


module.exports.CONFIG_SECTIONS = CONFIG_SECTIONS;
module.exports.CONFIG_CATEGORIES = CONFIG_CATEGORIES;
module.exports.refreshSectionView = refreshSectionView;
module.exports.handleConfirmAction = handleConfirmAction;
module.exports.parseComplexCustomId = parseComplexCustomId;
module.exports.showModalFieldsManager = modalFieldsManager.showModalFieldsManager;
module.exports.getConfigStats = getConfigStats;
module.exports.showMainDashboardUpdate = showMainDashboardUpdate;
module.exports.handleInteraction = handleInteraction;
