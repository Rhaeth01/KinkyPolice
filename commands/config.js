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
    TextInputStyle
} = require('discord.js');
const configManager = require('../utils/configManager');

// Configuration moderne avec icônes et catégories
const CONFIG_CATEGORIES = {
    core: {
        icon: '⚙️',
        label: 'Configuration principale',
        description: 'Paramètres essentiels du serveur',
        color: '#5865F2',
        sections: ['general']
    },
    logs: {
        icon: '📊',
        label: 'Logs & Surveillance',
        description: 'Configuration des systèmes de logging',
        color: '#3498DB',
        sections: ['moderation_logs', 'message_logs', 'voice_logs', 'member_logs', 'role_logs']
    },
    community: {
        icon: '👥',
        label: 'Communauté & Accueil',
        description: 'Gestion des nouveaux membres',
        color: '#57F287',
        sections: ['entry', 'welcome', 'entryModal']
    },
    moderation: {
        icon: '🛡️',
        label: 'Modération & Support',
        description: 'Outils de modération et tickets',
        color: '#ED4245',
        sections: ['modmail', 'tickets']
    },
    entertainment: {
        icon: '🎮',
        label: 'Divertissement',
        description: 'Jeux et contenu spécialisé',
        color: '#FEE75C',
        sections: ['games', 'confession', 'kink']
    },
    economy: {
        icon: '💰',
        label: 'Économie & Points',
        description: 'Système de points et récompenses',
        color: '#EB459E',
        sections: ['economy']
    },
    progression: {
        icon: '📈',
        label: 'Niveaux & Progression',
        description: 'Système de niveaux et d\'expérience',
        color: '#9B59B6',
        sections: ['levels']
    }
};

const CONFIG_SECTIONS = {
    general: {
        label: 'Paramètres généraux',
        icon: '⚙️',
        fields: {
            prefix: { label: 'Préfixe', type: 'text', description: 'Préfixe pour les commandes' },
            adminRole: { label: 'Rôle Admin', type: 'role', description: 'Rôle administrateur principal' },
            modRole: { label: 'Rôle Mod', type: 'role', description: 'Rôle modérateur' }
        }
    },
    moderation_logs: {
        label: 'Logs Modération',
        icon: '🛡️',
        dataSection: 'logging', // Utilise la section logging dans la config
        fields: {
            modLogs: { 
                label: '📍 Canal de destination', 
                type: 'channel', 
                description: 'Canal où seront envoyés les logs de modération (bans, kicks, warns, mutes)'
            },
            modLogsExcludedRoles: {
                label: '🚫 Rôles à ignorer',
                type: 'multi-role',
                description: 'Rôles dont les actions de modération ne seront pas loggées (ex: bots, staff)'
            }
        }
    },
    message_logs: {
        label: 'Logs Messages',
        icon: '💬',
        dataSection: 'logging',
        fields: {
            messageLogs: { 
                label: '📍 Canal de destination', 
                type: 'channel', 
                description: 'Canal où seront envoyés les logs des messages édités et supprimés'
            },
            messageLogsExcludedChannels: {
                label: '🚫 Canaux à ignorer',
                type: 'multi-channel',
                description: 'Canaux dont les messages ne seront pas surveillés (ex: spam, test)'
            },
            messageLogsExcludedRoles: {
                label: '🚫 Rôles à ignorer',
                type: 'multi-role',
                description: 'Rôles dont les messages ne seront pas loggés (ex: bots, modérateurs)'
            }
        }
    },
    voice_logs: {
        label: 'Logs Vocal',
        icon: '🔊',
        dataSection: 'logging',
        fields: {
            voiceLogs: { 
                label: '📍 Canal de destination', 
                type: 'channel', 
                description: 'Canal où seront envoyés les logs des activités vocales (connexions/déconnexions)'
            },
            voiceLogsExcludedChannels: {
                label: '🚫 Canaux vocal à ignorer',
                type: 'multi-channel',
                description: 'Canaux vocaux dont l\'activité ne sera pas surveillée (ex: AFK, privés)'
            },
            voiceLogsExcludedRoles: {
                label: '🚫 Rôles à ignorer',
                type: 'multi-role',
                description: 'Rôles dont l\'activité vocale ne sera pas loggée (ex: bots, staff)'
            }
        }
    },
    member_logs: {
        label: 'Logs Membres',
        icon: '👥',
        dataSection: 'logging',
        fields: {
            memberLogs: { 
                label: '📍 Canal de destination', 
                type: 'channel', 
                description: 'Canal où seront envoyés les logs des membres (arrivées, départs, profils)'
            },
            memberLogsExcludedRoles: {
                label: '🚫 Rôles à ignorer',
                type: 'multi-role',
                description: 'Rôles dont les changements ne seront pas loggés lors des arrivées/départs'
            }
        }
    },
    role_logs: {
        label: 'Logs Rôles',
        icon: '🎭',
        dataSection: 'logging',
        fields: {
            roleLogChannelId: { 
                label: '📍 Canal de destination', 
                type: 'channel', 
                description: 'Canal où seront envoyés les logs des modifications de rôles'
            },
            roleLogsExcludedRoles: {
                label: '🚫 Rôles à ne pas afficher',
                type: 'multi-role',
                description: 'Rôles dont les ajouts/suppressions ne seront pas loggés (ex: rôles automatiques)'
            },
            roleLogsExcludedMembers: {
                label: '🚫 Membres à ignorer',
                type: 'multi-role',
                description: 'Rôles de membres dont les changements de rôles ne seront pas loggés (ex: bots)'
            }
        }
    },
    entry: {
        label: 'Système d\'entrée',
        icon: '🚪',
        fields: {
            welcomeChannel: { label: 'Canal Bienvenue', type: 'channel', description: 'Canal d\'accueil des nouveaux' },
            rulesChannel: { label: 'Canal Règles', type: 'channel', description: 'Canal contenant les règles' },
            verificationRole: { label: 'Rôle Vérification', type: 'role', description: 'Rôle donné après vérification' }
        }
    },
    welcome: {
        label: 'Messages de bienvenue',
        icon: '👋',
        fields: {
            welcomeMessage: { label: 'Message Public', type: 'text', description: 'Message affiché publiquement' },
            welcomeDM: { label: 'Message Privé', type: 'text', description: 'Message envoyé en privé' },
            rulesMessage: { label: 'Message Règles', type: 'text', description: 'Message explicatif des règles' }
        }
    },
    entryModal: {
        label: 'Modal d\'entrée',
        icon: '📝',
        fields: {
            title: { label: 'Titre du Modal', type: 'text', description: 'Titre affiché en haut du formulaire' },
            'fields.manage': { label: 'Gérer les Champs', type: 'special', description: 'Interface pour configurer les champs du formulaire' }
        }
    },
    modmail: {
        label: 'Système ModMail',
        icon: '📧',
        fields: {
            modmailCategory: { label: 'Catégorie ModMail', type: 'category', description: 'Catégorie pour les tickets modmail' },
            modmailLogs: { label: 'Logs ModMail', type: 'channel', description: 'Canal pour logger les modmails' }
        }
    },
    tickets: {
        label: 'Système de Tickets',
        icon: '🎫',
        fields: {
            ticketCategory: { label: 'Catégorie Tickets', type: 'category', description: 'Catégorie pour les tickets support' },
            supportRole: { label: 'Rôle Support', type: 'role', description: 'Rôle pour gérer les tickets' },
            ticketLogs: { label: 'Logs Tickets', type: 'channel', description: 'Canal pour logger les tickets' }
        }
    },
    games: {
        label: 'Jeux & Quiz',
        icon: '🎮',
        fields: {
            gameChannel: { label: 'Canal Jeux', type: 'channel', description: 'Canal principal pour les jeux' },
            gameLeaderboard: { label: 'Classements', type: 'channel', description: 'Canal pour les classements' }
        }
    },
    confession: {
        label: 'Confessions Anonymes',
        icon: '😈',
        fields: {
            confessionChannel: { label: 'Canal Confessions', type: 'channel', description: 'Canal pour les confessions anonymes' }
        }
    },
    kink: {
        label: 'Contenu Adulte',
        icon: '🔞',
        fields: {
            nsfwChannel: { label: 'Canal NSFW', type: 'channel', description: 'Canal principal NSFW' },
            kinkLevels: { label: 'Niveaux Activés', type: 'toggle', description: 'Activer le système de niveaux' },
            kinkLogs: { label: 'Logs NSFW', type: 'channel', description: 'Canal pour logger les actions NSFW' }
        }
    },
    economy: {
        label: 'Système Économique',
        icon: '💰',
        fields: {
            enabled: { label: 'Économie Activée', type: 'toggle', description: 'Activer le système de points' },
            'voiceActivity.enabled': { label: 'Points Vocal', type: 'toggle', description: 'Points pour activité vocale' },
            'voiceActivity.pointsPerMinute': { label: 'Points/Minute Vocal', type: 'number', description: 'Points gagnés par minute en vocal' },
            'messageActivity.enabled': { label: 'Points Messages', type: 'toggle', description: 'Points pour les messages' },
            'messageActivity.pointsPerReward': { label: 'Points/Récompense', type: 'number', description: 'Points par récompense message' },
            'dailyQuiz.enabled': { label: 'Quiz Quotidien', type: 'toggle', description: 'Activer le quiz quotidien' },
            'dailyQuiz.pointsPerCorrectAnswer': { label: 'Points Quiz', type: 'number', description: 'Points par bonne réponse' },
            'dailyQuiz.hour': { label: 'Heure Quiz', type: 'number', description: 'Heure du quiz quotidien (0-23)' },
            'dailyQuiz.minute': { label: 'Minute Quiz', type: 'number', description: 'Minute du quiz quotidien (0-59)' },
            'limits.maxPointsPerDay': { label: 'Limite Journalière', type: 'number', description: 'Maximum de points par jour' },
            'limits.maxPointsPerHour': { label: 'Limite Horaire', type: 'number', description: 'Maximum de points par heure' }
        }
    },
    levels: {
        label: 'Système de Niveaux',
        icon: '📈',
        fields: {
            enabled: { label: 'Niveaux Activés', type: 'toggle', description: 'Activer le système de niveaux et d\'XP' },
            levelUpChannel: { label: 'Canal Level Up', type: 'channel', description: 'Canal pour les annonces de montée de niveau' },
            'xpGain.message.min': { label: 'XP Min Message', type: 'number', description: 'XP minimum par message (15-25 recommandé)' },
            'xpGain.message.max': { label: 'XP Max Message', type: 'number', description: 'XP maximum par message' },
            'xpGain.voice.perMinute': { label: 'XP/Min Vocal', type: 'number', description: 'XP par minute en vocal (10 recommandé)' },
            'multipliers.globalMultiplier': { label: 'Multiplicateur Global', type: 'number', description: 'Multiplicateur d\'XP pour tous (1.0 = normal)' },
            'multipliers.premiumMultiplier': { label: 'Bonus Premium', type: 'number', description: 'Multiplicateur pour les membres premium' },
            'messages.enabled': { label: 'Annonces Level Up', type: 'toggle', description: 'Afficher les messages de montée de niveau' }
        }
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('🎛️ Interface moderne de configuration du serveur')
        .setDefaultMemberPermissions('0'),
        
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 }); // 64 = EPHEMERAL flag
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.editReply({
                content: '❌ Vous devez être administrateur pour utiliser cette commande.'
            });
        }

        await showMainDashboard(interaction);
    }
};

