const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');

/**
 * @file commands/config/menus/entryMenu.js
 * @description Menu de configuration de l'entrée et du formulaire d'accès
 */

class EntryMenu {
    /**
     * Crée l'embed de configuration d'entrée
     * @param {Object} config - Configuration actuelle
     * @param {import('discord.js').Guild} guild - Le serveur Discord
     * @returns {import('discord.js').EmbedBuilder} L'embed de configuration
     */
    static createEmbed(config, guild) {
        const entryConfig = config.entry || {};
        const modalConfig = config.entryModal || {};
        
        const embed = new EmbedBuilder()
            .setTitle('🚪 Configuration d\'Entrée')
            .setDescription('Gestion de l\'accueil et du formulaire d\'accès')
            .setColor(0x5865F2)
            .addFields([
                {
                    name: '👋 Canal d\'Accueil',
                    value: entryConfig.welcomeChannel ? `<#${entryConfig.welcomeChannel}>` : 'Non défini',
                    inline: true
                },
                {
                    name: '📋 Canal des Règles',
                    value: entryConfig.rulesChannel ? `<#${entryConfig.rulesChannel}>` : 'Non défini',
                    inline: true
                },
                {
                    name: '📨 Canal des Demandes',
                    value: entryConfig.entryRequestChannelId ? `<#${entryConfig.entryRequestChannelId}>` : 'Non défini',
                    inline: true
                },
                {
                    name: '✅ Rôle de Vérification',
                    value: entryConfig.verificationRole ? `<@&${entryConfig.verificationRole}>` : 'Non défini',
                    inline: true
                },
                {
                    name: '📁 Catégorie d\'Entrée',
                    value: config.tickets?.acceptedEntryCategoryId ? `<#${config.tickets.acceptedEntryCategoryId}>` : 'Non défini',
                    inline: true
                },
                {
                    name: '📝 Formulaire d\'Accès',
                    value: `**Titre:** ${modalConfig.title || 'Non défini'}\n**Champs:** ${modalConfig.fields?.length || 0} champ(s)`,
                    inline: false
                }
            ])
            .setFooter({ text: 'Configuration > Entrée' });

        return embed;
    }

