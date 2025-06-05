const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GameUtils = require('../../utils/gameUtils');
const { addGameScore } = require('../../utils/gameScoresManager');
const { addCurrency, getUserBalance, removeCurrency } = require('../../utils/currencyManager'); // Nouvelle importation
const { getMessage } = require('../../utils/messageManager');
const fs = require('node:fs');
const path = require('node:path');

// Map pour stocker les parties en cours
const activeGames = new Map();

// Map pour stocker les parties terminées pour la relecture
const finishedGames = new Map(); // Nouvelle Map

// Map pour éviter les doubles clics (verrouillage temporaire)
const interactionLocks = new Map();

// Map pour éviter les race conditions (verrouillage des interactions)
const gameProcessingLocks = new Map();

// Charger les questions de quiz
const quizPath = path.join(__dirname, '..', '..', 'data', 'games', 'quiz-questions.json');
let quizData;

try {
    quizData = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
} catch (error) {
    console.error('Erreur lors du chargement des questions de quiz:', error);
    quizData = { categories: {} };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quiz-kinky')
        .setDescription('Teste tes connaissances coquines ! Quiz BDSM et culture kinky 🧠😈')
        .addStringOption(option =>
            option.setName('categorie')
                .setDescription('Catégorie de questions')
                .setRequired(false)
                .addChoices(
                    { name: 'Bases BDSM', value: 'bdsm_basics' },
                    { name: 'Psychologie', value: 'psychology' },
                    { name: 'Sécurité', value: 'safety' },
                    { name: 'Culture', value: 'culture' },
                    { name: 'Mélange', value: 'mixed' }
                ))
        .addIntegerOption(option =>
            option.setName('questions')
                .setDescription('Nombre de questions (défaut: 5)')
                .setRequired(false)
                .setMinValue(3)
                .setMaxValue(15))
        .addStringOption(option =>
            option.setName('difficulte')
                .setDescription('Le niveau de difficulté du quiz.')
                .setRequired(false)
                .addChoices(
                    { name: 'Facile', value: 'facile' },
                    { name: 'Normal', value: 'normal' },
                    { name: 'Difficile', value: 'difficile' },
                    { name: 'Expert', value: 'expert' }
                ))
        .addIntegerOption(option =>
            option.setName('mise')
                .setDescription('Le montant de Kinky Points à miser pour cette partie.')
                .setRequired(false)
                .setMinValue(1))
        .setDMPermission(false),

    async execute(interaction) {
        // Vérifier si c'est un salon NSFW
        if (!GameUtils.checkNSFWChannel(interaction)) {
            return;
        }

        let betAmount, category, difficulty, questionCount;
        let baseRewardMultiplier = 1;
        let isReplay = false;

        if (interaction.isChatInputCommand()) {
            betAmount = interaction.options.getInteger('mise') || 0;
            category = interaction.options.getString('categorie') || 'mixed';
            difficulty = interaction.options.getString('difficulte') || 'normal';
            questionCount = interaction.options.getInteger('questions') || 5;
        } else if (interaction.isButton() && interaction.customId.startsWith('quiz_replay_')) {
            isReplay = true;
            const gameId = interaction.customId.split('_').pop();
            const previousGameData = finishedGames.get(gameId);

            if (!previousGameData) {
                return interaction.reply({
                    content: getMessage('quizGame.replayDataNotFound'),
                    ephemeral: true
                });
            }

            betAmount = previousGameData.bet || 0;
            category = previousGameData.category || 'mixed';
            difficulty = previousGameData.difficulty || 'normal';
            questionCount = previousGameData.questions.length; // Utiliser le nombre de questions de la partie précédente
            
            // Assurez-vous que l'interaction est différée pour le bouton de relecture
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate();
            }
        } else {
            // Gérer les cas inattendus, bien que cela ne devrait pas arriver avec la logique actuelle
            return interaction.reply({
                content: getMessage('errors.unknownInteractionType'),
                ephemeral: true
            });
        }

        const userBalance = await getUserBalance(interaction.user.id);

        if (betAmount > 0) {
            if (userBalance < betAmount) {
                // Si c'est un replay et que l'utilisateur n'a pas assez de fonds, ne pas bloquer le replay
                // mais informer l'utilisateur qu'il ne peut pas miser.
                if (isReplay) {
                    await interaction.followUp({
                        content: `Tu n'as pas assez de Kinky Points pour miser ${betAmount} pour cette relecture ! Ton solde actuel est de ${userBalance} Kinky Points. La partie commencera sans mise.`,
                        ephemeral: true
                    });
                    betAmount = 0; // Annuler la mise pour le replay
                } else {
                    return interaction.reply({
                        content: `Tu n'as pas assez de Kinky Points pour miser ${betAmount} ! Ton solde actuel est de ${userBalance} Kinky Points.`,
                        ephemeral: true
                    });
                }
            } else {
                await removeCurrency(interaction.user.id, betAmount);
            }
        }

        // Ajuster le nombre de questions et le multiplicateur de récompense en fonction de la difficulté
        switch (difficulty) {
            case 'facile':
                questionCount = Math.max(3, Math.min(questionCount, 5)); // 3-5 questions
                baseRewardMultiplier = 0.8;
                break;
            case 'normal':
                questionCount = Math.max(5, Math.min(questionCount, 10)); // 5-10 questions
                baseRewardMultiplier = 1;
                break;
            case 'difficile':
                questionCount = Math.max(8, Math.min(questionCount, 15)); // 8-15 questions
                baseRewardMultiplier = 1.5;
                break;
            case 'expert':
                questionCount = Math.max(10, Math.min(questionCount, 20)); // 10-20 questions
                baseRewardMultiplier = 2;
                break;
        }

        // Préparer les questions
        let questions = [];
        
        if (category === 'mixed') {
            // Mélanger toutes les catégories
            const allCategories = Object.keys(quizData.categories);
            for (const cat of allCategories) {
                questions = questions.concat(quizData.categories[cat] || []);
            }
        } else {
            questions = quizData.categories[category] || [];
        }

        if (questions.length === 0) {
            return interaction.reply({
                content: getMessage('quizGame.noQuestions'), // Utilisation de messageManager
                ephemeral: true
            });
        }

        // Sélectionner des questions aléatoirement
        const selectedQuestions = GameUtils.shuffleArray(questions).slice(0, questionCount);
        const gameId = GameUtils.generateGameId(interaction.user.id, 'quiz');

        // Créer la partie
        const gameData = {
            id: gameId,
            player: interaction.user,
            questions: selectedQuestions,
            currentQuestionIndex: 0,
            score: 0,
            answers: [],
            startTime: Date.now(),
            category: category,
            bet: betAmount,
            difficulty: difficulty,
            baseRewardMultiplier: baseRewardMultiplier
        };

        activeGames.set(gameId, gameData);

        // Démarrer le quiz
        await showQuestion(interaction, gameData);
    }
};