async function showMainDashboard(interaction) {
    const config = configManager.getConfig();
    const stats = getConfigStats(config);
    
    const embed = new EmbedBuilder()
        .setTitle('🎛️ Tableau de Bord - Configuration')
        .setDescription('**Interface moderne de gestion du serveur**\n\nNaviguez par catégories pour configurer votre serveur avec une interface intuitive et moderne.')
        .setColor('#2b2d31')
        .setThumbnail(interaction.guild?.iconURL({ size: 256 }) || null)
        .addFields([
            {
                name: '📊 Statistiques de Configuration',
                value: `\`\`\`yaml\nSections configurées: ${stats.configuredSections}/${stats.totalSections}\nChamps remplis: ${stats.configuredFields}/${stats.totalFields}\nComplétion: ${stats.completionPercentage}%\nStatut: ${stats.status}\`\`\``,
                inline: false
            },
            {
                name: '🔧 Actions Rapides',
                value: '• Sélectionnez une catégorie ci-dessous\n• Utilisez les boutons pour des actions rapides\n• Toutes les modifications sont sauvegardées automatiquement',
                inline: false
            }
        ])
        .setFooter({ 
            text: `💡 Interface V2.0 • Dernière MAJ: ${new Date().toLocaleString('fr-FR')}`, 
            iconURL: interaction.client.user.displayAvatarURL() 
        })
        .setTimestamp();

    const components = [
        createCategorySelectMenu(),
        createQuickActionsRow()
    ];

    const message = await interaction.editReply({
        embeds: [embed],
        components: components
    });

    // Collecteur d'interactions
    const collector = message.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 300000 // 5 minutes
    });

    collector.on('collect', async i => {
        try {
            // Vérifier si l'interaction est encore valide
            if (i.replied || i.deferred) {
                console.log('[CONFIG] Interaction déjà traitée, ignorée');
                return;
            }
            
            await handleInteraction(i, config);
        } catch (error) {
            console.error('[CONFIG] Erreur interaction:', error);
            
            // Gérer les erreurs d'interaction expirée spécifiquement
            if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
                console.log('[CONFIG] Interaction expirée (10062), ignorée silencieusement');
                return;
            }
            
            // Fallback error reply
            try {
                if (!i.replied && !i.deferred) {
                    await i.reply({
                        content: '❌ Une erreur est survenue lors du traitement. Veuillez réessayer.',
                        flags: 64
                    });
                } else {
                    await i.followUp({
                        content: '❌ Une erreur est survenue lors du traitement de cette action. Veuillez réessayer.',
                        flags: 64
                    });
                }
            } catch (followUpError) {
                console.error('[CONFIG] Impossible d\'envoyer un message d\'erreur de suivi:', followUpError);
            }
        }
    });

    collector.on('end', async () => {
        try {
            // Check if the original message still exists
            if (!interaction.channel || !interaction.channel.messages.cache.has(message.id)) {
                console.log('[CONFIG] Message original supprimé ou inaccessible, impossible de désactiver les composants.');
                return;
            }

            const disabledComponents = components.map(row => {
                const newRow = new ActionRowBuilder();
                row.components.forEach(component => {
                    if (component.data.type === 3) { // Select Menu
                        newRow.addComponents(
                            StringSelectMenuBuilder.from(component).setDisabled(true)
                        );
                    } else { // Button
                        newRow.addComponents(
                            ButtonBuilder.from(component).setDisabled(true)
                        );
                    }
                });
                return newRow;
            });

            // Check if the interaction can still be edited
            if (interaction.replied || interaction.deferred || !interaction.isRepliable()) {
                 // Try to edit the message directly if interaction is no longer valid for editReply
                await message.edit({ components: disabledComponents }).catch(e => {
                    console.error('[CONFIG] Impossible de désactiver les composants via message.edit après expiration de l\'interaction:', e.message);
                });
            } else {
                await interaction.editReply({ components: disabledComponents });
            }
        } catch (error) {
            console.error('[CONFIG] Erreur lors de la désactivation des composants en fin de collecteur:', error.message);
        }
    });
}

function createCategorySelectMenu() {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('config_category_select')
        .setPlaceholder('🎯 Sélectionnez une catégorie à configurer')
        .setMinValues(1)
        .setMaxValues(1);

    Object.entries(CONFIG_CATEGORIES).forEach(([key, category]) => {
        selectMenu.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(category.label)
                .setDescription(category.description)
                .setValue(key)
                .setEmoji(category.icon)
        );
    });

    return new ActionRowBuilder().addComponents(selectMenu);
}

function createQuickActionsRow() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('config_view_all')
                .setLabel('Vue Complète')
                .setEmoji('👁️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('config_export')
                .setLabel('Exporter')
                .setEmoji('📤')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('config_import')
                .setLabel('Importer')
                .setEmoji('📥')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('config_reset')
                .setLabel('Réinitialiser')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Danger)
        );
}

async function handleInteraction(interaction, config) {
    const { customId } = interaction;

    // Vérifier l'état de l'interaction avant traitement
    if (interaction.replied || interaction.deferred) {
        console.log(`[CONFIG] handleInteraction - Interaction ${customId} déjà traitée, abandon`);
        return;
    }

    try {
        if (customId === 'config_category_select') {
            const categoryKey = interaction.values[0];
            await showCategoryView(interaction, categoryKey);
        } else if (customId === 'config_view_all') {
            await showCompleteView(interaction);
        } else if (customId === 'config_export') {
            await exportConfiguration(interaction);
        } else if (customId === 'config_import') {
            await showImportModal(interaction);
        } else if (customId === 'config_reset') { // Main config reset
            await showResetConfirmation(interaction);
        } else if (customId.startsWith('section_')) {
            const sectionKey = customId.replace('section_', '');
            await showSectionEditor(interaction, sectionKey);
        } else if (customId === 'back_to_main') {
            await showMainDashboardUpdate(interaction);
        } else if (customId === 'back_to_category') {
            const categoryKeyText = interaction.message.embeds[0]?.footer?.text;
            const categoryKeyMatch = categoryKeyText?.match(/Catégorie: (\w+)/);
            if (categoryKeyMatch && categoryKeyMatch[1]) {
                await showCategoryView(interaction, categoryKeyMatch[1]);
            } else {
                // Fallback for when 'Catégorie: X' is not in the footer,
                // such as returning from the Modal Fields Manager.
                const modalManagerCategoryMatch = categoryKeyText?.match(/Modal Fields Manager/);
                if (modalManagerCategoryMatch) {
                     await showCategoryView(interaction, 'community'); // Default to community if it's from modal manager
                } else {
                    console.log("[CONFIG] back_to_category: Could not determine category from footer. Defaulting to main dashboard.");
                    await showMainDashboardUpdate(interaction); // Fallback to main dashboard
                }
            }
        } else if (customId.startsWith('field_')) {
            await handleFieldInteraction(interaction);
        } else if (customId === 'modal_field_add') {
            await showAddFieldModal(interaction);
        } else if (customId === 'modal_field_edit') {
            await showEditFieldSelector(interaction);
        } else if (customId === 'modal_field_delete') {
            await showDeleteFieldSelector(interaction);
        } else if (customId === 'modal_field_preview') {
            await showModalPreview(interaction);
        } else if (customId === 'modal_field_reset') { // Reset for modal fields
            await showResetConfirmation(interaction); // This might need a more specific reset if different from main
        } else if (customId.startsWith('confirm_channel_')) {
            await handleChannelConfirmation(interaction);
        } else if (customId.startsWith('confirm_role_')) {
            await handleRoleConfirmation(interaction);
        } else if (customId.startsWith('confirm_toggle_')) {
            await handleToggleConfirmation(interaction);
        } else if (customId.startsWith('cancel_change_')) {
            await handleCancelChange(interaction);
        } else if (customId.startsWith('back_to_section_')) {
            const sectionKey = customId.replace('back_to_section_', '');
            await showSectionEditor(interaction, sectionKey);
        } else if (customId.startsWith('configure_channel_')) {
            await showChannelSelector(interaction);
        } else if (customId.startsWith('configure_role_')) {
            await showRoleSelector(interaction);
        } else if (customId.startsWith('configure_multi_channel_')) {
            await showMultiChannelSelector(interaction);
        } else if (customId.startsWith('configure_multi_role_')) {
            await showMultiRoleSelector(interaction);
        } else if (customId.startsWith('select_channel_')) {
            await handleSpecificChannelSelection(interaction);
        } else if (customId.startsWith('select_role_')) {
            await handleSpecificRoleSelection(interaction);
        } else if (customId.startsWith('select_multi_channel_')) {
            await handleMultiChannelSelection(interaction);
        } else if (customId.startsWith('select_multi_role_')) {
            await handleMultiRoleSelection(interaction);
        } else if (customId.startsWith('clear_multi_channel_')) {
            await handleClearMultiChannel(interaction);
        } else if (customId.startsWith('clear_multi_role_')) {
            await handleClearMultiRole(interaction);
        }
    } catch (error) {
        // Relancer l'erreur pour qu'elle soit gérée par le collector
        throw error;
    }
}

async function showCategoryView(interaction, categoryKey) {
    const category = CONFIG_CATEGORIES[categoryKey];
    if (!category) return;

    const config = configManager.getConfig();
    
    const embed = new EmbedBuilder()
        .setTitle(`${category.icon} ${category.label}`)
        .setDescription(`**${category.description}**\n\nSélectionnez une section à configurer ci-dessous.`)
        .setColor(category.color)
        .setFooter({ text: `Catégorie: ${categoryKey}` });

    // Ajouter un aperçu de chaque section
    category.sections.forEach(sectionKey => {
        const section = CONFIG_SECTIONS[sectionKey];
        if (!section) return;

        const sectionConfig = config[sectionKey] || {};
        const configuredFields = Object.keys(section.fields).filter(fieldKey => {
            const value = getNestedValue(sectionConfig, fieldKey);
            return value !== undefined && value !== '' && value !== false;
        });
        
        const status = configuredFields.length > 0 ? '✅' : '⚠️';
        const completion = `${configuredFields.length}/${Object.keys(section.fields).length}`;
        
        embed.addFields({
            name: `${section.icon} ${section.label}`,
            value: `${status} Configuré: **${completion}** champs`,
            inline: true
        });
    });

    // Boutons pour chaque section
    const rows = [];
    const sectionsPerRow = 3;
    
    for (let i = 0; i < category.sections.length; i += sectionsPerRow) {
        const row = new ActionRowBuilder();
        const sectionsSlice = category.sections.slice(i, i + sectionsPerRow);
        
        sectionsSlice.forEach(sectionKey => {
            const section = CONFIG_SECTIONS[sectionKey];
            if (!section) return;
            
            const sectionConfig = config[sectionKey] || {};
            const isConfigured = Object.keys(section.fields).some(fieldKey => {
                const value = getNestedValue(sectionConfig, fieldKey);
                return value !== undefined && value !== '' && value !== false;
            });
            
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`section_${sectionKey}`)
                    .setLabel(section.label)
                    .setEmoji(section.icon)
                    .setStyle(isConfigured ? ButtonStyle.Success : ButtonStyle.Primary)
            );
        });
        
        if (row.components.length > 0) {
            rows.push(row);
        }
    }

    // Bouton retour
    rows.push(
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_main')
                    .setLabel('Retour au tableau de bord')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Secondary)
            )
    );

    await interaction.update({
        embeds: [embed],
        components: rows
    });
}

