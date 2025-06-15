const fs = require('node:fs').promises;
const path = require('node:path');
const lockfile = require('proper-lockfile');
const configManager = require('./configManager');
const { addCurrency } = require('./currencyManager');

const levelsFilePath = path.join(__dirname, '..', 'data', 'levels.json');

// Structure des données de niveaux
const defaultLevelsData = {
    users: {}, // userId -> { xp: number, level: number, totalXp: number, lastMessage: timestamp }
    guildStats: {
        totalUsers: 0,
        averageLevel: 0,
        lastUpdate: Date.now()
    }
};

/**
 * Gestionnaire de niveaux moderne inspiré de DraftBot/MEE6
 * Formule progressive et configuration avancée
 */

// Formules de calcul XP/Niveau inspirées des meilleurs bots
const LEVEL_FORMULAS = {
    // Formule progressive : facile au début, exponentielle après
    getXpForLevel: (level) => {
        if (level <= 0) return 0;
        if (level <= 10) return level * 100; // 100, 200, 300... jusqu'à 1000
        if (level <= 25) return Math.floor(100 * level * Math.pow(1.15, level - 10)); // Progression modérée
        return Math.floor(100 * level * Math.pow(1.25, level - 25) * 1.5); // Progression difficile
    },
    
    // Calcul du niveau basé sur l'XP totale
    getLevelFromXp: (totalXp) => {
        let level = 0;
        let currentXp = 0;
        
        while (currentXp <= totalXp) {
            level++;
            currentXp += LEVEL_FORMULAS.getXpForLevel(level);
        }
        
        return Math.max(0, level - 1);
    },
    
    // XP nécessaire pour le prochain niveau
    getXpForNextLevel: (currentLevel) => {
        return LEVEL_FORMULAS.getXpForLevel(currentLevel + 1);
    },
    
    // Progression actuelle dans le niveau
    getProgressInLevel: (user) => {
        const currentLevelXp = LEVEL_FORMULAS.getXpForLevel(user.level);
        const nextLevelXp = LEVEL_FORMULAS.getXpForLevel(user.level + 1);
        const progressXp = user.xp;
        
        return {
            current: progressXp,
            needed: nextLevelXp,
            percentage: Math.min(100, (progressXp / nextLevelXp) * 100)
        };
    }
};

/**
 * Charge les données de niveaux
 */
async function loadLevelsData() {
    try {
        await fs.access(levelsFilePath);
        const data = await fs.readFile(levelsFilePath, 'utf8');
        const parsed = JSON.parse(data);
        
        // Merger avec les valeurs par défaut pour compatibilité
        return { ...defaultLevelsData, ...parsed };
    } catch (error) {
        console.log('[LevelManager] Création du fichier de niveaux');
        await saveLevelsData(defaultLevelsData);
        return defaultLevelsData;
    }
}

/**
 * Sauvegarde les données de niveaux avec verrouillage
 */
async function saveLevelsData(data) {
    try {
        // Créer le répertoire data s'il n'existe pas
        const dataDir = path.dirname(levelsFilePath);
        await fs.mkdir(dataDir, { recursive: true });
        
        // Vérifier si le fichier existe, sinon le créer
        try {
            await fs.access(levelsFilePath);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fs.writeFile(levelsFilePath, '{}', 'utf8');
            }
        }
        
        const release = await lockfile.lock(levelsFilePath, {
            retries: {
                retries: 5,
                factor: 3,
                minTimeout: 100,
                maxTimeout: 2000,
                randomize: true,
            }
        });
        
        try {
            await fs.writeFile(levelsFilePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } finally {
            await release();
        }
    } catch (error) {
        console.error('[LevelManager] Erreur lors de la sauvegarde:', error);
        return false;
    }
}

/**
 * Obtient les données d'un utilisateur
 */
async function getUserData(userId) {
    const data = await loadLevelsData();
    
    if (!data.users[userId]) {
        data.users[userId] = {
            xp: 0,
            level: 0,
            totalXp: 0,
            lastMessage: 0,
            lastVoiceActivity: 0
        };
        await saveLevelsData(data);
    }
    
    return data.users[userId];
}

/**
 * Ajoute de l'XP à un utilisateur avec toute la logique avancée
 */
async function addXpToUser(userId, baseXp, source = 'message', guildMember = null) {
    try {
        const config = configManager.getConfig();
        const levelConfig = config.levels;
        
        // Vérifier si le système est activé
        if (!levelConfig?.enabled) {
            return { success: false, reason: 'Système de niveaux désactivé' };
        }
        
        // Vérifier les exclusions
        if (await isUserExcluded(userId, source, guildMember, levelConfig)) {
            return { success: false, reason: 'Utilisateur/source exclu' };
        }
        
        // Vérifier les cooldowns
        const userData = await getUserData(userId);
        if (!canGainXp(userData, source, levelConfig)) {
            return { success: false, reason: 'Cooldown actif' };
        }
        
        // Calculer l'XP avec multiplicateurs
        const finalXp = calculateFinalXp(baseXp, guildMember, levelConfig);
        
        // Ajouter l'XP et vérifier level up
        const levelUpResult = await processXpGain(userId, finalXp, source);
        
        return {
            success: true,
            xpGained: finalXp,
            levelUp: levelUpResult.levelUp,
            newLevel: levelUpResult.newLevel,
            oldLevel: levelUpResult.oldLevel
        };
        
    } catch (error) {
        console.error('[LevelManager] Erreur lors de l\'ajout d\'XP:', error);
        return { success: false, reason: 'Erreur système' };
    }
}

