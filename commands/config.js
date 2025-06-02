const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
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
    features: {
        emoji: '✨',
        name: 'Fonctionnalités',
        description: 'Fonctionnalités spéciales du bot',
        color: '#1abc9c',
        fields: [
            { key: 'confessionChannel', label: 'Canal des confessions', type: 'channel' },
            { key: 'gameChannel', label: 'Canal des jeux', type: 'channel' },
            { key: 'nsfwChannel', label: 'Canal NSFW', type: 'channel' }
        ]
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('🎛️ Interface moderne de configuration du serveur'),
        
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            await showMainConfigPanel(interaction);
        } catch (error) {
            console.error('[CONFIG] Erreur:', error);
            await interaction.editReply({
                content: '❌ Une erreur est survenue lors du chargement de la configuration.',
                ephemeral: true
            });
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
    
    await interaction.editReply({
        embeds: [embed],
        components: rows
    });
    
    // Gestionnaire d'interactions
    const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 300000
    });
    
    collector.on('collect', async i => {
        try {
            if (i.isButton()) {
                await handleButtonInteraction(i, config);
            } else if (i.isStringSelectMenu()) {
                await handleSelectMenuInteraction(i, config);
            }
        } catch (error) {
            console.error('[CONFIG] Erreur interaction:', error);
            await i.reply({
                content: '❌ Une erreur est survenue lors du traitement de votre demande.',
                ephemeral: true
            });
        }
    });
    
    collector.on('end', async () => {
        try {
            const disabledRows = rows.map(row => {
                const newRow = new ActionRowBuilder();
                row.components.forEach(component => {
                    if (component.data.style !== undefined) {
                        // C'est un bouton
                        newRow.addComponents(
                            ButtonBuilder.from(component).setDisabled(true)
                        );
                    } else {
                        // C'est un select menu
                        newRow.addComponents(
                            StringSelectMenuBuilder.from(component).setDisabled(true)
                        );
                    }
                });
                return newRow;
            });
            
            await interaction.editReply({ components: disabledRows });
        } catch (error) {
            console.error('[CONFIG] Erreur lors de la désactivation:', error);
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
                .setCustomId('config_reset')
                .setLabel('Réinitialiser')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Danger)
        );
    rows.push(row3);
    
    return rows;
}

async function handleButtonInteraction(interaction, config) {
    const customId = interaction.customId;
    
    if (customId.startsWith('config_section_')) {
        const sectionKey = customId.replace('config_section_', '');
        await showSectionEditor(interaction, sectionKey, config);
    } else if (customId === 'config_view_all') {
        await showAllConfiguration(interaction, config);
    } else if (customId === 'config_export') {
        await exportConfiguration(interaction, config);
    } else if (customId === 'config_reset') {
        await showResetConfirmation(interaction);
    } else if (customId.startsWith('field_edit_')) {
        const fieldKey = customId.replace('field_edit_', '');
        const sectionKey = interaction.message.embeds[0]?.footer?.text?.match(/Section: (\w+)/)?.[1];
        if (sectionKey) {
            await showFieldEditor(interaction, sectionKey, fieldKey, config);
        }
    } else if (customId === 'back_to_main') {
        await showMainConfigPanel(interaction);
    }
}

async function showSectionEditor(interaction, sectionKey, config) {
    const section = CONFIG_SECTIONS[sectionKey];
    if (!section) return;
    
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

async function showFieldEditor(interaction, sectionKey, fieldKey, config) {
    const section = CONFIG_SECTIONS[sectionKey];
    const field = section.fields.find(f => f.key === fieldKey);
    
    if (!field) return;
    
    const modal = new ModalBuilder()
        .setCustomId(`config_modal_${sectionKey}_${fieldKey}`)
        .setTitle(`${section.emoji} Modifier ${field.label}`);
    
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
    
    // Attendre la soumission du modal
    try {
        const modalSubmission = await interaction.awaitModalSubmit({
            time: 300000,
            filter: i => i.user.id === interaction.user.id && i.customId === modal.data.custom_id
        });
        
        await handleModalSubmission(modalSubmission, sectionKey, fieldKey, field);
    } catch (error) {
        console.error('[CONFIG] Timeout ou erreur modal:', error);
    }
}

async function handleModalSubmission(interaction, sectionKey, fieldKey, field) {
    await interaction.deferReply({ ephemeral: true });
    
    const newValue = interaction.fields.getTextInputValue('field_value').trim();
    
    try {
        // Validation selon le type
        if (newValue && !validateFieldValue(newValue, field.type)) {
            await interaction.editReply({
                content: `❌ Valeur invalide pour ${field.label}. ${getValidationMessage(field.type)}`,
                ephemeral: true
            });
            return;
        }
        
        // Mettre à jour la configuration
        const config = configManager.getConfig();
        if (!config[sectionKey]) {
            config[sectionKey] = {};
        }
        
        if (newValue === '') {
            delete config[sectionKey][fieldKey];
        } else {
            config[sectionKey][fieldKey] = newValue;
        }
        
        await configManager.updateConfig(config);
        
        await interaction.editReply({
            content: `✅ **${field.label}** mis à jour avec succès!\n\n` +
                    `**Nouvelle valeur:** ${newValue || '*Supprimé*'}`,
            ephemeral: true
        });
        
        // Rafraîchir l'affichage de la section
        setTimeout(async () => {
            try {
                const updatedConfig = configManager.getConfig();
                await showSectionEditor(interaction, sectionKey, updatedConfig);
            } catch (error) {
                console.error('[CONFIG] Erreur rafraîchissement:', error);
            }
        }, 2000);
        
    } catch (error) {
        console.error('[CONFIG] Erreur sauvegarde:', error);
        await interaction.editReply({
            content: `❌ Erreur lors de la sauvegarde: ${error.message}`,
            ephemeral: true
        });
    }
}

async function showAllConfiguration(interaction, config) {
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

async function exportConfiguration(interaction, config) {
    const configString = JSON.stringify(config, null, 2);
    const buffer = Buffer.from(configString, 'utf8');
    
    await interaction.reply({
        content: '📤 **Export de la configuration**\n\nVoici votre fichier de configuration actuel.',
        files: [{
            attachment: buffer,
            name: `config-${interaction.guild.id}-${Date.now()}.json`
        }],
        ephemeral: true
    });
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