async function showQuestion(interaction, gameData) {
    const currentQuestion = gameData.questions[gameData.currentQuestionIndex];
    const questionNumber = gameData.currentQuestionIndex + 1;
    const totalQuestions = gameData.questions.length;

    // Créer l'embed de la question
    const categoryEmojis = {
        bdsm_basics: '📚',
        psychology: '🧠',
        safety: '🛡️',
        culture: '🎭',
        mixed: '🎲'
    };

    const progressBar = GameUtils.createProgressBar(questionNumber - 1, totalQuestions, 10);

    const embed = GameUtils.createGameEmbed(
        '🧠 Quiz Kinky',
        `${categoryEmojis[gameData.category] || '🎯'} **Catégorie :** ${getCategoryName(gameData.category)}\n\n` +
        `📊 **Progression :** ${questionNumber}/${totalQuestions}\n` +
        `${progressBar}\n\n` +
        `🏆 **Score actuel :** ${gameData.score}/${questionNumber - 1}\n\n` +
        `**Question ${questionNumber} :**\n${currentQuestion.question}`
    );

    // Créer les boutons pour les réponses
    const buttons = [];
    for (let i = 0; i < currentQuestion.options.length; i++) {
        const button = new ButtonBuilder()
            .setCustomId(`quiz_answer_${gameData.id}_${i}`)
            .setLabel(`${String.fromCharCode(65 + i)}. ${currentQuestion.options[i]}`)
            .setStyle(ButtonStyle.Secondary);
        
        buttons.push(button);
    }

    // Diviser en plusieurs rows si nécessaire (max 5 boutons par row)
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
        rows.push(row);
    }

    // Ajouter bouton d'abandon
    const abandonButton = new ButtonBuilder()
        .setCustomId(`quiz_abandon_${gameData.id}`)
        .setLabel('Abandonner')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger);

    const lastRow = new ActionRowBuilder().addComponents(abandonButton);
    rows.push(lastRow);

    let reply;
    if (gameData.currentQuestionIndex === 0) {
        reply = await interaction.reply({ embeds: [embed], components: rows });
    } else {
        reply = await interaction.editReply({ embeds: [embed], components: rows });
    }

    // Collecteur pour les réponses
    const collector = reply.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 60000 // 1 minute par question
    });

    collector.on('collect', async i => {
        // Créer une clé unique pour cette interaction
        const lockKey = `${i.user.id}_${i.customId}`;
        
        // Vérifier si l'interaction n'a pas déjà été répondue
        if (i.replied || i.deferred) {
            console.log(`[QUIZ_KINKY] Interaction déjà traitée (replied/deferred): ${i.customId}, LockKey: ${lockKey}`);
            return;
        }

        // Vérifier le verrouillage pour éviter les doubles clics
        if (interactionLocks.has(lockKey)) {
            console.log(`[QUIZ_KINKY] Double clic détecté pour: ${i.customId}, LockKey: ${lockKey}`);
            return;
        }

        // Verrouiller temporairement cette interaction
        interactionLocks.set(lockKey, Date.now());
        
        // Nettoyer le verrou après 3 secondes
        setTimeout(() => {
            interactionLocks.delete(lockKey);
        }, 3000);

        if (i.customId.startsWith(`quiz_answer_${gameData.id}`)) {
            const answerIndex = parseInt(i.customId.split('_').pop());
            await handleAnswer(i, gameData, answerIndex);
            collector.stop();
        } else if (i.customId === `quiz_abandon_${gameData.id}`) {
            await handleAbandon(i, gameData);
            collector.stop();
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time' && activeGames.has(gameData.id)) {
            // Vérifier si le jeu n'est pas déjà en cours de traitement
            if (!gameProcessingLocks.has(gameData.id)) {
                gameProcessingLocks.set(gameData.id, true);
                console.log(`[QUIZ DEBUG] Timeout déclenché pour le jeu ${gameData.id}`);
                handleTimeout(interaction, gameData);
            } else {
                console.log(`[QUIZ DEBUG] Timeout ignoré - jeu ${gameData.id} déjà en cours de traitement`);
            }
        }
    });
}