/**
 * Vérifie si un utilisateur est exclu du gain d'XP
 */
async function isUserExcluded(userId, source, guildMember, levelConfig) {
    if (!guildMember) return false;
    
    // Vérifier les rôles exclus
    const excludedRoles = levelConfig.excludedRoles || [];
    if (excludedRoles.some(roleId => guildMember.roles.cache.has(roleId))) {
        return true;
    }
    
    // Vérifier les channels exclus pour les messages
    if (source === 'message') {
        const excludedChannels = levelConfig.excludedChannels || [];
        if (excludedChannels.includes(guildMember.voice?.channel?.id)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Vérifie si l'utilisateur peut gagner de l'XP (cooldowns)
 */
function canGainXp(userData, source, levelConfig) {
    const now = Date.now();
    const cooldowns = levelConfig.cooldowns || {};
    
    switch (source) {
        case 'message':
            const messageCooldown = cooldowns.message || 60000; // 1 minute par défaut
            return (now - userData.lastMessage) >= messageCooldown;
            
        case 'voice':
            const voiceCooldown = cooldowns.voice || 60000; // 1 minute par défaut
            return (now - userData.lastVoiceActivity) >= voiceCooldown;
            
        default:
            return true;
    }
}

/**
 * Calcule l'XP final avec tous les multiplicateurs
 */
function calculateFinalXp(baseXp, guildMember, levelConfig) {
    let finalXp = baseXp;
    
    if (!guildMember) return finalXp;
    
    // Multiplicateur pour les rôles booster
    const boosterRoles = levelConfig.boosterRoles || {};
    for (const [roleId, multiplier] of Object.entries(boosterRoles)) {
        if (guildMember.roles.cache.has(roleId)) {
            finalXp *= multiplier;
            break; // On prend le premier multiplicateur trouvé
        }
    }
    
    // Multiplicateur pour les membres premium/nitro
    if (guildMember.premiumSince) {
        const premiumMultiplier = levelConfig.premiumMultiplier || 1.2;
        finalXp *= premiumMultiplier;
    }
    
    // Multiplicateur global
    const globalMultiplier = levelConfig.globalMultiplier || 1.0;
    finalXp *= globalMultiplier;
    
    return Math.round(finalXp);
}

/**
 * Traite le gain d'XP et vérifie les level ups
 */
async function processXpGain(userId, xpGain, source) {
    const data = await loadLevelsData();
    const userData = data.users[userId];
    
    // Mettre à jour les timestamps
    const now = Date.now();
    if (source === 'message') userData.lastMessage = now;
    if (source === 'voice') userData.lastVoiceActivity = now;
    
    // Sauvegarder l'ancien niveau
    const oldLevel = userData.level;
    
    // Ajouter l'XP
    userData.xp += xpGain;
    userData.totalXp += xpGain;
    
    // Calculer le nouveau niveau
    const newLevel = LEVEL_FORMULAS.getLevelFromXp(userData.totalXp);
    const levelUp = newLevel > oldLevel;
    
    if (levelUp) {
        userData.level = newLevel;
        userData.xp = userData.totalXp - getTotalXpForLevel(newLevel);
        
        // Traiter les récompenses de niveau
        await processLevelRewards(userId, newLevel, oldLevel);
    }
    
    await saveLevelsData(data);
    
    return {
        levelUp,
        newLevel,
        oldLevel,
        userData
    };
}

/**
 * Calcule l'XP totale nécessaire pour atteindre un niveau
 */
function getTotalXpForLevel(level) {
    let totalXp = 0;
    for (let i = 1; i <= level; i++) {
        totalXp += LEVEL_FORMULAS.getXpForLevel(i);
    }
    return totalXp;
}

/**
 * Traite les récompenses de niveau (rôles, KinkyCoins, etc.)
 */
async function processLevelRewards(userId, newLevel, oldLevel) {
    const config = configManager.getConfig();
    const levelConfig = config.levels;
    
    if (!levelConfig?.rewards) return;
    
    // Récompenses en KinkyCoins
    const coinRewards = levelConfig.rewards.coins || {};
    if (coinRewards[newLevel]) {
        await addCurrency(userId, coinRewards[newLevel], 'level_up');
        console.log(`[LevelManager] ${coinRewards[newLevel]} KinkyCoins attribués à ${userId} pour le niveau ${newLevel}`);
    }
    
    // Récompenses automatiques par paliers
    const milestoneRewards = levelConfig.rewards.milestones || {};
    Object.entries(milestoneRewards).forEach(([milestone, reward]) => {
        const milestoneLevel = parseInt(milestone);
        if (newLevel >= milestoneLevel && oldLevel < milestoneLevel) {
            // Traiter la récompense de palier
            processMilestoneReward(userId, milestoneLevel, reward);
        }
    });
}

/**
 * Traite les récompenses de paliers
 */
async function processMilestoneReward(userId, milestone, reward) {
    if (reward.coins) {
        await addCurrency(userId, reward.coins, 'milestone');
    }
    
    // Les rôles seront traités par le système d'annonces
    console.log(`[LevelManager] Palier ${milestone} atteint par ${userId}:`, reward);
}

/**
 * Crée le message d'annonce de level up
 */
function createLevelUpMessage(user, oldLevel, newLevel, progress) {
    const config = configManager.getConfig();
    const levelConfig = config.levels;
    const templates = levelConfig.messages?.templates || {};
    
    // Messages personnalisés par niveau ou paliers
    let message = templates[newLevel] || templates.default || 
        `🎉 **{user}** vient d'atteindre le niveau **{level}** ! \\n\\n` +
        `📊 **Progression:** {xp}/{nextXp} XP ({percentage}%)\\n` +
        `🏆 **XP Total:** {totalXp}`;
    
    // Remplacer les variables
    message = message
        .replace(/{user}/g, `<@${user.id}>`)
        .replace(/{level}/g, newLevel)
        .replace(/{oldLevel}/g, oldLevel)
        .replace(/{xp}/g, progress.current)
        .replace(/{nextXp}/g, progress.needed)
        .replace(/{percentage}/g, Math.round(progress.percentage))
        .replace(/{totalXp}/g, user.totalXp);
    
    return message;
}

/**
 * Obtient les statistiques de niveau d'un utilisateur
 */
async function getUserStats(userId) {
    const userData = await getUserData(userId);
    const progress = LEVEL_FORMULAS.getProgressInLevel(userData);
    
    return {
        level: userData.level,
        xp: userData.xp,
        totalXp: userData.totalXp,
        progress,
        nextLevelXp: LEVEL_FORMULAS.getXpForNextLevel(userData.level),
        rank: await getUserRank(userId)
    };
}

/**
 * Obtient le rang d'un utilisateur dans le classement
 */
async function getUserRank(userId) {
    const data = await loadLevelsData();
    const users = Object.entries(data.users)
        .map(([id, userData]) => ({ id, ...userData }))
        .sort((a, b) => b.totalXp - a.totalXp);
    
    const rank = users.findIndex(user => user.id === userId) + 1;
    return rank || null;
}

/**
 * Obtient le leaderboard des niveaux
 */
async function getLeaderboard(limit = 10) {
    const data = await loadLevelsData();
    const users = Object.entries(data.users)
        .map(([id, userData]) => ({ id, ...userData }))
        .sort((a, b) => b.totalXp - a.totalXp)
        .slice(0, limit);
    
    return users.map((user, index) => ({
        rank: index + 1,
        userId: user.id,
        level: user.level,
        totalXp: user.totalXp,
        progress: LEVEL_FORMULAS.getProgressInLevel(user)
    }));
}

/**
 * Réinitialise les données d'un utilisateur
 */
async function resetUserData(userId) {
    const data = await loadLevelsData();
    if (data.users[userId]) {
        delete data.users[userId];
        await saveLevelsData(data);
        return true;
    }
    return false;
}

/**
 * Met à jour les statistiques globales
 */
async function updateGuildStats() {
    const data = await loadLevelsData();
    const users = Object.values(data.users);
    
    if (users.length === 0) {
        data.guildStats = {
            totalUsers: 0,
            averageLevel: 0,
            lastUpdate: Date.now()
        };
    } else {
        const totalLevels = users.reduce((sum, user) => sum + user.level, 0);
        data.guildStats = {
            totalUsers: users.length,
            averageLevel: Math.round(totalLevels / users.length * 10) / 10,
            lastUpdate: Date.now()
        };
    }
    
    await saveLevelsData(data);
    return data.guildStats;
}

/**
 * Nettoyage des données anciennes (utilisateurs inactifs)
 */
async function cleanupInactiveUsers(inactiveDays = 90) {
    const data = await loadLevelsData();
    const cutoffTime = Date.now() - (inactiveDays * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    Object.entries(data.users).forEach(([userId, userData]) => {
        const lastActivity = Math.max(userData.lastMessage || 0, userData.lastVoiceActivity || 0);
        if (lastActivity < cutoffTime && userData.level < 5) { // Garder les utilisateurs level 5+
            delete data.users[userId];
            cleanedCount++;
        }
    });
    
    if (cleanedCount > 0) {
        await saveLevelsData(data);
        console.log(`[LevelManager] ${cleanedCount} utilisateurs inactifs supprimés`);
    }
    
    return cleanedCount;
}

module.exports = {
    addXpToUser,
    getUserData,
    getUserStats,
    getUserRank,
    getLeaderboard,
    resetUserData,
    updateGuildStats,
    cleanupInactiveUsers,
    createLevelUpMessage,
    LEVEL_FORMULAS,
    loadLevelsData,
    saveLevelsData
};