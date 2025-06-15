const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const GameUtils = require('../../utils/gameUtils');
const { safeUpdateInteraction, safeSendMessage } = require('../../utils/interactionUtils');
const { addCurrency, removeCurrency, getUserBalance } = require('../../utils/currencyManager');
const fs = require('node:fs');
const path = require('node:path');

// Map pour stocker les parties en cours
const activeGames = new Map();

// Map pour éviter les doubles clics (verrouillage temporaire)
const interactionLocks = new Map();

// Charger les anagrammes
const anagramsPath = path.join(__dirname, '..', '..', 'data', 'games', 'anagrams.json');
let anagramsData;

try {
    anagramsData = JSON.parse(fs.readFileSync(anagramsPath, 'utf8'));
} catch (error) {
    console.error('Erreur lors du chargement des anagrammes:', error);
    anagramsData = { facile: [], moyen: [], difficile: [] };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anagramme-kinky')
        .setDescription('Résous des anagrammes coquines ! Démêle les lettres 😈')
        .addStringOption(option =>
            option.setName('difficulte')
                .setDescription('Niveau de difficulté')
                .setRequired(false)
                .addChoices(
                    { name: 'Facile (4-7 lettres)', value: 'facile' },
                    { name: 'Moyen (8-10 lettres)', value: 'moyen' },
                    { name: 'Difficile (10+ lettres)', value: 'difficile' },
                    { name: 'Aléatoire', value: 'random' }
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

        let difficulty = interaction.options.getString('difficulte') || 'random';
        
        // Si aléatoire, choisir une difficulté au hasard
        if (difficulty === 'random') {
            const difficulties = ['facile', 'moyen', 'difficile'];
            difficulty = GameUtils.getRandomElement(difficulties);
        }

        // Sélectionner un mot aléatoire
        const wordsForDifficulty = anagramsData[difficulty] || anagramsData.facile;
        if (wordsForDifficulty.length === 0) {
            return interaction.reply({
                content: 'Aucun mot disponible pour cette difficulté ! 😅',
                ephemeral: true
            });
        }

        const selectedWord = GameUtils.getRandomElement(wordsForDifficulty);
        const gameId = GameUtils.generateGameId(interaction.user.id, 'anagram');

        // Créer la partie
        const gameData = {
            id: gameId,
            player: interaction.user,
            word: selectedWord.word,
            hint: selectedWord.hint,
            difficulty: difficulty,
            scrambledWord: GameUtils.scrambleWord(selectedWord.word),
            attempts: 0,
            maxAttempts: getMaxAttempts(difficulty),
            startTime: Date.now(),
            hintsUsed: 0,
            maxHints: 1,
            bet: betAmount
        };

        activeGames.set(gameId, gameData);

        // Créer l'embed initial
        const difficultyEmojis = {
            facile: '🟢',
            moyen: '🟡',
            difficile: '🔴'
        };

        const embed = GameUtils.createGameEmbed(
            '🔤 Anagramme Kinky',
            `${difficultyEmojis[difficulty]} **Difficulté :** ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}\n\n` +
            `🎯 **Lettres mélangées :** \`${gameData.scrambledWord.split('').join(' ')}\`\n\n` +
            `Démêle ces lettres pour former un mot coquin ! 😈\n\n` +
            `🎲 **Tentatives restantes :** ${gameData.maxAttempts}\n` +
            `💡 **Indices disponibles :** ${gameData.maxHints}\n\n` +
            `Utilise les boutons pour jouer !`
        );

        // Créer les boutons
        const guessButton = new ButtonBuilder()
            .setCustomId(`anagram_guess_${gameId}`)
            .setLabel('Proposer une solution')
            .setEmoji('🎯')
            .setStyle(ButtonStyle.Primary);

        const hintButton = new ButtonBuilder()
            .setCustomId(`anagram_hint_${gameId}`)
            .setLabel('Indice')
            .setEmoji('💡')
            .setStyle(ButtonStyle.Secondary);

        const abandonButton = new ButtonBuilder()
            .setCustomId(`anagram_abandon_${gameId}`)
            .setLabel('Abandonner')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(guessButton, hintButton, abandonButton);

        const reply = await interaction.reply({ embeds: [embed], components: [row] });

        // Collecteur pour les boutons
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 300000 // 5 minutes
        });

        collector.on('collect', async i => {
            try {
                // Créer une clé unique pour cette interaction
                const lockKey = `${i.user.id}_${i.customId}`;
                
                // Vérifier si l'interaction n'a pas déjà été répondue
                if (i.replied || i.deferred) {
                    console.log(`[ANAGRAM] Interaction déjà traitée (replied/deferred): ${i.customId}, LockKey: ${lockKey}`);
                    return;
                }

                // Vérifier le verrouillage pour éviter les doubles clics
                if (interactionLocks.has(lockKey)) {
                    console.log(`[ANAGRAM] Double clic détecté pour: ${i.customId}, LockKey: ${lockKey}`);
                    // Répondre avec un message d'erreur au lieu de simplement return
                    if (!i.replied && !i.deferred) {
                        await i.reply({ content: '⚠️ Action déjà en cours de traitement...', ephemeral: true });
                    }
                    return;
                }

                // Verrouiller temporairement cette interaction
                interactionLocks.set(lockKey, Date.now());
                
                // Nettoyer le verrou après 10 secondes (augmenté pour plus de sécurité)
                setTimeout(() => {
                    interactionLocks.delete(lockKey);
                }, 10000);

                if (i.customId === `anagram_guess_${gameId}`) {
                    // Ne pas différer pour les modals
                    await handleGuess(i, gameData);
                } else if (i.customId === `anagram_hint_${gameId}`) {
                    // Différer immédiatement et utiliser safeUpdateInteraction
                    await i.deferUpdate();
                    await handleHint(i, gameData, true); // true = interaction différée
                } else if (i.customId === `anagram_abandon_${gameId}`) {
                    // Différer immédiatement et utiliser safeUpdateInteraction
                    await i.deferUpdate();
                    await handleAbandon(i, gameData, true); // true = interaction différée
                    collector.stop();
                }
            } catch (error) {
                console.error(`[ANAGRAM] Erreur dans collector:`, error);
                // Essayer de répondre si possible
                if (!i.replied && !i.deferred) {
                    try {
                        await i.reply({
                            content: 'Une erreur est survenue. Veuillez relancer le jeu.',
                            ephemeral: true
                        });
                    } catch (replyError) {
                        console.error(`[ANAGRAM] Impossible de répondre:`, replyError);
                    }
                }
            }
        });

        collector.on('end', (collected, reason) => {
            console.log(`[ANAGRAM] Collector terminé pour ${gameId}, raison: ${reason}`);
            activeGames.delete(gameId);
            
            // Si le collector se termine par timeout, mettre à jour le message
            if (reason === 'time' && activeGames.has(gameId)) {
                const timeoutEmbed = GameUtils.createGameEmbed(
                    '⏰ Temps écoulé',
                    `Le temps est écoulé ! La partie d'anagramme s'est terminée.\n\n` +
                    `💡 **La solution était :** ${gameData.word}\n` +
                    `🔍 **Indice :** ${gameData.hint}\n\n` +
                    `Tu peux relancer une nouvelle partie quand tu veux ! 💕`,
                    '#FFA500'
                );

                const replayButton = new ButtonBuilder()
                    .setCustomId(`anagram_replay_${gameId}`)
                    .setLabel('Rejouer')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Success);

                const row = new ActionRowBuilder().addComponents(replayButton);

                // Essayer de mettre à jour le message sans causer d'erreur
                reply.edit({ embeds: [timeoutEmbed], components: [row] }).catch(error => {
                    console.error(`[ANAGRAM] Impossible de mettre à jour le message timeout:`, error);
                });
            }
        });
    }
};