async function createSectionEmbed(sectionKey, section, guild) {
    const config = configManager.getConfig();
    // Utiliser dataSection si défini, sinon utiliser sectionKey
    const dataKey = section.dataSection || sectionKey;
    const sectionConfig = config[dataKey] || {};

    const embed = new EmbedBuilder()
        .setTitle(`${section.icon} Configuration - ${section.label}`)
        .setDescription('**Éditeur de section**\n\nConfigurez les paramètres ci-dessous selon vos besoins.')
        .setColor('#5865F2')
        .setFooter({ text: `Section: ${sectionKey}` });

    // Affichage standard pour toutes les sections
    Object.entries(section.fields).forEach(([fieldKey, field]) => {
        const currentValue = getNestedValue(sectionConfig, fieldKey);
        const displayValue = formatDisplayValue(currentValue, field.type);
        const status = (currentValue !== undefined && currentValue !== '' && currentValue !== false) ? '✅' : '⚙️';
        
        embed.addFields({
            name: `${status} ${field.label}`,
            value: `**Valeur:** ${displayValue}\n*${field.description}*`,
            inline: false
        });
    });
    
    return embed;
}

async function showSectionEditor(interaction, sectionKey) {
    const section = CONFIG_SECTIONS[sectionKey];
    if (!section) return;

    const embed = await createSectionEmbed(sectionKey, section, interaction.guild);

    // Créer les composants interactifs pour chaque type de champ
    const components = await createFieldComponents(sectionKey, section.fields, section, interaction.guild);

    // Bouton retour - s'assurer qu'on ne dépasse pas 5 ActionRows
    if (components.length < 5) {
        components.push(
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back_to_category')
                        .setLabel('Retour à la catégorie')
                        .setEmoji('⬅️')
                        .setStyle(ButtonStyle.Secondary)
                )
        );
    } else {
        // Si on a déjà 5 lignes, ajouter le bouton retour à la dernière ligne
        const lastRow = components[components.length - 1];
        if (lastRow.components.length < 5) { // Discord permet max 5 boutons par ligne
            lastRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_category')
                    .setLabel('Retour')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
    }

    await interaction.update({
        embeds: [embed],
        components: components
    });
}

async function createFieldComponents(sectionKey, fields, section, guild) {
    // Récupérer la config avec la bonne section
    const config = configManager.getConfig();
    const dataKey = section.dataSection || sectionKey;
    const sectionConfig = config[dataKey] || {};
    const components = [];
    
    // Grouper les champs par type et catégorie pour une meilleure UX
    const channelFields = [];
    const roleFields = [];
    const otherFields = [];
    const fieldsByCategory = {};
    
    Object.entries(fields).forEach(([fieldKey, field]) => {
        if (field.type === 'channel' || field.type === 'category' || field.type === 'multi-channel') {
            channelFields.push([fieldKey, field]);
        } else if (field.type === 'role' || field.type === 'multi-role') {
            roleFields.push([fieldKey, field]);
        } else {
            otherFields.push([fieldKey, field]);
        }
        
        // Les catégories ne sont plus nécessaires avec les sections séparées
    });

    // Boutons individuels pour chaque champ channel/category
    if (channelFields.length > 0) {
        const buttonsPerRow = 3; // Augmenter pour respecter la limite de 5 ActionRows
        for (let i = 0; i < channelFields.length; i += buttonsPerRow) {
            const row = new ActionRowBuilder();
            const fieldsSlice = channelFields.slice(i, i + buttonsPerRow);
            
            fieldsSlice.forEach(([fieldKey, field]) => {
                const currentValue = getNestedValue(sectionConfig, fieldKey);
                let isConfigured = currentValue !== undefined && currentValue !== '' && currentValue !== false;
                
                // Pour les types multi, vérifier si c'est un tableau avec des éléments
                if (field.type === 'multi-channel') {
                    isConfigured = Array.isArray(currentValue) && currentValue.length > 0;
                }
                
                const customId = field.type === 'multi-channel' 
                    ? `configure_multi_channel_${sectionKey}_${fieldKey}`
                    : `configure_channel_${sectionKey}_${fieldKey}`;
                
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(customId)
                        .setLabel(field.label)
                        .setEmoji(field.type === 'multi-channel' ? '📋' : '🔗')
                        .setStyle(isConfigured ? ButtonStyle.Success : ButtonStyle.Primary)
                );
            });
            
            components.push(row);
        }
    }

    // Boutons individuels pour chaque champ role
    if (roleFields.length > 0) {
        const buttonsPerRow = 3;
        for (let i = 0; i < roleFields.length; i += buttonsPerRow) {
            const row = new ActionRowBuilder();
            const fieldsSlice = roleFields.slice(i, i + buttonsPerRow);
            
            fieldsSlice.forEach(([fieldKey, field]) => {
                const currentValue = getNestedValue(sectionConfig, fieldKey);
                let isConfigured = currentValue !== undefined && currentValue !== '' && currentValue !== false;
                
                // Pour les types multi, vérifier si c'est un tableau avec des éléments
                if (field.type === 'multi-role') {
                    isConfigured = Array.isArray(currentValue) && currentValue.length > 0;
                }
                
                const customId = field.type === 'multi-role' 
                    ? `configure_multi_role_${sectionKey}_${fieldKey}`
                    : `configure_role_${sectionKey}_${fieldKey}`;
                
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(customId)
                        .setLabel(field.label)
                        .setEmoji(field.type === 'multi-role' ? '📋' : '👥')
                        .setStyle(isConfigured ? ButtonStyle.Success : ButtonStyle.Primary)
                );
            });
            
            components.push(row);
        }
    }

    // Boutons pour les autres types
    if (otherFields.length > 0) {
        const buttonsPerRow = 3;
        for (let i = 0; i < otherFields.length; i += buttonsPerRow) {
            const row = new ActionRowBuilder();
            const fieldsSlice = otherFields.slice(i, i + buttonsPerRow);
            
            fieldsSlice.forEach(([fieldKey, field]) => {
                const currentValue = getNestedValue(sectionConfig, fieldKey);
                const isConfigured = currentValue !== undefined && currentValue !== '' && currentValue !== false;
                
                let buttonStyle = ButtonStyle.Primary;
                let emoji = '⚙️';
                
                if (field.type === 'toggle') {
                    buttonStyle = currentValue ? ButtonStyle.Success : ButtonStyle.Secondary;
                    emoji = currentValue ? '✅' : '❌';
                } else if (field.type === 'special') {
                    buttonStyle = ButtonStyle.Secondary;
                    emoji = '🔧';
                } else if (isConfigured) {
                    buttonStyle = ButtonStyle.Success;
                    emoji = '✅';
                }
                
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`field_${field.type}_${sectionKey}_${fieldKey}`)
                        .setLabel(field.label)
                        .setEmoji(emoji)
                        .setStyle(buttonStyle)
                );
            });
            
            components.push(row);
        }
    }

    // Vérification de sécurité : ne jamais dépasser 5 ActionRows
    if (components.length > 5) {
        console.warn(`[CONFIG] Trop de composants générés (${components.length}), limitation à 5`);
        return components.slice(0, 5);
    }

    return components;
}

async function handleFieldInteraction(interaction) {
    // Parse field interaction avec pattern field_type_sectionKey_fieldKey
    const parts = interaction.customId.split('_');
    const type = parts[1];
    
    // Pour field interactions, on a besoin de parser à partir de parts[2]
    const remainingParts = parts.slice(2);
    const possibleSections = Object.keys(CONFIG_SECTIONS);
    
    let sectionKey = null;
    let fieldKey = null;
    
    // Chercher la section dans les parts restantes
    for (const section of possibleSections) {
        if (remainingParts[0] === section) {
            sectionKey = section;
            fieldKey = remainingParts.slice(1).join('_');
            break;
        }
        // Vérifier si la section a des underscores et correspond
        const sectionParts = section.split('_');
        if (sectionParts.length > 1 && remainingParts.slice(0, sectionParts.length).join('_') === section) {
            sectionKey = section;
            fieldKey = remainingParts.slice(sectionParts.length).join('_');
            break;
        }
    }
    
    // Fallback si aucune section trouvée
    if (!sectionKey) {
        sectionKey = remainingParts[0];
        fieldKey = remainingParts.slice(1).join('_');
    }
    
    if (type === 'channel') {
        await handleChannelSelection(interaction, sectionKey);
    } else if (type === 'role') {
        await handleRoleSelection(interaction, sectionKey);
    } else if (type === 'toggle') {
        await handleToggleField(interaction, sectionKey, fieldKey);
    } else if (type === 'text' || type === 'number') {
        await showTextModal(interaction, sectionKey, fieldKey, type);
    } else if (type === 'special') {
        await handleSpecialField(interaction, sectionKey, fieldKey);
    }
}

