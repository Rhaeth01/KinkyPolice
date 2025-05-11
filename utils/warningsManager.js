const fs = require('node:fs');
const path = require('node:path');
const warningsFilePath = path.join(__dirname, '..', 'data', 'warnings.json');

// S'assure que le fichier existe, sinon le crée avec un objet vide
function ensureWarningsFile() {
    if (!fs.existsSync(warningsFilePath)) {
        fs.writeFileSync(warningsFilePath, JSON.stringify({}), 'utf8');
    }
}

// Lit tous les avertissements
function getWarnings() {
    ensureWarningsFile();
    try {
        const data = fs.readFileSync(warningsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Erreur lors de la lecture du fichier d'avertissements:", error);
        return {}; // Retourne un objet vide en cas d'erreur
    }
}

// Ajoute un avertissement pour un utilisateur
function addWarning(guildId, userId, moderatorId, reason) {
    const warnings = getWarnings();
    const timestamp = Date.now();
    const warningId = `${guildId}-${userId}-${timestamp}`; // ID unique simple

    if (!warnings[guildId]) {
        warnings[guildId] = {};
    }
    if (!warnings[guildId][userId]) {
        warnings[guildId][userId] = [];
    }

    warnings[guildId][userId].push({
        id: warningId,
        moderatorId,
        reason,
        timestamp
    });

    try {
        fs.writeFileSync(warningsFilePath, JSON.stringify(warnings, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error("Erreur lors de l'écriture dans le fichier d'avertissements:", error);
        return false;
    }
}

// Récupère les avertissements d'un utilisateur spécifique
function getUserWarnings(guildId, userId) {
    const warnings = getWarnings();
    return warnings[guildId] && warnings[guildId][userId] ? warnings[guildId][userId] : [];
}

// Supprime un avertissement spécifique (non demandé dans le cahier des charges, mais utile)
function removeWarning(guildId, userId, warningId) {
    const warnings = getWarnings();
    if (warnings[guildId] && warnings[guildId][userId]) {
        warnings[guildId][userId] = warnings[guildId][userId].filter(warn => warn.id !== warningId);
        try {
            fs.writeFileSync(warningsFilePath, JSON.stringify(warnings, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error("Erreur lors de la suppression d'un avertissement:", error);
            return false;
        }
    }
    return false;
}

// Supprime tous les avertissements d'un utilisateur (non demandé, mais utile)
function clearUserWarnings(guildId, userId) {
    const warnings = getWarnings();
    if (warnings[guildId] && warnings[guildId][userId]) {
        delete warnings[guildId][userId];
        try {
            fs.writeFileSync(warningsFilePath, JSON.stringify(warnings, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error("Erreur lors de la suppression des avertissements d'un utilisateur:", error);
            return false;
        }
    }
    return false;
}


module.exports = {
    addWarning,
    getUserWarnings,
    removeWarning,
    clearUserWarnings,
    getWarnings // Exporter pour un usage potentiel ailleurs
};