async function handleGuess(interaction, gameData) {
    const modal = new ModalBuilder()
        .setCustomId(`anagram_modal_${gameData.id}`)
        .setTitle('Anagramme Kinky');

    const guessInput = new TextInputBuilder()
        .setCustomId('anagram_solution')
        .setLabel('Ta solution')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(20)
        .setPlaceholder('Tape ta réponse...')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(guessInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);

    try {
        const modalSubmission = await interaction.awaitModalSubmit({
            filter: i => i.customId === `anagram_modal_${gameData.id}` && i.user.id === interaction.user.id,
            time: 60000
        });

        const guess = modalSubmission.fields.getTextInputValue('anagram_solution').trim();
        await processGuess(modalSubmission, gameData, guess);

    } catch (error) {
        console.error('Erreur lors de la saisie anagramme:', error);
    }
}

async function processGuess(interaction, gameData, guess) {
    try {
        // Vérifier si l'interaction n'a pas déjà été répondue
        if (interaction.replied || interaction.deferred) {
            console.log(`[ANAGRAM] Interaction modal déjà traitée (replied/deferred) pour ${gameData.id}, Guess: ${guess}`);
            return;
        }

        gameData.attempts++;
        const attemptsLeft = gameData.maxAttempts - gameData.attempts;

        // Normaliser les chaînes pour la comparaison
        const normalizedGuess = GameUtils.normalizeString(guess);
        const normalizedAnswer = GameUtils.normalizeString(gameData.word);

        const isCorrect = normalizedGuess === normalizedAnswer;

        if (isCorrect) {
            // Victoire !
            const result = GameUtils.formatGameResult(true, gameData.attempts, gameData.word, 'anagramme');
            const embed = GameUtils.createGameEmbed(result.title, result.description, result.color);
            
            const playTime = GameUtils.formatTime(Date.now() - gameData.startTime);
            const difficultyBonus = getDifficultyBonus(gameData.difficulty);
            let winnings = difficultyBonus;

            if (gameData.bet > 0) {
                winnings += gameData.bet * 2; // Double la mise en cas de victoire
                embed.setDescription(embed.data.description + `\n\n**Gains :** ${winnings} Kinky Points ! 💰`);
                await addCurrency(interaction.user.id, winnings);
            } else {
                // Récompense de base même sans mise
                embed.setDescription(embed.data.description + `\n\n**Gains :** ${winnings} Kinky Points ! 💰`);
                await addCurrency(interaction.user.id, winnings);
            }
            
            embed.addFields(
                { name: '🎯 Solution', value: `**${gameData.word}**`, inline: true },
                { name: '⏱️ Temps', value: playTime, inline: true },
                { name: '🏆 Difficulté', value: `${gameData.difficulty} (+${difficultyBonus} pts)`, inline: true },
                { name: '💡 Indice', value: gameData.hint, inline: false }
            );

            const replayButton = new ButtonBuilder()
                .setCustomId(`anagram_replay_${gameData.id}`)
                .setLabel('Rejouer')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(replayButton);

            await safeSendMessage(interaction, { embeds: [embed], components: [row] });
            activeGames.delete(gameData.id);

        } else if (attemptsLeft <= 0) {
            // Défaite
            const result = GameUtils.formatGameResult(false, gameData.attempts, gameData.word, 'anagramme');
            const embed = GameUtils.createGameEmbed(result.title, result.description, result.color);
            
            embed.addFields(
                { name: '💡 Indice', value: gameData.hint, inline: false }
            );

            if (gameData.bet > 0) {
                embed.setDescription(embed.data.description + `\n\n**Perte :** ${gameData.bet} Kinky Points. 💸`);
            }

            const replayButton = new ButtonBuilder()
                .setCustomId(`anagram_replay_${gameData.id}`)
                .setLabel('Rejouer')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(replayButton);

            await safeSendMessage(interaction, { embeds: [embed], components: [row] });
            activeGames.delete(gameData.id);

        } else {
            // Continuer le jeu
            const kinkyEncouragements = [
                "Pas encore, mais j'aime ta façon de penser ! 😈",
                "Mmm, pas tout à fait... Continue à chercher ! 💋",
                "Presque ! Tu me fais frissonner d'anticipation ! 🔥",
                "Pas cette fois, mais ne t'arrête pas ! 😏",
                "Ooh, tu chauffes... ou pas ! Continue ! 💕"
            ];

            const encouragement = GameUtils.getRandomElement(kinkyEncouragements);
            
            const embed = GameUtils.createGameEmbed(
                '🔤 Anagramme Kinky',
                `**Ta proposition :** ${guess}\n${encouragement}\n\n` +
                `🎯 **Lettres mélangées :** \`${gameData.scrambledWord.split('').join(' ')}\`\n\n` +
                `🎲 **Tentatives restantes :** ${attemptsLeft}\n` +
                `💡 **Indices disponibles :** ${gameData.maxHints - gameData.hintsUsed}\n\n` +
                `Continue à démêler ces lettres coquines ! 😈`
            );

            const guessButton = new ButtonBuilder()
                .setCustomId(`anagram_guess_${gameData.id}`)
                .setLabel('Nouvelle proposition')
                .setEmoji('🎯')
                .setStyle(ButtonStyle.Primary);

            const hintButton = new ButtonBuilder()
                .setCustomId(`anagram_hint_${gameData.id}`)
                .setLabel('Indice')
                .setEmoji('💡')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(gameData.hintsUsed >= gameData.maxHints);

            const abandonButton = new ButtonBuilder()
                .setCustomId(`anagram_abandon_${gameData.id}`)
                .setLabel('Abandonner')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(guessButton, hintButton, abandonButton);

            await safeSendMessage(interaction, { embeds: [embed], components: [row] });
        }
    } catch (error) {
        console.error(`[ANAGRAM] Erreur dans processGuess:`, error);
        // Utiliser la fonction sécurisée pour répondre en cas d'erreur
        await safeSendMessage(interaction, {
            content: 'Une erreur est survenue lors du traitement de ta réponse. Relance le jeu.',
            ephemeral: true
        });
    }
}

