/**
 * @file commands/config/utils/discordLimits.js
 * @description Discord API limits and validation utilities
 */

/**
 * Discord API limits for various components
 */
const DISCORD_LIMITS = {
    // Embed limits
    EMBED_TITLE_MAX: 256,
    EMBED_DESCRIPTION_MAX: 4096,
    EMBED_FIELD_NAME_MAX: 256,
    EMBED_FIELD_VALUE_MAX: 1024,
    EMBED_FIELDS_MAX: 25,
    EMBED_FOOTER_TEXT_MAX: 2048,
    EMBED_AUTHOR_NAME_MAX: 256,
    EMBED_TOTAL_CHARS_MAX: 6000,
    
    // Modal limits
    MODAL_TITLE_MAX: 45,
    MODAL_FIELDS_MAX: 5,
    MODAL_CUSTOM_ID_MAX: 100,
    
    // Text input limits
    TEXT_INPUT_LABEL_MAX: 45,
    TEXT_INPUT_PLACEHOLDER_MAX: 100,
    TEXT_INPUT_VALUE_SHORT_MAX: 4000,
    TEXT_INPUT_VALUE_PARAGRAPH_MAX: 4000,
    TEXT_INPUT_CUSTOM_ID_MAX: 100,
    
    // Button limits
    BUTTON_LABEL_MAX: 80,
    BUTTON_CUSTOM_ID_MAX: 100,
    
    // Select menu limits
    SELECT_PLACEHOLDER_MAX: 150,
    SELECT_CUSTOM_ID_MAX: 100,
    SELECT_OPTIONS_MAX: 25,
    SELECT_OPTION_LABEL_MAX: 100,
    SELECT_OPTION_VALUE_MAX: 100,
    SELECT_OPTION_DESCRIPTION_MAX: 100,
    
    // Component rows
    ACTION_ROWS_MAX: 5,
    COMPONENTS_PER_ROW_MAX: 5,
    
    // Message limits
    MESSAGE_CONTENT_MAX: 2000,
    MESSAGE_EMBEDS_MAX: 10
};

/**
 * Validates a string against Discord limits
 * @param {string} value - The value to validate
 * @param {number} maxLength - Maximum allowed length
 * @param {string} fieldName - Name of the field for error messages
 * @throws {Error} If validation fails
 */
function validateStringLength(value, maxLength, fieldName) {
    if (typeof value !== 'string') {
        throw new Error(`${fieldName} doit être une chaîne de caractères.`);
    }
    
    if (value.length > maxLength) {
        throw new Error(`${fieldName} ne peut pas dépasser ${maxLength} caractères (actuellement: ${value.length}).`);
    }
}

/**
 * Validates embed content against Discord limits
 * @param {Object} embedData - Embed data to validate
 * @throws {Error} If validation fails
 */
function validateEmbed(embedData) {
    if (embedData.title) {
        validateStringLength(embedData.title, DISCORD_LIMITS.EMBED_TITLE_MAX, 'Le titre de l\'embed');
    }
    
    if (embedData.description) {
        validateStringLength(embedData.description, DISCORD_LIMITS.EMBED_DESCRIPTION_MAX, 'La description de l\'embed');
    }
    
    if (embedData.footer?.text) {
        validateStringLength(embedData.footer.text, DISCORD_LIMITS.EMBED_FOOTER_TEXT_MAX, 'Le texte du footer');
    }
    
    if (embedData.author?.name) {
        validateStringLength(embedData.author.name, DISCORD_LIMITS.EMBED_AUTHOR_NAME_MAX, 'Le nom de l\'auteur');
    }
    
    if (embedData.fields) {
        if (embedData.fields.length > DISCORD_LIMITS.EMBED_FIELDS_MAX) {
            throw new Error(`Un embed ne peut contenir que ${DISCORD_LIMITS.EMBED_FIELDS_MAX} champs maximum.`);
        }
        
        embedData.fields.forEach((field, index) => {
            if (field.name) {
                validateStringLength(field.name, DISCORD_LIMITS.EMBED_FIELD_NAME_MAX, `Le nom du champ ${index + 1}`);
            }
            if (field.value) {
                validateStringLength(field.value, DISCORD_LIMITS.EMBED_FIELD_VALUE_MAX, `La valeur du champ ${index + 1}`);
            }
        });
    }
    
    // Calculate total character count
    let totalChars = 0;
    if (embedData.title) totalChars += embedData.title.length;
    if (embedData.description) totalChars += embedData.description.length;
    if (embedData.footer?.text) totalChars += embedData.footer.text.length;
    if (embedData.author?.name) totalChars += embedData.author.name.length;
    if (embedData.fields) {
        embedData.fields.forEach(field => {
            if (field.name) totalChars += field.name.length;
            if (field.value) totalChars += field.value.length;
        });
    }
    
    if (totalChars > DISCORD_LIMITS.EMBED_TOTAL_CHARS_MAX) {
        throw new Error(`Le contenu total de l'embed ne peut pas dépasser ${DISCORD_LIMITS.EMBED_TOTAL_CHARS_MAX} caractères (actuellement: ${totalChars}).`);
    }
}

