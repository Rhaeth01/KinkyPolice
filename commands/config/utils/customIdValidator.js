/**
 * @file commands/config/utils/customIdValidator.js
 * @description Custom ID validation and pattern matching for configuration system
 */

/**
 * Known custom ID patterns in the configuration system
 */
const CUSTOM_ID_PATTERNS = {
    // General configuration
    config_general: /^config_general_/,
    config_general_prefix_modal: /^config_general_prefix_modal$/,
    config_general_select_admin_role: /^config_general_select_admin_role$/,
    config_general_select_mod_role: /^config_general_select_mod_role$/,
    config_general_admin_role: /^config_general_admin_role$/,
    config_general_mod_role: /^config_general_mod_role$/,
    
    // Economy configuration
    config_economy: /^config_economy_/,
    config_economy_toggle: /^config_economy_toggle_(main|voice|messages)$/,
    config_economy_settings: /^config_economy_(voice|message)_settings$/,
    config_economy_numeric_modal: /^config_economy_numeric_modal_/,
    config_economy_edit: /^config_economy_(voice|message)_edit_/,
    
    // Entry configuration
    config_entry: /^config_entry_/,
    config_entry_select: /^config_entry_select_(welcome_channel|rules_channel|request_channel|verification_role|entry_category)$/,
    config_entry_modal: /^config_entry_(title_modal|add_field_modal|edit_field_modal_\d+|preview_modal_display)$/,
    config_entry_field_select: /^config_entry_field_select_(edit|remove|move_up|move_down)$/,
    config_entry_manage: /^config_entry_(add_field|edit_field|remove_field|move_field_(up|down)|manage_modal_fields|preview_modal)$/,
    
    // Logging configuration
    config_logging: /^config_logging_/,
    config_logging_select: /^config_logging_select_(mod_logs|message_logs|voice_logs|member_logs|role_logs)$/,
    config_logging_exclusion: /^config_logging_exclusion_type$/,
    config_logging_webhook: /^config_logging_webhook_setup$/,
    config_logging_manage: /^config_logging_manage_exclusions$/,
    
    // Games configuration
    games: /^games_/,
    games_forbidden_roles: /^games_forbidden_roles(_select)?$/,
    games_quiz: /^games_quiz_/,
    games_quiz_toggle: /^games_quiz_toggle$/,
    games_quiz_settings: /^games_quiz_settings$/,
    games_quiz_select_channel: /^games_quiz_select_channel$/,
    games_quiz_channel_select: /^games_quiz_channel_select$/,
    games_quiz_edit: /^games_quiz_edit_(points|max_points|time)$/,
    games_quiz_numeric_modal: /^games_quiz_numeric_modal_(points|max_points|time)$/,
    games_back: /^games_back_(to_main|to_quiz_settings)$/,
    
    // Confession configuration
    confession: /^confession_/,
    confession_select_channel: /^confession_select_channel$/,
    confession_channel_select: /^confession_channel_select$/,
    confession_toggle_logs: /^confession_toggle_logs$/,
    confession_select_logs_channel: /^confession_select_logs_channel$/,
    confession_logs_channel_select: /^confession_logs_channel_select$/,
    
    // Webhook configuration
    config_webhook: /^config_webhook_/,
    config_webhook_auto_setup: /^config_webhook_auto_setup$/,
    config_webhook_test_all: /^config_webhook_test_all$/,
    config_webhook_manual_setup: /^config_webhook_manual_setup$/,
    config_webhook_clean_old: /^config_webhook_clean_old$/,
    config_webhook_remove_all: /^config_webhook_remove_all$/,
    
    // Control buttons
    config_control: /^config_(back|home|help|save|cancel|close|close_channel_select)$/,
    config_category: /^config_category_(general|entry|logging|economy|levels|games|tickets|modmail|confession)$/
};

/**
 * Handler method mappings for each pattern type
 */
const HANDLER_MAPPINGS = {
    button: {
        config_general: 'handleGeneralButton',
        config_economy: 'handleEconomyButton',
        config_entry: 'handleEntryButton',
        config_logging: 'handleLoggingButton',
        config_webhook: 'handleWebhookButton',
        games: 'handleGamesButton',
        confession: 'handleConfessionButton',
        config_control: 'handleButton',
        config_category: 'handleCategorySelect'
    },
    modal: {
        config_general: 'handleGeneralModal',
        config_economy: 'handleEconomyModal',
        config_entry: 'handleEntryModal',
        games_quiz_numeric_modal: 'handleGamesQuizModal'
    },
    selectMenu: {
        config_logging_exclusion: 'handleExclusionTypeSelect',
        config_entry_field_select: 'handleFieldSelect'
    },
    channelSelect: {
        config_logging: 'handleChannelSelect',
        config_entry: 'handleChannelSelect',
        games_quiz_channel_select: 'handleChannelSelect',
        confession_channel_select: 'handleChannelSelect',
        confession_logs_channel_select: 'handleChannelSelect'
    },
    roleSelect: {
        config_general: 'handleRoleSelect',
        config_entry: 'handleRoleSelect',
        games_forbidden_roles_select: 'handleRoleSelect'
    }
};

/**
 * Validates a custom ID against known patterns
 * @param {string} customId - The custom ID to validate
 * @param {string} interactionType - Type of interaction (button, modal, selectMenu, etc.)
 * @returns {Object} Validation result with pattern info
 */
