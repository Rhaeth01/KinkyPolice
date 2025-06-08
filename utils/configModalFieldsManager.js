const {
    InteractionType,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
} = require('discord.js');
const configManager = require('./configManager');
const { isInteractionValid } = require('../utils/configUtils');

/**
 * Checks if a customId corresponds to a modal submission handled by this manager.
 * @param {string} customId - The custom ID of the interaction.
 * @returns {boolean} True if it's a modal field submission custom ID.
 */
function isModalFieldSubmit(customId) {
    return customId.startsWith('add_modal_field_submit') ||
           customId.startsWith('edit_modal_field_submit_');
}

/**
 * Checks if a customId corresponds to a select menu interaction handled by this manager.
 * @param {string} customId - The custom ID of the interaction.
 * @returns {boolean} True if it's a modal field select menu custom ID.
 */
function isModalFieldSelect(customId){
    return customId === 'select_modal_field_to_edit_submit' ||
           customId === 'select_modal_field_to_delete_submit';
}

/**
 * Main router for modal submissions related to modal fields.
 * @async
 * @param {import('discord.js').ModalSubmitInteraction} interaction - The modal submit interaction.
 */
async function handleModalSubmit(interaction) {
    if (!isInteractionValid(interaction)) {
        console.log("[MODAL_MGR] Modal submit on invalid interaction.");
        // Attempt to reply if possible, otherwise log and return.
        if (interaction.isRepliable()) {
            await interaction.reply({ content: 'Cette interaction a expiré.', ephemeral: true }).catch(e => console.error("Error replying to invalid modal submit:", e));
        }
        return;
    }

    if (interaction.customId === 'add_modal_field_submit') {
        await handleAddFieldSubmit(interaction);
    } else if (interaction.customId.startsWith('edit_modal_field_submit_')) {
        const fieldIndex = parseInt(interaction.customId.split('_').pop());
        await handleEditFieldSubmit(interaction, fieldIndex);
    } else {
        console.warn(`[MODAL_MGR] Unhandled modal submit: ${interaction.customId}`);
        if (interaction.isRepliable()) {
            await interaction.reply({ content: 'Ce formulaire n\'est pas géré correctement.', ephemeral: true });
        }
    }
}

/**
 * Main router for select menu interactions related to modal fields.
 * @async
 * @param {import('discord.js').StringSelectMenuInteraction} interaction - The string select menu interaction.
 */
async function handleSelectMenuInteraction(interaction) {
    if (!isInteractionValid(interaction)) {
        console.log("[MODAL_MGR] Select menu on invalid interaction.");
        if (interaction.isRepliable()) {
             await interaction.reply({ content: 'Cette interaction a expiré.', ephemeral: true }).catch(e => console.error("Error replying to invalid select menu:", e));
        }
        return;
    }

    // Defer update for select menus as they usually trigger a new view or modal.
    await interaction.deferUpdate().catch(e => console.warn("[MODAL_MGR] DeferUpdate failed in handleSelectMenuInteraction", e.message));


    if (interaction.customId === 'select_modal_field_to_edit_submit') {
        const fieldIndex = parseInt(interaction.values[0].split('_').pop());
        await showEditFieldModal(interaction, fieldIndex);
    } else if (interaction.customId === 'select_modal_field_to_delete_submit') {
        const fieldIndex = parseInt(interaction.values[0].split('_').pop());
        await showDeleteConfirmation(interaction, fieldIndex);
    } else {
        console.warn(`[MODAL_MGR] Unhandled select menu: ${interaction.customId}`);
        // interaction already deferred, use followUp if needed
        await interaction.followUp({ content: 'Cette sélection n\'est pas gérée.', ephemeral: true }).catch(e => console.error("Error following up unhandled select menu:", e));
    }
}

/**
 * Handles the submission of the "add modal field" modal.
 * Validates input, updates config, and shows the main modal fields manager view.
 * @async
 * @param {import('discord.js').ModalSubmitInteraction} interaction - The modal submit interaction.
 */
