const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GameUtils = require('../../utils/gameUtils');
const { addCurrency, removeCurrency, getUserBalance } = require('../../utils/currencyManager');

// Map pour stocker les parties en cours
const activeGames = new Map();

// Map pour éviter les doubles clics (verrouillage temporaire)
const interactionLocks = new Map();

// Emojis et défis pour le jeu de réaction
const reactionChallenges = [
    {
        type: 'emoji',
        instruction: 'Clique sur le bon emoji !',
        target: '🔥',
        options: ['🔥', '💋', '😈', '💕']
    },
    {
        type: 'color',
        instruction: 'Clique sur le bouton ROUGE !',
        target: 'red',
        options: [
            { label: 'Rouge', value: 'red', style: ButtonStyle.Danger },
            { label: 'Vert', value: 'green', style: ButtonStyle.Success },
            { label: 'Bleu', value: 'blue', style: ButtonStyle.Primary },
            { label: 'Gris', value: 'gray', style: ButtonStyle.Secondary }
        ]
    },
    {
        type: 'word',
        instruction: 'Clique sur le mot "PLAISIR" !',
        target: 'PLAISIR',
        options: ['PLAISIR', 'PASSION', 'DÉSIR', 'EXTASE']
    },
    {
        type: 'number',
        instruction: 'Clique sur le nombre le plus GRAND !',
        target: 'max',
        options: [] // Généré dynamiquement
    },
    {
        type: 'kinky',
        instruction: 'Clique sur l\'emoji le plus COQUIN !',
        target: '😈',
        options: ['😈', '😊', '🤔', '😴']
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reaction-race')
        .setDescription('Course de réactions coquines ! Qui sera le plus rapide ? ⚡😈')
        .addIntegerOption(option =>
            option.setName('rounds')
                .setDescription('Nombre de rounds (défaut: 5)')
                .setRequired(false)
                .setMinValue(3)
                .setMaxValue(15))
        .addStringOption(option =>
            option.setName('difficulte')
                .setDescription('Difficulté du jeu')
                .setRequired(false)
                .addChoices(
                    { name: 'Facile (3-5s)', value: 'easy' },
                    { name: 'Normal (2-4s)', value: 'normal' },
                    { name: 'Difficile (1-3s)', value: 'hard' },
                    { name: 'Extrême (0.5-2s)', value: 'extreme' }
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
            return; // checkNSFWChannel should handle its own reply
        }

        let rounds, difficulty, betAmount;

        // Check if interaction.options is available (ChatInputCommandInteraction)
        if (interaction.options && typeof interaction.options.getInteger === 'function') {
            rounds = interaction.options.getInteger('rounds') || 5;
            difficulty = interaction.options.getString('difficulte') || 'normal';
            betAmount = interaction.options.getInteger('mise') || 0;
        } else {
            // Default values for replay (ButtonInteraction)
            rounds = 5;
            difficulty = 'normal';
            betAmount = 0;
            console.log(`[REACTION_RACE] Replay detected or options not available. Using default game settings: ${rounds} rounds, ${difficulty} difficulty, ${betAmount} mise.`);
        }

        if (betAmount > 0) {
            const userBalance = await getUserBalance(interaction.user.id);
            if (userBalance < betAmount) {
                const insufFundsMsg = `Tu n'as pas assez de Kinky Points pour miser ${betAmount} ! Ton solde actuel est de ${userBalance} Kinky Points.`;
                if (interaction.deferred || interaction.replied) {
                    return interaction.followUp({ content: insufFundsMsg, ephemeral: true });
                }
                return interaction.reply({ content: insufFundsMsg, ephemeral: true });
            }
            await removeCurrency(interaction.user.id, betAmount);
        }
        
        const gameId = GameUtils.generateGameId(interaction.user.id, 'reaction');

        // Clear any existing game state for this gameId to ensure a fresh start
        if (activeGames.has(gameId)) {
            activeGames.delete(gameId);
            console.log(`[REACTION_RACE] Cleared existing game state for ${gameId} before new game.`);
        }

        // Créer la partie
        const gameData = {
            id: gameId,
            player: interaction.user,
            rounds: rounds,
            currentRound: 0,
            difficulty: difficulty,
            scores: [],
            totalTime: 0,
            startTime: Date.now(),
            roundStartTime: null,
            bestTime: null,
            worstTime: null,
            bet: betAmount
        };

        activeGames.set(gameId, gameData);

        // Afficher l'introduction
        await showIntroduction(interaction, gameData);
    }
};

async function showIntroduction(interaction, gameData) {
    const difficultyTexts = {
        easy: 'Facile (3-5s de délai)',
        normal: 'Normal (2-4s de délai)',
        hard: 'Difficile (1-3s de délai)',
        extreme: 'Extrême (0.5-2s de délai)'
    };

    const embed = GameUtils.createGameEmbed(
        '⚡ Reaction Race Kinky',
        `Prépare-toi à tester tes réflexes coquins ! 😈\n\n` +
        `🎯 **Nombre de rounds :** ${gameData.rounds}\n` +
        `⚡ **Difficulté :** ${difficultyTexts[gameData.difficulty]}\n\n` +
        `**Comment jouer :**\n` +
        `1. Attends le signal de départ\n` +
        `2. Clique sur le bon bouton le plus vite possible\n` +
        `3. Accumule les meilleurs temps !\n\n` +
        `**Attention :** Si tu cliques trop tôt, tu seras pénalisé ! 😏\n\n` +
        `Es-tu prêt(e) à montrer tes réflexes ? 💋`
    );

    const startButton = new ButtonBuilder()
        .setCustomId(`reaction_start_${gameData.id}`)
        .setLabel('Commencer la course !')
        .setEmoji('🚀')
        .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
        .setCustomId(`reaction_cancel_${gameData.id}`)
        .setLabel('Annuler')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(startButton, cancelButton);

    let reply;
    if (interaction.deferred || interaction.replied) {
        reply = await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
        reply = await interaction.reply({ embeds: [embed], components: [row] });
    }

    // Collecteur pour le démarrage
    // Ensure reply is not null if editReply/reply failed, though it shouldn't if error handling is proper
    if (!reply) {
        console.error("[REACTION_RACE] Failed to send initial message for game introduction.");
        if (activeGames.has(gameData.id)) {
            activeGames.delete(gameData.id); // Clean up game data if intro fails
        }
        return; // Stop execution if message couldn't be sent
    }
    const collector = reply.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 60000
    });

    collector.on('collect', async i => {
        // Créer une clé unique pour cette interaction
        const lockKey = `${i.user.id}_${i.customId}`;
        
        // Vérifier si l'interaction n'a pas déjà été répondue
        if (i.replied || i.deferred) {
            console.log(`[REACTION_RACE] Interaction déjà traitée (replied/deferred): ${i.customId}, LockKey: ${lockKey}`);
            return;
        }

        // Vérifier le verrouillage pour éviter les doubles clics
        if (interactionLocks.has(lockKey)) {
            console.log(`[REACTION_RACE] Double clic détecté pour: ${i.customId}, LockKey: ${lockKey}`);
            return;
        }

        // Verrouiller temporairement cette interaction
        interactionLocks.set(lockKey, Date.now());
        
        // Nettoyer le verrou après 3 secondes
        setTimeout(() => {
            interactionLocks.delete(lockKey);
        }, 3000);

        if (i.customId === `reaction_start_${gameData.id}`) {
            collector.stop(); // Arrêter le collecteur immédiatement
            await i.deferUpdate();
            await startNextRound(i, gameData);
        } else if (i.customId === `reaction_cancel_${gameData.id}`) {
            collector.stop(); // Arrêter le collecteur immédiatement
            await i.update({ content: '❌ Course annulée !', embeds: [], components: [] });
            activeGames.delete(gameData.id);
        }
        collector.stop();
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time' && activeGames.has(gameData.id)) {
            activeGames.delete(gameData.id);
        }
    });
}