async function handleSpecificChannelSelection(interaction) {
    try {
        // Vérifier l'état de l'interaction
        if (!isInteractionValid(interaction)) {
            console.log('[CONFIG] handleSpecificChannelSelection - Interaction non valide, abandon');
            return;
        }

        const selectedChannel = interaction.channels.first();
        if (!selectedChannel) return;
        
        // Parse customId avec support des sections complexes
        const { sectionKey, fieldKey } = parseComplexCustomId(interaction.customId, 'select_channel_');
        const section = CONFIG_SECTIONS[sectionKey];
        const field = section.fields[fieldKey];
        
        if (!section || !field) {
            console.error('[CONFIG] Section ou field introuvable:', sectionKey, fieldKey);
            return;
        }
        
        // Afficher une demande de confirmation avec des boutons
        const embed = new EmbedBuilder()
            .setTitle('🔄 Confirmation de Modification')
            .setDescription(`**Voulez-vous définir le canal suivant ?**\n\n**${field.label}**\n${selectedChannel}\n\n*${field.description}*`)
            .setColor('#FEE75C')
            .addFields({
                name: '💡 Information',
                value: 'Cette modification sera sauvegardée immédiatement.',
                inline: false
            });

        const confirmRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_channel_${sectionKey}_${fieldKey}_${selectedChannel.id}`)
                    .setLabel('✅ Confirmer')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`cancel_change_${sectionKey}`)
                    .setLabel('❌ Annuler')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.update({
            embeds: [embed],
            components: [confirmRow]
        });
    } catch (error) {
        console.error('[CONFIG] Erreur dans handleSpecificChannelSelection:', error);
        
        // Gérer spécifiquement l'erreur 10062
        if (error.code === 10062) {
            console.log('[CONFIG] Interaction expirée dans handleSpecificChannelSelection, ignorée');
            return;
        }
        
        throw error; // Relancer pour gestion par le collector
    }
}

async function handleSpecificRoleSelection(interaction) {
    try {
        // Vérifier l'état de l'interaction
        if (!isInteractionValid(interaction)) {
            console.log('[CONFIG] handleSpecificRoleSelection - Interaction non valide, abandon');
            return;
        }

        const selectedRole = interaction.roles.first();
        if (!selectedRole) return;
        
        // Parse customId avec support des sections complexes
        const { sectionKey, fieldKey } = parseComplexCustomId(interaction.customId, 'select_role_');
        const section = CONFIG_SECTIONS[sectionKey];
        const field = section.fields[fieldKey];
        
        if (!section || !field) {
            console.error('[CONFIG] Section ou field introuvable:', sectionKey, fieldKey);
            return;
        }
        
        // Afficher une demande de confirmation avec des boutons
        const embed = new EmbedBuilder()
            .setTitle('🔄 Confirmation de Modification')
            .setDescription(`**Voulez-vous définir le rôle suivant ?**\n\n**${field.label}**\n${selectedRole}\n\n*${field.description}*`)
            .setColor('#FEE75C')
            .addFields({
                name: '💡 Information',
                value: 'Cette modification sera sauvegardée immédiatement.',
                inline: false
            });

        const confirmRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_role_${sectionKey}_${fieldKey}_${selectedRole.id}`)
                    .setLabel('✅ Confirmer')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`cancel_change_${sectionKey}`)
                    .setLabel('❌ Annuler')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.update({
            embeds: [embed],
            components: [confirmRow]
        });
    } catch (error) {
        console.error('[CONFIG] Erreur dans handleSpecificRoleSelection:', error);
        
        // Gérer spécifiquement l'erreur 10062
        if (error.code === 10062) {
            console.log('[CONFIG] Interaction expirée dans handleSpecificRoleSelection, ignorée');
            return;
        }
        
        throw error; // Relancer pour gestion par le collector
    }
}

// Garde l'ancienne fonction pour compatibilité
async function handleChannelSelection(interaction, sectionKey) {
    const selectedChannel = interaction.channels.first();
    if (!selectedChannel) return;

    const section = CONFIG_SECTIONS[sectionKey];
    const channelFieldKey = Object.keys(section.fields).find(key => 
        section.fields[key].type === 'channel' || section.fields[key].type === 'category'
    );
    
    if (!channelFieldKey) return;

    // Afficher une demande de confirmation avec des boutons
    const field = section.fields[channelFieldKey];
    const embed = new EmbedBuilder()
        .setTitle('🔄 Confirmation de Modification')
        .setDescription(`**Voulez-vous définir le canal suivant ?**\n\n**${field.label}**\n${selectedChannel}\n\n*${field.description}*`)
        .setColor('#FEE75C')
        .addFields({
            name: '💡 Information',
            value: 'Cette modification sera sauvegardée immédiatement.',
            inline: false
        });

    const confirmRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`confirm_channel_${sectionKey}_${channelFieldKey}_${selectedChannel.id}`)
                .setLabel('✅ Confirmer')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`cancel_change_${sectionKey}`)
                .setLabel('❌ Annuler')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.update({
        embeds: [embed],
        components: [confirmRow]
    });
    
    // Actualiser l'affichage après 2 secondes
    setTimeout(async () => {
        try {
            // Vérifier si l'interaction est toujours valide
            if (!interaction.isRepliable()) {
                console.log('[CONFIG] Interaction expirée, impossible de rafraîchir');
                return;
            }
            const section = CONFIG_SECTIONS[sectionKey];
            if (!section) return;
            
            const config = configManager.getConfig();
            const sectionConfig = config[sectionKey] || {};
            
            const embed = new EmbedBuilder()
                .setTitle(`${section.icon} Configuration - ${section.label}`)
                .setDescription('**Éditeur de section**\n\nConfigurez les paramètres ci-dessous selon vos besoins.')
                .setColor('#5865F2')
                .setFooter({ text: `Section: ${sectionKey}` });
            
            // Afficher tous les champs avec leur état actuel
            Object.entries(section.fields).forEach(([fieldKey, field]) => {
                const currentValue = getNestedValue(sectionConfig, fieldKey);
                const displayValue = formatDisplayValue(currentValue, field.type);
                const status = (currentValue !== undefined && currentValue !== '' && currentValue !== false) ? '✅' : '⚙️';
                
                embed.addFields({
                    name: `${status} ${field.label}`,
                    value: `**Valeur:** ${displayValue}\n*${field.description}*`,
                    inline: false
                });
            });
            
            const components = await createFieldComponents(sectionKey, section.fields, sectionConfig, interaction.guild);
            
            // Bouton retour
            components.push(
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('back_to_category')
                            .setLabel('Retour à la catégorie')
                            .setEmoji('⬅️')
                            .setStyle(ButtonStyle.Secondary)
                    )
            );
            
            await interaction.editReply({
                content: null,
                embeds: [embed],
                components: components
            });
        } catch (error) {
            console.error('[CONFIG] Erreur lors du rafraîchissement:', error);
        }
    }, 2000);
}

async function handleRoleSelection(interaction, sectionKey) {
    const selectedRole = interaction.roles.first();
    if (!selectedRole) return;

    const section = CONFIG_SECTIONS[sectionKey];
    const roleFieldKey = Object.keys(section.fields).find(key => 
        section.fields[key].type === 'role'
    );
    
    if (!roleFieldKey) return;

    // Afficher une demande de confirmation avec des boutons
    const field = section.fields[roleFieldKey];
    const embed = new EmbedBuilder()
        .setTitle('🔄 Confirmation de Modification')
        .setDescription(`**Voulez-vous définir le rôle suivant ?**\n\n**${field.label}**\n${selectedRole}\n\n*${field.description}*`)
        .setColor('#FEE75C')
        .addFields({
            name: '💡 Information',
            value: 'Cette modification sera sauvegardée immédiatement.',
            inline: false
        });

    const confirmRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`confirm_role_${sectionKey}_${roleFieldKey}_${selectedRole.id}`)
                .setLabel('✅ Confirmer')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`cancel_change_${sectionKey}`)
                .setLabel('❌ Annuler')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.update({
        embeds: [embed],
        components: [confirmRow]
    });
    
    setTimeout(async () => {
        try {
            const section = CONFIG_SECTIONS[sectionKey];
            if (!section) return;
            
            const config = configManager.getConfig();
            const sectionConfig = config[sectionKey] || {};
            
            const embed = new EmbedBuilder()
                .setTitle(`${section.icon} Configuration - ${section.label}`)
                .setDescription('**Éditeur de section**\n\nConfigurez les paramètres ci-dessous selon vos besoins.')
                .setColor('#5865F2')
                .setFooter({ text: `Section: ${sectionKey}` });
            
            // Afficher tous les champs avec leur état actuel
            Object.entries(section.fields).forEach(([fieldKey, field]) => {
                const currentValue = getNestedValue(sectionConfig, fieldKey);
                const displayValue = formatDisplayValue(currentValue, field.type);
                const status = (currentValue !== undefined && currentValue !== '' && currentValue !== false) ? '✅' : '⚙️';
                
                embed.addFields({
                    name: `${status} ${field.label}`,
                    value: `**Valeur:** ${displayValue}\n*${field.description}*`,
                    inline: false
                });
            });
            
            const components = await createFieldComponents(sectionKey, section.fields, sectionConfig, interaction.guild);
            
            // Bouton retour
            components.push(
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('back_to_category')
                            .setLabel('Retour à la catégorie')
                            .setEmoji('⬅️')
                            .setStyle(ButtonStyle.Secondary)
                    )
            );
            
            await interaction.editReply({
                content: null,
                embeds: [embed],
                components: components
            });
        } catch (error) {
            console.error('[CONFIG] Erreur lors du rafraîchissement:', error);
        }
    }, 2000);
}

async function handleToggleField(interaction, sectionKey, fieldKey) {
    const config = configManager.getConfig();
    const currentValue = getNestedValue(config[sectionKey] || {}, fieldKey);
    const newValue = !currentValue;
    
    const section = CONFIG_SECTIONS[sectionKey];
    const field = section.fields[fieldKey];
    
    // Afficher une demande de confirmation avec des boutons
    const embed = new EmbedBuilder()
        .setTitle('🔄 Confirmation de Modification')
        .setDescription(`**Voulez-vous ${newValue ? 'activer' : 'désactiver'} cette fonctionnalité ?**\n\n**${field.label}**\n\n*${field.description}*`)
        .setColor(newValue ? '#57F287' : '#ED4245')
        .addFields({
            name: '💡 Information',
            value: 'Cette modification sera sauvegardée immédiatement.',
            inline: false
        });

    const confirmRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`confirm_toggle_${sectionKey}_${fieldKey}_${newValue}`)
                .setLabel(`${newValue ? '✅ Activer' : '❌ Désactiver'}`)
                .setStyle(newValue ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`cancel_change_${sectionKey}`)
                .setLabel('🔄 Annuler')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({
        embeds: [embed],
        components: [confirmRow]
    });
    
    setTimeout(async () => {
        try {
            const section = CONFIG_SECTIONS[sectionKey];
            if (!section) return;
            
            const config = configManager.getConfig();
            const sectionConfig = config[sectionKey] || {};
            
            const embed = new EmbedBuilder()
                .setTitle(`${section.icon} Configuration - ${section.label}`)
                .setDescription('**Éditeur de section**\n\nConfigurez les paramètres ci-dessous selon vos besoins.')
                .setColor('#5865F2')
                .setFooter({ text: `Section: ${sectionKey}` });
            
            // Afficher tous les champs avec leur état actuel
            Object.entries(section.fields).forEach(([fieldKey, field]) => {
                const currentValue = getNestedValue(sectionConfig, fieldKey);
                const displayValue = formatDisplayValue(currentValue, field.type);
                const status = (currentValue !== undefined && currentValue !== '' && currentValue !== false) ? '✅' : '⚙️';
                
                embed.addFields({
                    name: `${status} ${field.label}`,
                    value: `**Valeur:** ${displayValue}\n*${field.description}*`,
                    inline: false
                });
            });
            
            const components = await createFieldComponents(sectionKey, section.fields, sectionConfig, interaction.guild);
            
            // Bouton retour
            components.push(
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('back_to_category')
                            .setLabel('Retour à la catégorie')
                            .setEmoji('⬅️')
                            .setStyle(ButtonStyle.Secondary)
                    )
            );
            
            await interaction.editReply({
                content: null,
                embeds: [embed],
                components: components
            });
        } catch (error) {
            console.error('[CONFIG] Erreur lors du rafraîchissement:', error);
        }
    }, 2000);
}

