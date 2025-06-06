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
        sections: ['general', 'logging']
    },
    community: {
        icon: '👥',
        label: 'Communauté & Accueil',
        description: 'Gestion des nouveaux membres',
        color: '#57F287',
        sections: ['entry', 'welcome']
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
    logging: {
        label: 'Logs & Surveillance',
        icon: '📊',
        fields: {
            modLogs: { label: 'Logs Modération', type: 'channel', description: 'Canal pour les actions de modération' },
            messageLogs: { label: 'Logs Messages', type: 'channel', description: 'Canal pour les messages édités/supprimés' },
            voiceLogs: { label: 'Logs Vocal', type: 'channel', description: 'Canal pour l\'activité vocale' },
            memberLogs: { label: 'Logs Membres', type: 'channel', description: 'Canal pour les arrivées/départs' },
            roleLogChannelId: { label: 'Logs Rôles', type: 'channel', description: 'Canal pour les changements de rôles' }
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
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({
                content: '❌ Vous devez être administrateur pour utiliser cette commande.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });
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
            await handleInteraction(i, config);
        } catch (error) {
            console.error('[CONFIG] Erreur interaction:', error);
            if (!i.replied && !i.deferred) {
                await i.reply({
                    content: '❌ Une erreur est survenue. Veuillez réessayer.',
                    ephemeral: true
                });
            }
        }
    });

    collector.on('end', async () => {
        try {
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

            await interaction.editReply({ components: disabledComponents });
        } catch (error) {
            console.log('[CONFIG] Session expirée, impossible de désactiver les composants');
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

    if (customId === 'config_category_select') {
        const categoryKey = interaction.values[0];
        await showCategoryView(interaction, categoryKey);
    } else if (customId === 'config_view_all') {
        await showCompleteView(interaction);
    } else if (customId === 'config_export') {
        await exportConfiguration(interaction);
    } else if (customId === 'config_import') {
        await showImportModal(interaction);
    } else if (customId === 'config_reset') {
        await showResetConfirmation(interaction);
    } else if (customId.startsWith('section_')) {
        const sectionKey = customId.replace('section_', '');
        await showSectionEditor(interaction, sectionKey);
    } else if (customId === 'back_to_main') {
        await showMainDashboard(interaction);
    } else if (customId === 'back_to_category') {
        const categoryKey = interaction.message.embeds[0]?.footer?.text?.match(/Catégorie: (\\w+)/)?.[1];
        if (categoryKey) {
            await showCategoryView(interaction, categoryKey);
        }
    } else if (customId.startsWith('field_')) {
        await handleFieldInteraction(interaction);
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

async function showSectionEditor(interaction, sectionKey) {
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

    // Créer les composants interactifs pour chaque type de champ
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

    await interaction.update({
        embeds: [embed],
        components: components
    });
}

async function createFieldComponents(sectionKey, fields, sectionConfig, guild) {
    const components = [];
    
    // Grouper les champs par type pour une meilleure UX
    const channelFields = [];
    const roleFields = [];
    const otherFields = [];
    
    Object.entries(fields).forEach(([fieldKey, field]) => {
        if (field.type === 'channel' || field.type === 'category') {
            channelFields.push([fieldKey, field]);
        } else if (field.type === 'role') {
            roleFields.push([fieldKey, field]);
        } else {
            otherFields.push([fieldKey, field]);
        }
    });

    // Select Menu pour les channels
    if (channelFields.length > 0) {
        const channelSelect = new ChannelSelectMenuBuilder()
            .setCustomId(`field_channel_${sectionKey}`)
            .setPlaceholder('🔗 Sélectionnez un canal')
            .setChannelTypes([ChannelType.GuildText, ChannelType.GuildCategory])
            .setMaxValues(1);
        
        components.push(new ActionRowBuilder().addComponents(channelSelect));
    }

    // Select Menu pour les rôles
    if (roleFields.length > 0) {
        const roleSelect = new RoleSelectMenuBuilder()
            .setCustomId(`field_role_${sectionKey}`)
            .setPlaceholder('👥 Sélectionnez un rôle')
            .setMaxValues(1);
        
        components.push(new ActionRowBuilder().addComponents(roleSelect));
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

    return components;
}

async function handleFieldInteraction(interaction) {
    const [, type, sectionKey, ...fieldKeyParts] = interaction.customId.split('_');
    const fieldKey = fieldKeyParts.join('_');
    
    if (type === 'channel') {
        await handleChannelSelection(interaction, sectionKey);
    } else if (type === 'role') {
        await handleRoleSelection(interaction, sectionKey);
    } else if (type === 'toggle') {
        await handleToggleField(interaction, sectionKey, fieldKey);
    } else if (type === 'text' || type === 'number') {
        await showTextModal(interaction, sectionKey, fieldKey, type);
    }
}

async function handleChannelSelection(interaction, sectionKey) {
    const selectedChannel = interaction.channels.first();
    if (!selectedChannel) return;

    // Pour l'instant, on prend le premier champ channel de la section
    // En production, il faudrait un système plus sophistiqué
    const section = CONFIG_SECTIONS[sectionKey];
    const channelFieldKey = Object.keys(section.fields).find(key => 
        section.fields[key].type === 'channel' || section.fields[key].type === 'category'
    );
    
    if (!channelFieldKey) return;

    await updateConfigField(sectionKey, channelFieldKey, selectedChannel.id);
    
    await interaction.update({
        content: `✅ **${section.fields[channelFieldKey].label}** mis à jour: ${selectedChannel}`,
        embeds: interaction.message.embeds,
        components: interaction.message.components
    });
    
    // Actualiser l'affichage après 2 secondes
    setTimeout(async () => {
        await showSectionEditor(interaction, sectionKey);
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

    await updateConfigField(sectionKey, roleFieldKey, selectedRole.id);
    
    await interaction.update({
        content: `✅ **${section.fields[roleFieldKey].label}** mis à jour: ${selectedRole}`,
        embeds: interaction.message.embeds,
        components: interaction.message.components
    });
    
    setTimeout(async () => {
        await showSectionEditor(interaction, sectionKey);
    }, 2000);
}

async function handleToggleField(interaction, sectionKey, fieldKey) {
    const config = configManager.getConfig();
    const currentValue = getNestedValue(config[sectionKey] || {}, fieldKey);
    const newValue = !currentValue;
    
    await updateConfigField(sectionKey, fieldKey, newValue);
    
    const section = CONFIG_SECTIONS[sectionKey];
    const field = section.fields[fieldKey];
    
    await interaction.update({
        content: `${newValue ? '✅' : '❌'} **${field.label}** ${newValue ? 'activé' : 'désactivé'}`,
        embeds: interaction.message.embeds,
        components: interaction.message.components
    });
    
    setTimeout(async () => {
        await showSectionEditor(interaction, sectionKey);
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

async function updateConfigField(sectionKey, fieldKey, value) {
    const config = configManager.getConfig();
    
    if (!config[sectionKey]) {
        config[sectionKey] = {};
    }
    
    setNestedValue(config[sectionKey], fieldKey, value);
    await configManager.saveConfig(config);
}

function formatDisplayValue(value, type) {
    if (value === undefined || value === null || value === '') {
        return '*Non configuré*';
    }
    
    switch (type) {
        case 'channel':
        case 'category':
            return `<#${value}>`;
        case 'role':
            return `<@&${value}>`;
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
        ephemeral: true
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