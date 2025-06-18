const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GameUtils = require('../../utils/gameUtils');
const { addGameScore } = require('../../utils/gameScoresManager');
const { getUserBalance, removeCurrency } = require('../../utils/currencyManager');
const GameEconomyManager = require('../../utils/gameEconomyManager');
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
                    content: getMessage('quizGame.replayDataNotFound', { lang: interaction.locale }),
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
                content: getMessage('errors.unknownInteractionType', { lang: interaction.locale }),
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
                        content: getMessage('quizGame.notEnoughKinkyPointsForReplayBet', { lang: interaction.locale, betAmount, userBalance }),
                        ephemeral: true
                    });
                    betAmount = 0; // Annuler la mise pour le replay
                } else {
                    return interaction.reply({
                        content: getMessage('quizGame.notEnoughKinkyPointsToBet', { lang: interaction.locale, betAmount, userBalance }),
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
                content: getMessage('quizGame.noQuestions', { lang: interaction.locale }),
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
    if (gameData.currentQuestionIndex === 0 && !interaction.replied && !interaction.deferred) {
        reply = await interaction.reply({ embeds: [embed], components: rows });
    } else {
        reply = await interaction.editReply({ embeds: [embed], components: rows });
    }

    // Collecteur pour les réponses
    const collector = reply.createMessageComponentCollector({
        filter: i => i.user.id === gameData.player.id, // Assurer que seul le joueur initial peut répondre
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
            // On ne fait pas de deferUpdate ici car l'interaction est ignorée.
            return;
        }

        // Acknowledges the interaction quickly
        await i.deferUpdate();

        // Verrouiller temporairement cette interaction
        interactionLocks.set(lockKey, Date.now());

        // PAS DE TIMEOUT ICI: interactionLocks.delete(lockKey) sera appelé après handleAnswer/handleAbandon

        if (i.customId.startsWith(`quiz_answer_${gameData.id}`)) {
            const answerIndex = parseInt(i.customId.split('_').pop());
            await handleAnswer(i, gameData, answerIndex);
            interactionLocks.delete(lockKey); // Release lock after processing
            collector.stop();
        } else if (i.customId === `quiz_abandon_${gameData.id}`) {
            await handleAbandon(i, gameData);
            interactionLocks.delete(lockKey); // Release lock after processing
            collector.stop();
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time' && activeGames.has(gameData.id)) {
            // Vérifier si le jeu n'est pas déjà en cours de traitement
            if (!gameProcessingLocks.has(gameData.id)) {
                gameProcessingLocks.set(gameData.id, true);
                console.log(`[QUIZ DEBUG] Timeout déclenché pour le jeu ${gameData.id}`);
                handleTimeout(interaction, gameData); // Utiliser l'interaction originale de showQuestion pour le timeout
            } else {
                console.log(`[QUIZ DEBUG] Timeout ignoré - jeu ${gameData.id} déjà en cours de traitement`);
            }
        }
    });
}

async function handleAnswer(interaction, gameData, answerIndex) {
    // Vérifier si le jeu n'est pas déjà en cours de traitement (double-check, devrait être géré par le collecteur)
    if (gameProcessingLocks.has(gameData.id)) {
        console.log(`[QUIZ DEBUG] handleAnswer ignoré - jeu ${gameData.id} déjà en cours de traitement (pré-lock)`);
        // Si l'interaction n'a pas été deferred (ce qui ne devrait pas arriver ici à cause du deferUpdate dans le collecteur)
        // on pourrait envisager un deferUpdate ici, mais c'est un cas limite.
        return;
    }

    gameProcessingLocks.set(gameData.id, true);
    console.log(`[QUIZ DEBUG] handleAnswer - Traitement de la réponse pour le jeu ${gameData.id}`);

    try {
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
        // L'interaction ici est celle du bouton de réponse, qui a déjà été deferred.
        await showQuestionResult(interaction, gameData, isCorrect);
    } catch (error) {
        console.error(`[QUIZ_KINKY] Erreur dans handleAnswer pour le jeu ${gameData.id}:`, error);
        try {
            // L'interaction a déjà été deferred (par le collecteur). Utiliser editReply ou followUp.
            // Si interaction.update a été utilisé dans showQuestionResult et a échoué,
            // il est possible que l'état de l'interaction soit complexe.
            // On tente un followUp comme fallback plus sûr.
            await interaction.followUp({ content: getMessage('quizGame.errorProcessingAnswer', { lang: interaction.locale }), ephemeral: true });
        } catch (replyError) {
            console.error(`[QUIZ_KINKY] Impossible d'informer l'utilisateur de l'erreur dans handleAnswer:`, replyError);
        }
        // Nettoyage critique pour éviter que le jeu ne reste bloqué
        activeGames.delete(gameData.id);
        gameProcessingLocks.delete(gameData.id); // Assurer la libération du verrou de traitement du jeu
        // Important: Ne pas essayer de continuer le jeu ici, car l'état est potentiellement corrompu.
    }
    // Le gameProcessingLock est libéré dans showFinalResults ou handleAbandon, ou ici en cas d'erreur.
}

async function showQuestionResult(interaction, gameData, isCorrect) {
    const currentQuestion = gameData.questions[gameData.currentQuestionIndex];
    const questionNumber = gameData.currentQuestionIndex + 1;
    const totalQuestions = gameData.questions.length;

    const resultEmojis = isCorrect ? '✅' : '❌';
    const resultText = isCorrect ? getMessage('quizGame.correct', { lang: interaction.locale }) : getMessage('quizGame.incorrect', { lang: interaction.locale });

    const kinkyMessagesKey = isCorrect ? 'quizGame.correctMessages' : 'quizGame.incorrectMessages';
    const kinkyMessages = getMessage(kinkyMessagesKey, { lang: interaction.locale }, true); // true pour obtenir un tableau
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
        console.log(`[QUIZ DEBUG] showQuestionResult - Quiz terminé, appel showFinalResults pour jeu ${gameData.id}`);
        // L'interaction ici est celle du bouton réponse, qui a été deferred.
        await showFinalResults(interaction, gameData);
    } else {
        // Question suivante
        const nextButton = new ButtonBuilder()
            .setCustomId(`quiz_next_${gameData.id}`)
            .setLabel('Question suivante')
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(nextButton);

        // L'interaction du bouton réponse (i) a été deferred. On utilise editReply sur elle.
        await interaction.editReply({ embeds: [embed], components: [row] });

        // Collecteur pour le bouton suivant
        const collector = interaction.message.createMessageComponentCollector({
            filter: btnInteraction => btnInteraction.user.id === gameData.player.id && btnInteraction.customId === `quiz_next_${gameData.id}`,
            time: 30000
        });

        collector.on('collect', async btnInteraction => {
            const lockKey = `${btnInteraction.user.id}_${btnInteraction.customId}`;
            if (btnInteraction.replied || btnInteraction.deferred) {
                console.log(`[QUIZ_KINKY] Next button interaction déjà traitée: ${btnInteraction.customId}`);
                return;
            }
            if (interactionLocks.has(lockKey)) {
                console.log(`[QUIZ_KINKY] Double clic (next button) détecté pour: ${btnInteraction.customId}`);
                return;
            }

            await btnInteraction.deferUpdate(); // Defer l'interaction du bouton "Question Suivante"
            interactionLocks.set(lockKey, Date.now());

            await showQuestion(btnInteraction, gameData); // Passer l'interaction du bouton "Question Suivante"

            interactionLocks.delete(lockKey);
            collector.stop();
        });

        collector.on('end', (collected, reason) => {
            // Si le timeout se produit sur le bouton "Question suivante",
            // et que le jeu est toujours actif (pas abandonné ou terminé autrement)
            // on pourrait vouloir forcer le passage à la question suivante ou terminer le jeu.
            // Pour l'instant, on ne fait rien ici pour éviter des états complexes.
            // Le timeout principal de la question dans showQuestion gérera l'inactivité.
            if (reason === 'time' && activeGames.has(gameData.id) && !collected.size) {
                 console.log(`[QUIZ DEBUG] Timeout sur le bouton "Question Suivante" pour le jeu ${gameData.id}. Le timeout de la question principale devrait gérer.`);
                // On pourrait appeler handleTimeout ici si l'interaction originale de showQuestionResult (celle du bouton réponse)
                // est toujours valide et si on veut un comportement spécifique.
                // Pour l'instant, on laisse le timeout de la question principale gérer.
            }
        });
    }
}

