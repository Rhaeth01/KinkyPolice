const configManager = require('./configManager');

/**
 * Retrieves a nested value from an object using a dot-separated path.
 * @param {object} obj - The object to traverse.
 * @param {string} path - The dot-separated path to the desired value.
 * @returns {*} The value at the specified path, or undefined if the path does not exist.
 */
function getNestedValue(obj, path) {
    if (!path) return undefined;
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Sets a nested value in an object using a dot-separated path.
 * If the path does not exist, it will be created.
 * @param {object} obj - The object to modify.
 * @param {string} path - The dot-separated path to the value to be set.
 * @param {*} value - The value to set at the specified path.
 */
function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => (current[key] = current[key] || {}), obj);
    target[lastKey] = value;
}

/**
 * Updates a specific field in the configuration and saves it.
 * @async
 * @param {string} sectionKey - The key of the configuration section (e.g., 'general', 'logging').
 * @param {string} fieldKey - The key of the field within the section (can be dot-separated for nesting).
 * @param {*} value - The new value for the field.
 * @param {object} sectionData - The configuration object for the specific section (e.g., CONFIG_SECTIONS[sectionKey]).
 *                               This should contain `dataSection` if the actual data is stored under a different key.
 * @param {object} [allConfigSections=null] - Deprecated: No longer needed as sectionData should suffice or be derived by caller.
 * @returns {Promise<void>}
 */
async function updateConfigField(sectionKey, fieldKey, value, sectionData, allConfigSections = null) {
    const config = configManager.getConfig();
    // Determine the actual key in the config object where data for this section is stored.
    // This is important for sections like moderation_logs, message_logs, etc., which are grouped under 'logging'.
    const dataKey = sectionData.dataSection || sectionKey;
    if (!config[dataKey]) {
        config[dataKey] = {}; // Initialize if the data section doesn't exist
    }
    setNestedValue(config[dataKey], fieldKey, value); // Use the dataKey to set the value in the correct part of the config
    await configManager.updateConfig(config); // Save the entire modified config
}

/**
 * Formats a configuration value for display in an embed.
 * @param {*} value - The value to format.
 * @param {string} type - The type of the field (e.g., 'channel', 'role', 'toggle', 'text', 'number', 'multi-channel', 'multi-role').
 * @param {import('discord.js').Guild} [guild] - The guild object, used for fetching names if needed (currently not used here but good practice).
 * @returns {string} A string representation of the value suitable for display.
 */
function formatDisplayValue(value, type, guild) {
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0) || value === '') {
        return '*Non configuré*';
    }
    switch (type) {
        case 'channel':
        case 'category':
            return `<#${value}>`;
        case 'multi-channel': // Assumes value is an array of channel IDs
            return value.map(id => `<#${id}>`).join(', ') || '*Aucun*';
        case 'role':
            return `<@&${value}>`;
        case 'multi-role': // Assumes value is an array of role IDs
            return value.map(id => `<@&${id}>`).join(', ') || '*Aucun*';
        case 'toggle':
            return value ? '✅ Activé' : '❌ Désactivé';
        case 'number':
            return `\`${value}\``;
        case 'text': // Fallthrough for text and any other types
        default:
            return `\`${String(value).substring(0, 100)}\``; // Limit length for display
    }
}

/**
 * Gets a placeholder string for a given field type.
 * @param {string} type - The type of the field.
 * @returns {string} The placeholder string.
 */
function getPlaceholder(type) {
    const placeholders = {
        text:'Texte...',
        number:'Nombre...',
        channel:'ID du Canal',
        role:'ID du Rôle',
        category:'ID de la Catégorie'
    };
    return placeholders[type] || 'Valeur...';
}

/**
 * Checks if an interaction is still valid for processing (not too old).
 * Note: This doesn't check for replied/deferred status, as that depends on context.
 * @param {import('discord.js').Interaction} interaction - The interaction object.
 * @returns {boolean} True if the interaction is considered valid, false otherwise.
 */
function isInteractionValid(interaction) {
    if (!interaction || !interaction.createdTimestamp) {
        console.warn('[UTILS] isInteractionValid: Received invalid interaction object.');
        return false;
    }
    // Discord interactions generally time out after 15 minutes.
    // We use a slightly shorter duration to be safe.
    const MAX_INTERACTION_AGE = 14 * 60 * 1000;
    if ((Date.now() - interaction.createdTimestamp) > MAX_INTERACTION_AGE) {
        console.log(`[UTILS] Interaction (ID ${interaction.id}) trop ancienne.`);
        return false;
    }
    return true;
}

module.exports = {
    getNestedValue,
    setNestedValue,
    updateConfigField,
    formatDisplayValue,
    getPlaceholder,
    isInteractionValid,
};