async function startNextRound(interaction, gameData) {
    gameData.currentRound++;

    if (gameData.currentRound > gameData.rounds) {
        await showFinalResults(interaction, gameData);
        return;
    }

    // Afficher la préparation du round
    const embed = GameUtils.createGameEmbed(
        `🎯 Round ${gameData.currentRound}/${gameData.rounds}`,
        `Prépare-toi... Le défi va apparaître ! 😈\n\n` +
        `**Attends le signal !**\n` +
        `Ne clique pas trop tôt ! 😏`,
        '#FFA500'
    );

    await interaction.editReply({ embeds: [embed], components: [] });

    // Délai aléatoire selon la difficulté
    const delays = {
        easy: { min: 3000, max: 5000 },
        normal: { min: 2000, max: 4000 },
        hard: { min: 1000, max: 3000 },
        extreme: { min: 500, max: 2000 }
    };

    const delayRange = delays[gameData.difficulty];
    const randomDelay = GameUtils.generateRandomNumber(delayRange.min, delayRange.max);

    // Attendre le délai
    await new Promise(resolve => setTimeout(resolve, randomDelay));

    // Démarrer le round
    await showChallenge(interaction, gameData);
}

async function showChallenge(interaction, gameData) {
    // Sélectionner un défi aléatoire
    const challenge = GameUtils.getRandomElement(reactionChallenges);
    gameData.currentChallenge = challenge;
    gameData.roundStartTime = Date.now();

    let embed, buttons;

    if (challenge.type === 'emoji') {
        embed = GameUtils.createGameEmbed(
            '⚡ MAINTENANT !',
            `${challenge.instruction}\n\n**Cible :** ${challenge.target}`,
            '#2ECC71'
        );

        buttons = challenge.options.map(emoji => 
            new ButtonBuilder()
                .setCustomId(`reaction_answer_${gameData.id}_${emoji}`)
                .setLabel(emoji)
                .setStyle(ButtonStyle.Secondary)
        );

    } else if (challenge.type === 'color') {
        embed = GameUtils.createGameEmbed(
            '⚡ MAINTENANT !',
            challenge.instruction,
            '#2ECC71'
        );

        buttons = challenge.options.map(option => 
            new ButtonBuilder()
                .setCustomId(`reaction_answer_${gameData.id}_${option.value}`)
                .setLabel(option.label)
                .setStyle(option.style)
        );

    } else if (challenge.type === 'word') {
        embed = GameUtils.createGameEmbed(
            '⚡ MAINTENANT !',
            challenge.instruction,
            '#2ECC71'
        );

        buttons = challenge.options.map(word => 
            new ButtonBuilder()
                .setCustomId(`reaction_answer_${gameData.id}_${word}`)
                .setLabel(word)
                .setStyle(ButtonStyle.Secondary)
        );

    } else if (challenge.type === 'number') {
        // Générer des nombres aléatoirement
        const numbers = [];
        for (let i = 0; i < 4; i++) {
            numbers.push(GameUtils.generateRandomNumber(1, 100));
        }
        const maxNumber = Math.max(...numbers);
        
        challenge.options = numbers;
        challenge.target = maxNumber.toString();

        embed = GameUtils.createGameEmbed(
            '⚡ MAINTENANT !',
            challenge.instruction,
            '#2ECC71'
        );

        buttons = numbers.map(num => 
            new ButtonBuilder()
                .setCustomId(`reaction_answer_${gameData.id}_${num}`)
                .setLabel(num.toString())
                .setStyle(ButtonStyle.Secondary)
        );

    } else if (challenge.type === 'kinky') {
        embed = GameUtils.createGameEmbed(
            '⚡ MAINTENANT !',
            challenge.instruction,
            '#2ECC71'
        );

        buttons = challenge.options.map(emoji => 
            new ButtonBuilder()
                .setCustomId(`reaction_answer_${gameData.id}_${emoji}`)
                .setLabel(emoji)
                .setStyle(ButtonStyle.Secondary)
        );
    }

    // Créer les rows de boutons
    const rows = [];
    for (let i = 0; i < buttons.length; i += 4) {
        const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 4));
        rows.push(row);
    }

    await interaction.editReply({ embeds: [embed], components: rows });

    // Collecteur pour les réponses
    const collector = interaction.message.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 10000 // 10 secondes max
    });

    collector.on('collect', async i => {
        // Créer une clé unique pour cette interaction
        const lockKey = `${i.user.id}_${i.customId}`;
        
        // Vérifier si l'interaction n'a pas déjà été répondue
        if (i.replied || i.deferred) {
            console.log(`[REACTION_RACE] Interaction déjà traitée (replied/deferred): ${i.customId}, LockKey: ${lockKey}`);
            return;
        }

        // Vérifier le verrouillage pour éviter les doubles clics
        if (interactionLocks.has(lockKey)) {
            console.log(`[REACTION_RACE] Double clic détecté pour: ${i.customId}, LockKey: ${lockKey}`);
            return;
        }

        // Verrouiller temporairement cette interaction
        interactionLocks.set(lockKey, Date.now());
        
        // Nettoyer le verrou après 3 secondes
        setTimeout(() => {
            interactionLocks.delete(lockKey);
        }, 3000);

        await i.deferUpdate();
        const reactionTime = Date.now() - gameData.roundStartTime;
        const answer = i.customId.split('_').pop();
        
        await handleAnswer(i, gameData, answer, reactionTime);
        collector.stop();
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time' && activeGames.has(gameData.id)) {
            handleTimeout(interaction, gameData);
        }
    });
}