async function handleAnswer(interaction, gameData, answerIndex) {
    // Vérifier si le jeu n'est pas déjà en cours de traitement
    if (gameProcessingLocks.has(gameData.id)) {
        console.log(`[QUIZ DEBUG] handleAnswer ignoré - jeu ${gameData.id} déjà en cours de traitement`);
        return;
    }
    
    gameProcessingLocks.set(gameData.id, true);
    console.log(`[QUIZ DEBUG] handleAnswer - Traitement de la réponse pour le jeu ${gameData.id}`);
    
    const currentQuestion = gameData.questions[gameData.currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correct;
    
    if (isCorrect) {
        gameData.score++;
    }

    gameData.answers.push({
        question: currentQuestion.question,
        userAnswer: answerIndex,
        correctAnswer: currentQuestion.correct,
        isCorrect: isCorrect,
        explanation: currentQuestion.explanation
    });

    // Afficher le résultat de la question
    await showQuestionResult(interaction, gameData, isCorrect);
}

async function showQuestionResult(interaction, gameData, isCorrect) {
    const currentQuestion = gameData.questions[gameData.currentQuestionIndex];
    const questionNumber = gameData.currentQuestionIndex + 1;
    const totalQuestions = gameData.questions.length;

    const resultEmojis = isCorrect ? '✅' : '❌';
    const resultText = isCorrect ? getMessage('quizGame.correct') : getMessage('quizGame.incorrect');
    
    const kinkyMessages = isCorrect ? getMessage('quizGame.correctMessages', {}, true) : getMessage('quizGame.incorrectMessages', {}, true);
    const randomMessage = GameUtils.getRandomElement(kinkyMessages);

    const embed = GameUtils.createGameEmbed(
        `${resultEmojis} ${resultText}`,
        `${randomMessage}\n\n` +
        `**Question ${questionNumber} :**\n${currentQuestion.question}\n\n` +
        `**Ta réponse :** ${currentQuestion.options[gameData.answers[gameData.answers.length - 1].userAnswer]}\n` +
        `**Bonne réponse :** ${currentQuestion.options[currentQuestion.correct]}\n\n` +
        `💡 **Explication :** ${currentQuestion.explanation}\n\n` +
        `🏆 **Score :** ${gameData.score}/${questionNumber}`,
        isCorrect ? '#2ECC71' : '#E74C3C'
    );

    gameData.currentQuestionIndex++;

    if (gameData.currentQuestionIndex >= gameData.questions.length) {
        // Quiz terminé - afficher directement les résultats
        console.log(`[QUIZ DEBUG] showQuestionResult - Quiz terminé, appel showFinalResults`);
        console.log(`[QUIZ DEBUG] showQuestionResult - État interaction avant showFinalResults: replied=${interaction.replied}, deferred=${interaction.deferred}`);
        await showFinalResults(interaction, gameData);
    } else {
        // Question suivante
        const nextButton = new ButtonBuilder()
            .setCustomId(`quiz_next_${gameData.id}`)
            .setLabel('Question suivante')
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(nextButton);

        await interaction.update({ embeds: [embed], components: [row] });

        // Collecteur pour le bouton suivant
        const collector = interaction.message.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id && i.customId === `quiz_next_${gameData.id}`,
            time: 30000
        });

        collector.on('collect', async i => {
            // Créer une clé unique pour cette interaction
            const lockKey = `${i.user.id}_${i.customId}`;
            
            // Vérifier si l'interaction n'a pas déjà été répondue
            if (i.replied || i.deferred) {
                console.log(`[QUIZ_KINKY] Interaction déjà traitée (replied/deferred): ${i.customId}, LockKey: ${lockKey}`);
                return;
            }

            // Vérifier le verrouillage pour éviter les doubles clics
            if (interactionLocks.has(lockKey)) {
                console.log(`[QUIZ_KINKY] Double clic détecté pour: ${i.customId}, LockKey: ${lockKey}`);
                return;
            }

            // Verrouiller temporairement cette interaction
            interactionLocks.set(lockKey, Date.now());
            
            // Nettoyer le verrou après 3 secondes
            setTimeout(() => {
                interactionLocks.delete(lockKey);
            }, 3000);

            // Différer la nouvelle interaction avant de l'utiliser
            await i.deferUpdate();
            await showQuestion(i, gameData);
            collector.stop();
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                showQuestion(interaction, gameData);
            }
        });
    }
}

