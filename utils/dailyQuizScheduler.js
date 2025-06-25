const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const GameUtils = require('./gameUtils');
const { getMessage } = require('./messageManager');
const { addCurrency, isSourceEnabled } = require('./currencyManager');
const configManager = require('./configManager');
const { addQuizParticipant, hasParticipatedInQuiz } = require('./persistentState');

// Chemin vers les questions de quiz
const quizPath = path.join(__dirname, '..', 'data', 'games', 'quiz-questions.json');
let quizData;

try {
    quizData = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
} catch (error) {
    console.error('Erreur lors du chargement des questions de quiz pour le quiz quotidien:', error);
    quizData = { categories: {} };
}

// Map pour stocker la question active du quiz quotidien
const activeDailyQuiz = new Map(); // guildId -> { question, collector, message, correctOptionIndex }
let schedulerTimeout = null;
let dailyInterval = null;

async function sendQuiz(client) {
    try {
        const config = configManager.getConfig();
        const quizChannelId = config.games?.gameChannel;

        if (!quizChannelId) {
            console.log('Le salon pour le quiz quotidien n\'est pas configuré.');
            return;
        }

        const quizConfig = config.economy?.dailyQuiz || { hour: 13, minute: 0 };
        const hour = (typeof quizConfig.hour === 'number' && quizConfig.hour >= 0 && quizConfig.hour <= 23) ? quizConfig.hour : 13;
        const minute = (typeof quizConfig.minute === 'number' && quizConfig.minute >= 0 && quizConfig.minute <= 59) ? quizConfig.minute : 0;
        const nextQuizTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

        const channel = await client.channels.fetch(quizChannelId);
        if (!channel || !channel.isTextBased()) {
            console.error(`Salon de quiz quotidien invalide ou introuvable: ${quizChannelId}`);
            return;
        }

        let allQuestions = [];
        for (const category in quizData.categories) {
            allQuestions = allQuestions.concat(quizData.categories[category]);
        }

        if (allQuestions.length === 0) {
            console.log('Aucune question disponible pour le quiz quotidien.');
            return;
        }

        const question = GameUtils.getRandomElement(allQuestions);
        const questionId = Date.now().toString();
        const today = new Date();
        const dateString = today.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const embed = new EmbedBuilder()
            .setTitle('🧠 Question Kinky du Jour !')
            .setDescription(`📅 **${dateString}**

**${question.question}**

💰 **Récompense :** ${quizConfig.pointsPerCorrectAnswer || 100} KinkyCoins pour la bonne réponse !
⏰ **Disponible pendant 1 heure**`)
            .setColor('#FF69B4')
            .setFooter({ text: `Quiz quotidien • Nouveau quiz chaque jour à ${nextQuizTime} !` })
            .setTimestamp();

        const buttons = question.options.map((option, i) => {
            const prefix = `${String.fromCharCode(65 + i)}. `;
            const maxLength = 80 - prefix.length;
            let optionText = option.length > maxLength ? option.substring(0, maxLength - 3) + '...' : option;
            return new ButtonBuilder()
                .setCustomId(`daily_quiz_answer_${questionId}_${i}`)
                .setLabel(prefix + optionText)
                .setStyle(ButtonStyle.Secondary);
        });

        const row = new ActionRowBuilder().addComponents(buttons);
        const message = await channel.send({ embeds: [embed], components: [row] });

        const collector = message.createMessageComponentCollector({
            filter: i => i.customId.startsWith(`daily_quiz_answer_${questionId}`),
            time: 3600000, // 1 heure
        });

        const quizState = {
            question,
            collector,
            message,
            correctOptionIndex: question.correct,
            answeredUsers: new Set(),
        };
        activeDailyQuiz.set(channel.guild.id, quizState);

        collector.on('collect', async i => {
            if (!activeDailyQuiz.has(i.guild.id)) return;

            const hasAlreadyParticipated = await hasParticipatedInQuiz(i.user.id);
            if (hasAlreadyParticipated || quizState.answeredUsers.has(i.user.id)) {
                await i.reply({ content: 'Vous avez déjà répondu au quiz d\'aujourd\'hui !', ephemeral: true });
                return;
            }
            
            quizState.answeredUsers.add(i.user.id);
            await addQuizParticipant(i.user.id);

            const answerIndex = parseInt(i.customId.split('_').pop());
            const isCorrect = answerIndex === quizState.correctOptionIndex;

            let replyContent;
            if (isCorrect) {
                replyContent = getMessage('quizGame.dailyQuizCorrect');
                if (isSourceEnabled('quiz')) {
                    const rewardAmount = quizConfig.pointsPerCorrectAnswer || 100;
                    await addCurrency(i.user.id, rewardAmount, 'quiz');
                }
            } else {
                replyContent = getMessage('quizGame.dailyQuizIncorrect', {
                    correctAnswer: quizState.question.options[quizState.correctOptionIndex]
                });
            }
            await i.reply({ content: replyContent, ephemeral: true });
        });

        collector.on('end', async () => {
            if (!activeDailyQuiz.has(channel.guild.id)) return;

            const finalEmbed = new EmbedBuilder()
                .setTitle('🧠 Fin du Quiz Kinky du Jour !')
                .setDescription(`La question était : **${quizState.question.question}**

` +
                                `✅ **Bonne réponse :** ${String.fromCharCode(65 + quizState.correctOptionIndex)}. ${quizState.question.options[quizState.correctOptionIndex]}

` +
                                `💡 **Explication :** ${quizState.question.explanation || 'Aucune explication fournie.'}

` +
                                `👥 **Participants :** ${quizState.answeredUsers.size}
` +
                                `💰 **Récompense :** ${quizConfig.pointsPerCorrectAnswer || 100} KinkyCoins pour chaque bonne réponse

` +
                                `🕐 **Prochain quiz :** Demain à ${nextQuizTime} !`)
                .setColor('#32CD32')
                .setTimestamp();

            await quizState.message.edit({ embeds: [finalEmbed], components: [] });
            activeDailyQuiz.delete(channel.guild.id);
        });
    
    } catch (error) {
        console.error('❌ [DailyQuiz] Erreur lors de l\'envoi du quiz:', error);
    }
}