async function handleAnswer(interaction, gameData, answer, reactionTime) {
    const challenge = gameData.currentChallenge;
    let isCorrect = false;

    // Vérifier la réponse selon le type de défi
    if (challenge.type === 'number') {
        const maxNumber = Math.max(...challenge.options);
        isCorrect = parseInt(answer) === maxNumber;
    } else {
        isCorrect = answer === challenge.target;
    }

    // Enregistrer le score
    const roundScore = {
        round: gameData.currentRound,
        correct: isCorrect,
        time: reactionTime,
        challenge: challenge.type
    };

    gameData.scores.push(roundScore);

    if (isCorrect) {
        gameData.totalTime += reactionTime;
        
        // Mettre à jour les records
        if (!gameData.bestTime || reactionTime < gameData.bestTime) {
            gameData.bestTime = reactionTime;
        }
        if (!gameData.worstTime || reactionTime > gameData.worstTime) {
            gameData.worstTime = reactionTime;
        }
    }

    // Afficher le résultat du round
    await showRoundResult(interaction, gameData, isCorrect, reactionTime);
}

async function showRoundResult(interaction, gameData, isCorrect, reactionTime) {
    const resultEmoji = isCorrect ? '✅' : '❌';
    const resultText = isCorrect ? 'Correct !' : 'Incorrect !';
    
    const kinkyMessages = {
        correct: [
            `Excellent ! Tu as des réflexes de félin ! 😈`,
            `Parfait ! Tu es rapide comme l'éclair ! ⚡`,
            `Bravo ! Tes réflexes me font vibrer ! 🔥`,
            `Magnifique ! Tu es vraiment doué(e) ! 💋`,
            `Fantastique ! Continue comme ça ! 💕`
        ],
        incorrect: [
            `Raté ! Mais ne baisse pas les bras ! 😏`,
            `Dommage ! Concentre-toi mieux ! 💭`,
            `Pas cette fois ! Tu feras mieux au prochain ! 😊`,
            `Oups ! Tes réflexes ont besoin d'entraînement ! 😅`,
            `Pas grave ! L'important c'est de participer ! 🤗`
        ]
    };

    const messages = isCorrect ? kinkyMessages.correct : kinkyMessages.incorrect;
    const randomMessage = GameUtils.getRandomElement(messages);

    const timeText = isCorrect ? `⏱️ **Temps de réaction :** ${reactionTime}ms` : '';
    const correctAnswers = gameData.scores.filter(s => s.correct).length;

    const embed = GameUtils.createGameEmbed(
        `${resultEmoji} ${resultText}`,
        `${randomMessage}\n\n${timeText}\n\n` +
        `📊 **Score actuel :** ${correctAnswers}/${gameData.currentRound}\n` +
        `🎯 **Round :** ${gameData.currentRound}/${gameData.rounds}`,
        isCorrect ? '#2ECC71' : '#E74C3C'
    );

    if (gameData.currentRound < gameData.rounds) {
        const nextButton = new ButtonBuilder()
            .setCustomId(`reaction_next_${gameData.id}`)
            .setLabel('Round suivant')
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(nextButton);

        // Edit the original message components
        await interaction.message.edit({ embeds: [embed], components: [row] });

        // Collecteur pour le round suivant
        const collector = interaction.message.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id && i.customId === `reaction_next_${gameData.id}`,
            time: 15000
        });

        collector.on('collect', async i => {
            // Créer une clé unique pour cette interaction
            const lockKey = `${i.user.id}_${i.customId}`;
            
            // Vérifier si l'interaction n'a pas déjà été répondue
            if (i.replied || i.deferred) {
                console.log(`[REACTION_RACE] Interaction déjà traitée (replied/deferred): ${i.customId}, LockKey: ${lockKey}`);
                return;
            }

            // Vérifier le verrouillage pour éviter les doubles clics
            if (interactionLocks.has(lockKey)) {
                console.log(`[REACTION_RACE] Double clic détecté pour: ${i.customId}, LockKey: ${lockKey}`);
                return;
            }

            // Verrouiller temporairement cette interaction
            interactionLocks.set(lockKey, Date.now());
            
            // Nettoyer le verrou après 3 secondes
            setTimeout(() => {
                interactionLocks.delete(lockKey);
            }, 3000);

            await i.deferUpdate();
            await startNextRound(i, gameData);
            collector.stop();
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                startNextRound(interaction, gameData);
            }
        });
    } else {
        // Dernier round, aller aux résultats finaux directement
        await showFinalResults(interaction, gameData);
    }
}