async function showTextModal(interaction, sectionKey, fieldKey, type) {
    const section = CONFIG_SECTIONS[sectionKey];
    const field = section.fields[fieldKey];
    const config = configManager.getConfig();
    const currentValue = getNestedValue(config[sectionKey] || {}, fieldKey);
    
    const modal = new ModalBuilder()
        .setCustomId(`config_modal_${sectionKey}_${fieldKey}`)
        .setTitle(`✏️ Modifier ${field.label}`);

    const input = new TextInputBuilder()
        .setCustomId('field_value')
        .setLabel(field.label)
        .setStyle(field.description.length > 100 ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setPlaceholder(getPlaceholder(field.type))
        .setValue(currentValue ? currentValue.toString() : '')
        .setRequired(false);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
}

// Fonctions utilitaires
function getConfigStats(config) {
    let totalSections = Object.keys(CONFIG_SECTIONS).length;
    let configuredSections = 0;
    let totalFields = 0;
    let configuredFields = 0;
    
    Object.entries(CONFIG_SECTIONS).forEach(([sectionKey, section]) => {
        const sectionConfig = config[sectionKey] || {};
        let sectionHasConfig = false;
        
        Object.entries(section.fields).forEach(([fieldKey, field]) => {
            totalFields++;
            const value = getNestedValue(sectionConfig, fieldKey);
            if (value !== undefined && value !== '' && value !== false) {
                configuredFields++;
                sectionHasConfig = true;
            }
        });
        
        if (sectionHasConfig) configuredSections++;
    });
    
    const completionPercentage = Math.round((configuredFields / totalFields) * 100);
    let status = '🔴 Non configuré';
    
    if (completionPercentage >= 80) status = '🟢 Complètement configuré';
    else if (completionPercentage >= 50) status = '🟡 Partiellement configuré';
    else if (completionPercentage > 0) status = '🟠 Configuration minimale';
    
    return {
        totalSections,
        configuredSections,
        totalFields,
        configuredFields,
        completionPercentage,
        status
    };
}

// Parse customId with complex section names (e.g., role_logs, message_logs)
function parseComplexCustomId(customId, prefix, includeExtraData = false) {
    const suffix = customId.replace(prefix, '');
    
    // Liste des sections possibles avec underscores
    const possibleSections = Object.keys(CONFIG_SECTIONS);
    
    // Trouver la section correspondante
    for (const section of possibleSections) {
        if (suffix.startsWith(section + '_')) {
            const remainder = suffix.replace(section + '_', '');
            
            if (includeExtraData) {
                // Pour les patterns comme confirm_channel_section_field_value
                const parts = remainder.split('_');
                return {
                    sectionKey: section,
                    fieldKey: parts[0],
                    extraData: parts.slice(1)
                };
            } else {
                // Pour les patterns normaux
                return {
                    sectionKey: section,
                    fieldKey: remainder
                };
            }
        }
    }
    
    // Fallback vers l'ancien parsing si aucune section complexe trouvée
    const parts = customId.split('_');
    const prefixParts = prefix.split('_').length - 1; // Nombre de parts du prefix (moins 1 pour l'underscore final)
    
    if (includeExtraData) {
        return {
            sectionKey: parts[prefixParts],
            fieldKey: parts[prefixParts + 1],
            extraData: parts.slice(prefixParts + 2)
        };
    } else {
        return {
            sectionKey: parts[prefixParts],
            fieldKey: parts.slice(prefixParts + 1).join('_')
        };
    }
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
        if (!current[key]) current[key] = {};
        return current[key];
    }, obj);
    target[lastKey] = value;
}

async function updateConfigField(sectionKey, fieldKey, value, section = null) {
    const config = configManager.getConfig();
    
    // Utiliser dataSection si fourni dans l'objet section
    const dataKey = (section && section.dataSection) || sectionKey;
    
    if (!config[dataKey]) {
        config[dataKey] = {};
    }
    
    setNestedValue(config[dataKey], fieldKey, value);
    await configManager.updateConfig(config);
}

function formatDisplayValue(value, type) {
    if (value === undefined || value === null || value === '') {
        return '*Non configuré*';
    }
    
    switch (type) {
        case 'channel':
        case 'category':
            return `<#${value}>`;
        case 'multi-channel':
            if (Array.isArray(value) && value.length > 0) {
                return value.map(id => `<#${id}>`).join(', ');
            }
            return '*Aucun canal*';
        case 'role':
            return `<@&${value}>`;
        case 'multi-role':
            if (Array.isArray(value) && value.length > 0) {
                return value.map(id => `<@&${id}>`).join(', ');
            }
            return '*Aucun rôle*';
        case 'toggle':
            return value ? '✅ Activé' : '❌ Désactivé';
        case 'number':
            return `\`${value}\``;
        default:
            return value.length > 100 ? `\`${value.substring(0, 97)}...\`` : `\`${value}\``;
    }
}

function getPlaceholder(type) {
    const placeholders = {
        text: 'Entrez votre texte...',
        number: 'Entrez un nombre...',
        channel: 'ID du canal',
        role: 'ID du rôle',
        category: 'ID de la catégorie',
        toggle: 'true/false'
    };
    return placeholders[type] || 'Entrez une valeur...';
}

async function handleSpecialField(interaction, sectionKey, fieldKey) {
    if (sectionKey === 'entryModal' && fieldKey === 'fields.manage') {
        await showModalFieldsManager(interaction);
    }
}

async function showModalFieldsManager(interaction, successMessage = null) {
    const config = configManager.getConfig();
    const entryModal = config.entryModal || { fields: [] };
    
    const description = successMessage 
        ? `${successMessage}\n\n**Configuration avancée des champs du formulaire d'entrée**\n\nGérez facilement les champs de votre modal d'entrée avec cette interface intuitive.`
        : '**Configuration avancée des champs du formulaire d\'entrée**\n\nGérez facilement les champs de votre modal d\'entrée avec cette interface intuitive.';
    
    const embed = new EmbedBuilder()
        .setTitle('🔧 Gestionnaire des Champs du Modal')
        .setDescription(description)
        .setColor('#5865F2')
        .setFooter({ text: 'Modal Fields Manager • Utilisez les boutons ci-dessous' });

    // Afficher les champs existants
    if (entryModal.fields && entryModal.fields.length > 0) {
        const fieldsText = entryModal.fields.map((field, index) => {
            const requiredIcon = field.required ? '🔴' : '⚪';
            const styleIcon = field.style === 'Short' ? '📝' : '📄';
            return `${index + 1}. ${requiredIcon} ${styleIcon} **${field.label}**\n   \`${field.customId}\` • ${field.style} • ${field.required ? 'Obligatoire' : 'Optionnel'}`;
        }).join('\n\n');
        
        embed.addFields({
            name: '📋 Champs Configurés',
            value: fieldsText,
            inline: false
        });
    } else {
        embed.addFields({
            name: '📋 Champs Configurés',
            value: '*Aucun champ configuré*',
            inline: false
        });
    }

    // Légende
    embed.addFields({
        name: '📖 Légende',
        value: '🔴 Obligatoire • ⚪ Optionnel\n📝 Texte court • 📄 Texte long\n\n**Limite:** 5 champs maximum par modal Discord',
        inline: false
    });

    const components = [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('modal_field_add')
                    .setLabel('Ajouter un Champ')
                    .setEmoji('➕')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(entryModal.fields?.length >= 5),
                new ButtonBuilder()
                    .setCustomId('modal_field_edit')
                    .setLabel('Modifier un Champ')
                    .setEmoji('✏️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!entryModal.fields?.length),
                new ButtonBuilder()
                    .setCustomId('modal_field_delete')
                    .setLabel('Supprimer un Champ')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!entryModal.fields?.length)
            ),
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('modal_field_preview')
                    .setLabel('Aperçu du Modal')
                    .setEmoji('👁️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('modal_field_reset')
                    .setLabel('Réinitialiser')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('back_to_category')
                    .setLabel('Retour')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Secondary)
            )
    ];

    await interaction.update({
        embeds: [embed],
        components: components
    });

    // Nested collector removed. Logic moved to the main collector in showMainDashboard.
}

async function showAddFieldModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('add_modal_field')
        .setTitle('➕ Ajouter un Champ');

    const labelInput = new TextInputBuilder()
        .setCustomId('field_label')
        .setLabel('Libellé du champ')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: Quel est votre pseudo ?')
        .setRequired(true)
        .setMaxLength(45);

    const customIdInput = new TextInputBuilder()
        .setCustomId('field_custom_id')
        .setLabel('ID personnalisé (technique)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: pseudo_input')
        .setRequired(true)
        .setMaxLength(100);

    const placeholderInput = new TextInputBuilder()
        .setCustomId('field_placeholder')
        .setLabel('Texte d\'aide (optionnel)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: Entrez votre pseudo principal')
        .setRequired(false)
        .setMaxLength(100);

    const styleInput = new TextInputBuilder()
        .setCustomId('field_style')
        .setLabel('Type de champ')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Short ou Paragraph')
        .setValue('Short')
        .setRequired(true);

    const requiredInput = new TextInputBuilder()
        .setCustomId('field_required')
        .setLabel('Champ obligatoire ?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('true ou false')
        .setValue('true')
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(labelInput),
        new ActionRowBuilder().addComponents(customIdInput),
        new ActionRowBuilder().addComponents(placeholderInput),
        new ActionRowBuilder().addComponents(styleInput),
        new ActionRowBuilder().addComponents(requiredInput)
    );

    await interaction.showModal(modal);
}

async function showEditFieldSelector(interaction) {
    const config = configManager.getConfig();
    const entryModal = config.entry?.modal || { fields: [] };
    
    if (!entryModal.fields || entryModal.fields.length === 0) {
        return interaction.update({
            content: '❌ Aucun champ à modifier.',
            embeds: interaction.message.embeds,
            components: interaction.message.components
        });
    }
    
    const options = entryModal.fields.map((field, index) => ({
        label: field.label || `Champ ${index + 1}`,
        value: `edit_field_${index}`,
        description: `ID: ${field.customId || 'non défini'}`,
        emoji: '✏️'
    }));
    
    const select = new StringSelectMenuBuilder()
        .setCustomId('select_field_to_edit')
        .setPlaceholder('Choisissez un champ à modifier')
        .addOptions(options);
    
    const row = new ActionRowBuilder().addComponents(select);
    
    await interaction.update({
        content: '✏️ **Sélectionnez le champ à modifier:**',
        embeds: [],
        components: [row]
    });
}

