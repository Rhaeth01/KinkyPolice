const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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

    const buttons = Object.values(CATEGORIES).map(cat => 
        new ButtonBuilder()
            .setCustomId(`config_category_${cat.id}`)
            .setLabel(cat.name)
            .setStyle(ButtonStyle.Primary)
    );

    const actionRow = new ActionRowBuilder().addComponents(buttons);

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

    // Boutons d'action
    const buttons = [
        new ButtonBuilder()
            .setCustomId('config_back')
            .setLabel('← Retour')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`config_edit_${categoryId}`)
            .setLabel('✏️ Modifier')
            .setStyle(ButtonStyle.Success)
    ];

    const actionRow = new ActionRowBuilder().addComponents(buttons);

    await interaction.update({
        embeds: [embed],
        components: [actionRow],
        ephemeral: true
    });
}

// Gérer les interactions
module.exports.handleInteraction = async (interaction) => {
    if (!interaction.isButton()) return;

    const [action, categoryId] = interaction.customId.split('_').slice(1);

    switch (action) {
        case 'category':
            await showCategory(interaction, categoryId);
            break;
        case 'back':
            await showMainMenu(interaction, true);
            break;
        case 'edit':
            await showEditModal(interaction, categoryId);
            break;
    }
};

// Afficher le modal d'édition
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

// Gérer la soumission du modal
module.exports.handleModal = async (interaction) => {
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
