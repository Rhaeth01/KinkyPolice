const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle
} = require('discord.js');
const configManager = require('../../../utils/configManager');
const { CONFIG_CATEGORIES, CONFIG_SECTIONS } = require('../definitions');
const { getNestedValue } = require('../utils');

/**
 * Show category view with sections list
 * @param {Object} interaction - Discord interaction object
 * @param {string} categoryKey - The category key to display
 */
async function showCategoryView(interaction, categoryKey) {
    const category = CONFIG_CATEGORIES[categoryKey];
    if (!category) return;

    const config = configManager.getConfig();
    
    const embed = createCategoryEmbed(category, categoryKey, config);
    const components = createCategoryComponents(category, config);

    await interaction.update({
        embeds: [embed],
        components: components
    });
}

/**
 * Create category embed with section overview
 * @param {Object} category - Category configuration
 * @param {string} categoryKey - Category key
 * @param {Object} config - Configuration object
 * @returns {EmbedBuilder}
 */
function createCategoryEmbed(category, categoryKey, config) {
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

    return embed;
}

/**
 * Create category action components (buttons for each section)
 * @param {Object} category - Category configuration
 * @param {Object} config - Configuration object
 * @returns {Array<ActionRowBuilder>}
 */
function createCategoryComponents(category, config) {
    const rows = [];
    const sectionsPerRow = 3;
    
    // Boutons pour chaque section
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

    return rows;
}

module.exports = {
    showCategoryView,
    createCategoryEmbed,
    createCategoryComponents
};