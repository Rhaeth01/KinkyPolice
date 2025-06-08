/**
 * Set nested value in object using dot notation path
 * @param {Object} obj - The object to set value in
 * @param {string} path - The path in dot notation (e.g., 'economy.voiceActivity.enabled')
 * @param {*} value - The value to set
 */
function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
        if (!current[key]) current[key] = {};
        return current[key];
    }, obj);
    target[lastKey] = value;
}

/**
 * Format a value for display based on its type
 * @param {*} value - The value to format
 * @param {string} type - The type of the value
 * @returns {string} Formatted value for display
 */
function formatValue(value, type) {
    if (value === undefined || value === null || value === '') {
        return '*Non défini*';
    }

    switch (type) {
        case 'channel':
            return `<#${value}>`;
        case 'role':
            return `<@&${value}>`;
        case 'category':
            return `📁 <#${value}>`;
        case 'toggle':
            return value ? '✅ Activé' : '❌ Désactivé';
        case 'number':
            return `\`${value}\``;
        case 'text':
            if (typeof value === 'string' && value.length > 50) {
                return `\`${value.substring(0, 47)}...\``;
            }
            return `\`${value}\``;
        default:
            return String(value);
    }
}

/**
 * Format a list of channel IDs for display
 * @param {Array<string>} channelIds - Array of channel IDs
 * @returns {string} Formatted channel list
 */
function formatChannelList(channelIds) {
    if (!channelIds || channelIds.length === 0) {
        return '*Aucun canal*';
    }
    return channelIds.map(id => `<#${id}>`).join(', ');
}

/**
 * Format a list of role IDs for display
 * @param {Array<string>} roleIds - Array of role IDs
 * @returns {string} Formatted role list
 */
function formatRoleList(roleIds) {
    if (!roleIds || roleIds.length === 0) {
        return '*Aucun rôle*';
    }
    return roleIds.map(id => `<@&${id}>`).join(', ');
}

module.exports = {
    setNestedValue,
    formatValue,
    formatChannelList,
    formatRoleList
};