async function showDeleteFieldSelector(interaction) {
    const config = configManager.getConfig();
    const entryModal = config.entry?.modal || { fields: [] };
    
    if (!entryModal.fields || entryModal.fields.length === 0) {
        return interaction.update({
            content: '❌ Aucun champ à supprimer.',
            embeds: interaction.message.embeds,
            components: interaction.message.components
        });
    }
    
    const options = entryModal.fields.map((field, index) => ({
        label: field.label || `Champ ${index + 1}`,
        value: `delete_field_${index}`,
        description: `ID: ${field.customId || 'non défini'}`,
        emoji: '🗑️'
    }));
    
    const select = new StringSelectMenuBuilder()
        .setCustomId('select_field_to_delete')
        .setPlaceholder('Choisissez un champ à supprimer')
        .addOptions(options);
    
    const row = new ActionRowBuilder().addComponents(select);
    
    await interaction.update({
        content: '🗑️ **Sélectionnez le champ à supprimer:**',
        embeds: [],
        components: [row]
    });
}

async function showModalPreview(interaction) {
    const config = configManager.getConfig();
    const entryModal = config.entry?.modal || { fields: [] };
    
    if (!entryModal.fields || entryModal.fields.length === 0) {
        return interaction.update({
            content: '❌ Aucun champ dans le modal.',
            embeds: interaction.message.embeds,
            components: interaction.message.components
        });
    }
    
    try {
        const modal = new ModalBuilder()
            .setCustomId('preview_modal')
            .setTitle(entryModal.title || 'Aperçu du Modal');
        
        entryModal.fields.slice(0, 5).forEach(field => {
            const input = new TextInputBuilder()
                .setCustomId(field.customId || `field_${Date.now()}`)
                .setLabel(field.label || 'Champ sans nom')
                .setStyle(field.style === 'Paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
                .setRequired(field.required !== false);
            
            if (field.placeholder) input.setPlaceholder(field.placeholder);
            if (field.minLength) input.setMinLength(field.minLength);
            if (field.maxLength) input.setMaxLength(field.maxLength);
            if (field.value) input.setValue(field.value);
            
            modal.addComponents(new ActionRowBuilder().addComponents(input));
        });
        
        await interaction.showModal(modal);
    } catch (error) {
        console.error('[CONFIG] Erreur aperçu modal:', error);
        await interaction.update({
            content: '❌ Impossible d\'afficher l\'aperçu du modal.',
            embeds: interaction.message.embeds,
            components: interaction.message.components
        });
    }
}

async function showCompleteView(interaction) {
    const config = configManager.getConfig();
    
    const embed = new EmbedBuilder()
        .setTitle('📋 Configuration Complète')
        .setDescription('**Vue d\'ensemble de toute la configuration**')
        .setColor('#2b2d31')
        .setTimestamp();
    
    Object.entries(CONFIG_CATEGORIES).forEach(([categoryKey, category]) => {
        const sections = category.sections.map(sectionKey => {
            const section = CONFIG_SECTIONS[sectionKey];
            const sectionConfig = config[sectionKey] || {};
            const configuredCount = Object.keys(section.fields).filter(fieldKey => {
                const value = getNestedValue(sectionConfig, fieldKey);
                return value !== undefined && value !== '' && value !== false;
            }).length;
            
            return `${section.icon} ${section.label}: ${configuredCount}/${Object.keys(section.fields).length}`;
        });
        
        embed.addFields({
            name: `${category.icon} ${category.label}`,
            value: sections.join('\n') || '*Aucune section*',
            inline: true
        });
    });
    
    await interaction.update({
        embeds: [embed],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back_to_main')
                        .setLabel('Retour')
                        .setEmoji('⬅️')
                        .setStyle(ButtonStyle.Secondary)
                )
        ]
    });
}

async function exportConfiguration(interaction) {
    await interaction.deferUpdate();
    
    const config = configManager.getConfig();
    const configString = JSON.stringify(config, null, 2);
    const buffer = Buffer.from(configString, 'utf8');
    
    await interaction.followUp({
        content: '📤 **Export de Configuration**\n\nVoici votre fichier de configuration actuel au format JSON.',
        files: [{
            attachment: buffer,
            name: `config-${interaction.guild.id}-${Date.now()}.json`
        }],
        flags: 64
    });
}

async function showImportModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('config_import_modal')
        .setTitle('📥 Importer une Configuration');

    const input = new TextInputBuilder()
        .setCustomId('config_json')
        .setLabel('Configuration JSON')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Collez votre configuration JSON ici...')
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
}

async function showResetConfirmation(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('⚠️ Confirmation de Réinitialisation')
        .setDescription('**Attention !** Cette action va réinitialiser toute la configuration.\n\nÊtes-vous sûr de vouloir continuer ?')
        .setColor('#ED4245');

    await interaction.update({
        embeds: [embed],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_reset')
                        .setLabel('Confirmer')
                        .setEmoji('⚠️')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('back_to_main')
                        .setLabel('Annuler')
                        .setEmoji('❌')
                        .setStyle(ButtonStyle.Secondary)
                )
        ]
    });
}

async function showMainDashboardUpdate(interaction) {
    const config = configManager.getConfig();
    const stats = getConfigStats(config);
    
    const embed = new EmbedBuilder()
        .setTitle('🎛️ Tableau de Bord - Configuration')
        .setDescription('**Interface moderne de gestion du serveur**\n\nNaviguez par catégories pour configurer votre serveur avec une interface intuitive et moderne.')
        .setColor('#2b2d31')
        .setThumbnail(interaction.guild?.iconURL({ size: 256 }) || null)
        .addFields([
            {
                name: '📊 Statistiques de Configuration',
                // CORRECTION ICI
                value: `\`\`\`yaml\nSections configurées: ${stats.configuredSections}/${stats.totalSections}\nChamps remplis: ${stats.configuredFields}/${stats.totalFields}\nComplétion: ${stats.completionPercentage}%\nStatut: ${stats.status}\n\`\`\``,
                inline: false
            },
            {
                name: '🔧 Actions Rapides',
                // CORRECTION ICI
                value: '• Sélectionnez une catégorie ci-dessous\n• Utilisez les boutons pour des actions rapides\n• Toutes les modifications sont sauvegardées automatiquement',
                inline: false
            }
        ])
        .setFooter({ 
            text: `💡 Interface V2.0 • Dernière MAJ: ${new Date().toLocaleString('fr-FR')}`, 
            iconURL: interaction.client.user.displayAvatarURL() 
        })
        .setTimestamp();

    const components = [
        createCategorySelectMenu(),
        createQuickActionsRow()
    ];

    await interaction.update({
        embeds: [embed],
        components: components
    });
}
async function handleChannelConfirmation(interaction) {
    try {
        // Vérifier l'état de l'interaction
        if (!isInteractionValid(interaction)) {
            console.log('[CONFIG] handleChannelConfirmation - Interaction non valide, abandon');
            return;
        }

        // Parse customId avec support des sections complexes
        const { sectionKey, fieldKey, extraData } = parseComplexCustomId(interaction.customId, 'confirm_channel_', true);
        const channelId = extraData[0];
        
        const section = CONFIG_SECTIONS[sectionKey];
        await updateConfigField(sectionKey, fieldKey, channelId, section);
        const field = section.fields[fieldKey];
        const channel = interaction.guild.channels.cache.get(channelId);
        
        await interaction.update({
            content: `✅ **${field.label}** configuré avec succès sur ${channel}`,
            embeds: [],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`back_to_section_${sectionKey}`)
                            .setLabel('Retour à la section')
                            .setEmoji('⬅️')
                            .setStyle(ButtonStyle.Primary)
                    )
            ]
        });
        
        // Retour automatique après 3 secondes
        setTimeout(async () => {
            try {
                if (!isInteractionValid(interaction)) return;
                
                // Créer le contenu de la section directement sans utiliser showSectionEditor
                const section = CONFIG_SECTIONS[sectionKey];
                const embed = await createSectionEmbed(sectionKey, section, interaction.guild);
                const components = await createFieldComponents(sectionKey, section.fields, section, interaction.guild);
                
                // Ajouter le bouton de retour
                components.push(
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('back_to_category')
                                .setLabel('Retour à la catégorie')
                                .setEmoji('⬅️')
                                .setStyle(ButtonStyle.Secondary)
                        )
                );
                
                await interaction.editReply({
                    content: '',
                    embeds: [embed],
                    components: components
                });
            } catch (error) {
                console.error('[CONFIG] Erreur retour section:', error);
                // Ignorer les erreurs d'interaction expirée
                if (error.code === 10062) {
                    console.log('[CONFIG] Interaction expirée dans timeout retour section, ignorée');
                }
            }
        }, 3000);
    } catch (error) {
        console.error('[CONFIG] Erreur dans handleChannelConfirmation:', error);
        
        // Gérer spécifiquement l'erreur 10062
        if (error.code === 10062) {
            console.log('[CONFIG] Interaction expirée dans handleChannelConfirmation, ignorée');
            return;
        }
        
        throw error; // Relancer pour gestion par le collector
    }
}

async function handleRoleConfirmation(interaction) {
    // Parse customId avec support des sections complexes
    const { sectionKey, fieldKey, extraData } = parseComplexCustomId(interaction.customId, 'confirm_role_', true);
    const roleId = extraData[0];
    
    const section = CONFIG_SECTIONS[sectionKey];
    await updateConfigField(sectionKey, fieldKey, roleId, section);
    const field = section.fields[fieldKey];
    const role = interaction.guild.roles.cache.get(roleId);
    
    await interaction.update({
        content: `✅ **${field.label}** configuré avec succès sur ${role}`,
        embeds: [],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`back_to_section_${sectionKey}`)
                        .setLabel('Retour à la section')
                        .setEmoji('⬅️')
                        .setStyle(ButtonStyle.Primary)
                )
        ]
    });
    
    // Retour automatique après 3 secondes
    setTimeout(async () => {
        try {
            if (!isInteractionValid(interaction)) return;
            
            // Créer le contenu de la section directement sans utiliser showSectionEditor
            const section = CONFIG_SECTIONS[sectionKey];
            const embed = await createSectionEmbed(sectionKey, section, interaction.guild);
            const components = await createFieldComponents(sectionKey, section.fields, section, interaction.guild);
            
            // Ajouter le bouton de retour
            components.push(
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('back_to_category')
                            .setLabel('Retour à la catégorie')
                            .setEmoji('⬅️')
                            .setStyle(ButtonStyle.Secondary)
                    )
            );
            
            await interaction.editReply({
                content: '',
                embeds: [embed],
                components: components
            });
        } catch (error) {
            console.error('[CONFIG] Erreur retour section:', error);
            // Ignorer les erreurs d'interaction expirée
            if (error.code === 10062) {
                console.log('[CONFIG] Interaction expirée dans timeout retour section, ignorée');
            }
        }
    }, 3000);
}

