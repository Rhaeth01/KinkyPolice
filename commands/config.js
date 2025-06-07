const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const configManager = require('../utils/configManager');

// Configuration basée sur la vraie structure de config.json
const CONFIG_SECTIONS = {
    general: {
        emoji: '⚙️',
        name: 'Général',
        description: 'Paramètres généraux du serveur',
        color: '#3498db',
        fields: [
            { key: 'prefix', label: 'Préfixe des commandes', type: 'text', placeholder: '!' },
            { key: 'adminRole', label: 'Rôle Administrateur', type: 'role' },
            { key: 'modRole', label: 'Rôle Modérateur', type: 'role' }
        ]
    },
    entry: {
        emoji: '🚪',
        name: 'Entrée',
        description: 'Système d\'entrée et bienvenue',
        color: '#2ecc71',
        fields: [
            { key: 'welcomeChannel', label: 'Canal de bienvenue', type: 'channel' },
            { key: 'rulesChannel', label: 'Canal des règles', type: 'channel' },
            { key: 'verificationRole', label: 'Rôle de vérification', type: 'role' }
        ]
    },
    modmail: {
        emoji: '📧',
        name: 'Modmail',
        description: 'Système de modmail',
        color: '#9b59b6',
        fields: [
            { key: 'modmailCategory', label: 'Catégorie modmail', type: 'category' },
            { key: 'modmailLogs', label: 'Logs modmail', type: 'channel' }
        ]
    },
    tickets: {
        emoji: '🎫',
        name: 'Tickets',
        description: 'Système de tickets et support',
        color: '#e67e22',
        fields: [
            { key: 'ticketCategory', label: 'Catégorie des tickets', type: 'category' },
            { key: 'supportRole', label: 'Rôle Support', type: 'role' },
            { key: 'ticketLogs', label: 'Logs des tickets', type: 'channel' }
        ]
    },
    logging: {
        emoji: '📊',
        name: 'Logs',
        description: 'Configuration des logs',
        color: '#f39c12',
        fields: [
            { key: 'modLogs', label: 'Logs de modération', type: 'channel' },
            { key: 'messageLogs', label: 'Logs de messages', type: 'channel' },
            { key: 'voiceLogs', label: 'Logs vocaux', type: 'channel' },
            { key: 'memberLogs', label: 'Logs de membres', type: 'channel' },
            { key: 'roleLogChannelId', label: 'Logs des rôles', type: 'channel' }
        ]
    },
    welcome: {
        emoji: '👋',
        name: 'Messages de bienvenue',
        description: 'Configuration des messages de bienvenue',
        color: '#1abc9c',
        fields: [
            { key: 'welcomeMessage', label: 'Message de bienvenue', type: 'text' },
            { key: 'rulesMessage', label: 'Message des règles', type: 'text' },
            { key: 'welcomeDM', label: 'Message privé de bienvenue', type: 'text' }
        ]
    },
    confession: {
        emoji: '😈',
        name: 'Confessions',
        description: 'Système de confessions anonymes',
        color: '#e91e63',
        fields: [
            { key: 'confessionChannel', label: 'Canal des confessions', type: 'channel' }
        ]
    },
    games: {
        emoji: '🎮',
        name: 'Jeux',
        description: 'Configuration des jeux et quiz',
        color: '#00bcd4',
        fields: [
            { key: 'gameChannel', label: 'Canal des jeux', type: 'channel' },
            { key: 'gameLeaderboard', label: 'Classement des jeux', type: 'channel' }
        ]
    },
    kink: {
        emoji: '🔞',
        name: 'Contenu Adulte',
        description: 'Configuration du contenu NSFW',
        color: '#e74c3c',
        fields: [
            { key: 'nsfwChannel', label: 'Canal NSFW', type: 'channel' },
            { key: 'kinkLevels', label: 'Niveaux activés', type: 'text' },
            { key: 'kinkLogs', label: 'Logs NSFW', type: 'channel' }
        ]
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('🎛️ Interface moderne de configuration du serveur')
        .setDefaultMemberPermissions('0'), // Visible uniquement par les administrateurs
        
    async execute(interaction) {
        // Vérifier si l'interaction a déjà été gérée
        if (interaction.replied || interaction.deferred) {
            console.log('[CONFIG] Interaction déjà gérée, abandon');
            return;
        }

        // Vérifier les permissions
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({
                content: '❌ Vous devez être administrateur pour utiliser cette commande.',
                ephemeral: true
            });
        }

        try {
            await interaction.deferReply({ ephemeral: true });
        } catch (error) {
            console.error('[CONFIG] Erreur lors du deferReply:', error);
            // Si deferReply échoue, l'interaction a probablement déjà été acquittée
            return;
        }
        
        try {
            await showMainConfigPanel(interaction);
        } catch (error) {
            console.error('[CONFIG] Erreur:', error);
            
            const errorMessage = '❌ Une erreur est survenue lors du chargement de la configuration.';
            
            try {
                if (!interaction.replied && interaction.deferred) {
                    await interaction.editReply({ content: errorMessage });
                } else if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: errorMessage,
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('[CONFIG] Impossible de répondre à l\'erreur:', replyError);
            }
        }
    }
};

