const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const GameUtils = require('./gameUtils');
const { getMessage } = require('./messageManager');
const { addCurrency } = require('./currencyManager');
const configManager = require('./configManager');

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
    const config = configManager.getConfig();
    const quizChannelId = config.dailyQuizChannelId;

    if (!quizChannelId) {
        console.log('Aucun salon de quiz quotidien configuré.');
        return;
    }

    const channel = await client.channels.fetch(quizChannelId);
    if (!channel) {
        console.error(`Salon de quiz quotidien introuvable: ${quizChannelId}`);
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

    const embed = new EmbedBuilder()
        .setTitle('🧠 Question Kinky du Jour !')
        .setDescription(`**${question.question}**`)
        .setColor('#FF69B4')
        .setFooter({ text: 'Vous avez 5 minutes pour répondre !' });

    const buttons = [];
    for (let i = 0; i < question.options.length; i++) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`daily_quiz_answer_${questionId}_${i}`)
                .setLabel(`${String.fromCharCode(65 + i)}. ${question.options[i]}`)
                .setStyle(ButtonStyle.Secondary)
        );
    }

    const row = new ActionRowBuilder().addComponents(buttons);

    const message = await channel.send({ embeds: [embed], components: [row] });

    const collector = message.createMessageComponentCollector({
        filter: i => i.customId.startsWith(`daily_quiz_answer_${questionId}`),
        time: 300000, // 5 minutes
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

        if (quizState.answeredUsers.has(i.user.id)) {
            await i.reply({ content: 'Vous avez déjà répondu à cette question !', ephemeral: true });
            return;
        }
        quizState.answeredUsers.add(i.user.id);

        const answerIndex = parseInt(i.customId.split('_').pop());
        const isCorrect = answerIndex === quizState.correctOptionIndex;

        let replyContent;
        if (isCorrect) {
            replyContent = getMessage('quizGame.dailyQuizCorrect');
            await addCurrency(i.user.id, 5); // Récompense pour bonne réponse
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

        const finalEmbed = new EmbedBuilder()
            .setTitle('🧠 Fin du Quiz Kinky du Jour !')
            .setDescription(`La question était : **${quizState.question.question}**\n\n` +
                            `La bonne réponse était : **${String.fromCharCode(65 + quizState.correctOptionIndex)}. ${quizState.question.options[quizState.correctOptionIndex]}**\n\n` +
                            `💡 **Explication :** ${quizState.question.explanation || 'Aucune explication fournie.'}\n\n` +
                            `Nombre de participants : ${quizState.answeredUsers.size}`)
            .setColor('#FF69B4');

        await quizState.message.edit({ embeds: [finalEmbed], components: [] });
        activeDailyQuiz.delete(channel.guild.id);
    });
}

module.exports = {
    startDailyQuiz,
};
