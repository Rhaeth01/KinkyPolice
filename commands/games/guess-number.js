const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const GameUtils = require('../../utils/gameUtils');
const { safeUpdateInteraction, safeSendMessage } = require('../../utils/interactionUtils');
const { addCurrency, removeCurrency, getUserBalance } = require('../../utils/currencyManager');

// Map pour stocker les parties en cours
const activeGames = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('devine-nombre')
        .setDescription('Devine le nombre que je pense ! Jeu coquin avec indices 😈')
        .addIntegerOption(option =>
            option.setName('min')
                .setDescription('Nombre minimum (défaut: 1)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(1000))
        .addIntegerOption(option =>
            option.setName('max')
                .setDescription('Nombre maximum (défaut: 100)')
                .setRequired(false)
                .setMinValue(2)
                .setMaxValue(1000))
        .addIntegerOption(option =>
            option.setName('tentatives')
                .setDescription('Nombre de tentatives (défaut: 7)')
                .setRequired(false)
                .setMinValue(3)
                .setMaxValue(15))
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

        const betAmount = interaction.options.getInteger('mise') || 0;
        const userBalance = await getUserBalance(interaction.user.id);

        if (betAmount > 0) {
            if (userBalance < betAmount) {
                return interaction.reply({
                    content: `Tu n'as pas assez de Kinky Points pour miser ${betAmount} ! Ton solde actuel est de ${userBalance} Kinky Points.`,
                    ephemeral: true
                });
            }
            await removeCurrency(interaction.user.id, betAmount);
        }

        const min = interaction.options.getInteger('min') || 1;
        const max = interaction.options.getInteger('max') || 100;
        const maxAttempts = interaction.options.getInteger('tentatives') || 7;

        // Validation des paramètres
        if (min >= max) {
            return interaction.reply({
                content: 'Le nombre minimum doit être inférieur au maximum, coquin·e ! 😏',
                ephemeral: true
            });
        }

        const gameId = GameUtils.generateGameId(interaction.user.id, 'guess');
        const targetNumber = GameUtils.generateRandomNumber(min, max);

        // Créer la partie
        const gameData = {
            id: gameId,
            player: interaction.user,
            targetNumber: targetNumber,
            min: min,
            max: max,
            attempts: 0,
            maxAttempts: maxAttempts,
            guesses: [],
            startTime: Date.now(),
            bet: betAmount
        };

        activeGames.set(gameId, gameData);

        // Créer l'embed initial
        const embed = GameUtils.createGameEmbed(
            '🎯 Devine le Nombre Coquin',
            `Je pense à un nombre entre **${min}** et **${max}**...\nSauras-tu deviner mon petit secret ? 😈\n\n` +
            `🎲 **Tentatives restantes :** ${maxAttempts}\n` +
            `💭 **Plage :** ${min} - ${max}\n\n` +
            `Utilise les boutons ci-dessous pour faire ta proposition !`
        );

        // Créer les boutons de jeu
        const guessButton = new ButtonBuilder()
            .setCustomId(`guess_input_${gameId}`)
            .setLabel('Faire une proposition')
            .setEmoji('🎯')
            .setStyle(ButtonStyle.Primary);

        const abandonButton = new ButtonBuilder()
            .setCustomId(`guess_abandon_${gameId}`)
            .setLabel('Abandonner')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(guessButton, abandonButton);

        const reply = await interaction.reply({ embeds: [embed], components: [row] });

        // Collecteur pour les boutons
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 300000 // 5 minutes
        });

        // Map pour éviter les doubles clics (verrouillage temporaire)
        const interactionLocks = new Map();

        collector.on('collect', async i => {
            // Créer une clé unique pour cette interaction
            const lockKey = `${i.user.id}_${i.customId}`;
            
            // Vérifier si l'interaction n'a pas déjà été répondue
            if (i.replied || i.deferred) {
                console.log(`[GUESS_NUMBER] Interaction déjà traitée (replied/deferred): ${i.customId}, LockKey: ${lockKey}`);
                return;
            }

            // Vérifier le verrouillage pour éviter les doubles clics
            if (interactionLocks.has(lockKey)) {
                console.log(`[GUESS_NUMBER] Double clic détecté pour: ${i.customId}, LockKey: ${lockKey}`);
                return;
            }

            // Verrouiller temporairement cette interaction
            interactionLocks.set(lockKey, Date.now());
            
            // Nettoyer le verrou après 3 secondes
            setTimeout(() => {
                interactionLocks.delete(lockKey);
            }, 10000); // Sécurité: timeout augmenté

            if (i.customId === `guess_input_${gameId}`) {
                // Ne pas différer pour les modals
                await handleGuessInput(i, gameData);
            } else if (i.customId === `guess_abandon_${gameId}`) {
                await i.deferUpdate();
                await handleAbandon(i, gameData);
                collector.stop();
            }
        });

        collector.on('end', () => {
            activeGames.delete(gameId);
        });
    }
};

