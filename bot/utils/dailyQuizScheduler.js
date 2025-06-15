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

async function startDailyQuiz(client) {
    try {
        const config = configManager.getConfig();
        const quizChannelId = config.games?.gameChannel;

        if (!quizChannelId) {
            console.log('Le salon pour le quiz quotidien n\'est pas configuré. Utilisez la commande /config pour le définir.');
            return;
        }

        // Obtenir l'heure configurée pour le prochain quiz avec validation
        const quizConfig = config.economy?.dailyQuiz || { hour: 13, minute: 0 };
        
        // Valider les valeurs avant utilisation
        const hour = (typeof quizConfig.hour === 'number' && quizConfig.hour >= 0 && quizConfig.hour <= 23) ? quizConfig.hour : 13;
        const minute = (typeof quizConfig.minute === 'number' && quizConfig.minute >= 0 && quizConfig.minute <= 59) ? quizConfig.minute : 0;
        
        const nextQuizTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

        const channel = await client.channels.fetch(quizChannelId);
        if (!channel) {
            console.error(`Salon de quiz quotidien introuvable: ${quizChannelId}`);
            return;
        }

        // Vérifier que le channel est bien un canal texte
        if (!channel.isTextBased()) {
            console.error(`Le canal ${quizChannelId} n'est pas un canal texte`);
            return;
        }

    // Sélectionner une question aléatoire parmi toutes les catégories
    let allQuestions = [];
    for (const category in quizData.categories) {
        allQuestions = allQuestions.concat(quizData.categories[category]);
    }

    if (allQuestions.length === 0) {
        console.log('Aucune question disponible pour le quiz quotidien.');
        return;
    }

    const question = GameUtils.getRandomElement(allQuestions);
    const questionId = Date.now().toString(); // ID unique pour cette question de quiz

    // Obtenir la date actuelle pour l'affichage
    const today = new Date();
    const dateString = today.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const embed = new EmbedBuilder()
        .setTitle('🧠 Question Kinky du Jour !')
        .setDescription(`📅 **${dateString}**\n\n**${question.question}**\n\n💰 **Récompense :** ${quizConfig.pointsPerCorrectAnswer || 100} KinkyCoins pour la bonne réponse !\n⏰ **Disponible pendant 1 heure**`)
        .setColor('#FF69B4')
        .setFooter({ text: `Quiz quotidien • Nouveau quiz chaque jour à ${nextQuizTime} !` })
        .setTimestamp();

    const buttons = [];
    for (let i = 0; i < question.options.length; i++) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`daily_quiz_answer_${questionId}_${i}`)
                .setLabel((() => {
                    const prefix = `${String.fromCharCode(65 + i)}. `;
                    const maxLength = 80 - prefix.length;
                    let optionText = question.options[i];
                    if (optionText.length > maxLength - 3) {
                        optionText = optionText.substring(0, maxLength - 3) + '...';
                    }
                    return prefix + optionText;
                })())
                .setStyle(ButtonStyle.Secondary)
        );
    }

    const row = new ActionRowBuilder().addComponents(buttons);

    const message = await channel.send({ embeds: [embed], components: [row] });

    const collector = message.createMessageComponentCollector({
        filter: i => i.customId.startsWith(`daily_quiz_answer_${questionId}`),
        time: 3600000, // 1 heure (60 minutes)
    });

    activeDailyQuiz.set(channel.guild.id, {
        question: question,
        collector: collector,
        message: message,
        correctOptionIndex: question.correct,
        answeredUsers: new Set(), // Pour éviter les réponses multiples
    });

    collector.on('collect', async i => {
        const quizState = activeDailyQuiz.get(i.guild.id);
        if (!quizState) return;

        // Vérification avec stockage persistant pour empêcher les multiples participations
        const hasAlreadyParticipated = await hasParticipatedInQuiz(i.user.id);
        if (hasAlreadyParticipated || quizState.answeredUsers.has(i.user.id)) {
            await i.reply({ content: 'Vous avez déjà répondu au quiz d\'aujourd\'hui !', ephemeral: true });
            return;
        }
        
        // Ajouter aux deux systèmes de tracking
        quizState.answeredUsers.add(i.user.id);
        await addQuizParticipant(i.user.id);

        const answerIndex = parseInt(i.customId.split('_').pop());
        const isCorrect = answerIndex === quizState.correctOptionIndex;

        let replyContent;
        if (isCorrect) {
            replyContent = getMessage('quizGame.dailyQuizCorrect');
            // Récompense pour bonne réponse (avec configuration)
            if (isSourceEnabled('quiz')) {
                const config = configManager.getConfig();
                const quizConfig = config.economy?.dailyQuiz || { pointsPerCorrectAnswer: 100 };
                const rewardAmount = quizConfig.pointsPerCorrectAnswer || 100; // 100 points par défaut
                await addCurrency(i.user.id, rewardAmount, 'quiz');
            }
        } else {
            replyContent = getMessage('quizGame.dailyQuizIncorrect', {
                correctAnswer: quizState.question.options[quizState.correctOptionIndex]
            });
        }
        await i.reply({ content: replyContent, ephemeral: true });
    });

    collector.on('end', async collected => {
        const quizState = activeDailyQuiz.get(channel.guild.id);
        if (!quizState) return;

        // Calculer le nombre de bonnes réponses
        let correctAnswers = 0;
        const userAnswers = Array.from(quizState.answeredUsers);
        
        const finalEmbed = new EmbedBuilder()
            .setTitle('🧠 Fin du Quiz Kinky du Jour !')
            .setDescription(`La question était : **${quizState.question.question}**\n\n` +
                            `✅ **Bonne réponse :** ${String.fromCharCode(65 + quizState.correctOptionIndex)}. ${quizState.question.options[quizState.correctOptionIndex]}\n\n` +
                            `💡 **Explication :** ${quizState.question.explanation || 'Aucune explication fournie.'}\n\n` +
                            `👥 **Participants :** ${quizState.answeredUsers.size}\n` +
                            `💰 **Récompense :** ${quizConfig.pointsPerCorrectAnswer || 100} KinkyCoins pour chaque bonne réponse\n\n` +
                            `🕐 **Prochain quiz :** Demain à ${nextQuizTime} !`)
            .setColor('#32CD32') // Vert pour indiquer la fin
            .setTimestamp();

        await quizState.message.edit({ embeds: [finalEmbed], components: [] });
        activeDailyQuiz.delete(channel.guild.id);
    });
    
    } catch (error) {
        console.error('❌ [DailyQuiz] Erreur lors du démarrage du quiz:', error);
        
        // Tenter de nettoyer si il y a eu une erreur
        try {
            const guildId = client.guilds.cache.first()?.id;
            if (guildId && activeDailyQuiz.has(guildId)) {
                const quizState = activeDailyQuiz.get(guildId);
                if (quizState.collector) {
                    quizState.collector.stop();
                }
                activeDailyQuiz.delete(guildId);
            }
        } catch (cleanupError) {
            console.error('❌ [DailyQuiz] Erreur lors du nettoyage:', cleanupError);
        }
    }
}

module.exports = {
    startDailyQuiz,
};