async function handleAddFieldSubmit(interaction) {
    try {
        const label = interaction.fields.getTextInputValue('field_label');
        const customId = interaction.fields.getTextInputValue('field_custom_id').replace(/\s+/g, '_');
        const placeholder = interaction.fields.getTextInputValue('field_placeholder') || '';
        const styleInput = interaction.fields.getTextInputValue('field_style').toUpperCase();
        const style = (styleInput === 'PARAGRAPH' || styleInput === 'TEXTAREA') ? 'Paragraph' : 'Short';
        const required = interaction.fields.getTextInputValue('field_required').toLowerCase() === 'true';

        // Basic Validation
        if (!label || !customId) return await interaction.reply({ content: 'Libellé et ID personnalisé sont requis.', ephemeral: true });
        if (customId.length > 100 || label.length > 45 || placeholder.length > 100) return await interaction.reply({ content: 'Un des champs dépasse la longueur maximale autorisée.', ephemeral: true });
        if (!/^[a-zA-Z0-9_]{1,100}$/.test(customId)) return await interaction.reply({ content: 'L\'ID personnalisé ne doit contenir que des lettres, chiffres et underscores.', ephemeral: true});


        const config = configManager.getConfig();
        if (!config.entryModal) config.entryModal = { title: 'Modal d\'Entrée', fields: [] };
        if (!config.entryModal.fields) config.entryModal.fields = [];

        if (config.entryModal.fields.some(f => f.customId === customId)) return await interaction.reply({ content: `L'ID personnalisé "${customId}" existe déjà.`, ephemeral: true });
        if (config.entryModal.fields.length >= 5) return await interaction.reply({ content: 'Limite de 5 champs atteinte.', ephemeral: true });

        config.entryModal.fields.push({ label, customId, placeholder, style, required });
        await configManager.updateConfig(config);

        // Interaction has been replied to by showModal, or by error messages.
        // We need to ensure showModalFieldsManager is called correctly.
        // Since modals auto-defer/reply, we typically use editReply for the original message.
        // Here, we are updating the message that *triggered* the modal opening.
        // This requires careful state management or passing the original message reference.
        // For now, we assume the interaction for the modal submission should be replied to, then the user re-opens the manager.
        // A better UX might be to edit the original manager message.
        // For now, we'll defer the modal submission and then call showModalFieldsManager on that deferred interaction.
        await interaction.deferUpdate();
        await showModalFieldsManager(interaction, `Champ "${label}" ajouté avec succès.`);

    } catch (error) {
        console.error('[MODAL_MGR] Erreur ajout champ:', error);
        if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'Erreur lors de l\'ajout du champ.', ephemeral: true }).catch(()=>{});
        else await interaction.followUp({ content: 'Erreur lors de l\'ajout du champ.', ephemeral: true }).catch(()=>{});
    }
}

/**
 * Handles the submission of the "edit modal field" modal.
 * Validates input, updates the specified field in config, and shows the main manager view.
 * @async
 * @param {import('discord.js').ModalSubmitInteraction} interaction - The modal submit interaction.
 * @param {number} fieldIndex - The index of the field being edited.
 */
