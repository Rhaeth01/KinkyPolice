const fs = require('node:fs').promises;
const path = require('node:path');
const lockfile = require('proper-lockfile');

const stateFilePath = path.join(__dirname, '..', 'data', 'persistent-state.json');

// Structure du fichier d'état persistant
const defaultState = {
    messageCooldowns: {}, // userId -> timestamp
    messageCounts: {}, // userId -> count
    voiceTimestamps: {}, // userId -> lastPointAwardTime
    quizParticipants: {}, // date -> Set of userIds (serialized as arrays)
    gameStates: {} // gameId -> state
};

/**
 * Charge l'état persistant depuis le fichier
 */
async function loadPersistentState() {
    try {
        await fs.access(stateFilePath);
        const data = await fs.readFile(stateFilePath, 'utf8');
        const parsed = JSON.parse(data);
        
        // Merger avec les valeurs par défaut pour assurer la compatibilité
        return { ...defaultState, ...parsed };
    } catch (error) {
        // Fichier n'existe pas, créer avec les valeurs par défaut
        console.log('[PersistentState] Création du fichier d\'état persistant');
        await savePersistentState(defaultState);
        return defaultState;
    }
}

/**
 * Sauvegarde l'état persistant dans le fichier avec verrouillage
 */
async function savePersistentState(state) {
    try {
        // Créer le répertoire data s'il n'existe pas
        const dataDir = path.dirname(stateFilePath);
        await fs.mkdir(dataDir, { recursive: true });
        
        // Vérifier si le fichier existe, sinon le créer
        try {
            await fs.access(stateFilePath);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fs.writeFile(stateFilePath, '{}', 'utf8');
            }
        }
        
        const release = await lockfile.lock(stateFilePath, {
            retries: {
                retries: 5,
                factor: 3,
                minTimeout: 100,
                maxTimeout: 2000,
                randomize: true,
            }
        });
        
        try {
            await fs.writeFile(stateFilePath, JSON.stringify(state, null, 2), 'utf8');
            return true;
        } finally {
            await release();
        }
    } catch (error) {
        console.error('[PersistentState] Erreur lors de la sauvegarde:', error);
        return false;
    }
}

/**
 * Met à jour un cooldown de message pour un utilisateur
 */
async function updateMessageCooldown(userId, timestamp = Date.now()) {
    const state = await loadPersistentState();
    state.messageCooldowns[userId] = timestamp;
    await savePersistentState(state);
}

/**
 * Récupère le dernier cooldown de message pour un utilisateur
 */
async function getMessageCooldown(userId) {
    const state = await loadPersistentState();
    return state.messageCooldowns[userId] || 0;
}

/**
 * Met à jour le compteur de messages pour un utilisateur
 */
async function updateMessageCount(userId, count) {
    const state = await loadPersistentState();
    state.messageCounts[userId] = count;
    await savePersistentState(state);
}

/**
 * Récupère le compteur de messages pour un utilisateur
 */
async function getMessageCount(userId) {
    const state = await loadPersistentState();
    return state.messageCounts[userId] || 0;
}

/**
 * Remet à zéro le compteur de messages pour un utilisateur
 */
async function resetMessageCount(userId) {
    const state = await loadPersistentState();
    state.messageCounts[userId] = 0;
    await savePersistentState(state);
}

/**
 * Met à jour le timestamp vocal pour un utilisateur
 */
async function updateVoiceTimestamp(userId, timestamp = Date.now()) {
    const state = await loadPersistentState();
    state.voiceTimestamps[userId] = timestamp;
    await savePersistentState(state);
}

/**
 * Récupère le timestamp vocal pour un utilisateur
 */
async function getVoiceTimestamp(userId) {
    const state = await loadPersistentState();
    return state.voiceTimestamps[userId] || Date.now(); // Default to now for new users
}

/**
 * Ajoute un participant au quiz quotidien
 */
async function addQuizParticipant(userId, date = new Date().toDateString()) {
    const state = await loadPersistentState();
    if (!state.quizParticipants[date]) {
        state.quizParticipants[date] = [];
    }
    
    if (!state.quizParticipants[date].includes(userId)) {
        state.quizParticipants[date].push(userId);
        await savePersistentState(state);
        return true;
    }
    return false; // Déjà participant
}

/**
 * Vérifie si un utilisateur a déjà participé au quiz du jour
 */
async function hasParticipatedInQuiz(userId, date = new Date().toDateString()) {
    const state = await loadPersistentState();
    const participants = state.quizParticipants[date] || [];
    return participants.includes(userId);
}

/**
 * Nettoie les données anciennes (plus de 7 jours)
 */
async function cleanupOldData() {
    try {
        const state = await loadPersistentState();
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Nettoyer les cooldowns anciens
    for (const [userId, timestamp] of Object.entries(state.messageCooldowns)) {
        if (timestamp < sevenDaysAgo) {
            delete state.messageCooldowns[userId];
        }
    }
    
    // Nettoyer les timestamps vocaux anciens
    for (const [userId, timestamp] of Object.entries(state.voiceTimestamps)) {
        if (timestamp < sevenDaysAgo) {
            delete state.voiceTimestamps[userId];
        }
    }
    
    // Nettoyer les quiz participants anciens
    const sevenDaysAgoDate = new Date(sevenDaysAgo).toDateString();
    for (const date of Object.keys(state.quizParticipants)) {
        if (new Date(date) < new Date(sevenDaysAgoDate)) {
            delete state.quizParticipants[date];
        }
    }
    
        await savePersistentState(state);
        console.log('[PersistentState] Nettoyage des données anciennes terminé');
    } catch (error) {
        // Si le fichier n'existe pas encore, ce n'est pas grave
        if (error.code === 'ENOENT') {
            console.log('[PersistentState] Fichier d\'état persistant non trouvé, création automatique...');
            await loadPersistentState(); // Ceci va créer le fichier par défaut
        } else {
            console.error('[PersistentState] Erreur lors du nettoyage:', error);
            throw error;
        }
    }
}

/**
 * Statistiques de l'état persistant
 */
async function getStateStats() {
    const state = await loadPersistentState();
    return {
        messageCooldowns: Object.keys(state.messageCooldowns).length,
        messageCounts: Object.keys(state.messageCounts).length,
        voiceTimestamps: Object.keys(state.voiceTimestamps).length,
        quizParticipants: Object.keys(state.quizParticipants).length,
        totalSize: JSON.stringify(state).length
    };
}

module.exports = {
    loadPersistentState,
    savePersistentState,
    updateMessageCooldown,
    getMessageCooldown,
    updateMessageCount,
    getMessageCount,
    resetMessageCount,
    updateVoiceTimestamp,
    getVoiceTimestamp,
    addQuizParticipant,
    hasParticipatedInQuiz,
    cleanupOldData,
    getStateStats
};