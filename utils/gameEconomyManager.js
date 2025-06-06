const configManager = require('./configManager');
const { addCurrency, isSourceEnabled } = require('./currencyManager');

/**
 * Gestionnaire d'économie pour les jeux
 * Centralise la logique de récompenses et de paris
 */
class GameEconomyManager {
    /**
     * Vérifie si les jeux sont activés
     */
    static isGamesEnabled() {
        return isSourceEnabled('games');
    }

    /**
     * Récupère la configuration des jeux
     */
    static getGameConfig() {
        const config = configManager.getConfig();
        return config.economy?.games || {
            enabled: true,
            baseRewards: {},
            difficultyMultipliers: {
                easy: 0.7,
                normal: 1.0,
                difficult: 1.3,
                expert: 1.8
            },
            bettingSystem: {
                enabled: true,
                minimumBet: 5,
                maximumBet: 100,
                winMultiplier: 2.0
            }
        };
    }

    /**
     * Calcule la récompense d'un jeu avec multiplicateurs
     * @param {string} gameType - Type de jeu (quiz, memory, etc.)
     * @param {string} performanceLevel - Niveau de performance (excellent, good, passing)
     * @param {string} difficulty - Difficulté (easy, normal, difficult, expert)
     * @returns {number} Points à attribuer
     */
    static calculateGameReward(gameType, performanceLevel, difficulty = 'normal') {
        if (!this.isGamesEnabled()) return 0;

        const gameConfig = this.getGameConfig();
        const baseRewards = gameConfig.baseRewards[gameType];
        
        if (!baseRewards) {
            console.warn(`[GameEconomy] Configuration manquante pour le jeu: ${gameType}`);
            return 0;
        }

        let basePoints = 0;
        
        // Obtenir les points de base selon le type de jeu
        if (typeof baseRewards === 'object' && baseRewards[performanceLevel]) {
            basePoints = baseRewards[performanceLevel];
        } else if (typeof baseRewards === 'number') {
            basePoints = baseRewards;
        }

        // Appliquer le multiplicateur de difficulté
        const multiplier = gameConfig.difficultyMultipliers[difficulty] || 1.0;
        
        return Math.round(basePoints * multiplier);
    }

    /**
     * Gère les récompenses de quiz avec performance
     * @param {string} userId - ID de l'utilisateur
     * @param {number} correctAnswers - Nombre de bonnes réponses
     * @param {number} totalQuestions - Nombre total de questions
     * @param {string} difficulty - Difficulté du quiz
     */
    static async rewardQuizPerformance(userId, correctAnswers, totalQuestions, difficulty = 'normal') {
        if (!this.isGamesEnabled()) return 0;

        const percentage = (correctAnswers / totalQuestions) * 100;
        let performanceLevel;

        if (percentage >= 90) {
            performanceLevel = 'excellent';
        } else if (percentage >= 75) {
            performanceLevel = 'good';
        } else if (percentage >= 50) {
            performanceLevel = 'passing';
        } else {
            return 0; // Pas de récompense sous 50%
        }

        const points = this.calculateGameReward('quiz', performanceLevel, difficulty);
        if (points > 0) {
            await addCurrency(userId, points, 'games');
            console.log(`[GameEconomy] Quiz reward: ${points} points to ${userId} (${performanceLevel}, ${difficulty})`);
        }
        
        return points;
    }

    /**
     * Gère les récompenses de memory game
     * @param {string} userId - ID de l'utilisateur
     * @param {number} sequenceLength - Longueur de la séquence
     * @param {number} speedLevel - Niveau de vitesse (0-3)
     */
    static async rewardMemoryGame(userId, sequenceLength, speedLevel = 0) {
        if (!this.isGamesEnabled()) return 0;

        const gameConfig = this.getGameConfig();
        const memoryConfig = gameConfig.baseRewards.memory;
        
        if (!memoryConfig) return 0;

        // Points de base selon la longueur de séquence
        const basePoints = memoryConfig.basePoints[Math.min(sequenceLength - 1, memoryConfig.basePoints.length - 1)] || 0;
        
        // Bonus de vitesse
        const speedBonus = memoryConfig.speedBonuses[speedLevel] || 0;
        
        const totalPoints = basePoints + speedBonus;
        
        if (totalPoints > 0) {
            await addCurrency(userId, totalPoints, 'games');
            console.log(`[GameEconomy] Memory reward: ${totalPoints} points to ${userId} (sequence: ${sequenceLength}, speed: ${speedLevel})`);
        }
        
        return totalPoints;
    }

    /**
     * Gère les paris de jeux
     * @param {string} userId - ID de l'utilisateur
     * @param {number} betAmount - Montant du pari
     * @param {boolean} won - Si l'utilisateur a gagné
     * @returns {number} Points gagnés ou perdus
     */
    static async handleGameBet(userId, betAmount, won) {
        if (!this.isGamesEnabled()) return 0;

        const gameConfig = this.getGameConfig();
        const bettingConfig = gameConfig.bettingSystem;
        
        if (!bettingConfig.enabled) return 0;

        // Vérifier les limites de pari
        if (betAmount < bettingConfig.minimumBet || betAmount > bettingConfig.maximumBet) {
            console.warn(`[GameEconomy] Bet amount ${betAmount} outside limits for ${userId}`);
            return 0;
        }

        if (won) {
            const winnings = Math.round(betAmount * bettingConfig.winMultiplier);
            await addCurrency(userId, winnings, 'games');
            console.log(`[GameEconomy] Bet won: ${winnings} points to ${userId}`);
            return winnings;
        } else {
            // Les points ont déjà été retirés lors du pari
            console.log(`[GameEconomy] Bet lost: ${betAmount} points from ${userId}`);
            return -betAmount;
        }
    }

    /**
     * Valide un pari avant de commencer un jeu
     * @param {number} betAmount - Montant du pari
     * @returns {boolean} Si le pari est valide
     */
    static validateBet(betAmount) {
        if (!this.isGamesEnabled()) return false;

        const gameConfig = this.getGameConfig();
        const bettingConfig = gameConfig.bettingSystem;
        
        if (!bettingConfig.enabled) return false;
        
        return betAmount >= bettingConfig.minimumBet && betAmount <= bettingConfig.maximumBet;
    }

    /**
     * Obtient les limites de pari
     * @returns {Object} Limites min/max
     */
    static getBetLimits() {
        const gameConfig = this.getGameConfig();
        const bettingConfig = gameConfig.bettingSystem;
        
        return {
            enabled: bettingConfig.enabled,
            minimum: bettingConfig.minimumBet,
            maximum: bettingConfig.maximumBet,
            multiplier: bettingConfig.winMultiplier
        };
    }
}

module.exports = GameEconomyManager;