async function handleGuessInput(interaction, gameData) {
    // Créer un modal pour la saisie
    const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

    const modal = new ModalBuilder()
        .setCustomId(`guess_modal_${gameData.id}`)
        .setTitle('Devine le Nombre');

    const guessInput = new TextInputBuilder()
        .setCustomId('guess_value')
        .setLabel(`Ton nombre (entre ${gameData.min} et ${gameData.max})`)
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(4)
        .setPlaceholder('Tape ton nombre...')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(guessInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);

    // Attendre la soumission du modal
    try {
        const modalSubmission = await interaction.awaitModalSubmit({
            filter: i => i.customId === `guess_modal_${gameData.id}` && i.user.id === interaction.user.id,
            time: 60000
        });

        const guessValue = parseInt(modalSubmission.fields.getTextInputValue('guess_value'));

        if (isNaN(guessValue) || guessValue < gameData.min || guessValue > gameData.max) {
            return modalSubmission.reply({
                content: `Voyons petit·e coquin·e, il faut un nombre entre ${gameData.min} et ${gameData.max} ! 😏`,
                ephemeral: true
            });
        }

        await processGuess(modalSubmission, gameData, guessValue);

    } catch (error) {
        console.error('Erreur lors de la saisie:', error);
    }
}

async function processGuess(interaction, gameData, guess) {
    // Vérifier si l'interaction n'a pas déjà été répondue
    if (interaction.replied || interaction.deferred) {
        console.log(`[GUESS_NUMBER] Interaction modal déjà traitée pour ${gameData.id}, Guess: ${guess}`);
        return;
    }

    gameData.attempts++;
    gameData.guesses.push(guess);

    const isCorrect = guess === gameData.targetNumber;
    const attemptsLeft = gameData.maxAttempts - gameData.attempts;

    if (isCorrect) {
        // Victoire !
        const result = GameUtils.formatGameResult(true, gameData.attempts, gameData.targetNumber, 'devine-nombre');
        const embed = GameUtils.createGameEmbed(result.title, result.description, result.color);
        
        const playTime = GameUtils.formatTime(Date.now() - gameData.startTime);
        let winnings = getDifficultyBonusGuessNumber(gameData.min, gameData.max, gameData.maxAttempts, gameData.attempts);

        if (gameData.bet > 0) {
            winnings += gameData.bet * 2; // Double la mise en cas de victoire
            embed.setDescription(embed.data.description + `\n\n**Gains :** ${winnings} Kinky Points ! 💰`);
            await addCurrency(interaction.user.id, winnings);
        } else {
            // Si pas de mise, pas de gain de points
            embed.setDescription(embed.data.description + `\n\n**Pas de mise, pas de gain de Kinky Points.**`);
        }

        embed.addFields(
            { name: '🎯 Nombre secret', value: `${gameData.targetNumber}`, inline: true },
            { name: '⏱️ Temps de jeu', value: playTime, inline: true },
            { name: '📊 Historique', value: gameData.guesses.join(' → '), inline: false }
        );

        const replayButton = new ButtonBuilder()
            .setCustomId(`guess_replay_${gameData.id}`)
            .setLabel('Rejouer')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(replayButton);

        await interaction.update({ embeds: [embed], components: [row] });
        activeGames.delete(gameData.id);

    } else if (attemptsLeft <= 0) {
        // Défaite
        const result = GameUtils.formatGameResult(false, gameData.attempts, gameData.targetNumber, 'devine-nombre');
        const embed = GameUtils.createGameEmbed(result.title, result.description, result.color);
        
        embed.addFields(
            { name: '📊 Tes propositions', value: gameData.guesses.join(' → '), inline: false }
        );

        if (gameData.bet > 0) {
            embed.setDescription(embed.data.description + `\n\n**Perte :** ${gameData.bet} Kinky Points. 💸`);
        }

        const replayButton = new ButtonBuilder()
            .setCustomId(`guess_replay_${gameData.id}`)
            .setLabel('Rejouer')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(replayButton);

        await interaction.update({ embeds: [embed], components: [row] });
        activeGames.delete(gameData.id);

    } else {
        // Continuer le jeu avec un indice
        const hint = getHint(guess, gameData.targetNumber);
        const kinkyHints = [
            `${hint} Continue, tu me chatouillez ! 😈`,
            `${hint} Tu brûles... ou pas ! 🔥`,
            `${hint} Allez, encore un effort vilain·e ! 💋`,
            `${hint} Tu y es presque, je le sens ! 😏`,
            `${hint} Mmm, pas encore mais j'aime ta détermination ! 💕`
        ];

        const randomHint = GameUtils.getRandomElement(kinkyHints);
        
        const embed = GameUtils.createGameEmbed(
            '🎯 Devine le Nombre Coquin',
            `**Ta proposition :** ${guess}\n${randomHint}\n\n` +
            `🎲 **Tentatives restantes :** ${attemptsLeft}\n` +
            `💭 **Plage :** ${gameData.min} - ${gameData.max}\n` +
            `📊 **Tes essais :** ${gameData.guesses.join(' → ')}\n\n` +
            `Continue à chercher mon petit secret ! 😈`
        );

        const guessButton = new ButtonBuilder()
            .setCustomId(`guess_input_${gameData.id}`)
            .setLabel('Nouvelle proposition')
            .setEmoji('🎯')
            .setStyle(ButtonStyle.Primary);

        const abandonButton = new ButtonBuilder()
            .setCustomId(`guess_abandon_${gameData.id}`)
            .setLabel('Abandonner')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(guessButton, abandonButton);

        await interaction.update({ embeds: [embed], components: [row] });
    }
}