    /**
     * Crée les composants de configuration d'entrée
     * @returns {Array<import('discord.js').ActionRowBuilder>} Les composants
     */
    static createComponents() {
        const channelRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_entry_select_welcome_channel')
                .setLabel('👋 Canal Accueil')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('config_entry_select_rules_channel')
                .setLabel('📋 Canal Règles')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('config_entry_select_request_channel')
                .setLabel('📨 Canal Demandes')
                .setStyle(ButtonStyle.Primary)
        ]);

        const roleRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_entry_select_verification_role')
                .setLabel('✅ Rôle Vérification')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('config_entry_select_entry_category')
                .setLabel('📁 Catégorie Entrée')
                .setStyle(ButtonStyle.Primary)
        ]);

        const modalRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_entry_edit_modal_title')
                .setLabel('✏️ Titre du Formulaire')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('config_entry_manage_modal_fields')
                .setLabel('📝 Gérer les Champs')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('config_entry_preview_modal')
                .setLabel('👁️ Prévisualiser')
                .setStyle(ButtonStyle.Secondary)
        ]);

        return [channelRow, roleRow, modalRow];
    }

    /**
     * Crée l'embed de gestion des champs du modal
     * @param {Object} modalConfig - Configuration actuelle du modal
     * @returns {Object} Embed et composants
     */
    static createFieldManagementEmbed(modalConfig = {}) {
        const fields = modalConfig.fields || [];
        
        const embed = new EmbedBuilder()
            .setTitle('📝 Gestion des Champs du Formulaire')
            .setDescription(`**Titre:** ${modalConfig.title || 'Non défini'}\n\n**Champs configurés:** ${fields.length}/5`)
            .setColor(0x5865F2)
            .setFooter({ text: 'Configuration > Entrée > Champs du Formulaire' });

        // Ajouter chaque champ comme un field de l'embed
        fields.forEach((field, index) => {
            const requiredText = field.required ? '✅ Obligatoire' : '❌ Optionnel';
            const styleText = field.style === 'Short' ? '📝 Ligne courte' : '📄 Paragraphe';
            
            embed.addFields([{
                name: `${index + 1}. ${field.label}`,
                value: `**ID:** \`${field.customId}\`\n**Type:** ${styleText}\n**Requis:** ${requiredText}\n**Placeholder:** ${field.placeholder || 'Aucun'}`,
                inline: false
            }]);
        });

        if (fields.length === 0) {
            embed.addFields([{
                name: 'Aucun champ configuré',
                value: 'Utilisez les boutons ci-dessous pour ajouter des champs',
                inline: false
            }]);
        }

        const actionRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_entry_add_field')
                .setLabel('➕ Ajouter un Champ')
                .setStyle(ButtonStyle.Success)
                .setDisabled(fields.length >= 5), // Discord limite à 5 champs par modal
            new ButtonBuilder()
                .setCustomId('config_entry_edit_field')
                .setLabel('✏️ Modifier un Champ')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(fields.length === 0),
            new ButtonBuilder()
                .setCustomId('config_entry_remove_field')
                .setLabel('🗑️ Supprimer un Champ')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(fields.length === 0)
        ]);

        const orderRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_entry_move_field_up')
                .setLabel('⬆️ Monter')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(fields.length <= 1),
            new ButtonBuilder()
                .setCustomId('config_entry_move_field_down')
                .setLabel('⬇️ Descendre')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(fields.length <= 1)
        ]);

        return { embed, components: [actionRow, orderRow] };
    }

    /**
     * Crée le menu de sélection de champ
     * @param {Array} fields - Liste des champs
     * @param {string} action - Action à effectuer (edit, remove, move_up, move_down)
     * @returns {import('discord.js').ActionRowBuilder} Le menu de sélection
     */
    static createFieldSelectMenu(fields, action) {
        const options = fields.map((field, index) => ({
            label: `${index + 1}. ${field.label}`,
            description: `ID: ${field.customId} | ${field.style} | ${field.required ? 'Obligatoire' : 'Optionnel'}`,
            value: `${action}_${index}`,
            emoji: field.style === 'Short' ? '📝' : '📄'
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`config_entry_field_select_${action}`)
            .setPlaceholder('Sélectionnez un champ')
            .addOptions(options);

        return new ActionRowBuilder().addComponents(selectMenu);
    }

    /**
     * Crée le modal d'ajout/édition de champ
     * @param {Object} existingField - Champ existant (pour édition) ou null (pour ajout)
     * @param {number} fieldIndex - Index du champ (pour édition)
     * @returns {import('discord.js').ModalBuilder} Le modal
     */
    static createFieldModal(existingField = null, fieldIndex = null) {
        const isEdit = existingField !== null;
        
        const modal = new ModalBuilder()
            .setCustomId(isEdit ? `config_entry_edit_field_modal_${fieldIndex}` : 'config_entry_add_field_modal')
            .setTitle(isEdit ? 'Modifier le Champ' : 'Ajouter un Champ');

        const labelInput = new TextInputBuilder()
            .setCustomId('field_label')
            .setLabel('Libellé du champ')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Quel est votre pseudo ?')
            .setValue(existingField?.label || '')
            .setMaxLength(45)
            .setRequired(true);

        const customIdInput = new TextInputBuilder()
            .setCustomId('field_custom_id')
            .setLabel('ID personnalisé (unique)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: pseudo_input')
            .setValue(existingField?.customId || '')
            .setMaxLength(100)
            .setRequired(true);

        const placeholderInput = new TextInputBuilder()
            .setCustomId('field_placeholder')
            .setLabel('Texte d\'aide (optionnel)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Entrez votre pseudo principal')
            .setValue(existingField?.placeholder || '')
            .setMaxLength(100)
            .setRequired(false);

        const styleInput = new TextInputBuilder()
            .setCustomId('field_style')
            .setLabel('Type de champ (Short ou Paragraph)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Short ou Paragraph')
            .setValue(existingField?.style || 'Short')
            .setRequired(true);

        const requiredInput = new TextInputBuilder()
            .setCustomId('field_required')
            .setLabel('Obligatoire ? (true ou false)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('true ou false')
            .setValue(existingField?.required?.toString() || 'true')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(labelInput),
            new ActionRowBuilder().addComponents(customIdInput),
            new ActionRowBuilder().addComponents(placeholderInput),
            new ActionRowBuilder().addComponents(styleInput),
            new ActionRowBuilder().addComponents(requiredInput)
        );

        return modal;
    }

    /**
     * Traite le modal de titre du formulaire
     * @param {import('discord.js').ModalSubmitInteraction} interaction - L'interaction modal
     * @param {Function} addPendingChanges - Fonction pour ajouter des changements
     * @returns {Object} Les changements à appliquer
     */
    static handleTitleModal(interaction, addPendingChanges) {
        const newTitle = interaction.fields.getTextInputValue('modal_title').trim();
        
        if (newTitle.length === 0) {
            throw new Error('Le titre ne peut pas être vide.');
        }
        
        if (newTitle.length > 100) {
            throw new Error('Le titre ne peut pas dépasser 100 caractères.');
        }

        const changes = {
            entryModal: {
                title: newTitle
            }
        };

        addPendingChanges(interaction.user.id, changes);
        return changes;
    }

    /**
     * Traite l'ajout/édition d'un champ
     * @param {import('discord.js').ModalSubmitInteraction} interaction - L'interaction modal
     * @param {boolean} isEdit - Si c'est une édition
     * @param {number} fieldIndex - Index du champ (pour édition)
     * @param {Function} addPendingChanges - Fonction pour ajouter des changements
     * @returns {Object} Les changements à appliquer
     */
    static handleFieldModal(interaction, isEdit, fieldIndex, addPendingChanges) {
        const label = interaction.fields.getTextInputValue('field_label').trim();
        const customId = interaction.fields.getTextInputValue('field_custom_id').trim();
        const placeholder = interaction.fields.getTextInputValue('field_placeholder').trim();
        const style = interaction.fields.getTextInputValue('field_style').trim();
        const requiredStr = interaction.fields.getTextInputValue('field_required').trim().toLowerCase();

        // Validation
        if (!label || !customId) {
            throw new Error('Le libellé et l\'ID personnalisé sont obligatoires.');
        }

        if (!['Short', 'Paragraph'].includes(style)) {
            throw new Error('Le type doit être "Short" ou "Paragraph".');
        }

        if (!['true', 'false'].includes(requiredStr)) {
            throw new Error('Le champ "Obligatoire" doit être "true" ou "false".');
        }

        const newField = {
            customId,
            label,
            style,
            required: requiredStr === 'true',
            placeholder: placeholder || undefined
        };

        const configManager = require('../../../utils/configManager');
        const currentConfig = configManager.getConfig();
        const currentFields = currentConfig.entryModal?.fields || [];

        // Vérifier l'unicité de l'ID personnalisé
        const existingIndex = currentFields.findIndex(f => f.customId === customId);
        if (existingIndex !== -1 && (!isEdit || existingIndex !== fieldIndex)) {
            throw new Error('Un champ avec cet ID personnalisé existe déjà.');
        }

        let newFields = [...currentFields];
        
        if (isEdit) {
            newFields[fieldIndex] = newField;
        } else {
            newFields.push(newField);
        }

        const changes = {
            entryModal: {
                fields: newFields
            }
        };

        addPendingChanges(interaction.user.id, changes);
        return changes;
    }

    /**
     * Supprime un champ
     * @param {number} fieldIndex - Index du champ à supprimer
     * @param {Function} addPendingChanges - Fonction pour ajouter des changements
     * @param {string} userId - ID de l'utilisateur
     * @returns {Object} Les changements à appliquer
     */
    static removeField(fieldIndex, addPendingChanges, userId) {
        const configManager = require('../../../utils/configManager');
        const currentConfig = configManager.getConfig();
        const currentFields = currentConfig.entryModal?.fields || [];

        if (fieldIndex < 0 || fieldIndex >= currentFields.length) {
            throw new Error('Index de champ invalide.');
        }

        const newFields = currentFields.filter((_, index) => index !== fieldIndex);

        const changes = {
            entryModal: {
                fields: newFields
            }
        };

        addPendingChanges(userId, changes);
        return changes;
    }

    /**
     * Déplace un champ vers le haut ou le bas
     * @param {number} fieldIndex - Index du champ
     * @param {string} direction - Direction (up ou down)
     * @param {Function} addPendingChanges - Fonction pour ajouter des changements
     * @param {string} userId - ID de l'utilisateur
     * @returns {Object} Les changements à appliquer
     */
    static moveField(fieldIndex, direction, addPendingChanges, userId) {
        const configManager = require('../../../utils/configManager');
        const currentConfig = configManager.getConfig();
        const currentFields = [...(currentConfig.entryModal?.fields || [])];

        if (fieldIndex < 0 || fieldIndex >= currentFields.length) {
            throw new Error('Index de champ invalide.');
        }

        let newIndex;
        if (direction === 'up') {
            if (fieldIndex === 0) throw new Error('Le champ est déjà en première position.');
            newIndex = fieldIndex - 1;
        } else if (direction === 'down') {
            if (fieldIndex === currentFields.length - 1) throw new Error('Le champ est déjà en dernière position.');
            newIndex = fieldIndex + 1;
        } else {
            throw new Error('Direction invalide.');
        }

        // Échanger les éléments
        [currentFields[fieldIndex], currentFields[newIndex]] = [currentFields[newIndex], currentFields[fieldIndex]];

        const changes = {
            entryModal: {
                fields: currentFields
            }
        };

        addPendingChanges(userId, changes);
        return changes;
    }

    /**
     * Crée le modal d'édition du titre
     * @param {string} currentTitle - Titre actuel
     * @returns {import('discord.js').ModalBuilder} Le modal
     */
    static createTitleModal(currentTitle = '') {
        const modal = new ModalBuilder()
            .setCustomId('config_entry_title_modal')
            .setTitle('Modifier le Titre du Formulaire');

        const titleInput = new TextInputBuilder()
            .setCustomId('modal_title')
            .setLabel('Titre du formulaire')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Formulaire de demande d\'accès')
            .setValue(currentTitle)
            .setMaxLength(100)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput)
        );

        return modal;
    }

    /**
     * Traite la sélection d'un canal
     * @param {import('discord.js').ChannelSelectMenuInteraction} interaction - L'interaction
     * @param {string} channelType - Type de canal (welcomeChannel, rulesChannel)
     * @param {Function} addPendingChanges - Fonction pour ajouter des changements
     * @returns {Object} Les changements à appliquer
     */
    static handleChannelSelect(interaction, channelType, addPendingChanges) {
        const selectedChannel = interaction.channels.first();
        
        if (!selectedChannel) {
            throw new Error('Aucun salon sélectionné.');
        }

        let changes;
        
        // La catégorie d'entrée va dans la section tickets
        if (channelType === 'acceptedEntryCategoryId') {
            changes = {
                tickets: {
                    [channelType]: selectedChannel.id
                }
            };
        } else {
            // Les autres canaux vont dans la section entry
            changes = {
                entry: {
                    [channelType]: selectedChannel.id
                }
            };
        }

        addPendingChanges(interaction.user.id, changes);
        return changes;
    }

    /**
     * Traite la sélection d'un rôle
     * @param {import('discord.js').RoleSelectMenuInteraction} interaction - L'interaction
     * @param {Function} addPendingChanges - Fonction pour ajouter des changements
     * @returns {Object} Les changements à appliquer
     */
    static handleRoleSelect(interaction, addPendingChanges) {
        const selectedRole = interaction.roles.first();
        
        if (!selectedRole) {
            throw new Error('Aucun rôle sélectionné.');
        }

        if (selectedRole.id === interaction.guild.id) {
            throw new Error('Le rôle @everyone ne peut pas être utilisé.');
        }

        const changes = {
            entry: {
                verificationRole: selectedRole.id
            }
        };

        addPendingChanges(interaction.user.id, changes);
        return changes;
    }
}

module.exports = EntryMenu;