async function handleToggleConfirmation(interaction) {
    // Parse customId avec support des sections complexes
    const { sectionKey, fieldKey, extraData } = parseComplexCustomId(interaction.customId, 'confirm_toggle_', true);
    const newValue = extraData[0];
    const boolValue = newValue === 'true';
    
    const section = CONFIG_SECTIONS[sectionKey];
    await updateConfigField(sectionKey, fieldKey, boolValue, section);
    const field = section.fields[fieldKey];
    
    await interaction.update({
        content: `${boolValue ? '✅' : '❌'} **${field.label}** ${boolValue ? 'activé' : 'désactivé'} avec succès`,
        embeds: [],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`back_to_section_${sectionKey}`)
                        .setLabel('Retour à la section')
                        .setEmoji('⬅️')
                        .setStyle(ButtonStyle.Primary)
                )
        ]
    });
    
    // Retour automatique après 3 secondes
    setTimeout(async () => {
        try {
            if (!isInteractionValid(interaction)) return;
            
            // Créer le contenu de la section directement sans utiliser showSectionEditor
            const section = CONFIG_SECTIONS[sectionKey];
            const embed = await createSectionEmbed(sectionKey, section, interaction.guild);
            const components = await createFieldComponents(sectionKey, section.fields, section, interaction.guild);
            
            // Ajouter le bouton de retour
            components.push(
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('back_to_category')
                            .setLabel('Retour à la catégorie')
                            .setEmoji('⬅️')
                            .setStyle(ButtonStyle.Secondary)
                    )
            );
            
            await interaction.editReply({
                content: '',
                embeds: [embed],
                components: components
            });
        } catch (error) {
            console.error('[CONFIG] Erreur retour section:', error);
            // Ignorer les erreurs d'interaction expirée
            if (error.code === 10062) {
                console.log('[CONFIG] Interaction expirée dans timeout retour section, ignorée');
            }
        }
    }, 3000);
}

async function handleCancelChange(interaction) {
    // Pour cancel_change_sectionKey - parsing simple car pas de fieldKey
    const sectionKey = interaction.customId.replace('cancel_change_', '');
    
    await interaction.update({
        content: '❌ Modification annulée',
        embeds: [],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`back_to_section_${sectionKey}`)
                        .setLabel('Retour à la section')
                        .setEmoji('⬅️')
                        .setStyle(ButtonStyle.Secondary)
                )
        ]
    });
    
    // Retour automatique après 2 secondes
    setTimeout(async () => {
        try {
            if (!isInteractionValid(interaction)) return;
            
            // Créer le contenu de la section directement sans utiliser showSectionEditor
            const section = CONFIG_SECTIONS[sectionKey];
            const embed = await createSectionEmbed(sectionKey, section, interaction.guild);
            const components = await createFieldComponents(sectionKey, section.fields, section, interaction.guild);
            
            // Ajouter le bouton de retour
            components.push(
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('back_to_category')
                            .setLabel('Retour à la catégorie')
                            .setEmoji('⬅️')
                            .setStyle(ButtonStyle.Secondary)
                    )
            );
            
            await interaction.editReply({
                content: '',
                embeds: [embed],
                components: components
            });
        } catch (error) {
            console.error('[CONFIG] Erreur retour section:', error);
            // Ignorer les erreurs d'interaction expirée
            if (error.code === 10062) {
                console.log('[CONFIG] Interaction expirée dans timeout retour section, ignorée');
            }
        }
    }, 2000);
}

// Fonction utilitaire pour vérifier l'état des interactions
function isInteractionValid(interaction) {
    const now = Date.now();
    const interactionTime = interaction.createdTimestamp;
    const maxAge = 14 * 60 * 1000; // 14 minutes (Discord timeout is 15min)
    
    // Vérifier l'âge de l'interaction
    if (now - interactionTime > maxAge) {
        console.log('[CONFIG] Interaction trop ancienne, probablement expirée');
        return false;
    }
    
    // Vérifier l'état de l'interaction
    if (interaction.replied || interaction.deferred) {
        console.log('[CONFIG] Interaction déjà traitée');
        return false;
    }
    
    return true;
}

async function showChannelSelector(interaction) {
    try {
        // Vérifier l'état de l'interaction
        if (!isInteractionValid(interaction)) {
            console.log('[CONFIG] showChannelSelector - Interaction non valide, abandon');
            return;
        }

        // Parse customId avec support des sections complexes
        const { sectionKey, fieldKey } = parseComplexCustomId(interaction.customId, 'configure_channel_');
        const section = CONFIG_SECTIONS[sectionKey];
        const field = section.fields[fieldKey];
        
        if (!section || !field) {
            console.error('[CONFIG] Section ou field introuvable:', sectionKey, fieldKey);
            return;
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`🔗 Configuration - ${field.label}`)
            .setDescription(`**Sélectionnez un canal pour :**\n\n**${field.label}**\n\n*${field.description}*`)
            .setColor('#5865F2')
            .addFields({
                name: '💡 Information',
                value: 'Utilisez le menu déroulant ci-dessous pour choisir le canal approprié.',
                inline: false
            });

        const channelSelect = new ChannelSelectMenuBuilder()
            .setCustomId(`select_channel_${sectionKey}_${fieldKey}`)
            .setPlaceholder(`🔗 Sélectionnez le canal pour ${field.label}`)
            .setChannelTypes([ChannelType.GuildText, ChannelType.GuildCategory])
            .setMaxValues(1);

        const components = [
            new ActionRowBuilder().addComponents(channelSelect),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`back_to_section_${sectionKey}`)
                    .setLabel('Retour à la section')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Secondary)
            )
        ];

        await interaction.update({
            embeds: [embed],
            components: components
        });
    } catch (error) {
        console.error('[CONFIG] Erreur dans showChannelSelector:', error);
        
        // Gérer spécifiquement l'erreur 10062
        if (error.code === 10062) {
            console.log('[CONFIG] Interaction expirée dans showChannelSelector, ignorée');
            return;
        }
        
        // Essayer un fallback si possible
        try {
            if (!interaction.replied && !interaction.deferred && interaction.isRepliable()) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue. Veuillez relancer la commande.',
                    flags: 64
                });
            }
        } catch (fallbackError) {
            console.error('[CONFIG] Impossible d\'envoyer le message de fallback:', fallbackError);
        }
    }
}

async function showRoleSelector(interaction) {
    try {
        // Vérifier l'état de l'interaction
        if (!isInteractionValid(interaction)) {
            console.log('[CONFIG] showRoleSelector - Interaction non valide, abandon');
            return;
        }

        // Parse customId avec support des sections complexes
        const { sectionKey, fieldKey } = parseComplexCustomId(interaction.customId, 'configure_role_');
        const section = CONFIG_SECTIONS[sectionKey];
        const field = section.fields[fieldKey];
        
        if (!section || !field) {
            console.error('[CONFIG] Section ou field introuvable:', sectionKey, fieldKey);
            return;
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`👥 Configuration - ${field.label}`)
            .setDescription(`**Sélectionnez un rôle pour :**\n\n**${field.label}**\n\n*${field.description}*`)
            .setColor('#5865F2')
            .addFields({
                name: '💡 Information',
                value: 'Utilisez le menu déroulant ci-dessous pour choisir le rôle approprié.',
                inline: false
            });

        const roleSelect = new RoleSelectMenuBuilder()
            .setCustomId(`select_role_${sectionKey}_${fieldKey}`)
            .setPlaceholder(`👥 Sélectionnez le rôle pour ${field.label}`)
            .setMaxValues(1);

        const components = [
            new ActionRowBuilder().addComponents(roleSelect),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`back_to_section_${sectionKey}`)
                    .setLabel('Retour à la section')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Secondary)
            )
        ];

        await interaction.update({
            embeds: [embed],
            components: components
        });
    } catch (error) {
        console.error('[CONFIG] Erreur dans showRoleSelector:', error);
        
        // Gérer spécifiquement l'erreur 10062
        if (error.code === 10062) {
            console.log('[CONFIG] Interaction expirée dans showRoleSelector, ignorée');
            return;
        }
        
        // Essayer un fallback si possible
        try {
            if (!interaction.replied && !interaction.deferred && interaction.isRepliable()) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue. Veuillez relancer la commande.',
                    flags: 64
                });
            }
        } catch (fallbackError) {
            console.error('[CONFIG] Impossible d\'envoyer le message de fallback:', fallbackError);
        }
    }
}

async function showMultiChannelSelector(interaction) {
    try {
        // Vérifier l'état de l'interaction
        if (!isInteractionValid(interaction)) {
            console.log('[CONFIG] showMultiChannelSelector - Interaction non valide, abandon');
            return;
        }

        // Parse customId avec support des sections complexes
        const { sectionKey, fieldKey } = parseComplexCustomId(interaction.customId, 'configure_multi_channel_');
        
        const section = CONFIG_SECTIONS[sectionKey];
        
        if (!section || !section.fields || !section.fields[fieldKey]) {
            console.error('[CONFIG] Section ou field introuvable:', sectionKey, fieldKey);
            return;
        }
        
        const field = section.fields[fieldKey];
        const config = configManager.getConfig();
        
        // Utiliser dataSection mapping
        const dataKey = section.dataSection || sectionKey;
        const currentValue = getNestedValue(config[dataKey] || {}, fieldKey) || [];
        const currentChannels = Array.isArray(currentValue) ? currentValue : [];
        
        let currentValueText = 'Aucun canal sélectionné';
        if (currentChannels.length > 0) {
            currentValueText = currentChannels.map(id => `<#${id}>`).join(', ');
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`📋 Configuration - ${field.label}`)
            .setDescription(`**Gestion des canaux pour :**\n\n**${field.label}**\n\n*${field.description}*`)
            .setColor('#5865F2')
            .addFields(
                {
                    name: '🎯 Canaux actuels',
                    value: currentValueText,
                    inline: false
                },
                {
                    name: '💡 Information',
                    value: 'Utilisez le menu déroulant pour ajouter/retirer des canaux. Sélectionnez jusqu\'à 25 canaux.',
                    inline: false
                }
            );

        const channelSelect = new ChannelSelectMenuBuilder()
            .setCustomId(`select_multi_channel_${sectionKey}_${fieldKey}`)
            .setPlaceholder(`📋 Sélectionnez les canaux pour ${field.label}`)
            .setChannelTypes([ChannelType.GuildText, ChannelType.GuildCategory])
            .setMinValues(0)
            .setMaxValues(25)
            .setDefaultChannels(currentChannels);

        const components = [
            new ActionRowBuilder().addComponents(channelSelect),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`clear_multi_channel_${sectionKey}_${fieldKey}`)
                    .setLabel('Vider la liste')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`back_to_section_${sectionKey}`)
                    .setLabel('Retour à la section')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Secondary)
            )
        ];

        await interaction.update({
            embeds: [embed],
            components: components
        });
    } catch (error) {
        console.error('[CONFIG] Erreur dans showMultiChannelSelector:', error);
        
        if (error.code === 10062) {
            console.log('[CONFIG] Interaction expirée dans showMultiChannelSelector, ignorée');
            return;
        }
        
        try {
            if (!interaction.replied && !interaction.deferred && interaction.isRepliable()) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue. Veuillez relancer la commande.',
                    flags: 64
                });
            }
        } catch (fallbackError) {
            console.error('[CONFIG] Impossible d\'envoyer le message de fallback:', fallbackError);
        }
    }
}

