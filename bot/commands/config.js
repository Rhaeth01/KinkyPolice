const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const configHandler = require('./config/configInteractionHandler');
const ConfigFixer = require('./config/utils/configFixer');

/**
 * @file commands/config.js
 * @description Commande principale de configuration du bot avec interface interactive
 * Utilise une architecture modulaire avec menus déroulants pour les sélections
 */

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configuration interactive du bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),

    async execute(interaction) {
        try {
            // Correction automatique des problèmes de configuration
            await ConfigFixer.fixAllConfigs();
            // Vérifier les permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: '❌ Vous devez être administrateur pour utiliser cette commande.',
                    ephemeral: true
                });
            }

            // Vérifier si l'utilisateur a déjà une session active
            if (!configHandler.startSession(interaction.user, interaction)) {
                return interaction.reply({
                    content: '⚠️ Vous avez déjà une session de configuration active. Fermez-la d\'abord avant d\'en démarrer une nouvelle.',
                    ephemeral: true
                });
            }

            // Créer l'interface principale
            const embed = configHandler.createMainConfigEmbed(interaction.user.id, interaction.guild);
            const categoryMenu = configHandler.createCategorySelectMenu();
            const controlButtons = configHandler.createControlButtons(interaction.user.id);

            await interaction.reply({
                embeds: [embed],
                components: [categoryMenu, controlButtons],
                ephemeral: true
            });

        } catch (error) {
            console.error('[CONFIG COMMAND] Erreur lors de l\'exécution:', error);
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: '❌ Une erreur est survenue lors de l\'ouverture de la configuration.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors de l\'ouverture de la configuration.',
                    ephemeral: true
                });
            }
        }
    }
};