async function handleAbandon(interaction, gameData) {
    const embed = GameUtils.createGameEmbed(
        '💔 Abandon',
        `Dommage petit·e fripon·ne ! Tu abandonnes déjà ? 😔\n\n` +
        `💡 **Mon nombre secret était :** ${gameData.targetNumber}\n` +
        `📊 **Tes tentatives :** ${gameData.guesses.join(' → ') || 'Aucune'}\n\n` +
        `Ne sois pas triste, tu peux toujours rejouer ! 💕`,
        '#FFA500'
    );

    const replayButton = new ButtonBuilder()
        .setCustomId(`guess_replay_${gameData.id}`)
        .setLabel('Rejouer')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(replayButton);

    await interaction.update({ embeds: [embed], components: [row] });
    activeGames.delete(gameData.id);
}

function getHint(guess, target) {
    const difference = Math.abs(guess - target);
    
    if (difference <= 2) {
        return "🔥 **Très chaud !**";
    } else if (difference <= 5) {
        return "🌡️ **Chaud !**";
    } else if (difference <= 10) {
        return "😊 **Tiède...**";
    } else if (difference <= 20) {
        return "❄️ **Froid...**";
    } else {
        return "🧊 **Très froid !**";
    }
}

function getDifficultyBonusGuessNumber(min, max, maxAttempts, attemptsTaken) {
    const range = max - min;
    let basePoints = 0;

    if (range <= 20) {
        basePoints = 20;
    } else if (range <= 50) {
        basePoints = 30;
    } else if (range <= 100) {
        basePoints = 40;
    } else if (range <= 200) {
        basePoints = 50;
    } else {
        basePoints = 75;
    }

    // Bonus basé sur le nombre de tentatives restantes
    const attemptsFactor = (maxAttempts - attemptsTaken + 1) / maxAttempts;
    return Math.round(basePoints * (1 + attemptsFactor));
}
