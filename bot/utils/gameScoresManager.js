const fs = require('node:fs').promises;
const path = require('node:path');
const scoresFilePath = path.join(__dirname, '..', 'data', 'game-scores.json');

async function ensureScoresFile() {
    try {
        await fs.access(scoresFilePath);
    } catch (error) {
        await fs.writeFile(scoresFilePath, JSON.stringify({}), 'utf8');
    }
}

async function getGameScores() {
    await ensureScoresFile();
    try {
        const data = await fs.readFile(scoresFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Erreur lors de la lecture du fichier de scores de jeux:", error);
        return {};
    }
}

async function saveGameScores(scores) {
    try {
        await fs.writeFile(scoresFilePath, JSON.stringify(scores, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error("Erreur lors de l'écriture dans le fichier de scores de jeux:", error);
        return false;
    }
}

async function addGameScore(gameType, userId, score, timestamp = Date.now()) {
    const scores = await getGameScores();
    if (!scores[gameType]) {
        scores[gameType] = [];
    }
    scores[gameType].push({ userId, score, timestamp });
    return saveGameScores(scores);
}

async function getUserScores(gameType, userId) {
    const scores = await getGameScores();
    if (scores[gameType]) {
        return scores[gameType].filter(entry => entry.userId === userId);
    }
    return [];
}

async function getLeaderboard(gameType, limit = 10) {
    const scores = await getGameScores();
    if (scores[gameType]) {
        // Tri par score décroissant
        const sortedScores = scores[gameType].sort((a, b) => b.score - a.score);
        
        // Agréger les scores par utilisateur pour obtenir le meilleur score
        const userBestScores = {};
        for (const entry of sortedScores) {
            if (!userBestScores[entry.userId] || entry.score > userBestScores[entry.userId].score) {
                userBestScores[entry.userId] = entry;
            }
        }
        
        // Convertir en tableau et trier à nouveau pour le classement final
        const leaderboard = Object.values(userBestScores).sort((a, b) => b.score - a.score);
        
        return leaderboard.slice(0, limit);
    }
    return [];
}

module.exports = {
    addGameScore,
    getUserScores,
    getLeaderboard,
    getGameScores // Utile pour le débogage ou d'autres opérations
};