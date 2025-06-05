const fs = require('node:fs').promises;
const fsSync = require('node:fs');
const path = require('node:path');
const warningsFilePath = path.join(__dirname, '..', 'data', 'warnings.json');

// S'assure que le fichier existe, sinon le crée avec un objet vide (version synchrone pour l'initialisation)
function ensureWarningsFileSync() {
    if (!fsSync.existsSync(warningsFilePath)) {
        fsSync.writeFileSync(warningsFilePath, JSON.stringify({}), 'utf8');
    }
}

// S'assure que le fichier existe, sinon le crée avec un objet vide (version asynchrone)
async function ensureWarningsFile() {
    try {
        await fs.access(warningsFilePath);
    } catch (error) {
        await fs.writeFile(warningsFilePath, JSON.stringify({}), 'utf8');
    }
}

// Lit tous les avertissements (version synchrone pour compatibilité)
function getWarnings() {
    ensureWarningsFileSync();
    try {
        const data = fsSync.readFileSync(warningsFilePath, 'utf8');
        const warnings = JSON.parse(data);
        
        // Filtre les entrées corrompues (clés vides ou invalides)
        const cleanedWarnings = {};
        for (const [guildId, guildData] of Object.entries(warnings)) {
            if (guildId && guildId.trim() !== '' && typeof guildData === 'object' && guildData !== null) {
                cleanedWarnings[guildId] = {};
                for (const [userId, userWarnings] of Object.entries(guildData)) {
                    if (userId && userId.trim() !== '' && Array.isArray(userWarnings)) {
                        cleanedWarnings[guildId][userId] = userWarnings.filter(warn =>
                            warn && typeof warn === 'object' && warn.id && warn.moderatorId !== undefined
                        );
                    }
                }
            }
        }
        
        return cleanedWarnings;
    } catch (error) {
        console.error("Erreur lors de la lecture du fichier d'avertissements:", error);
        return {}; // Retourne un objet vide en cas d'erreur
    }
}

// Lit tous les avertissements (version asynchrone)
async function getWarningsAsync() {
    await ensureWarningsFile();
    try {
        const data = await fs.readFile(warningsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Erreur lors de la lecture du fichier d'avertissements:", error);
        return {}; // Retourne un objet vide en cas d'erreur
    }
}

// Ajoute un avertissement pour un utilisateur (version synchrone pour compatibilité)
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
        fsSync.writeFileSync(warningsFilePath, JSON.stringify(warnings, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error("Erreur lors de l'écriture dans le fichier d'avertissements:", error);
        return false;
    }
}

// Ajoute un avertissement pour un utilisateur (version asynchrone)
async function addWarningAsync(guildId, userId, moderatorId, reason) {
    const warnings = await getWarningsAsync();
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
        await fs.writeFile(warningsFilePath, JSON.stringify(warnings, null, 2), 'utf8');
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

// Supprime un avertissement spécifique (version synchrone pour compatibilité)
function removeWarning(guildId, userId, warningId) {
    const warnings = getWarnings();
    if (warnings[guildId] && warnings[guildId][userId]) {
        warnings[guildId][userId] = warnings[guildId][userId].filter(warn => warn.id !== warningId);
        try {
            fsSync.writeFileSync(warningsFilePath, JSON.stringify(warnings, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error("Erreur lors de la suppression d'un avertissement:", error);
            return false;
        }
    }
    return false;
}

// Supprime un avertissement spécifique (version asynchrone)
async function removeWarningAsync(guildId, userId, warningId) {
    const warnings = await getWarningsAsync();
    if (warnings[guildId] && warnings[guildId][userId]) {
        warnings[guildId][userId] = warnings[guildId][userId].filter(warn => warn.id !== warningId);
        try {
            await fs.writeFile(warningsFilePath, JSON.stringify(warnings, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error("Erreur lors de la suppression d'un avertissement:", error);
            return false;
        }
    }
    return false;
}

// Supprime tous les avertissements d'un utilisateur (version synchrone pour compatibilité)
function clearUserWarnings(guildId, userId) {
    const warnings = getWarnings();
    if (warnings[guildId] && warnings[guildId][userId]) {
        delete warnings[guildId][userId];
        try {
            fsSync.writeFileSync(warningsFilePath, JSON.stringify(warnings, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error("Erreur lors de la suppression des avertissements d'un utilisateur:", error);
            return false;
        }
    }
    return false;
}

// Supprime tous les avertissements d'un utilisateur (version asynchrone)
async function clearUserWarningsAsync(guildId, userId) {
    const warnings = await getWarningsAsync();
    if (warnings[guildId] && warnings[guildId][userId]) {
        delete warnings[guildId][userId];
        try {
            await fs.writeFile(warningsFilePath, JSON.stringify(warnings, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error("Erreur lors de la suppression des avertissements d'un utilisateur:", error);
            return false;
        }
    }
    return false;
}


module.exports = {
    // Versions synchrones (pour compatibilité)
    addWarning,
    getUserWarnings,
    removeWarning,
    clearUserWarnings,
    getWarnings,
    // Versions asynchrones (optimisées)
    addWarningAsync,
    removeWarningAsync,
    clearUserWarningsAsync,
    getWarningsAsync
};
