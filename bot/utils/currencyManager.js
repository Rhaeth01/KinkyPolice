const fs = require('node:fs').promises;
const path = require('node:path');
const lockfile = require('proper-lockfile');
const configManager = require('./configManager');
const currencyFilePath = path.join(__dirname, '..', 'data', 'currency.json');

// Tracker pour les limites journalières et horaires
const userLimits = new Map(); // userId -> { hourly: number, daily: number, lastReset: timestamp }

async function ensureCurrencyFile() {
    try {
        await fs.access(currencyFilePath);
    } catch (error) {
        await fs.writeFile(currencyFilePath, JSON.stringify({}), 'utf8');
    }
}

async function getCurrencyData() {
    await ensureCurrencyFile();
    try {
        const data = await fs.readFile(currencyFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Erreur lors de la lecture du fichier de monnaie:", error);
        return {};
    }
}

async function saveCurrencyData(data) {
    const release = await lockfile.lock(currencyFilePath, {
        retries: {
            retries: 5,
            factor: 3,
            minTimeout: 100,
            maxTimeout: 2000,
            randomize: true,
        }
    });
    
    try {
        await fs.writeFile(currencyFilePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error("Erreur lors de l'écriture dans le fichier de monnaie:", error);
        return false;
    } finally {
        await release();
    }
}

async function getUserBalance(userId) {
    const currencyData = await getCurrencyData();
    return currencyData[userId] || 0;
}

async function addCurrency(userId, amount, source = 'unknown') {
    const release = await lockfile.lock(currencyFilePath, {
        retries: {
            retries: 5,
            factor: 3,
            minTimeout: 100,
            maxTimeout: 2000,
            randomize: true,
        }
    });
    
    try {
        // Vérifier si l'économie est activée
        const config = configManager.getConfig();
        if (!config.economy?.enabled) {
            console.log(`[CurrencyManager] Économie désactivée, gain ignoré: ${amount} points pour ${userId}`);
            return false;
        }

        // Valider les limites
        const canAdd = await checkLimits(userId, amount);
        if (!canAdd.allowed) {
            console.log(`[CurrencyManager] Limite atteinte: ${canAdd.reason} pour ${userId}`);
            return false;
        }

        // Transaction atomique: lire -> modifier -> écrire
        const currencyData = await getCurrencyDataUnsafe(); // Version sans lock car déjà verrouillé
        const oldBalance = currencyData[userId] || 0;
        const newBalance = oldBalance + canAdd.allowedAmount;
        currencyData[userId] = newBalance;
        
        // Écriture sécurisée
        await fs.writeFile(currencyFilePath, JSON.stringify(currencyData, null, 2), 'utf8');
        
        // Mettre à jour les limites après succès
        updateUserLimits(userId, canAdd.allowedAmount);
        
        // Log d'audit de sécurité
        console.log(`[CurrencyManager] TRANSACTION: ${userId} | ${oldBalance} -> ${newBalance} (+${canAdd.allowedAmount}) | source: ${source} | timestamp: ${Date.now()}`);
        
        return true;
    } catch (error) {
        console.error('[CurrencyManager] Erreur lors de l\'ajout de monnaie:', error);
        return false;
    } finally {
        await release();
    }
}

// Version non-sécurisée pour usage interne avec lock déjà acquis
async function getCurrencyDataUnsafe() {
    await ensureCurrencyFile();
    try {
        const data = await fs.readFile(currencyFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Erreur lors de la lecture du fichier de monnaie:", error);
        return {};
    }
}

async function removeCurrency(userId, amount) {
    const release = await lockfile.lock(currencyFilePath, {
        retries: {
            retries: 5,
            factor: 3,
            minTimeout: 100,
            maxTimeout: 2000,
            randomize: true,
        }
    });
    
    try {
        const currencyData = await getCurrencyDataUnsafe();
        const currentBalance = currencyData[userId] || 0;
        
        if (currentBalance >= amount) {
            const newBalance = currentBalance - amount;
            currencyData[userId] = newBalance;
            await fs.writeFile(currencyFilePath, JSON.stringify(currencyData, null, 2), 'utf8');
            
            // Log d'audit de sécurité
            console.log(`[CurrencyManager] RETRAIT: ${userId} | ${currentBalance} -> ${newBalance} (-${amount}) | timestamp: ${Date.now()}`);
            return true;
        }
        
        console.log(`[CurrencyManager] RETRAIT ÉCHOUÉ: ${userId} solde insuffisant (${currentBalance} < ${amount})`);
        return false; // Solde insuffisant
    } catch (error) {
        console.error('[CurrencyManager] Erreur lors du retrait de monnaie:', error);
        return false;
    } finally {
        await release();
    }
}

// Fonctions de gestion des limites
function resetLimitsIfNeeded(userId) {
    const config = configManager.getConfig();
    const limits = config.economy?.limits;
    if (!limits) return;

    const now = Date.now();
    const userLimit = userLimits.get(userId) || { hourly: 0, daily: 0, lastReset: now, lastHourReset: now };
    
    // Reset horaire
    const hoursSinceLastReset = (now - userLimit.lastHourReset) / (1000 * 60 * 60);
    if (hoursSinceLastReset >= 1) {
        userLimit.hourly = 0;
        userLimit.lastHourReset = now;
    }
    
    // Reset journalier
    const resetHour = limits.dailyResetHour || 0;
    const today = new Date();
    const resetTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), resetHour);
    
    if (now >= resetTime.getTime() && userLimit.lastReset < resetTime.getTime()) {
        userLimit.daily = 0;
        userLimit.lastReset = resetTime.getTime();
    }
    
    userLimits.set(userId, userLimit);
}

function updateUserLimits(userId, amount) {
    const userLimit = userLimits.get(userId) || { hourly: 0, daily: 0, lastReset: Date.now(), lastHourReset: Date.now() };
    userLimit.hourly += amount;
    userLimit.daily += amount;
    userLimits.set(userId, userLimit);
}

async function checkLimits(userId, amount) {
    const config = configManager.getConfig();
    const limits = config.economy?.limits;
    
    if (!limits) {
        return { allowed: true, allowedAmount: amount };
    }
    
    resetLimitsIfNeeded(userId);
    const userLimit = userLimits.get(userId) || { hourly: 0, daily: 0 };
    
    // Vérifier limite horaire
    if (limits.maxPointsPerHour && (userLimit.hourly + amount) > limits.maxPointsPerHour) {
        const remainingHourly = Math.max(0, limits.maxPointsPerHour - userLimit.hourly);
        if (remainingHourly === 0) {
            return { allowed: false, reason: 'Limite horaire atteinte', allowedAmount: 0 };
        }
        amount = remainingHourly;
    }
    
    // Vérifier limite journalière
    if (limits.maxPointsPerDay && (userLimit.daily + amount) > limits.maxPointsPerDay) {
        const remainingDaily = Math.max(0, limits.maxPointsPerDay - userLimit.daily);
        if (remainingDaily === 0) {
            return { allowed: false, reason: 'Limite journalière atteinte', allowedAmount: 0 };
        }
        amount = Math.min(amount, remainingDaily);
    }
    
    return { allowed: true, allowedAmount: amount };
}

// Fonction pour obtenir les statistiques de limites d'un utilisateur
function getUserLimitStats(userId) {
    const config = configManager.getConfig();
    const limits = config.economy?.limits;
    if (!limits) return null;
    
    resetLimitsIfNeeded(userId);
    const userLimit = userLimits.get(userId) || { hourly: 0, daily: 0 };
    
    return {
        hourly: {
            used: userLimit.hourly,
            limit: limits.maxPointsPerHour || 0,
            remaining: Math.max(0, (limits.maxPointsPerHour || 0) - userLimit.hourly)
        },
        daily: {
            used: userLimit.daily,
            limit: limits.maxPointsPerDay || 0,
            remaining: Math.max(0, (limits.maxPointsPerDay || 0) - userLimit.daily)
        }
    };
}

// Fonction pour vérifier si une source de revenus est activée
function isSourceEnabled(source) {
    const config = configManager.getConfig();
    if (!config.economy?.enabled) return false;
    
    switch (source) {
        case 'voice':
            return config.economy.voiceActivity?.enabled || false;
        case 'message':
            return config.economy.messageActivity?.enabled || false;
        case 'quiz':
            return config.economy.dailyQuiz?.enabled || false;
        case 'games':
            return config.economy.games?.enabled || false;
        case 'quests':
            return config.economy.quests?.enabled || false;
        default:
            return true; // Autres sources (admin, etc.)
    }
}

module.exports = {
    getUserBalance,
    addCurrency,
    removeCurrency,
    getUserLimitStats,
    isSourceEnabled,
    checkLimits
};