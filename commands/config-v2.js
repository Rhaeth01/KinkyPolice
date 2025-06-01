const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const configManager = require('../utils/configManager');
const { logToChannel } = require('../utils/logger');

// Structure des catégories de configuration
const CATEGORIES = {
    GENERAL: {
        id: 'general',
        name: '⚙️ Général',
        color: 0x5865F2,
        fields: [
            'guildId', 'logChannelId', 'logActionMod', 
            'messageLogChannelId', 'voiceLogChannelId'
        ]
    },
    ROLES: {
        id: 'roles',
        name: '🎭 Rôles',
        color: 0xEB459E,
        fields: [
            'staffRoleId', 'memberRoleId', 'reglesValidesId',
            'newMemberRoleIds', 'forbiddenRoleIds'
        ]
    },
    CHANNELS: {
        id: 'channels',
        name: '📚 Salons',
        color: 0x57F287,
        fields: [
            'ticketCategoryId', 'entryRequestCategoryId', 'entryRequestChannelId',
            'acceptedEntryCategoryId', 'supportCategoryId', 'logsTicketsChannelId',
            'confessionChannelId', 'dailyQuizChannelId', 'quizChannelId'
        ]
    },
    MESSAGES: {
        id: 'messages',
        name: '✉️ Messages',
        color: 0xFEE75C,
        fields: ['welcomeChannels']
    },
    MODMAIL: {
        id: 'modmail',
        name: '📬 ModMail',
        color: 0xED4245,
        fields: ['modmail']
    },
    ENTRY_FORM: {
        id: 'entry_form',
        name: '📋 Formulaire Entrée',
        color: 0x9C84EF,
        fields: ['entryModal']
    }
};

module.exports = {
    data: {
        name: 'config-v2',
        description: 'Configuration avancée du serveur'
    },

    async execute(interaction) {
        // Vérifier les permissions
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({
                content: '❌ Vous devez être administrateur pour utiliser cette commande.',
                ephemeral: true
            });
        }

        await showMainMenu(interaction);
    }
};

// Afficher le menu principal
async function showMainMenu(interaction, isEdit = false) {
    const embed = new EmbedBuilder()
        .setTitle('⚙️ CONFIGURATION DU SERVEUR')
        .setDescription('Sélectionnez une catégorie à configurer')
        .setColor(0x5865F2);

    // Créer un menu déroulant pour la navigation par onglets
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('config_category_select')
        .setPlaceholder('Sélectionnez une catégorie')
        .addOptions(Object.values(CATEGORIES).map(cat => ({
            label: cat.name,
            value: cat.id,
            emoji: cat.name.split(' ')[0] // Utiliser l'emoji du nom
        })));

    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    if (isEdit) {
        await interaction.update({
            embeds: [embed],
            components: [actionRow],
            ephemeral: true
        });
    } else {
        await interaction.reply({
            embeds: [embed],
            components: [actionRow],
            ephemeral: true
        });
    }
}

// Afficher les paramètres d'une catégorie
async function showCategory(interaction, categoryId) {
    const category = Object.values(CATEGORIES).find(c => c.id === categoryId);
    if (!category) return showMainMenu(interaction, true);

    const config = configManager.getConfig();
    const embed = new EmbedBuilder()
        .setTitle(`${category.name} - Paramètres`)
        .setColor(category.color);

    // Ajouter les champs avec leurs valeurs actuelles
    category.fields.forEach(field => {
        let value = config[field];
        if (typeof value === 'object') {
            value = '```json\n' + JSON.stringify(value, null, 2) + '\n```';
        } else {
            value = value || 'Non défini';
        }
        embed.addFields({ name: `**${field}**`, value });
    });

    // Boutons d'action principaux
    const mainButtons = [
        new ButtonBuilder()
            .setCustomId('config_back')
            .setLabel('← Retour')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`config_edit_${categoryId}`)
            .setLabel('✏️ Modifier toute la catégorie')
            .setStyle(ButtonStyle.Success)
    ];

    const mainActionRow = new ActionRowBuilder().addComponents(mainButtons);

    // Boutons pour modifier chaque champ individuellement
    const fieldButtons = category.fields.map(field => 
        new ButtonBuilder()
            .setCustomId(`config_edit_field_${categoryId}_${field}`)
            .setLabel(`Modifier ${field}`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔧')
    );

    // Diviser les boutons en groupes de 5 (limite Discord)
    const fieldActionRows = [];
    for (let i = 0; i < fieldButtons.length; i += 5) {
        const chunk = fieldButtons.slice(i, i + 5);
        fieldActionRows.push(new ActionRowBuilder().addComponents(chunk));
    }

    const components = [mainActionRow, ...fieldActionRows];

    await interaction.update({
        embeds: [embed],
        components,
        ephemeral: true
    });
}