async function handleHint(interaction, gameData, isDeferred = false) {
    if (gameData.hintsUsed >= gameData.maxHints) {
        // Utiliser la fonction sécurisée pour répondre
        return safeSendMessage(interaction, {
            content: 'Tu as déjà utilisé tous tes indices, petit·e coquin·e ! 😏',
            ephemeral: true
        });
    }

    gameData.hintsUsed++;

    const embed = GameUtils.createGameEmbed(
        '💡 Indice Coquin',
        `Voici un petit indice pour t'aider, vilain·e ! 😈\n\n` +
        `**Indice :** ${gameData.hint}\n\n` +
        `🎯 **Lettres mélangées :** \`${gameData.scrambledWord.split('').join(' ')}\`\n\n` +
        `Maintenant tu devrais pouvoir trouver ! 💋`,
        '#FFA500'
    );

    const guessButton = new ButtonBuilder()
        .setCustomId(`anagram_guess_${gameData.id}`)
        .setLabel('Proposer une solution')
        .setEmoji('🎯')
        .setStyle(ButtonStyle.Primary);

    const abandonButton = new ButtonBuilder()
        .setCustomId(`anagram_abandon_${gameData.id}`)
        .setLabel('Abandonner')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(guessButton, abandonButton);

    // Utiliser la fonction sécurisée pour mettre à jour l'interaction
    await safeUpdateInteraction(interaction, { embeds: [embed], components: [row] }, isDeferred);
}