async function handleEditFieldSubmit(interaction, fieldIndex) {
    try {
        const label = interaction.fields.getTextInputValue('field_label');
        const customId = interaction.fields.getTextInputValue('field_custom_id').replace(/\s+/g, '_');
        const placeholder = interaction.fields.getTextInputValue('field_placeholder') || '';
        const styleInput = interaction.fields.getTextInputValue('field_style').toUpperCase();
        const style = (styleInput === 'PARAGRAPH' || styleInput === 'TEXTAREA') ? 'Paragraph' : 'Short';
        const required = interaction.fields.getTextInputValue('field_required').toLowerCase() === 'true';

        if (!label || !customId) return await interaction.reply({ content: 'Libellé et ID personnalisé sont requis.', ephemeral: true });
        if (customId.length > 100 || label.length > 45 || placeholder.length > 100) return await interaction.reply({ content: 'Un des champs dépasse la longueur maximale autorisée.', ephemeral: true });
        if (!/^[a-zA-Z0-9_]{1,100}$/.test(customId)) return await interaction.reply({ content: 'L\'ID personnalisé ne doit contenir que des lettres, chiffres et underscores.', ephemeral: true});


        const config = configManager.getConfig();
        if (!config.entryModal?.fields?.[fieldIndex]) return await interaction.reply({ content: 'Champ introuvable pour modification.', ephemeral: true });
        if (config.entryModal.fields.some((f, idx) => f.customId === customId && idx !== fieldIndex)) return await interaction.reply({ content: `L'ID personnalisé "${customId}" existe déjà.`, ephemeral: true });

        config.entryModal.fields[fieldIndex] = { label, customId, placeholder, style, required };
        await configManager.updateConfig(config);

        await interaction.deferUpdate();
        await showModalFieldsManager(interaction, `Champ "${label}" modifié avec succès.`);
    } catch (error) {
        console.error('[MODAL_MGR] Erreur modif champ:', error);
        if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'Erreur modification champ.', ephemeral: true }).catch(()=>{});
        else await interaction.followUp({ content: 'Erreur modification champ.', ephemeral: true }).catch(()=>{});
    }
}

/**
 * Shows a confirmation dialog before deleting a modal field.
 * @async
 * @param {import('discord.js').StringSelectMenuInteraction} interaction - The select menu interaction that triggered deletion.
 * @param {number} fieldIndex - The index of the field to be deleted.
 */
async function showDeleteConfirmation(interaction, fieldIndex) {
    // interaction is already deferred by handleSelectMenuInteraction
    const config = configManager.getConfig();
    const field = config.entryModal?.fields?.[fieldIndex];
    if (!field) return interaction.editReply({ content: '❌ Champ introuvable pour suppression.', embeds: [], components: [] });

    const embed = new EmbedBuilder().setTitle('🗑️ Confirmer Suppression').setDescription(`Supprimer le champ: **${field.label}** (\`${field.customId}\`) ?`).setColor('#ED4245');
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`delete_modal_field_do_${fieldIndex}`).setLabel('✅ Confirmer').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('back_to_modal_manager').setLabel('❌ Annuler').setStyle(ButtonStyle.Secondary)
    );
    // Since interaction was deferred, use editReply
    await interaction.editReply({ embeds: [embed], components: [row], content:'' });
}

/**
 * Handles the actual deletion of a modal field after confirmation.
 * @async
 * @param {import('discord.js').ButtonInteraction} interaction - The button interaction confirming deletion.
 * @param {number} fieldIndex - The index of the field to delete.
 */
async function handleDeleteFieldConfirm(interaction, fieldIndex) {
    try {
        if (!isInteractionValid(interaction)) return; // Check if interaction is too old
        await interaction.deferUpdate(); // Defer the button interaction

        const config = configManager.getConfig();
        if (!config.entryModal?.fields?.[fieldIndex]) {
            return showModalFieldsManager(interaction, '❌ Champ introuvable ou déjà supprimé.');
        }
        const deletedField = config.entryModal.fields.splice(fieldIndex, 1);
        await configManager.updateConfig(config);

        await showModalFieldsManager(interaction, `Champ "${deletedField[0]?.label}" supprimé.`);
    } catch (error) {
        console.error('[MODAL_MGR] Erreur suppression champ:', error);
        if (!interaction.replied && !interaction.deferred) await interaction.deferUpdate().catch(()=>{}); // Ensure defer if not done
        await showModalFieldsManager(interaction, '❌ Erreur lors de la suppression.').catch(()=>{});
    }
}

/**
 * Shows a confirmation dialog before resetting all modal fields.
 * @async
 * @param {import('discord.js').ButtonInteraction} interaction - The button interaction.
 */