// Afficher le modal d'édition pour un champ spécifique
async function showFieldEditModal(interaction, categoryId, fieldName) {
    const category = Object.values(CATEGORIES).find(c => c.id === categoryId);
    if (!category) return;

    const config = configManager.getConfig();
    const currentValue = config[fieldName];
    const value = typeof currentValue === 'string' 
        ? currentValue 
        : JSON.stringify(currentValue, null, 2);

    const modal = new ModalBuilder()
        .setCustomId(`config_field_modal_${categoryId}_${fieldName}`)
        .setTitle(`Modifier ${fieldName}`);

    const input = new TextInputBuilder()
        .setCustomId(fieldName)
        .setLabel(fieldName)
        .setStyle(TextInputStyle.Paragraph)
        .setValue(value || '')
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

// Afficher le modal d'édition pour toute la catégorie
async function showEditModal(interaction, categoryId) {
    const category = Object.values(CATEGORIES).find(c => c.id === categoryId);
    if (!category) return;

    const modal = new ModalBuilder()
        .setCustomId(`config_modal_${categoryId}`)
        .setTitle(`Modifier ${category.name}`);

    const config = configManager.getConfig();
    const inputs = [];

    category.fields.forEach(field => {
        const currentValue = config[field];
        const value = typeof currentValue === 'string' 
            ? currentValue 
            : JSON.stringify(currentValue, null, 2);

        inputs.push(new TextInputBuilder()
            .setCustomId(field)
            .setLabel(field)
            .setStyle(TextInputStyle.Paragraph)
            .setValue(value || '')
            .setRequired(true)
        );
    });

    const rows = inputs.map(input => 
        new ActionRowBuilder().addComponents(input)
    );

    modal.addComponents(...rows);
    await interaction.showModal(modal);
}

// Gérer les interactions
module.exports.handleInteraction = async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    if (interaction.isStringSelectMenu() && interaction.customId === 'config_category_select') {
        const categoryId = interaction.values[0];
        await showCategory(interaction, categoryId);
        return;
    }

    if (interaction.isButton()) {
        const [action, categoryId] = interaction.customId.split('_').slice(1);

        switch (action) {
            case 'back':
                await showMainMenu(interaction, true);
                break;
            case 'edit':
                await showEditModal(interaction, categoryId);
                break;
            case 'edit_field':
                const fieldName = interaction.customId.split('_').pop();
                await showFieldEditModal(interaction, categoryId, fieldName);
                break;
        }
    }
};

// Gérer la soumission du modal
module.exports.handleModal = async (interaction) => {
    // Gérer les modals de champ
    if (interaction.customId.startsWith('config_field_modal_')) {
        const parts = interaction.customId.split('_');
        const categoryId = parts[3];
        const fieldName = parts[4];
        
        const category = Object.values(CATEGORIES).find(c => c.id === categoryId);
        if (!category) return;

        const updates = {};
        try {
            const value = interaction.fields.getTextInputValue(fieldName);
            updates[fieldName] = value.includes('{') ? JSON.parse(value) : value;
            
            await configManager.updateConfig(updates);
            await logToChannel(
                configManager.logChannelId, 
                `⚙️ Configuration mise à jour par ${interaction.user.tag}:\n\`\`\`json\n${JSON.stringify(updates, null, 2)}\n\`\`\``
            );
            await interaction.reply({
                content: `✅ Champ "${fieldName}" mis à jour avec succès!`,
                ephemeral: true
            });
            await showCategory(interaction, categoryId);
        } catch (error) {
            console.error(`Erreur mise à jour champ ${fieldName}:`, error);
            await interaction.reply({
                content: `❌ Échec de la mise à jour: ${error.message}`,
                ephemeral: true
            });
        }
        return;
    }

    // Gérer les modals de catégorie complète
    const categoryId = interaction.customId.split('_')[2];
    const category = Object.values(CATEGORIES).find(c => c.id === categoryId);
    if (!category) return;

    const updates = {};
    for (const field of category.fields) {
        try {
            const value = interaction.fields.getTextInputValue(field);
            updates[field] = value.includes('{') ? JSON.parse(value) : value;
        } catch (error) {
            await interaction.reply({
                content: `❌ Format invalide pour ${field}: ${error.message}`,
                ephemeral: true
            });
            return;
        }
    }

    try {
        await configManager.updateConfig(updates);
        await logToChannel(
            configManager.logChannelId, 
            `⚙️ Configuration mise à jour par ${interaction.user.tag}:\n\`\`\`json\n${JSON.stringify(updates, null, 2)}\n\`\`\``
        );
        await interaction.reply({
            content: '✅ Configuration mise à jour avec succès!',
            ephemeral: true
        });
        await showCategory(interaction, categoryId);
    } catch (error) {
        console.error('Erreur mise à jour config:', error);
        await interaction.reply({
            content: `❌ Échec de la mise à jour: ${error.message}`,
            ephemeral: true
        });
    }
};