async function handleAbandon(interaction, gameData, isDeferred = false) {
    const embed = GameUtils.createGameEmbed(
        '💔 Abandon',
        `Tu abandonnes déjà ? Dommage petit·e fripon·ne ! 😔\n\n` +
        `💡 **La solution était :** ${gameData.word}\n` +
        `🔍 **Indice :** ${gameData.hint}\n` +
        `🎯 **Lettres mélangées :** \`${gameData.scrambledWord}\`\n\n` +
        `Ne sois pas triste, tu peux toujours rejouer ! 💕`,
        '#FFA500'
    );

    const replayButton = new ButtonBuilder()
        .setCustomId(`anagram_replay_${gameData.id}`)
        .setLabel('Rejouer')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(replayButton);

    // Utiliser la fonction sécurisée pour mettre à jour l'interaction
    await safeUpdateInteraction(interaction, { embeds: [embed], components: [row] }, isDeferred);
    
    activeGames.delete(gameData.id);
}

function getMaxAttempts(difficulty) {
    const attempts = {
        facile: 5,
        moyen: 4,
        difficile: 3
    };
    return attempts[difficulty] || 4;
}

function getDifficultyBonus(difficulty) {
    const bonus = {
        facile: 10,
        moyen: 20,
        difficile: 30
    };
    return bonus[difficulty] || 15;
}