async function showMainConfigPanel(interaction) {
    const config = configManager.getConfig();
    
    // Embed principal moderne
    const embed = new EmbedBuilder()
        .setTitle('🎛️ Configuration du Serveur')
        .setDescription('**Interface moderne de gestion**\n\nSélectionnez une section pour configurer votre serveur avec une interface intuitive.')
        .setColor('#2f3136')
        .setThumbnail(interaction.guild?.iconURL() || null)
        .addFields([
            {
                name: '📊 État de la configuration',
                value: `\`\`\`yaml\nSections configurées: ${Object.keys(config).length}\nDernière modification: ${new Date().toLocaleString('fr-FR')}\nStatut: ✅ Opérationnel\`\`\``,
                inline: false
            }
        ])
        .setFooter({ 
            text: '💡 Interface moderne • Navigation par boutons', 
            iconURL: interaction.client.user.displayAvatarURL() 
        })
        .setTimestamp();

    // Boutons de navigation modernes
    const rows = createNavigationButtons();
    
    // Répondre ou éditer selon l'état de l'interaction
    const response = {
        embeds: [embed],
        components: rows
    };

    let message;
    if (interaction.deferred) {
        message = await interaction.editReply(response);
    } else {
        // Utilisation correcte sans fetchReply déprécié
        await interaction.reply(response);
        message = await interaction.fetchReply();
    }
    
    // Gestionnaire d'interactions avec gestion d'état améliorée
    const collector = message.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 300000
    });
    
    collector.on('collect', async i => {
        try {
            if (i.isButton()) {
                await handleButtonInteraction(i, config);
            }
        } catch (error) {
            console.error('[CONFIG] Erreur interaction:', error);
            
            if (!i.replied && !i.deferred) {
                await i.reply({
                    content: '❌ Une erreur est survenue lors du traitement de votre demande.',
                    ephemeral: true
                });
            }
        }
    });
    
    collector.on('end', async () => {
        try {
            // Désactiver tous les boutons
            const disabledRows = rows.map(row => {
                const newRow = new ActionRowBuilder();
                row.components.forEach(component => {
                    newRow.addComponents(
                        ButtonBuilder.from(component).setDisabled(true)
                    );
                });
                return newRow;
            });
            
            // Vérifier si le message existe encore avant modification
            try {
                const message = await interaction.fetchReply();
                if (message) {
                    await interaction.editReply({ components: disabledRows });
                }
            } catch (fetchError) {
                if (fetchError.code === 10008) { // Unknown Message
                    console.log('[CONFIG] Message déjà supprimé, pas de mise à jour nécessaire');
                } else {
                    throw fetchError;
                }
            }
        } catch (error) {
            if (error.code === 10008) {
                console.log('[CONFIG] Impossible de désactiver les boutons: message supprimé');
            } else {
                console.error('[CONFIG] Erreur lors de la désactivation:', error);
            }
        }
    });
}