async function showFinalResults(interaction, gameData) {
    const totalQuestions = gameData.questions.length;
    const percentage = Math.round((gameData.score / totalQuestions) * 100);
    const playTime = GameUtils.formatTime(Date.now() - gameData.startTime);

    // Enregistrer le score
    await addGameScore('quiz', gameData.player.id, gameData.score); // Enregistre le score du quiz

    // Calcul de la récompense en monnaie
    let currencyEarned = 0;
    let baseReward = 0;

    if (percentage >= 90) {
        baseReward = 50;
    } else if (percentage >= 75) {
        baseReward = 30;
    } else if (percentage >= 50) {
        baseReward = 10;
    }

    currencyEarned = Math.round(baseReward * gameData.baseRewardMultiplier);

    if (gameData.bet > 0) {
        if (percentage >= 50) { // Gagne la mise si plus de 50% de bonnes réponses
            currencyEarned += gameData.bet * 2;
        } else { // Perd la mise
            // La mise a déjà été retirée au début du jeu
        }
    }

    if (currencyEarned > 0) {
        await addCurrency(gameData.player.id, currencyEarned);
    }

    // Messages selon le score
    let resultMessage, resultColor, resultEmoji;
    if (percentage >= 90) {
        resultMessage = getMessage('quizGame.results.expert');
        resultColor = '#FFD700';
        resultEmoji = '🏆';
    } else if (percentage >= 75) {
        resultMessage = getMessage('quizGame.results.veryGood');
        resultColor = '#2ECC71';
        resultEmoji = '🔥';
    } else if (percentage >= 50) {
        resultMessage = getMessage('quizGame.results.notBad');
        resultColor = '#FFA500';
        resultEmoji = '😊';
    } else {
        resultMessage = getMessage('quizGame.results.courage');
        resultColor = '#E74C3C';
        resultEmoji = '💪';
    }
    
    // Ajouter la monnaie gagnée/perdue au message de résultat
    if (gameData.bet > 0) {
        if (percentage >= 50) {
            resultMessage += `\n\n💰 Vous avez gagné **${currencyEarned}** KinkyCoins (incluant votre mise doublée) !`;
        } else {
            resultMessage += `\n\n💸 Vous avez perdu votre mise de **${gameData.bet}** KinkyCoins.`;
        }
    } else if (currencyEarned > 0) {
        resultMessage += `\n\n💰 Vous avez gagné **${currencyEarned}** KinkyCoins !`;
    }

    const embed = GameUtils.createGameEmbed(
        `${resultEmoji} Résultats du Quiz Kinky`,
        `${resultMessage}\n\n` +
        `🏆 **Score final :** ${gameData.score}/${totalQuestions} (${percentage}%)\n` +
        `⏱️ **Temps total :** ${playTime}\n` +
        `📂 **Catégorie :** ${getCategoryName(gameData.category)}\n\n` +
        `📊 **Détail des réponses :**`,
        resultColor
    );

    // Ajouter le détail des réponses
    let detailText = '';
    gameData.answers.forEach((answer, index) => {
        const emoji = answer.isCorrect ? '✅' : '❌';
        detailText += `${emoji} **Q${index + 1}:** ${answer.isCorrect ? 'Correct' : 'Incorrect'}\n`;
    });

    embed.addFields({ name: '📋 Résumé', value: detailText, inline: false });

    const replayButton = new ButtonBuilder()
        .setCustomId(`quiz_replay_${gameData.id}`)
        .setLabel('Rejouer')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Success);

    const reviewButton = new ButtonBuilder()
        .setCustomId(`quiz_review_${gameData.id}`)
        .setLabel('Revoir les réponses')
        .setEmoji('📖')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(replayButton, reviewButton);

    // DIAGNOSTIC: Vérifier l'état de l'interaction avant mise à jour
    console.log(`[QUIZ DEBUG] showFinalResults - État interaction: replied=${interaction.replied}, deferred=${interaction.deferred}`);
    
    try {
        // Vérifier si l'interaction est encore valide (pas expirée)
        const timeElapsed = Date.now() - interaction.createdTimestamp;
        const timeRemaining = (15 * 60 * 1000) - timeElapsed; // 15 minutes
        
        if (timeRemaining < 30000) { // Moins de 30 secondes restantes
            console.log(`[QUIZ DEBUG] showFinalResults - Interaction expirée, envoi dans le canal`);
            await interaction.channel.send({ embeds: [embed], components: [row] });
        } else if (interaction.replied) {
            console.log(`[QUIZ DEBUG] showFinalResults - Utilisation d'editReply`);
            await interaction.editReply({ embeds: [embed], components: [row] });
        } else {
            console.log(`[QUIZ DEBUG] showFinalResults - Utilisation d'update`);
            await interaction.update({ embeds: [embed], components: [row] });
        }
        console.log(`[QUIZ DEBUG] showFinalResults - Mise à jour réussie`);
    } catch (error) {
        console.error(`[QUIZ DEBUG] showFinalResults - Erreur mise à jour:`, error.code, error.message);
        
        // Tentative de fallback - envoyer dans le canal
        try {
            await interaction.channel.send({ embeds: [embed], components: [row] });
            console.log(`[QUIZ DEBUG] showFinalResults - Fallback canal réussi`);
        } catch (fallbackError) {
            console.error(`[QUIZ DEBUG] showFinalResults - Fallback canal échoué:`, fallbackError.code);
        }
    }
    
    // Déplacer les données du jeu vers finishedGames pour la relecture
    finishedGames.set(gameData.id, gameData);
    // Nettoyer finishedGames après 1 heure (par exemple)
    setTimeout(() => {
        finishedGames.delete(gameData.id);
    }, 3600 * 1000); // 1 heure

    activeGames.delete(gameData.id);
    gameProcessingLocks.delete(gameData.id);
}

