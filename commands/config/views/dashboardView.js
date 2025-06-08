const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require('discord.js');
const configManager = require('../../../utils/configManager');
const { CONFIG_CATEGORIES } = require('../definitions');
const { getConfigStats } = require('../utils');

/**
 * Show the main configuration dashboard
 * @param {Object} interaction - Discord interaction object
 */
async function showMainDashboard(interaction) {
    const config = configManager.getConfig();
    const stats = getConfigStats(config);
    
    const embed = createDashboardEmbed(interaction, stats);
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
            
            // Import handleInteraction from parent module to avoid circular dependency
            const configModule = require('../../config');
            await configModule.handleInteraction(i, config);
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

    collector.on('end', async (collected, reason) => {
        try {
            console.log(`[CONFIG] Collecteur terminé. Raison: ${reason}, Interactions collectées: ${collected.size}`);
            
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

/**
 * Create the main dashboard embed
 * @param {Object} interaction - Discord interaction
 * @param {Object} stats - Configuration statistics
 * @returns {EmbedBuilder}
 */
function createDashboardEmbed(interaction, stats) {
    return new EmbedBuilder()
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
}

/**
 * Create category selection menu
 * @returns {ActionRowBuilder}
 */
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

/**
 * Create quick actions button row
 * @returns {ActionRowBuilder}
 */
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

module.exports = {
    showMainDashboard,
    createDashboardEmbed,
    createCategorySelectMenu,
    createQuickActionsRow
};