function validateCustomId(customId, interactionType = 'unknown') {
    const result = {
        isValid: false,
        matchedPattern: null,
        category: null,
        suggestedHandler: null,
        suggestions: []
    };
    
    // Check against all known patterns
    for (const [patternName, regex] of Object.entries(CUSTOM_ID_PATTERNS)) {
        if (regex.test(customId)) {
            result.isValid = true;
            result.matchedPattern = patternName;
            result.category = getCategoryFromPattern(patternName);
            
            // Find suggested handler based on interaction type
            if (HANDLER_MAPPINGS[interactionType]) {
                for (const [pattern, handler] of Object.entries(HANDLER_MAPPINGS[interactionType])) {
                    if (customId.startsWith(pattern) || patternName.includes(pattern)) {
                        result.suggestedHandler = handler;
                        break;
                    }
                }
            }
            
            break;
        }
    }
    
    // If not found, generate suggestions
    if (!result.isValid) {
        result.suggestions = generateSuggestions(customId);
    }
    
    return result;
}

/**
 * Gets the category from a pattern name
 * @param {string} patternName - The pattern name
 * @returns {string} The category name
 */
function getCategoryFromPattern(patternName) {
    if (patternName.includes('general')) return 'general';
    if (patternName.includes('economy')) return 'economy';
    if (patternName.includes('entry')) return 'entry';
    if (patternName.includes('logging')) return 'logging';
    if (patternName.includes('games')) return 'games';
    if (patternName.includes('confession')) return 'confession';
    if (patternName.includes('webhook')) return 'webhook';
    if (patternName.includes('config_control')) return 'control';
    if (patternName.includes('config_category')) return 'category';
    
    return 'unknown';
}

/**
 * Generates suggestions for similar custom IDs
 * @param {string} customId - The invalid custom ID
 * @returns {Array<string>} Array of suggestions
 */
function generateSuggestions(customId) {
    const suggestions = [];
    const lowerCustomId = customId.toLowerCase();
    
    // Extract potential keywords
    const keywords = ['config', 'general', 'economy', 'entry', 'logging', 'games', 'confession', 'webhook'];
    const foundKeywords = keywords.filter(keyword => lowerCustomId.includes(keyword));
    
    if (foundKeywords.length > 0) {
        // Generate suggestions based on found keywords
        foundKeywords.forEach(keyword => {
            const patterns = Object.keys(CUSTOM_ID_PATTERNS).filter(pattern => pattern.includes(keyword));
            suggestions.push(...patterns.slice(0, 3)); // Limit to 3 suggestions per keyword
        });
    }
    
    // If no keywords found, suggest common patterns
    if (suggestions.length === 0) {
        suggestions.push('config_general_*', 'config_economy_*', 'games_*', 'confession_*');
    }
    
    return [...new Set(suggestions)]; // Remove duplicates
}

/**
 * Checks if a custom ID is handled by the system
 * @param {string} customId - The custom ID to check
 * @param {string} interactionType - Type of interaction
 * @returns {boolean} True if handled
 */
function isCustomIdHandled(customId, interactionType) {
    const validation = validateCustomId(customId, interactionType);
    return validation.isValid && validation.suggestedHandler !== null;
}

/**
 * Gets all custom IDs for a specific category
 * @param {string} category - The category name
 * @returns {Array<string>} Array of custom ID patterns
 */
function getCustomIdsForCategory(category) {
    return Object.keys(CUSTOM_ID_PATTERNS).filter(pattern => 
        getCategoryFromPattern(pattern) === category
    );
}

/**
 * Validates custom ID format (length, characters, etc.)
 * @param {string} customId - The custom ID to validate
 * @throws {Error} If validation fails
 */
function validateCustomIdFormat(customId) {
    if (!customId || typeof customId !== 'string') {
        throw new Error('L\'ID personnalisé doit être une chaîne de caractères non vide.');
    }
    
    if (customId.length > 100) {
        throw new Error('L\'ID personnalisé ne peut pas dépasser 100 caractères.');
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(customId)) {
        throw new Error('L\'ID personnalisé ne peut contenir que des lettres, chiffres, underscores et tirets.');
    }
    
    if (customId.startsWith('_') || customId.endsWith('_') || customId.startsWith('-') || customId.endsWith('-')) {
        throw new Error('L\'ID personnalisé ne peut pas commencer ou finir par un underscore ou un tiret.');
    }
}

/**
 * Creates a debugging report for custom ID validation
 * @param {string} customId - The custom ID to analyze
 * @param {string} interactionType - Type of interaction
 * @returns {Object} Detailed validation report
 */
function createValidationReport(customId, interactionType) {
    const validation = validateCustomId(customId, interactionType);
    
    return {
        customId,
        interactionType,
        isValid: validation.isValid,
        isHandled: validation.suggestedHandler !== null,
        matchedPattern: validation.matchedPattern,
        category: validation.category,
        suggestedHandler: validation.suggestedHandler,
        suggestions: validation.suggestions,
        formatValid: (() => {
            try {
                validateCustomIdFormat(customId);
                return true;
            } catch (error) {
                return false;
            }
        })(),
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    CUSTOM_ID_PATTERNS,
    HANDLER_MAPPINGS,
    validateCustomId,
    isCustomIdHandled,
    getCustomIdsForCategory,
    validateCustomIdFormat,
    createValidationReport,
    generateSuggestions
};