function createNavigationButtons() {
    const sections = Object.entries(CONFIG_SECTIONS);
    const rows = [];
    
    // Répartir les sections en rangées de maximum 5 boutons
    const sectionsPerRow = 5;
    for (let i = 0; i < sections.length; i += sectionsPerRow) {
        const row = new ActionRowBuilder();
        const sectionsSlice = sections.slice(i, i + sectionsPerRow);
        
        sectionsSlice.forEach(([key, section]) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`config_section_${key}`)
                    .setLabel(section.name)
                    .setEmoji(section.emoji)
                    .setStyle(ButtonStyle.Primary)
            );
        });
        
        if (row.components.length > 0) {
            rows.push(row);
        }
    }
    
    // Rangée d'actions utilitaires
    const utilityRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('config_view_all')
                .setLabel('Voir tout')
                .setEmoji('👁️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('config_export')
                .setLabel('Exporter')
                .setEmoji('📤')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('config_refresh')
                .setLabel('Actualiser')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Secondary)
        );
    rows.push(utilityRow);
    
    return rows;
}

async function handleButtonInteraction(interaction, config) {
    const customId = interaction.customId;
    
    if (customId.startsWith('config_section_')) {
        const sectionKey = customId.replace('config_section_', '');
        await showSectionEditor(interaction, sectionKey);
    } else if (customId === 'config_view_all') {
        await showAllConfiguration(interaction);
    } else if (customId === 'config_export') {
        await exportConfiguration(interaction);
    } else if (customId === 'config_refresh') {
        await refreshConfiguration(interaction);
    } else if (customId.startsWith('field_edit_')) {
        const fieldKey = customId.replace('field_edit_', '');
        const sectionKey = interaction.message.embeds[0]?.footer?.text?.match(/Section: (\w+)/)?.[1];
        if (sectionKey) {
            await showFieldEditor(interaction, sectionKey, fieldKey);
        }
    } else if (customId === 'back_to_main') {
        await showMainConfigPanel(interaction);
    }
}

async function showSectionEditor(interaction, sectionKey) {
    const section = CONFIG_SECTIONS[sectionKey];
    if (!section) {
        return interaction.reply({
            content: '❌ Section non trouvée.',
            ephemeral: true
        });
    }
    
    const config = configManager.getConfig();
    const sectionConfig = config[sectionKey] || {};
    
    const embed = new EmbedBuilder()
        .setTitle(`${section.emoji} Configuration - ${section.name}`)
        .setDescription(section.description)
        .setColor(section.color)
        .setFooter({ text: `Section: ${sectionKey}` });
    
    // Afficher les champs actuels
    section.fields.forEach(field => {
        const currentValue = sectionConfig[field.key];
        const displayValue = currentValue ? 
            (field.type === 'channel' ? `<#${currentValue}>` :
             field.type === 'role' ? `<@&${currentValue}>` :
             field.type === 'category' ? `📁 ${currentValue}` :
             currentValue) : '*Non configuré*';
        
        embed.addFields({
            name: `${getFieldIcon(field.type)} ${field.label}`,
            value: displayValue,
            inline: true
        });
    });
    
    // Boutons d'édition
    const rows = [];
    const fieldsPerRow = 3;
    
    for (let i = 0; i < section.fields.length; i += fieldsPerRow) {
        const row = new ActionRowBuilder();
        const fieldsSlice = section.fields.slice(i, i + fieldsPerRow);
        
        fieldsSlice.forEach(field => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`field_edit_${field.key}`)
                    .setLabel(field.label)
                    .setEmoji(getFieldIcon(field.type))
                    .setStyle(sectionConfig[field.key] ? ButtonStyle.Success : ButtonStyle.Secondary)
            );
        });
        rows.push(row);
    }
    
    // Bouton retour
    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_main')
                .setLabel('Retour')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Secondary)
        );
    rows.push(backRow);
    
    await interaction.update({
        embeds: [embed],
        components: rows
    });
}

async function showFieldEditor(interaction, sectionKey, fieldKey) {
    const section = CONFIG_SECTIONS[sectionKey];
    const field = section.fields.find(f => f.key === fieldKey);
    
    if (!field) {
        return interaction.reply({
            content: '❌ Champ non trouvé.',
            ephemeral: true
        });
    }
    
    const modal = new ModalBuilder()
        .setCustomId(`config_modal_${sectionKey}_${fieldKey}`)
        .setTitle(`${section.emoji} Modifier ${field.label}`);
    
    const config = configManager.getConfig();
    const currentValue = config[sectionKey]?.[fieldKey] || '';
    
    const input = new TextInputBuilder()
        .setCustomId('field_value')
        .setLabel(field.label)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(field.placeholder || getPlaceholderForType(field.type))
        .setValue(currentValue ? currentValue.toString() : '')
        .setRequired(false);
    
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    
    await interaction.showModal(modal);
}