async function handleResetAllModalFields(interaction) {
    if (!isInteractionValid(interaction)) return;
    await interaction.deferUpdate();

    const embed = new EmbedBuilder().setTitle('⚠️ Confirmer Réinitialisation').setDescription('Supprimer **TOUS** les champs du modal ? Irréversible.').setColor('#ED4245');
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_reset_modal_fields_action').setLabel('Oui, TOUT supprimer').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('back_to_modal_manager').setLabel('Annuler').setStyle(ButtonStyle.Secondary)
    );
    await interaction.editReply({ embeds: [embed], components: [row], content: '' });
}

/**
 * Handles the actual reset of all modal fields after confirmation.
 * @async
 * @param {import('discord.js').ButtonInteraction} interaction - The button interaction confirming reset.
 */
async function handleConfirmResetAllModalFields(interaction) {
    try {
        if (!isInteractionValid(interaction)) return;
        await interaction.deferUpdate();

        const config = configManager.getConfig();
        if (config.entryModal) {
            config.entryModal.fields = [];
            await configManager.updateConfig(config);
        }
        await showModalFieldsManager(interaction, 'Tous les champs du modal ont été réinitialisés.');
    } catch (error) {
        console.error('[MODAL_MGR] Erreur réinit. champs:', error);
        if (!interaction.replied && !interaction.deferred) await interaction.deferUpdate().catch(()=>{});
        await showModalFieldsManager(interaction, '❌ Erreur lors de la réinitialisation.').catch(()=>{});
    }
}

/**
 * Displays the main interface for managing modal fields.
 * @async
 * @param {import('discord.js').Interaction} interaction - The interaction object.
 * @param {string} [successMessage=null] - An optional success message to display.
 */
async function showModalFieldsManager(interaction, successMessage = null) {
    // This function is called by other functions in this file after deferUpdate()
    // or by config.js (handleSpecialField, back_to_modal_manager) which should also defer/reply.
    const config = configManager.getConfig();
    const entryModalConfig = config.entryModal || { title: 'Modal d\'Entrée', fields: [] };
    const description = successMessage
        ? `✅ ${successMessage}\n\n**Gérez les champs du formulaire d'entrée.**`
        : '**Gérez les champs du formulaire d\'entrée.**';
    const embed = new EmbedBuilder().setTitle('🔧 Gestionnaire Champs Modal').setDescription(description).setColor('#5865F2').setFooter({ text: 'Modal Fields Manager' });
    if (entryModalConfig.fields?.length) {
        embed.addFields({ name: '📋 Champs Actuels', value: entryModalConfig.fields.map((f, i) => `${i+1}. ${f.required?'🔴':'⚪'} ${f.style==='Short'?'📝':'📄'} **${f.label}** (\`${f.customId}\`)`).join('\n') || '*Aucun*', inline: false });
    } else {
        embed.addFields({ name: '📋 Champs Actuels', value: '*Aucun champ configuré*', inline: false });
    }
    embed.addFields({ name: '📖 Légende', value: '🔴Obligatoire ⚪Optionnel 📝Court 📄Long\nMax 5 champs.', inline: false });
    const components = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('modal_field_add').setLabel('Ajouter').setEmoji('➕').setStyle(ButtonStyle.Success).setDisabled(entryModalConfig.fields?.length >= 5),
            new ButtonBuilder().setCustomId('modal_field_edit').setLabel('Modifier').setEmoji('✏️').setStyle(ButtonStyle.Primary).setDisabled(!entryModalConfig.fields?.length),
            new ButtonBuilder().setCustomId('modal_field_delete').setLabel('Supprimer').setEmoji('🗑️').setStyle(ButtonStyle.Danger).setDisabled(!entryModalConfig.fields?.length)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('modal_field_preview').setLabel('Aperçu').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('modal_field_reset_all_fields').setLabel('Tout Réinit.').setEmoji('🔄').setStyle(ButtonStyle.Danger).setDisabled(!entryModalConfig.fields?.length),
            new ButtonBuilder().setCustomId('back_to_category_community').setLabel('Retour Config').setEmoji('⬅️').setStyle(ButtonStyle.Secondary)
        )
    ];

    // If interaction was already handled (e.g. deferUpdate from modal submit), use editReply.
    // Otherwise (e.g. initial call from config.js button), use update.
    // This logic might need refinement based on how interactions are deferred/replied to before calling this.
    if (interaction.replied || interaction.deferred) {
         await interaction.editReply({ content: successMessage ? null : '', embeds: [embed], components: components }).catch(e => console.error("[MODAL_MGR] EditReply error in showModalFieldsManager:", e.message));
    } else { // Should ideally not happen if called from button handlers that defer/update
         await interaction.update({ content: successMessage ? null : '', embeds: [embed], components: components }).catch(e => console.error("[MODAL_MGR] Update error in showModalFieldsManager:", e.message));
    }
}

