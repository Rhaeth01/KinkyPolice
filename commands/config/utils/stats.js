const { CONFIG_SECTIONS } = require('../definitions');

/**
 * Get nested value from object using dot notation path
 * @param {Object} obj - The object to get value from
 * @param {string} path - The path in dot notation (e.g., 'economy.voiceActivity.enabled')
 * @returns {*} The value at the path or undefined
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Calculate configuration statistics
 * @param {Object} config - The configuration object
 * @returns {Object} Statistics about configuration completion
 */
function getConfigStats(config) {
    let totalSections = Object.keys(CONFIG_SECTIONS).length;
    let configuredSections = 0;
    let totalFields = 0;
    let configuredFields = 0;
    
    Object.entries(CONFIG_SECTIONS).forEach(([sectionKey, section]) => {
        const sectionConfig = config[sectionKey] || {};
        let sectionHasConfig = false;
        
        Object.entries(section.fields).forEach(([fieldKey, field]) => {
            totalFields++;
            const value = getNestedValue(sectionConfig, fieldKey);
            if (value !== undefined && value !== '' && value !== false) {
                configuredFields++;
                sectionHasConfig = true;
            }
        });
        
        if (sectionHasConfig) configuredSections++;
    });
    
    const completionPercentage = Math.round((configuredFields / totalFields) * 100);
    let status = '🔴 Non configuré';
    
    if (completionPercentage >= 80) status = '🟢 Complètement configuré';
    else if (completionPercentage >= 50) status = '🟡 Partiellement configuré';
    else if (completionPercentage > 0) status = '🟠 Configuration minimale';
    
    return {
        totalSections,
        configuredSections,
        totalFields,
        configuredFields,
        completionPercentage,
        status
    };
}

module.exports = {
    getConfigStats,
    getNestedValue
};