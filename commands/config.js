const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags
} = require('discord.js');
const configManager = require('../utils/configManager');

// Configuration moderne avec icônes et couleurs
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
    channels: {
        emoji: '📺',
        name: 'Canaux',
        description: 'Configuration des canaux importants',
        color: '#e74c3c',
        fields: [
            { key: 'welcomeChannel', label: 'Canal de bienvenue', type: 'channel' },
            { key: 'rulesChannel', label: 'Canal des règles', type: 'channel' },
            { key: 'logChannel', label: 'Canal des logs', type: 'channel' }
        ]
    },
    moderation: {
        emoji: '🛡️',
        name: 'Modération',
        description: 'Outils de modération et logs',
        color: '#f39c12',
        fields: [
            { key: 'modLogs', label: 'Logs de modération', type: 'channel' },
            { key: 'messageLogs', label: 'Logs de messages', type: 'channel' },
            { key: 'voiceLogs', label: 'Logs vocaux', type: 'channel' },
            { key: 'memberLogs', label: 'Logs de membres', type: 'channel' }
        ]
    },
    tickets: {
        emoji: '🎫',
        name: 'Tickets',
        description: 'Système de tickets et support',
        color: '#9b59b6',
        fields: [
            { key: 'ticketCategory', label: 'Catégorie des tickets', type: 'category' },
            { key: 'supportRole', label: 'Rôle Support', type: 'role' },
            { key: 'ticketLogs', label: 'Logs des tickets', type: 'channel' }
        ]
    },
    confession: {
        emoji: '😈',
        name: 'Confessions',
        description: 'Système de confessions anonymes',
        color: '#9b59b6',
        fields: [
            { key: 'confessionChannel', label: 'Canal des confessions', type: 'channel' },
            { key: 'confessionLogs', label: 'Logs des confessions', type: 'channel' },
            { key: 'confessionRole', label: 'Rôle de modération', type: 'role' }
        ]
    },
    games: {
        emoji: '🎮',
        name: 'Jeux',
        description: 'Configuration des jeux et quiz',
        color: '#1abc9c',
        fields: [
            { key: 'gameChannel', label: 'Canal des jeux', type: 'channel' },
            { key: 'dailyQuizChannel', label: 'Canal du quiz quotidien', type: 'channel' },
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
        // Vérifier les permissions
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({
                content: '❌ Vous devez être administrateur pour utiliser cette commande.',
                flags: MessageFlags.FLAGS.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.FLAGS.Ephemeral });
        
        try {
            await showMainConfigPanel(interaction);
        } catch (error) {
            console.error('[CONFIG] Erreur:', error);
            
            const errorMessage = '❌ Une erreur est survenue lors du chargement de la configuration.';
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: errorMessage,
                    flags: MessageFlags.FLAGS.Ephemeral
                });
            } else {
                await interaction.editReply({ content: errorMessage });
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
                    flags: MessageFlags.FLAGS.Ephemeral
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
    
    // Première rangée - Sections principales
    const row1 = new ActionRowBuilder();
    sections.slice(0, 3).forEach(([key, section]) => {
        row1.addComponents(
            new ButtonBuilder()
                .setCustomId(`config_section_${key}`)
                .setLabel(section.name)
                .setEmoji(section.emoji)
                .setStyle(ButtonStyle.Primary)
        );
    });
    rows.push(row1);
    
    // Deuxième rangée - Sections secondaires
    const row2 = new ActionRowBuilder();
    sections.slice(3).forEach(([key, section]) => {
        row2.addComponents(
            new ButtonBuilder()
                .setCustomId(`config_section_${key}`)
                .setLabel(section.name)
                .setEmoji(section.emoji)
                .setStyle(ButtonStyle.Primary)
        );
    });
    rows.push(row2);
    
    // Troisième rangée - Actions utilitaires
    const row3 = new ActionRowBuilder()
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
    rows.push(row3);
    
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
            flags: MessageFlags.FLAGS.Ephemeral
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
            flags: MessageFlags.FLAGS.Ephemeral
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
        .setValue(currentValue.toString())
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
    const config = configManager.getConfig();
    const configString = JSON.stringify(config, null, 2);
    const buffer = Buffer.from(configString, 'utf8');
    
    await interaction.reply({
        content: '📤 **Export de la configuration**\n\nVoici votre fichier de configuration actuel.',
        files: [{
            attachment: buffer,
            name: `config-${interaction.guild.id}-${Date.now()}.json`
        }],
        flags: MessageFlags.FLAGS.Ephemeral
    });
}

async function refreshConfiguration(interaction) {
    try {
        configManager.forceReload();
        
        await interaction.reply({
            content: '🔄 **Configuration actualisée**\n\nLa configuration a été rechargée depuis le fichier.',
            flags: MessageFlags.FLAGS.Ephemeral
        });
        
        // Actualiser l'affichage principal après un court délai
        setTimeout(async () => {
            try {
                await showMainConfigPanel(interaction);
            } catch (error) {
                console.error('[CONFIG] Erreur lors de l\'actualisation:', error);
            }
        }, 1000);
        
    } catch (error) {
        console.error('[CONFIG] Erreur actualisation:', error);
        await interaction.reply({
            content: '❌ Erreur lors de l\'actualisation de la configuration.',
            flags: MessageFlags.FLAGS.Ephemeral
        });
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
