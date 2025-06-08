const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle
} = require('discord.js');
const configManager = require('../../../utils/configManager');
const { CONFIG_SECTIONS } = require('../definitions');
const { getNestedValue } = require('../utils');

/**
 * Show section editor view
 * @param {Object} interaction - Discord interaction object
 * @param {string} sectionKey - The section key to edit
 */
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

/**
 * Create section embed with field values
 * @param {string} sectionKey - Section key
 * @param {Object} section - Section configuration
 * @param {Object} guild - Discord guild object
 * @returns {EmbedBuilder}
 */
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

/**
 * Create field components for section editing
 * @param {string} sectionKey - Section key
 * @param {Object} fields - Fields configuration
 * @param {Object} section - Section configuration
 * @param {Object} guild - Discord guild object
 * @returns {Array<ActionRowBuilder>}
 */
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
    
    Object.entries(fields).forEach(([fieldKey, field]) => {
        if (field.type === 'channel' || field.type === 'category' || field.type === 'multi-channel') {
            channelFields.push([fieldKey, field]);
        } else if (field.type === 'role' || field.type === 'multi-role') {
            roleFields.push([fieldKey, field]);
        } else {
            otherFields.push([fieldKey, field]);
        }
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
                        .setCustomId(`configure_${field.type}_${sectionKey}_${fieldKey}`)
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

/**
 * Format value for display
 * @param {*} value - Value to format
 * @param {string} type - Field type
 * @returns {string}
 */
function formatDisplayValue(value, type) {
    if (value === undefined || value === null || value === '') {
        return '*Non défini*';
    }

    switch (type) {
        case 'channel':
        case 'category':
            return `<#${value}>`;
        case 'role':
            return `<@&${value}>`;
        case 'multi-channel':
            if (Array.isArray(value) && value.length > 0) {
                return value.map(id => `<#${id}>`).join(', ');
            }
            return '*Aucun canal*';
        case 'multi-role':
            if (Array.isArray(value) && value.length > 0) {
                return value.map(id => `<@&${id}>`).join(', ');
            }
            return '*Aucun rôle*';
        case 'toggle':
            return value ? '✅ Activé' : '❌ Désactivé';
        case 'number':
            return `\`${value}\``;
        case 'text':
            if (typeof value === 'string' && value.length > 100) {
                return `\`${value.substring(0, 97)}...\``;
            }
            return `\`${value}\``;
        default:
            return String(value);
    }
}

module.exports = {
    showSectionEditor,
    createSectionEmbed,
    createFieldComponents,
    formatDisplayValue
};