async function showFinalResults(interaction, gameData) {
    const correctAnswers = gameData.scores.filter(s => s.correct).length;
    const percentage = Math.round((correctAnswers / gameData.rounds) * 100);
    const averageTime = correctAnswers > 0 ? Math.round(gameData.totalTime / correctAnswers) : 0;
    const playTime = GameUtils.formatTime(Date.now() - gameData.startTime);

    let baseWinnings = getDifficultyBonusReactionRace(gameData.difficulty, percentage, averageTime);
    let finalWinnings = 0;

    if (percentage >= 75) { // Condition de victoire
        finalWinnings = baseWinnings;
        if (gameData.bet > 0) {
            finalWinnings += gameData.bet * 2; // Ajoute le double de la mise si le joueur a misé
        }
    } else { // Condition de défaite
        if (gameData.bet > 0) {
            // La mise a déjà été retirée au début du jeu, donc rien à faire ici pour la perte
        }
    }

    if (finalWinnings > 0) {
        await addCurrency(interaction.user.id, finalWinnings);
    }

    // Messages selon le score
    let resultMessage, resultColor, resultEmoji;
    if (percentage >= 90) {
        resultMessage = "🏆 **RÉFLEXES DE MAÎTRE !** Tu es incroyablement rapide ! 😈⚡";
        resultColor = '#FFD700';
        resultEmoji = '🏆';
    } else if (percentage >= 75) {
        resultMessage = "🔥 **EXCELLENT !** Tes réflexes sont impressionnants ! 💋⚡";
        resultColor = '#2ECC71';
        resultEmoji = '🔥';
    } else if (percentage >= 50) {
        resultMessage = "😊 **PAS MAL !** Tu as de bons réflexes ! Continue à t'entraîner ! 💪";
        resultColor = '#FFA500';
        resultEmoji = '😊';
    } else {
        resultMessage = "💪 **COURAGE !** Tes réflexes ont besoin d'entraînement ! 😌⚡";
        resultColor = '#E74C3C';
        resultEmoji = '💪';
    }

    // Ajouter la monnaie gagnée/perdue au message de résultat
    if (gameData.bet > 0) {
        if (percentage >= 75) {
            resultMessage += `\n\n💰 Vous avez gagné **${finalWinnings}** KinkyCoins (incluant votre mise doublée) !`;
        } else {
            resultMessage += `\n\n Vous avez perdu votre mise de **${gameData.bet}** KinkyCoins.`;
        }
    } else if (finalWinnings > 0) {
        resultMessage += `\n\n💰 Vous avez gagné **${finalWinnings}** KinkyCoins !`;
    }

    const embed = GameUtils.createGameEmbed(
        `${resultEmoji} Résultats de la Course`,
        `${resultMessage}\n\n` +
        `🏆 **Score final :** ${correctAnswers}/${gameData.rounds} (${percentage}%)\n` +
        `⏱️ **Temps moyen :** ${averageTime}ms\n` +
        `🚀 **Meilleur temps :** ${gameData.bestTime || 'N/A'}ms\n` +
        `🐌 **Temps le plus lent :** ${gameData.worstTime || 'N/A'}ms\n` +
        `⏰ **Durée totale :** ${playTime}\n` +
        `⚡ **Difficulté :** ${gameData.difficulty}`,
        resultColor
    );

    // Ajouter le détail des rounds
    let detailText = '';
    gameData.scores.forEach((score, index) => {
        const emoji = score.correct ? '✅' : '❌';
        const timeText = score.correct ? ` (${score.time}ms)` : '';
        detailText += `${emoji} **Round ${index + 1}:** ${score.challenge}${timeText}\n`;
    });

    embed.addFields({ name: '📋 Détail des rounds', value: detailText, inline: false });

    const replayButton = new ButtonBuilder()
        .setCustomId(`reaction_replay_${gameData.id}`)
        .setLabel('Rejouer')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(replayButton);

    await interaction.editReply({ embeds: [embed], components: [row] });
    activeGames.delete(gameData.id);
}

