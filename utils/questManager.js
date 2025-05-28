const fs = require('node:fs').promises;
const path = require('node:path');
const questsConfig = require('../config/quests.json');
const { addCurrency } = require('./currencyManager');
const { getMessage } = require('./messageManager');

const userQuestsFilePath = path.join(__dirname, '..', 'data', 'userQuests.json');

async function ensureUserQuestsFile() {
    try {
        await fs.access(userQuestsFilePath);
    } catch (error) {
        await fs.writeFile(userQuestsFilePath, JSON.stringify({}), 'utf8');
    }
}

async function getUserQuestsData() {
    await ensureUserQuestsFile();
    try {
        const data = await fs.readFile(userQuestsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Erreur lors de la lecture du fichier de quêtes utilisateur:", error);
        return {};
    }
}

async function saveUserQuestsData(data) {
    try {
        await fs.writeFile(userQuestsFilePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error("Erreur lors de l'écriture dans le fichier de quêtes utilisateur:", error);
        return false;
    }
}

async function assignDailyQuests(userId) {
    const userQuestsData = await getUserQuestsData();
    if (!userQuestsData[userId]) {
        userQuestsData[userId] = { daily: {}, weekly: {} };
    }

    const today = new Date().toDateString();
    if (userQuestsData[userId].lastDailyAssignment !== today) {
        userQuestsData[userId].daily = {};
        for (const quest of questsConfig.dailyQuests) {
            userQuestsData[userId].daily[quest.id] = {
                progress: 0,
                completed: false
            };
        }
        userQuestsData[userId].lastDailyAssignment = today;
        await saveUserQuestsData(userQuestsData);
    }
    return userQuestsData[userId].daily;
}

async function assignWeeklyQuests(userId) {
    const userQuestsData = await getUserQuestsData();
    if (!userQuestsData[userId]) {
        userQuestsData[userId] = { daily: {}, weekly: {} };
    }

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Dimanche
    const weekString = startOfWeek.toDateString();

    if (userQuestsData[userId].lastWeeklyAssignment !== weekString) {
        userQuestsData[userId].weekly = {};
        for (const quest of questsConfig.weeklyQuests) {
            userQuestsData[userId].weekly[quest.id] = {
                progress: 0,
                completed: false
            };
        }
        userQuestsData[userId].lastWeeklyAssignment = weekString;
        await saveUserQuestsData(userQuestsData);
    }
    return userQuestsData[userId].weekly;
}

async function updateQuestProgress(userId, questType, questId, progressToAdd, interaction = null) {
    const userQuestsData = await getUserQuestsData();
    const userQuests = userQuestsData[userId]?.[questType]?.[questId];

    if (!userQuests || userQuests.completed) {
        return;
    }

    const questDefinition = questsConfig[questType].find(q => q.id === questId);
    if (!questDefinition) {
        console.warn(`Définition de quête introuvable pour ${questId} de type ${questType}.`);
        return;
    }

    userQuests.progress += progressToAdd;

    if (userQuests.progress >= questDefinition.target && !userQuests.completed) {
        userQuests.completed = true;
        await saveUserQuestsData(userQuestsData);
        
        // Récompenser l'utilisateur
        if (questDefinition.rewardCurrency) {
            await addCurrency(userId, questDefinition.rewardCurrency);
        }
        // Gérer l'XP si vous avez un système d'XP
        // if (questDefinition.rewardXp) { ... }

        if (interaction) {
            await interaction.followUp({
                content: getMessage('quest.completed', {
                    questName: questDefinition.name,
                    currency: questDefinition.rewardCurrency
                }),
                ephemeral: true
            });
        }
    } else {
        await saveUserQuestsData(userQuestsData);
    }
}

async function getUserActiveQuests(userId) {
    const dailyQuests = await assignDailyQuests(userId);
    const weeklyQuests = await assignWeeklyQuests(userId);

    const activeQuests = [];
    for (const questId in dailyQuests) {
        const quest = dailyQuests[questId];
        const definition = questsConfig.dailyQuests.find(q => q.id === questId);
        if (definition && !quest.completed) {
            activeQuests.push({ ...definition, progress: quest.progress });
        }
    }
    for (const questId in weeklyQuests) {
        const quest = weeklyQuests[questId];
        const definition = questsConfig.weeklyQuests.find(q => q.id === questId);
        if (definition && !quest.completed) {
            activeQuests.push({ ...definition, progress: quest.progress });
        }
    }
    return activeQuests;
}

module.exports = {
    assignDailyQuests,
    assignWeeklyQuests,
    updateQuestProgress,
    getUserActiveQuests
};