/**
 * Validates modal components against Discord limits
 * @param {Object} modalData - Modal data to validate
 * @throws {Error} If validation fails
 */
function validateModal(modalData) {
    if (modalData.title) {
        validateStringLength(modalData.title, DISCORD_LIMITS.MODAL_TITLE_MAX, 'Le titre du modal');
    }
    
    if (modalData.customId) {
        validateStringLength(modalData.customId, DISCORD_LIMITS.MODAL_CUSTOM_ID_MAX, 'L\'ID personnalisé du modal');
        validateCustomId(modalData.customId);
    }
    
    if (modalData.fields && modalData.fields.length > DISCORD_LIMITS.MODAL_FIELDS_MAX) {
        throw new Error(`Un modal ne peut contenir que ${DISCORD_LIMITS.MODAL_FIELDS_MAX} champs maximum.`);
    }
}

/**
 * Validates text input components
 * @param {Object} textInputData - Text input data to validate
 * @throws {Error} If validation fails
 */
function validateTextInput(textInputData) {
    if (textInputData.label) {
        validateStringLength(textInputData.label, DISCORD_LIMITS.TEXT_INPUT_LABEL_MAX, 'Le libellé du champ');
    }
    
    if (textInputData.placeholder) {
        validateStringLength(textInputData.placeholder, DISCORD_LIMITS.TEXT_INPUT_PLACEHOLDER_MAX, 'Le texte d\'aide');
    }
    
    if (textInputData.customId) {
        validateStringLength(textInputData.customId, DISCORD_LIMITS.TEXT_INPUT_CUSTOM_ID_MAX, 'L\'ID personnalisé du champ');
        validateCustomId(textInputData.customId);
    }
    
    if (textInputData.value) {
        const maxLength = textInputData.style === 'Short' 
            ? DISCORD_LIMITS.TEXT_INPUT_VALUE_SHORT_MAX 
            : DISCORD_LIMITS.TEXT_INPUT_VALUE_PARAGRAPH_MAX;
        validateStringLength(textInputData.value, maxLength, 'La valeur du champ');
    }
}

/**
 * Validates custom ID format
 * @param {string} customId - The custom ID to validate
 * @throws {Error} If validation fails
 */
function validateCustomId(customId) {
    if (!/^[a-zA-Z0-9_-]+$/.test(customId)) {
        throw new Error('L\'ID personnalisé ne peut contenir que des lettres, chiffres, underscores et tirets.');
    }
}

/**
 * Validates button components
 * @param {Object} buttonData - Button data to validate
 * @throws {Error} If validation fails
 */
function validateButton(buttonData) {
    if (buttonData.label) {
        validateStringLength(buttonData.label, DISCORD_LIMITS.BUTTON_LABEL_MAX, 'Le libellé du bouton');
    }
    
    if (buttonData.customId) {
        validateStringLength(buttonData.customId, DISCORD_LIMITS.BUTTON_CUSTOM_ID_MAX, 'L\'ID personnalisé du bouton');
        validateCustomId(buttonData.customId);
    }
}

/**
 * Validates select menu components
 * @param {Object} selectData - Select menu data to validate
 * @throws {Error} If validation fails
 */
function validateSelectMenu(selectData) {
    if (selectData.placeholder) {
        validateStringLength(selectData.placeholder, DISCORD_LIMITS.SELECT_PLACEHOLDER_MAX, 'Le texte d\'aide du menu');
    }
    
    if (selectData.customId) {
        validateStringLength(selectData.customId, DISCORD_LIMITS.SELECT_CUSTOM_ID_MAX, 'L\'ID personnalisé du menu');
        validateCustomId(selectData.customId);
    }
    
    if (selectData.options && selectData.options.length > DISCORD_LIMITS.SELECT_OPTIONS_MAX) {
        throw new Error(`Un menu de sélection ne peut contenir que ${DISCORD_LIMITS.SELECT_OPTIONS_MAX} options maximum.`);
    }
}

/**
 * Validates action row components
 * @param {Array} components - Array of components to validate
 * @throws {Error} If validation fails
 */
function validateActionRows(components) {
    if (components.length > DISCORD_LIMITS.ACTION_ROWS_MAX) {
        throw new Error(`Un message ne peut contenir que ${DISCORD_LIMITS.ACTION_ROWS_MAX} rangées de composants maximum.`);
    }
    
    components.forEach((row, index) => {
        if (row.components && row.components.length > DISCORD_LIMITS.COMPONENTS_PER_ROW_MAX) {
            throw new Error(`La rangée ${index + 1} ne peut contenir que ${DISCORD_LIMITS.COMPONENTS_PER_ROW_MAX} composants maximum.`);
        }
    });
}

module.exports = {
    DISCORD_LIMITS,
    validateStringLength,
    validateEmbed,
    validateModal,
    validateTextInput,
    validateCustomId,
    validateButton,
    validateSelectMenu,
    validateActionRows
};