async function showMultiRoleSelector(interaction) {
    try {
        // Vérifier l'état de l'interaction
        if (!isInteractionValid(interaction)) {
            console.log('[CONFIG] showMultiRoleSelector - Interaction non valide, abandon');
            return;
        }

        // Parse customId avec support des sections complexes
        const { sectionKey, fieldKey } = parseComplexCustomId(interaction.customId, 'configure_multi_role_');
        
        const section = CONFIG_SECTIONS[sectionKey];
        
        if (!section || !section.fields || !section.fields[fieldKey]) {
            console.error('[CONFIG] Section ou field introuvable:', sectionKey, fieldKey);
            return;
        }
        
        const field = section.fields[fieldKey];
        const config = configManager.getConfig();
        
        // Utiliser dataSection mapping
        const dataKey = section.dataSection || sectionKey;
        const currentValue = getNestedValue(config[dataKey] || {}, fieldKey) || [];
        const currentRoles = Array.isArray(currentValue) ? currentValue : [];
        
        let currentValueText = 'Aucun rôle sélectionné';
        if (currentRoles.length > 0) {
            currentValueText = currentRoles.map(id => `<@&${id}>`).join(', ');
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`📋 Configuration - ${field.label}`)
            .setDescription(`**Gestion des rôles pour :**\n\n**${field.label}**\n\n*${field.description}*`)
            .setColor('#5865F2')
            .addFields(
                {
                    name: '🎯 Rôles actuels',
                    value: currentValueText,
                    inline: false
                },
                {
                    name: '💡 Information',
                    value: 'Utilisez le menu déroulant pour ajouter/retirer des rôles. Sélectionnez jusqu\'à 25 rôles.',
                    inline: false
                }
            );

        const roleSelect = new RoleSelectMenuBuilder()
            .setCustomId(`select_multi_role_${sectionKey}_${fieldKey}`)
            .setPlaceholder(`📋 Sélectionnez les rôles pour ${field.label}`)
            .setMinValues(0)
            .setMaxValues(25)
            .setDefaultRoles(currentRoles);

        const components = [
            new ActionRowBuilder().addComponents(roleSelect),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`clear_multi_role_${sectionKey}_${fieldKey}`)
                    .setLabel('Vider la liste')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`back_to_section_${sectionKey}`)
                    .setLabel('Retour à la section')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Secondary)
            )
        ];

        await interaction.update({
            embeds: [embed],
            components: components
        });
    } catch (error) {
        console.error('[CONFIG] Erreur dans showMultiRoleSelector:', error);
        
        if (error.code === 10062) {
            console.log('[CONFIG] Interaction expirée dans showMultiRoleSelector, ignorée');
            return;
        }
        
        try {
            if (!interaction.replied && !interaction.deferred && interaction.isRepliable()) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue. Veuillez relancer la commande.',
                    flags: 64
                });
            }
        } catch (fallbackError) {
            console.error('[CONFIG] Impossible d\'envoyer le message de fallback:', fallbackError);
        }
    }
}

async function handleMultiChannelSelection(interaction) {
    try {
        // Parse customId avec support des sections complexes
        const { sectionKey, fieldKey } = parseComplexCustomId(interaction.customId, 'select_multi_channel_');
        const selectedChannels = interaction.values;
        
        const section = CONFIG_SECTIONS[sectionKey];
        await updateConfigField(sectionKey, fieldKey, selectedChannels, section);
        const field = section.fields[fieldKey];
        
        let selectionText = 'Aucun canal sélectionné';
        if (selectedChannels.length > 0) {
            selectionText = selectedChannels.map(id => `<#${id}>`).join(', ');
        }
        
        await interaction.update({
            content: `✅ **${field.label}** mis à jour avec succès\n\n**Canaux sélectionnés :** ${selectionText}`,
            embeds: [],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`back_to_section_${sectionKey}`)
                            .setLabel('Retour à la section')
                            .setEmoji('⬅️')
                            .setStyle(ButtonStyle.Primary)
                    )
            ]
        });
        
        // Retour automatique après 3 secondes
        setTimeout(async () => {
            try {
                if (!isInteractionValid(interaction)) return;
                
                const section = CONFIG_SECTIONS[sectionKey];
                const embed = await createSectionEmbed(sectionKey, section, interaction.guild);
                const components = await createFieldComponents(sectionKey, section.fields, section, interaction.guild);
                
                components.push(
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('back_to_category')
                                .setLabel('Retour à la catégorie')
                                .setEmoji('⬅️')
                                .setStyle(ButtonStyle.Secondary)
                        )
                );
                
                await interaction.editReply({
                    content: '',
                    embeds: [embed],
                    components: components
                });
            } catch (error) {
                console.error('[CONFIG] Erreur retour section:', error);
                if (error.code === 10062) {
                    console.log('[CONFIG] Interaction expirée dans timeout retour section, ignorée');
                }
            }
        }, 3000);
    } catch (error) {
        console.error('[CONFIG] Erreur dans handleMultiChannelSelection:', error);
        throw error;
    }
}

async function handleMultiRoleSelection(interaction) {
    try {
        // Parse customId avec support des sections complexes
        const { sectionKey, fieldKey } = parseComplexCustomId(interaction.customId, 'select_multi_role_');
        const selectedRoles = interaction.values;
        
        const section = CONFIG_SECTIONS[sectionKey];
        await updateConfigField(sectionKey, fieldKey, selectedRoles, section);
        const field = section.fields[fieldKey];
        
        let selectionText = 'Aucun rôle sélectionné';
        if (selectedRoles.length > 0) {
            selectionText = selectedRoles.map(id => `<@&${id}>`).join(', ');
        }
        
        await interaction.update({
            content: `✅ **${field.label}** mis à jour avec succès\n\n**Rôles sélectionnés :** ${selectionText}`,
            embeds: [],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`back_to_section_${sectionKey}`)
                            .setLabel('Retour à la section')
                            .setEmoji('⬅️')
                            .setStyle(ButtonStyle.Primary)
                    )
            ]
        });
        
        // Retour automatique après 3 secondes
        setTimeout(async () => {
            try {
                if (!isInteractionValid(interaction)) return;
                
                const section = CONFIG_SECTIONS[sectionKey];
                const embed = await createSectionEmbed(sectionKey, section, interaction.guild);
                const components = await createFieldComponents(sectionKey, section.fields, section, interaction.guild);
                
                components.push(
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('back_to_category')
                                .setLabel('Retour à la catégorie')
                                .setEmoji('⬅️')
                                .setStyle(ButtonStyle.Secondary)
                        )
                );
                
                await interaction.editReply({
                    content: '',
                    embeds: [embed],
                    components: components
                });
            } catch (error) {
                console.error('[CONFIG] Erreur retour section:', error);
                if (error.code === 10062) {
                    console.log('[CONFIG] Interaction expirée dans timeout retour section, ignorée');
                }
            }
        }, 3000);
    } catch (error) {
        console.error('[CONFIG] Erreur dans handleMultiRoleSelection:', error);
        throw error;
    }
}

async function handleClearMultiChannel(interaction) {
    try {
        // Parse customId avec support des sections complexes
        const { sectionKey, fieldKey } = parseComplexCustomId(interaction.customId, 'clear_multi_channel_');
        
        const section = CONFIG_SECTIONS[sectionKey];
        await updateConfigField(sectionKey, fieldKey, [], section);
        const field = section.fields[fieldKey];
        
        await interaction.update({
            content: `🗑️ **${field.label}** vidé avec succès\n\n**Tous les canaux ont été retirés de la liste.**`,
            embeds: [],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`back_to_section_${sectionKey}`)
                            .setLabel('Retour à la section')
                            .setEmoji('⬅️')
                            .setStyle(ButtonStyle.Primary)
                    )
            ]
        });
        
        // Retour automatique après 3 secondes
        setTimeout(async () => {
            try {
                if (!isInteractionValid(interaction)) return;
                
                const section = CONFIG_SECTIONS[sectionKey];
                const embed = await createSectionEmbed(sectionKey, section, interaction.guild);
                const components = await createFieldComponents(sectionKey, section.fields, section, interaction.guild);
                
                components.push(
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('back_to_category')
                                .setLabel('Retour à la catégorie')
                                .setEmoji('⬅️')
                                .setStyle(ButtonStyle.Secondary)
                        )
                );
                
                await interaction.editReply({
                    content: '',
                    embeds: [embed],
                    components: components
                });
            } catch (error) {
                console.error('[CONFIG] Erreur retour section:', error);
                if (error.code === 10062) {
                    console.log('[CONFIG] Interaction expirée dans timeout retour section, ignorée');
                }
            }
        }, 3000);
    } catch (error) {
        console.error('[CONFIG] Erreur dans handleClearMultiChannel:', error);
        throw error;
    }
}

async function handleClearMultiRole(interaction) {
    try {
        // Parse customId avec support des sections complexes
        const { sectionKey, fieldKey } = parseComplexCustomId(interaction.customId, 'clear_multi_role_');
        
        const section = CONFIG_SECTIONS[sectionKey];
        await updateConfigField(sectionKey, fieldKey, [], section);
        const field = section.fields[fieldKey];
        
        await interaction.update({
            content: `🗑️ **${field.label}** vidé avec succès\n\n**Tous les rôles ont été retirés de la liste.**`,
            embeds: [],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`back_to_section_${sectionKey}`)
                            .setLabel('Retour à la section')
                            .setEmoji('⬅️')
                            .setStyle(ButtonStyle.Primary)
                    )
            ]
        });
        
        // Retour automatique après 3 secondes
        setTimeout(async () => {
            try {
                if (!isInteractionValid(interaction)) return;
                
                const section = CONFIG_SECTIONS[sectionKey];
                const embed = await createSectionEmbed(sectionKey, section, interaction.guild);
                const components = await createFieldComponents(sectionKey, section.fields, section, interaction.guild);
                
                components.push(
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('back_to_category')
                                .setLabel('Retour à la catégorie')
                                .setEmoji('⬅️')
                                .setStyle(ButtonStyle.Secondary)
                        )
                );
                
                await interaction.editReply({
                    content: '',
                    embeds: [embed],
                    components: components
                });
            } catch (error) {
                console.error('[CONFIG] Erreur retour section:', error);
                if (error.code === 10062) {
                    console.log('[CONFIG] Interaction expirée dans timeout retour section, ignorée');
                }
            }
        }, 3000);
    } catch (error) {
        console.error('[CONFIG] Erreur dans handleClearMultiRole:', error);
        throw error;
    }
}

// Export de fonctions pour utilisation dans d'autres fichiers
module.exports.showModalFieldsManager = showModalFieldsManager;