async function handleAbandon(interaction, gameData) {
    const questionsAnswered = gameData.answers.length;
    const embed = GameUtils.createGameEmbed(
        '💔 Quiz Abandonné',
        getMessage('quizGame.abandonMessage', {
            score: gameData.score,
            answered: questionsAnswered,
            total: gameData.questions.length,
            category: getCategoryName(gameData.category)
        }),
        '#FFA500'
    );

    const replayButton = new ButtonBuilder()
        .setCustomId(`quiz_replay_${gameData.id}`)
        .setLabel('Rejouer')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(replayButton);

    await interaction.update({ embeds: [embed], components: [row] });
    activeGames.delete(gameData.id);
    gameProcessingLocks.delete(gameData.id); // Nettoyer le verrouillage
}

async function handleTimeout(interaction, gameData) {
    try {
        // Ajouter une réponse incorrecte pour timeout
        const currentQuestion = gameData.questions[gameData.currentQuestionIndex];
        gameData.answers.push({
            question: currentQuestion.question,
            userAnswer: -1, // Timeout
            correctAnswer: currentQuestion.correct,
            isCorrect: false,
            explanation: currentQuestion.explanation
        });

        await showQuestionResult(interaction, gameData, false);
    } catch (error) {
        console.error(`Erreur lors du traitement du timeout pour le quiz:`, error);
        // Nettoyer en cas d'erreur
        activeGames.delete(gameData.id);
        gameProcessingLocks.delete(gameData.id);
    }
}

function getCategoryName(category) {
    const names = {
        bdsm_basics: 'Bases BDSM',
        psychology: 'Psychologie',
        safety: 'Sécurité',
        culture: 'Culture',
        mixed: 'Mélange'
    };
    return names[category] || category;
}

// Fonction exportée pour récupérer les données d'une partie terminée
function getFinishedQuizGameData(gameId) {
    return finishedGames.get(gameId);
}

module.exports.getFinishedQuizGameData = getFinishedQuizGameData;
