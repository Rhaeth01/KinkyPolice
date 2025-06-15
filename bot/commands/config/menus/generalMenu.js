const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

/**
 * @file commands/config/menus/generalMenu.js
 * @description Menu de configuration générale du bot
 */

class GeneralMenu {
    /**
     * Crée l'embed de configuration générale
     * @param {Object} config - Configuration actuelle
     * @param {import('discord.js').Guild} guild - Le serveur Discord
     * @returns {import('discord.js').EmbedBuilder} L'embed de configuration
     */
    static createEmbed(config, guild) {
        const generalConfig = config.general || {};
        
        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configuration Générale')
            .setDescription('Paramètres de base du bot')
            .setColor(0x5865F2)
            .addFields([
                {
                    name: '🔧 Préfixe',
                    value: `Actuel: \`${generalConfig.prefix || '!'}\``,
                    inline: true
                },
                {
                    name: '👑 Rôle Administrateur',
                    value: generalConfig.adminRole ? `<@&${generalConfig.adminRole}>` : 'Non défini',
                    inline: true
                },
                {
                    name: '🛡️ Rôle Modérateur',
                    value: generalConfig.modRole ? `<@&${generalConfig.modRole}>` : 'Non défini',
                    inline: true
                }
            ])
            .setFooter({ text: 'Configuration > Général' });

        return embed;
    }

    /**
     * Crée les composants de configuration générale
     * @returns {Array<import('discord.js').ActionRowBuilder>} Les composants
     */
    static createComponents() {
        const editRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_general_edit_prefix')
                .setLabel('✏️ Modifier le préfixe')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('config_general_select_admin_role')
                .setLabel('👑 Rôle Admin')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('config_general_select_mod_role')
                .setLabel('🛡️ Rôle Mod')
                .setStyle(ButtonStyle.Secondary)
        ]);

        return [editRow];
    }

    /**
     * Crée le modal d'édition du préfixe
     * @param {string} currentPrefix - Le préfixe actuel
     * @returns {import('discord.js').ModalBuilder} Le modal
     */
    static createPrefixModal(currentPrefix = '!') {
        const modal = new ModalBuilder()
            .setCustomId('config_general_prefix_modal')
            .setTitle('Modifier le préfixe du bot');

        const prefixInput = new TextInputBuilder()
            .setCustomId('prefix_input')
            .setLabel('Nouveau préfixe')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: !, ?, $, etc.')
            .setValue(currentPrefix)
            .setMaxLength(5)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(prefixInput)
        );

        return modal;
    }

    /**
     * Traite la soumission du modal de préfixe
     * @param {import('discord.js').ModalSubmitInteraction} interaction - L'interaction modal
     * @param {Function} addPendingChanges - Fonction pour ajouter des changements
     * @returns {Object} Les changements à appliquer
     */
    static handlePrefixModal(interaction, addPendingChanges) {
        const newPrefix = interaction.fields.getTextInputValue('prefix_input').trim();
        
        // Validation du préfixe
        if (newPrefix.length === 0) {
            throw new Error('Le préfixe ne peut pas être vide.');
        }
        
        if (newPrefix.length > 5) {
            throw new Error('Le préfixe ne peut pas dépasser 5 caractères.');
        }

        // Caractères interdits
        const forbiddenChars = /[a-zA-Z0-9]/;
        if (forbiddenChars.test(newPrefix)) {
            throw new Error('Le préfixe ne doit pas contenir de lettres ou de chiffres.');
        }

        const changes = {
            general: {
                prefix: newPrefix
            }
        };

        addPendingChanges(interaction.user.id, changes);
        return changes;
    }

    /**
     * Traite la sélection d'un rôle administrateur
     * @param {import('discord.js').RoleSelectMenuInteraction} interaction - L'interaction de sélection
     * @param {Function} addPendingChanges - Fonction pour ajouter des changements
     * @returns {Object} Les changements à appliquer
     */
    static handleAdminRoleSelect(interaction, addPendingChanges) {
        const selectedRole = interaction.roles.first();
        
        if (!selectedRole) {
            throw new Error('Aucun rôle sélectionné.');
        }

        // Vérification que le rôle n'est pas @everyone
        if (selectedRole.id === interaction.guild.id) {
            throw new Error('Le rôle @everyone ne peut pas être utilisé comme rôle administrateur.');
        }

        const changes = {
            general: {
                adminRole: selectedRole.id
            }
        };

        addPendingChanges(interaction.user.id, changes);
        return changes;
    }

    /**
     * Traite la sélection d'un rôle modérateur
     * @param {import('discord.js').RoleSelectMenuInteraction} interaction - L'interaction de sélection
     * @param {Function} addPendingChanges - Fonction pour ajouter des changements
     * @returns {Object} Les changements à appliquer
     */
    static handleModRoleSelect(interaction, addPendingChanges) {
        const selectedRole = interaction.roles.first();
        
        if (!selectedRole) {
            throw new Error('Aucun rôle sélectionné.');
        }

        // Vérification que le rôle n'est pas @everyone
        if (selectedRole.id === interaction.guild.id) {
            throw new Error('Le rôle @everyone ne peut pas être utilisé comme rôle modérateur.');
        }

        const changes = {
            general: {
                modRole: selectedRole.id
            }
        };

        addPendingChanges(interaction.user.id, changes);
        return changes;
    }
}

module.exports = GeneralMenu;