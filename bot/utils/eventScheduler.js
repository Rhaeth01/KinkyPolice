const { EmbedBuilder } = require('discord.js');
const { getMessage } = require('./messageManager');
const { addCurrency } = require('./currencyManager');
const { quizData } = require('../commands/games/quiz-kinky'); // Pour accéder aux questions du quiz
const GameUtils = require('./gameUtils'); // Pour shuffleArray

// Map pour stocker les événements actifs (pour éviter les doublons ou gérer l'état)
const activeEvents = new Map();

// Fonction pour démarrer un événement "Quiz du Jour"
async function startDailyQuiz(client, guildId, channelId) {
    if (activeEvents.has('daily_quiz')) {
        console.log('Un quiz quotidien est déjà en cours ou planifié.');
        return;
    }

    const guild = client.guilds.cache.get(guildId);
    const channel = guild ? guild.channels.cache.get(channelId) : null;

    if (!channel) {
        console.error(`Canal d'annonce pour le quiz quotidien introuvable: ${channelId}`);
        return;
    }

    // Sélectionner une catégorie aléatoire ou "mixed"
    const categories = Object.keys(quizData.categories);
    const selectedCategory = GameUtils.getRandomElement(categories);
    let questions = quizData.categories[selectedCategory] || [];
    
    if (questions.length === 0) {
        console.error(`Aucune question disponible pour la catégorie ${selectedCategory}.`);
        return;
    }

    const selectedQuestion = GameUtils.getRandomElement(questions);
    const options = GameUtils.shuffleArray(selectedQuestion.options); // Mélanger les options

    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🧠 Quiz Kinky du Jour !')
        .setDescription(getMessage('event.dailyQuizAnnouncement', { category: selectedCategory }))
        .addFields(
            { name: 'Question', value: selectedQuestion.question, inline: false },
            { name: 'Options', value: options.map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`).join('\n'), inline: false }
        )
        .setFooter({ text: 'Répondez dans le chat avec le numéro de l\'option (ex: A, B, C...). Vous avez 60 secondes !' })
        .setTimestamp();

    const message = await channel.send({ embeds: [embed] });

    activeEvents.set('daily_quiz', {
        question: selectedQuestion,
        options: options,
        correctAnswerIndex: selectedQuestion.correct,
        messageId: message.id,
        channelId: channel.id,
        participants: new Map(), // userId -> { answered: boolean, correct: boolean }
        startTime: Date.now()
    });

    // Collecter les réponses pendant 60 secondes
    const collector = channel.createMessageCollector({
        filter: m => !m.author.bot && m.content.match(/^[A-D]$/i), // Filtre les réponses A, B, C, D
        time: 60000 // 60 secondes
    });

    collector.on('collect', async m => {
        const eventData = activeEvents.get('daily_quiz');
        if (!eventData || eventData.participants.has(m.author.id)) return; // Ne pas traiter les réponses multiples

        const userAnswerIndex = options.indexOf(options.find(opt => opt === m.content.toUpperCase()));
        const isCorrect = userAnswerIndex === eventData.correctAnswerIndex;

        eventData.participants.set(m.author.id, { answered: true, correct: isCorrect });

        if (isCorrect) {
            await addCurrency(m.author.id, 20); // Récompense pour la bonne réponse
            await m.react('✅');
        } else {
            await m.react('❌');
        }
    });

    collector.on('end', async collected => {
        const eventData = activeEvents.get('daily_quiz');
        if (!eventData) return;

        const correctParticipants = Array.from(eventData.participants.entries())
            .filter(([, data]) => data.correct)
            .map(([userId]) => `<@${userId}>`);

        const resultsEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎉 Résultats du Quiz Kinky du Jour !')
            .setDescription(getMessage('event.dailyQuizResults', {
                correctAnswer: eventData.question.options[eventData.correctAnswerIndex],
                explanation: eventData.question.explanation
            }))
            .addFields(
                { name: 'Bonnes réponses de:', value: correctParticipants.length > 0 ? correctParticipants.join(', ') : 'Personne cette fois !', inline: false }
            )
            .setTimestamp();

        await channel.send({ embeds: [resultsEmbed] });
        activeEvents.delete('daily_quiz'); // Nettoyer l'événement
    });
}

module.exports = {
    startDailyQuiz
};