function stopDailyQuizScheduler() {
    if (schedulerTimeout) {
        clearTimeout(schedulerTimeout);
        schedulerTimeout = null;
        console.log('[QUIZ] Ancien planificateur de quiz arrêté.');
    }
    if (dailyInterval) {
        clearInterval(dailyInterval);
        dailyInterval = null;
        console.log('[QUIZ] Intervalle quotidien de quiz arrêté.');
    }
}

function startDailyQuizScheduler(client) {
    stopDailyQuizScheduler(); // Assure qu'il n'y a pas de doublons

    const config = configManager.getConfig();
    if (!config.games?.gameChannel || !config.economy?.dailyQuiz?.enabled) {
        console.log('[QUIZ] Le quiz quotidien est désactivé ou non configuré. Arrêt du planificateur.');
        return;
    }

    const quizConfig = config.economy.dailyQuiz;
    const quizHour = (typeof quizConfig.hour === 'number' && quizConfig.hour >= 0 && quizConfig.hour <= 23) ? quizConfig.hour : 13;
    const quizMinute = (typeof quizConfig.minute === 'number' && quizConfig.minute >= 0 && quizConfig.minute <= 59) ? quizConfig.minute : 0;

    const now = new Date();
    const target = new Date(now);
    target.setHours(quizHour, quizMinute, 0, 0);

    if (now > target) {
        target.setDate(target.getDate() + 1);
    }

    const initialDelay = target.getTime() - now.getTime();
    
    console.log(`[QUIZ] Prochain quiz quotidien programmé pour ${target.toLocaleString('fr-FR')}. Délai: ${Math.round(initialDelay / 60000)} minutes.`);

    schedulerTimeout = setTimeout(() => {
        sendQuiz(client);
        // Une fois le premier quiz envoyé, on passe à un intervalle de 24h
        dailyInterval = setInterval(() => {
            sendQuiz(client);
        }, 24 * 60 * 60 * 1000);
    }, initialDelay);
}

function restartDailyQuizScheduler(client) {
    console.log('[QUIZ] Redémarrage du planificateur de quiz quotidien demandé.');
    startDailyQuizScheduler(client);
}

module.exports = {
    startDailyQuizScheduler,
    stopDailyQuizScheduler,
    restartDailyQuizScheduler,
    sendQuiz, // Exporté pour les tests manuels
};