/**
 * Shows a modal for adding a new field to the entry modal.
 * @async
 * @param {import('discord.js').ButtonInteraction} interaction - The button interaction.
 */
async function showAddFieldModal(interaction) {
    if (!isInteractionValid(interaction)) return;
    // No deferUpdate() here as showModal is an initial reply.
    const modal = new ModalBuilder().setCustomId('add_modal_field_submit').setTitle('➕ Ajouter Champ Modal');
    modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field_label').setLabel('Libellé (max 45)').setStyle(TextInputStyle.Short).setPlaceholder('Ex: Pseudo').setRequired(true).setMaxLength(45)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field_custom_id').setLabel('ID (unique, sans espaces, max 100)').setStyle(TextInputStyle.Short).setPlaceholder('Ex: pseudo_input').setRequired(true).setMaxLength(100)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field_placeholder').setLabel('Texte d\'aide (optionnel, max 100)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field_style').setLabel('Type (Short/Paragraph)').setStyle(TextInputStyle.Short).setValue('Short').setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field_required').setLabel('Obligatoire? (true/false)').setStyle(TextInputStyle.Short).setValue('true').setRequired(true))
    );
    await interaction.showModal(modal);
}

/**
 * Shows a select menu to choose which modal field to edit.
 * @async
 * @param {import('discord.js').ButtonInteraction} interaction - The button interaction.
 */
async function showEditFieldSelector(interaction) {
    if (!isInteractionValid(interaction)) return;
    await interaction.deferUpdate();

    const config = configManager.getConfig();
    const fields = config.entryModal?.fields || [];
    if (!fields.length) return interaction.editReply({ content: '❌ Aucun champ à modifier.', embeds: [], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('back_to_modal_manager').setLabel('Retour').setStyle(ButtonStyle.Secondary))] });

    const options = fields.map((f, i) => ({
        label: f.label.substring(0,100),
        value: `edit_modal_field_select_${i}`, // Value contains index
        description: `ID: ${f.customId}`.substring(0,100)
    }));
    const sel = new StringSelectMenuBuilder().setCustomId('select_modal_field_to_edit_submit').setPlaceholder('Quel champ modifier ?').addOptions(options);
    await interaction.editReply({ content: '✏️ Sélectionnez le champ à modifier:', embeds:[], components: [new ActionRowBuilder().addComponents(sel), new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('back_to_modal_manager').setLabel('Retour').setStyle(ButtonStyle.Secondary))]});
}

/**
 * Shows a modal pre-filled with data for editing an existing modal field.
 * @async
 * @param {import('discord.js').StringSelectMenuInteraction} interaction - The select menu interaction.
 * @param {number} fieldIndex - The index of the field to edit.
 */