async function showAllConfiguration(interaction) {
    const config = configManager.getConfig();
    
    const embed = new EmbedBuilder()
        .setTitle('📋 Configuration Complète')
        .setDescription('Aperçu de toute la configuration du serveur')
        .setColor('#2f3136')
        .setTimestamp();
    
    Object.entries(CONFIG_SECTIONS).forEach(([key, section]) => {
        const sectionConfig = config[key] || {};
        const configuredFields = section.fields.filter(field => sectionConfig[field.key]);
        
        const value = configuredFields.length > 0 ?
            configuredFields.map(field => 
                `• **${field.label}:** ${sectionConfig[field.key]}`
            ).join('\n') : '*Aucune configuration*';
        
        embed.addFields({
            name: `${section.emoji} ${section.name}`,
            value: value.length > 1024 ? value.substring(0, 1021) + '...' : value,
            inline: false
        });
    });
    
    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_main')
                .setLabel('Retour')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.update({
        embeds: [embed],
        components: [backRow]
    });
}

async function exportConfiguration(interaction) {
    try {
        if (interaction.replied || interaction.deferred) {
            return;
        }

        await interaction.deferUpdate();
        
        const config = configManager.getConfig();
        const configString = JSON.stringify(config, null, 2);
        const buffer = Buffer.from(configString, 'utf8');
        
        await interaction.followUp({
            content: '📤 **Export de la configuration**\n\nVoici votre fichier de configuration actuel.',
            files: [{
                attachment: buffer,
                name: `config-${interaction.guild.id}-${Date.now()}.json`
            }],
            ephemeral: true
        });
    } catch (error) {
        console.error('[CONFIG] Erreur export:', error);
        
        // Si l'interaction a expiré, on ne peut rien faire
        if (error.code === 10062) {
            console.log('[CONFIG] Interaction expirée pour export');
            return;
        }
        
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Erreur lors de l\'export de la configuration.',
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: '❌ Erreur lors de l\'export de la configuration.',
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error('[CONFIG] Erreur lors de la réponse export:', replyError);
        }
    }
}

async function refreshConfiguration(interaction) {
    try {
        if (interaction.replied || interaction.deferred) {
            return;
        }

        // Pour les interactions de boutons, utiliser deferUpdate au lieu de deferReply
        await interaction.deferUpdate();
        
        configManager.forceReload();
        
        await interaction.followUp({
            content: '🔄 **Configuration actualisée**\n\nLa configuration a été rechargée depuis le fichier.',
            ephemeral: true
        });
        
    } catch (error) {
        console.error('[CONFIG] Erreur actualisation:', error);
        
        // Si l'interaction a expiré, on ne peut rien faire
        if (error.code === 10062) {
            console.log('[CONFIG] Interaction expirée pour refresh');
            return;
        }
        
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Erreur lors de l\'actualisation de la configuration.',
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: '❌ Erreur lors de l\'actualisation de la configuration.',
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error('[CONFIG] Erreur lors de la réponse d\'erreur:', replyError);
        }
    }
}

// Fonctions utilitaires
function getFieldIcon(type) {
    const icons = {
        text: '📝',
        channel: '📺',
        role: '👥',
        category: '📁',
        user: '👤'
    };
    return icons[type] || '⚙️';
}

function getPlaceholderForType(type) {
    const placeholders = {
        text: 'Entrez du texte...',
        channel: 'ID du canal (ex: 123456789)',
        role: 'ID du rôle (ex: 123456789)',
        category: 'ID de la catégorie (ex: 123456789)',
        user: 'ID de l\'utilisateur (ex: 123456789)'
    };
    return placeholders[type] || 'Entrez une valeur...';
}

function validateFieldValue(value, type) {
    if (type === 'channel' || type === 'role' || type === 'category' || type === 'user') {
        return /^\d{17,19}$/.test(value);
    }
    return true;
}

function getValidationMessage(type) {
    if (type === 'channel' || type === 'role' || type === 'category' || type === 'user') {
        return 'Veuillez entrer un ID Discord valide (17-19 chiffres).';
    }
    return '';
}