async function showFinalResults(interaction, gameData) {
    const totalQuestions = gameData.questions.length;
    const percentage = Math.round((gameData.score / totalQuestions) * 100);
    const playTime = GameUtils.formatTime(Date.now() - gameData.startTime);

    await addGameScore('quiz', gameData.player.id, gameData.score);

    let currencyEarned = 0;
    const performanceReward = await GameEconomyManager.rewardQuizPerformance(
        gameData.player.id,
        gameData.score,
        totalQuestions,
        gameData.difficulty
    );
    currencyEarned += performanceReward;

    if (gameData.bet > 0) {
        const won = percentage >= 50;
        const betResult = await GameEconomyManager.handleGameBet(gameData.player.id, gameData.bet, won);
        // betResult est le montant total après pari (mise + gain ou 0 si perdu)
        // Si won, betResult = gameData.bet * 2. Si lost, betResult = 0.
        // On veut que currencyEarned reflète le gain net.
        if (won) {
            currencyEarned += gameData.bet; // Ajoute le gain de la mise (la mise initiale est déjà "compensée")
        } else {
            // La perte de la mise est déjà gérée par removeCurrency au début.
            // On ne soustrait rien ici pour ne pas le faire deux fois.
        }
    }

    let resultMessageKey;
    let resultColor;
    let resultEmoji;

    if (percentage >= 90) {
        resultMessageKey = 'quizGame.results.expert';
        resultColor = '#FFD700';
        resultEmoji = '🏆';
    } else if (percentage >= 75) {
        resultMessageKey = 'quizGame.results.veryGood';
        resultColor = '#2ECC71';
        resultEmoji = '🔥';
    } else if (percentage >= 50) {
        resultMessageKey = 'quizGame.results.notBad';
        resultColor = '#FFA500';
        resultEmoji = '😊';
    } else {
        resultMessageKey = 'quizGame.results.courage';
        resultColor = '#E74C3C';
        resultEmoji = '💪';
    }

    let resultMessage = getMessage(resultMessageKey, { lang: interaction.locale });

    if (gameData.bet > 0) {
        if (percentage >= 50) {
            resultMessage += `\n\n${getMessage('quizGame.results.betWon', { lang: interaction.locale, amount: gameData.bet * 2 })}`;
        } else {
            resultMessage += `\n\n${getMessage('quizGame.results.betLost', { lang: interaction.locale, amount: gameData.bet })}`;
        }
    }
    if (performanceReward > 0 && gameData.bet === 0) { // Afficher la récompense de performance seulement si pas de pari ou si pari gagné et déjà inclus
         resultMessage += `\n\n${getMessage('quizGame.results.performanceBonus', { lang: interaction.locale, amount: performanceReward })}`;
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

    try {
        // L'interaction originale (du bouton réponse ou /quiz) a été deferred.
        if (!interaction.replied && interaction.deferred) { // S'assurer qu'elle est deferred mais pas encore répondue.
             await interaction.editReply({ embeds: [embed], components: [row] });
        } else {
            // Fallback si l'état est inattendu (par ex. déjà répondu par une erreur)
            await interaction.channel.send({ embeds: [embed], components: [row] });
        }
    } catch (error) {
        console.error(`[QUIZ DEBUG] showFinalResults - Erreur lors de l'envoi des résultats pour jeu ${gameData.id}:`, error);
        try {
            await interaction.channel.send({ embeds: [embed], components: [row] });
        } catch (fallbackError) {
            console.error(`[QUIZ DEBUG] showFinalResults - Fallback canal échoué pour jeu ${gameData.id}:`, fallbackError);
        }
    }

    finishedGames.set(gameData.id, gameData);
    setTimeout(() => {
        finishedGames.delete(gameData.id);
    }, 3600 * 1000); // 1 heure

    activeGames.delete(gameData.id);
    gameProcessingLocks.delete(gameData.id);
}

async function handleAbandon(interaction, gameData) {
    // interaction est celle du bouton "Abandonner", qui a été deferred par le collecteur de showQuestion
    const questionsAnswered = gameData.answers.length;
    const embed = GameUtils.createGameEmbed(
        '💔 Quiz Abandonné',
        getMessage('quizGame.abandonMessage', {
            lang: interaction.locale,
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

    try {
        await interaction.editReply({ embeds: [embed], components: [row] });
    } catch(error) {
        console.error(`[QUIZ_KINKY] Erreur lors de l'abandon (editReply) pour jeu ${gameData.id}:`, error);
        // Fallback si editReply échoue
        try {
            await interaction.channel.send({ embeds: [embed], components: [row] });
        } catch (channelSendError) {
            console.error(`[QUIZ_KINKY] Erreur lors de l'abandon (channel.send) pour jeu ${gameData.id}:`, channelSendError);
        }
    }
    activeGames.delete(gameData.id);
    gameProcessingLocks.delete(gameData.id);
}

async function handleTimeout(originalInteraction, gameData) {
    // originalInteraction est l'interaction de la commande /quiz ou du bouton rejouer/question suivante
    // qui a initié le showQuestion dont le collecteur a expiré.
    console.log(`[QUIZ DEBUG] handleTimeout pour le jeu ${gameData.id}`);
    try {
        const currentQuestion = gameData.questions[gameData.currentQuestionIndex];
        if (!currentQuestion) {
            console.error(`[QUIZ DEBUG] handleTimeout: currentQuestion non définie pour ${gameData.id}. Index: ${gameData.currentQuestionIndex}`);
            activeGames.delete(gameData.id);
            gameProcessingLocks.delete(gameData.id);
            return;
        }

        gameData.answers.push({
            question: currentQuestion.question,
            userAnswer: -1, // Indique un timeout
            correctAnswer: currentQuestion.correct,
            isCorrect: false,
            explanation: currentQuestion.explanation
        });

        // On doit utiliser l'interaction originale qui a affiché la question,
        // car c'est elle qui porte le message à éditer.
        // Il faut s'assurer qu'elle n'a pas déjà été répondue par autre chose (ex: erreur)
        // et qu'elle est toujours modifiable.
        // showQuestionResult attend une interaction qui a été deferred.
        // Si originalInteraction n'est pas deferred, il faut le faire.
        // Cependant, l'interaction du timeout est celle du message original, pas d'un bouton.
        // Le plus sûr est de reconstruire une interaction "fictive" ou d'utiliser l'originale avec précaution.

        // Pour simplifier, on va supposer que showQuestionResult peut gérer une interaction déjà deferred ou non.
        // On va directement appeler showQuestionResult avec l'originalInteraction.
        // showQuestionResult va appeler showFinalResults si c'est la dernière question.
        // Si ce n'est pas la dernière question, il va afficher "Question Suivante".
        // L'interaction passée à showQuestionResult doit être celle qui peut être éditée.

        // Si l'interaction originale n'a pas été deferred, on la defer ici.
        // Cela est peu probable si le timeout vient du collecteur de showQuestion,
        // car showQuestion a déjà fait un reply ou editReply.
        // if (!originalInteraction.deferred && !originalInteraction.replied) {
        //     await originalInteraction.deferUpdate(); // Ce serait pour un bouton, pas pour un message existant.
        // }

        // Il est plus sûr d'utiliser editReply sur le message original si possible.
        // showQuestionResult s'attend à une interaction de bouton qui est deferred.
        // Pour un timeout, l'interaction est celle du message de la question.
        // On va appeler showFinalResults directement si c'est la dernière question.
        // Sinon, on doit afficher le résultat de la question actuelle et ensuite la question suivante.

        if (gameData.currentQuestionIndex + 1 >= gameData.questions.length) {
            await showFinalResults(originalInteraction, gameData);
        } else {
            // On doit d'abord afficher le résultat de la question actuelle (timeout)
            // puis passer à la suivante. C'est ce que fait showQuestionResult.
            // Mais showQuestionResult s'attend à une interaction de bouton.
            // On va simuler cela en appelant directement les fonctions internes si nécessaire
            // ou adapter showQuestionResult. Pour l'instant, on tente avec originalInteraction.
            // showQuestionResult va faire interaction.update() (ou editReply)
            await showQuestionResult(originalInteraction, gameData, false);
        }

    } catch (error) {
        console.error(`Erreur lors du traitement du timeout pour le quiz ${gameData.id}:`, error);
        // Nettoyage critique en cas d'erreur pendant le timeout handling
        activeGames.delete(gameData.id);
        gameProcessingLocks.delete(gameData.id);
        // Tenter d'informer l'utilisateur si possible
        try {
            if (!originalInteraction.replied && !originalInteraction.deferred) {
                await originalInteraction.reply({ content: getMessage('quizGame.errorTimeout', { lang: originalInteraction.locale }), ephemeral: true });
            } else {
                 await originalInteraction.followUp({ content: getMessage('quizGame.errorTimeout', { lang: originalInteraction.locale }), ephemeral: true });
            }
        } catch (e) {
            console.error(`[QUIZ_KINKY] Impossible d'informer (timeout err) ${gameData.id}:`, e);
        }
    }
    // gameProcessingLock est libéré à la fin de showFinalResults ou ici en cas d'erreur.
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