async function showEditFieldModal(interaction, fieldIndex) {
    // Interaction is already deferred by handleSelectMenuInteraction
    const config = configManager.getConfig();
    const field = config.entryModal?.fields?.[fieldIndex];
    if (!field) return interaction.editReply({ content: '❌ Champ introuvable.', components:[], ephemeral: true }); // editReply on deferred interaction

    const modal = new ModalBuilder().setCustomId(`edit_modal_field_submit_${fieldIndex}`).setTitle(`✏️ Modifier: ${field.label.substring(0,15)}`);
    modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field_label').setLabel('Libellé (max 45)').setStyle(TextInputStyle.Short).setValue(field.label).setRequired(true).setMaxLength(45)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field_custom_id').setLabel('ID (unique, max 100)').setStyle(TextInputStyle.Short).setValue(field.customId).setRequired(true).setMaxLength(100)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field_placeholder').setLabel('Texte d\'aide (max 100)').setStyle(TextInputStyle.Short).setValue(field.placeholder || '').setRequired(false).setMaxLength(100)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field_style').setLabel('Type (Short/Paragraph)').setStyle(TextInputStyle.Short).setValue(field.style).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('field_required').setLabel('Obligatoire? (true/false)').setStyle(TextInputStyle.Short).setValue(String(field.required)).setRequired(true))
    );
    await interaction.showModal(modal);
}

/**
 * Shows a select menu to choose which modal field to delete.
 * @async
 * @param {import('discord.js').ButtonInteraction} interaction - The button interaction.
 */
async function showDeleteFieldSelector(interaction) {
    if (!isInteractionValid(interaction)) return;
    await interaction.deferUpdate();

    const config = configManager.getConfig();
    const fields = config.entryModal?.fields || [];
    if (!fields.length) return interaction.editReply({ content: '❌ Aucun champ à supprimer.', embeds: [], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('back_to_modal_manager').setLabel('Retour').setStyle(ButtonStyle.Secondary))] });

    const options = fields.map((f, i) => ({
        label: f.label.substring(0,100),
        value: `delete_modal_field_select_${i}`, // Changed value to match router logic for select menus
        description: `ID: ${f.customId}`.substring(0,100)
    }));
    const sel = new StringSelectMenuBuilder().setCustomId('select_modal_field_to_delete_submit').setPlaceholder('Quel champ supprimer ?').addOptions(options);
    await interaction.editReply({ content: '🗑️ Sélectionnez le champ à supprimer:', embeds:[], components: [new ActionRowBuilder().addComponents(sel), new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('back_to_modal_manager').setLabel('Retour').setStyle(ButtonStyle.Secondary))]});
}

/**
 * Shows a preview of the entry modal.
 * @async
 * @param {import('discord.js').ButtonInteraction} interaction - The button interaction.
 */
async function showModalPreview(interaction) {
    if (!isInteractionValid(interaction)) return;
    // Defer if not already, though showModal is an initial reply
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ephemeral: true}).catch(()=>{});


    const config = configManager.getConfig();
    const cfg = config.entryModal || { title: 'Aperçu', fields: [] };
    if (!cfg.fields?.length) {
         if (interaction.deferred || interaction.replied) return interaction.editReply({ content: '❌ Aucun champ à prévisualiser.', embeds:[], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('back_to_modal_manager').setLabel('Retour').setStyle(ButtonStyle.Secondary))]});
        return interaction.update({ content: '❌ Aucun champ à prévisualiser.', embeds:[], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('back_to_modal_manager').setLabel('Retour').setStyle(ButtonStyle.Secondary))]});
    }
    const modal = new ModalBuilder().setCustomId('preview_modal_unused').setTitle(cfg.title || 'Aperçu Modal');
    cfg.fields.slice(0,5).forEach((f, i) => {
        const ti = new TextInputBuilder().setCustomId(f.customId||`prev_${i}`).setLabel(f.label.substring(0,45)).setStyle(f.style==='Paragraph'?TextInputStyle.Paragraph:TextInputStyle.Short).setRequired(f.required);
        if(f.placeholder) ti.setPlaceholder(f.placeholder.substring(0,100));
        modal.addComponents(new ActionRowBuilder().addComponents(ti));
    });
    await interaction.showModal(modal);
}

module.exports = {
    showModalFieldsManager,
    showAddFieldModal,
    showEditFieldSelector,
    showEditFieldModal,
    showDeleteFieldSelector,
    showModalPreview,
    isModalFieldSubmit,
    isModalFieldSelect,
    handleModalSubmit,
    handleSelectMenuInteraction,
    handleDeleteFieldConfirm,
    handleResetAllModalFields,
    handleConfirmResetAllModalFields,
};