async function handleTimeout(interaction, gameData) {
    const roundScore = {
        round: gameData.currentRound,
        correct: false,
        time: 10000, // Timeout
        challenge: gameData.currentChallenge.type
    };

    gameData.scores.push(roundScore);

    await showRoundResult(interaction, gameData, false, 10000);
}

function getDifficultyBonusReactionRace(difficulty, percentage, averageTime) {
    let basePoints = 0;

    // Bonus basé sur la difficulté
    switch (difficulty) {
        case 'easy':
            basePoints += 10;
            break;
        case 'normal':
            basePoints += 20;
            break;
        case 'hard':
            basePoints += 30;
            break;
        case 'extreme':
            basePoints += 40;
            break;
    }

    // Bonus basé sur le pourcentage de bonnes réponses
    if (percentage >= 90) {
        basePoints *= 1.5;
    } else if (percentage >= 75) {
        basePoints *= 1.2;
    }

    // Bonus/malus basé sur le temps de réaction moyen (plus rapide = plus de points)
    // Ces valeurs sont arbitraires et peuvent être ajustées
    if (averageTime > 0) {
        if (averageTime <= 500) { // Très rapide
            basePoints *= 2;
        } else if (averageTime <= 1000) { // Rapide
            basePoints *= 1.5;
        } else if (averageTime >= 2000) { // Lent
            basePoints *= 0.5;
        }
    }

    return Math.round(basePoints);
}
