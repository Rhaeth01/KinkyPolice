const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const GameUtils = require('../../utils/gameUtils');
const { addCurrency, removeCurrency, getUserBalance } = require('../../utils/currencyManager');
const fs = require('node:fs');
const path = require('node:path');

// Map pour stocker les parties en cours
const activeGames = new Map();

// Map pour éviter les doubles clics (verrouillage temporaire)
const interactionLocks = new Map();

// Charger les mots mystères
const mysteryWordsPath = path.join(__dirname, '..', '..', 'data', 'games', 'mystery-words.json');
let mysteryData;

try {
    mysteryData = JSON.parse(fs.readFileSync(mysteryWordsPath, 'utf8'));
} catch (error) {
    console.error('Erreur lors du chargement des mots mystères:', error);
    mysteryData = { categories: {} };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mot-mystere-kinky')
        .setDescription('Devine le mot mystère avec des indices coquins ! 🔍😈')
        .addStringOption(option =>
            option.setName('categorie')
                .setDescription('Catégorie de mots')
                .setRequired(false)
                .addChoices(
                    { name: 'Objets', value: 'objets' },
                    { name: 'Pratiques', value: 'pratiques' },
                    { name: 'Sentiments', value: 'sentiments' },
                    { name: 'Rôles', value: 'roles' },
                    { name: 'Aléatoire', value: 'random' }
                ))
        .addStringOption(option =>
            option.setName('difficulte')
                .setDescription('Le niveau de difficulté du mot mystère.')
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

        let category = interaction.options.getString('categorie') || 'random';
        const difficulty = interaction.options.getString('difficulte') || 'normal';
        let maxAttempts;
        let baseRewardMultiplier;

        switch (difficulty) {
            case 'facile':
                maxAttempts = 7;
                baseRewardMultiplier = 0.8;
                break;
            case 'normal':
                maxAttempts = 5;
                baseRewardMultiplier = 1;
                break;
            case 'difficile':
                maxAttempts = 4;
                baseRewardMultiplier = 1.5;
                break;
            case 'expert':
                maxAttempts = 3;
                baseRewardMultiplier = 2;
                break;
            default:
                maxAttempts = 5;
                baseRewardMultiplier = 1;
        }
        
        // Si aléatoire, choisir une catégorie au hasard
        if (category === 'random') {
            const categories = Object.keys(mysteryData.categories);
            if (categories.length === 0) {
                return interaction.reply({
                    content: 'Aucune catégorie disponible ! 😅',
                    ephemeral: true
                });
            }
            category = GameUtils.getRandomElement(categories);
        }

        // Sélectionner un mot aléatoire
        const wordsForCategory = mysteryData.categories[category] || [];
        if (wordsForCategory.length === 0) {
            return interaction.reply({
                content: 'Aucun mot disponible pour cette catégorie ! 😅',
                ephemeral: true
            });
        }

        // Filtrer les mots par longueur pour la difficulté
        let filteredWords = wordsForCategory;
        if (difficulty === 'facile') {
            filteredWords = wordsForCategory.filter(w => w.word.length <= 5);
        } else if (difficulty === 'normal') {
            filteredWords = wordsForCategory.filter(w => w.word.length > 5 && w.word.length <= 8);
        } else if (difficulty === 'difficile') {
            filteredWords = wordsForCategory.filter(w => w.word.length > 8 && w.word.length <= 12);
        } else if (difficulty === 'expert') {
            filteredWords = wordsForCategory.filter(w => w.word.length > 12);
        }

        if (filteredWords.length === 0) {
            // Fallback si aucune correspondance de longueur pour la difficulté
            filteredWords = wordsForCategory;
        }

        const selectedWord = GameUtils.getRandomElement(filteredWords);
        const gameId = GameUtils.generateGameId(interaction.user.id, 'mystery');

        // Créer la partie
        const gameData = {
            id: gameId,
            player: interaction.user,
            word: selectedWord.word,
            hints: selectedWord.hints,
            category: category,
            currentHintIndex: 0,
            attempts: 0,
            maxAttempts: maxAttempts,
            startTime: Date.now(),
            guesses: [],
            bet: betAmount,
            difficulty: difficulty,
            baseRewardMultiplier: baseRewardMultiplier
        };

        activeGames.set(gameId, gameData);

        // Créer l'embed initial
        const categoryEmojis = {
            objets: '🔗',
            pratiques: '💫',
            sentiments: '💕',
            roles: '🎭'
        };

        const embed = GameUtils.createGameEmbed(
            '🔍 Mot Mystère Kinky',
            `${categoryEmojis[category] || '🎯'} **Catégorie :** ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n` +
            `💡 **Premier indice :** ${gameData.hints[0]}\n\n` +
            `Devine le mot mystère avec ces indices coquins ! 😈\n\n` +
            `🎲 **Tentatives restantes :** ${gameData.maxAttempts}\n` +
            `🔍 **Indices disponibles :** ${gameData.hints.length}\n` +
            `📝 **Indice actuel :** 1/${gameData.hints.length}\n\n` +
            `Utilise les boutons pour jouer !`
        );

        // Créer les boutons
        const guessButton = new ButtonBuilder()
            .setCustomId(`mystery_guess_${gameId}`)
            .setLabel('Proposer une solution')
            .setEmoji('🎯')
            .setStyle(ButtonStyle.Primary);

        const nextHintButton = new ButtonBuilder()
            .setCustomId(`mystery_hint_${gameId}`)
            .setLabel('Indice suivant')
            .setEmoji('💡')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(gameData.currentHintIndex >= gameData.hints.length - 1);

        const abandonButton = new ButtonBuilder()
            .setCustomId(`mystery_abandon_${gameId}`)
            .setLabel('Abandonner')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(guessButton, nextHintButton, abandonButton);

        const reply = await interaction.reply({ embeds: [embed], components: [row] });

        // Collecteur pour les boutons
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 300000 // 5 minutes
        });

        collector.on('collect', async i => {
            // Créer une clé unique pour cette interaction
            const lockKey = `${i.user.id}_${i.customId}`;
            
            // Vérifier si l'interaction n'a pas déjà été répondue
            if (i.replied || i.deferred) {
                return;
            }

            // Vérifier le verrouillage pour éviter les doubles clics
            if (interactionLocks.has(lockKey)) {
                return;
            }

            // Verrouiller temporairement cette interaction
            interactionLocks.set(lockKey, Date.now());
            
            // Nettoyer le verrou après 3 secondes
            setTimeout(() => {
                interactionLocks.delete(lockKey);
            }, 3000);

            if (i.customId === `mystery_guess_${gameId}`) {
                await handleGuess(i, gameData);
            } else if (i.customId === `mystery_hint_${gameId}`) {
                await i.deferUpdate();
                await handleNextHint(i, gameData);
            } else if (i.customId === `mystery_abandon_${gameId}`) {
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

async function handleGuess(interaction, gameData) {
    const modal = new ModalBuilder()
        .setCustomId(`mystery_modal_${gameData.id}`)
        .setTitle('Mot Mystère Kinky');

    const guessInput = new TextInputBuilder()
        .setCustomId('mystery_solution')
        .setLabel('Ta solution')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(25)
        .setPlaceholder('Tape ta réponse...')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(guessInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);

    try {
        const modalSubmission = await interaction.awaitModalSubmit({
            filter: i => i.customId === `mystery_modal_${gameData.id}` && i.user.id === interaction.user.id,
            time: 60000
        });

        const guess = modalSubmission.fields.getTextInputValue('mystery_solution').trim();
        await processGuess(modalSubmission, gameData, guess);

    } catch (error) {
        console.error('Erreur lors de la saisie mot mystère:', error);
    }
}

async function processGuess(interaction, gameData, guess) {
    // Vérifier si l'interaction n'a pas déjà été répondue
    if (interaction.replied || interaction.deferred) {
        return;
    }

    // Defer the modal submission interaction if not already deferred
    // This is crucial as showModal defers the *original* interaction, not the modal submission itself.
    if (!interaction.deferred) {
        await interaction.deferUpdate();
    }

    gameData.attempts++;
    gameData.guesses.push(guess);
    const attemptsLeft = gameData.maxAttempts - gameData.attempts;

    // Normaliser les chaînes pour la comparaison
    const normalizedGuess = GameUtils.normalizeString(guess);
    const normalizedAnswer = GameUtils.normalizeString(gameData.word);

    const isCorrect = normalizedGuess === normalizedAnswer;

    if (isCorrect) {
        // Victoire !
        const result = GameUtils.formatGameResult(true, gameData.attempts, gameData.word, 'mot-mystere');
        const embed = GameUtils.createGameEmbed(result.title, result.description, result.color);
        
        const playTime = GameUtils.formatTime(Date.now() - gameData.startTime);
        const hintsUsed = gameData.currentHintIndex + 1;
        const categoryBonus = getCategoryBonus(gameData.category);
        
        let winnings = Math.round(categoryBonus * gameData.baseRewardMultiplier);

        // Bonus/malus basé sur le nombre d'indices utilisés
        const hintPenaltyFactor = (hintsUsed / gameData.hints.length); // Plus d'indices = moins de points
        winnings = Math.round(winnings * (1 - (hintPenaltyFactor * 0.2))); // Pénalité de 20% max

        // Bonus basé sur les tentatives restantes
        const attemptsBonusFactor = (gameData.maxAttempts - gameData.attempts) / gameData.maxAttempts;
        winnings = Math.round(winnings * (1 + (attemptsBonusFactor * 0.3))); // Bonus de 30% max

        if (gameData.bet > 0) {
            winnings += gameData.bet * 2; // Double la mise en cas de victoire
            embed.setDescription(embed.data.description + `\n\n**Gains :** ${winnings} Kinky Points ! 💰`);
            await addCurrency(interaction.user.id, winnings);
        } else {
            // Si pas de mise, pas de gain de points
            embed.setDescription(embed.data.description + `\n\n**Pas de mise, pas de gain de Kinky Points.**`);
        }
        
        embed.addFields(
            { name: '🎯 Solution', value: `**${gameData.word}**`, inline: true },
            { name: '⏱️ Temps', value: playTime, inline: true },
            { name: '🏆 Catégorie', value: `${gameData.category} (+${categoryBonus} pts)`, inline: true },
            { name: '💡 Indices utilisés', value: `${hintsUsed}/${gameData.hints.length}`, inline: true },
            { name: '📊 Tentatives', value: gameData.guesses.join(' → '), inline: false }
        );

        const replayButton = new ButtonBuilder()
            .setCustomId(`mystery_replay_${gameData.id}`)
            .setLabel('Rejouer')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(replayButton);
 
        await interaction.editReply({ embeds: [embed], components: [row] }); // Use editReply on the deferred modalSubmission
        activeGames.delete(gameData.id);

    } else if (attemptsLeft <= 0) {
        // Défaite
        const result = GameUtils.formatGameResult(false, gameData.attempts, gameData.word, 'mot-mystere');
        const embed = GameUtils.createGameEmbed(result.title, result.description, result.color);
        
        embed.addFields(
            { name: '📊 Tes propositions', value: gameData.guesses.join(' → '), inline: false },
            { name: '💡 Tous les indices', value: gameData.hints.map((hint, i) => `${i + 1}. ${hint}`).join('\n'), inline: false }
        );

        if (gameData.bet > 0) {
            embed.setDescription(embed.data.description + `\n\n**Perte :** ${gameData.bet} Kinky Points. 💸`);
        }

        const replayButton = new ButtonBuilder()
            .setCustomId(`mystery_replay_${gameData.id}`)
            .setLabel('Rejouer')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(replayButton);
 
        await interaction.editReply({ embeds: [embed], components: [row] }); // Use editReply on the deferred modalSubmission
        activeGames.delete(gameData.id);

    } else {
        // Continuer le jeu
        const kinkyEncouragements = [
            "Pas encore, mais tu me fais vibrer d'anticipation ! 😈",
            "Mmm, pas tout à fait... Continue à chercher ! 💋",
            "Presque ! Tu me donnes des frissons ! 🔥",
            "Pas cette fois, mais j'adore ta détermination ! 😏",
            "Ooh, tu chauffes... ou pas ! Continue coquin·e ! 💕"
        ];

        const encouragement = GameUtils.getRandomElement(kinkyEncouragements);
        
        // Afficher les indices révélés jusqu'à présent
        const revealedHints = gameData.hints.slice(0, gameData.currentHintIndex + 1)
            .map((hint, i) => `${i + 1}. ${hint}`)
            .join('\n');

        const categoryEmojis = {
            objets: '🔗',
            pratiques: '💫',
            sentiments: '💕',
            roles: '🎭'
        };

        const embed = GameUtils.createGameEmbed(
            '🔍 Mot Mystère Kinky',
            `**Ta proposition :** ${guess}\n${encouragement}\n\n` +
            `${categoryEmojis[gameData.category] || '🎯'} **Catégorie :** ${gameData.category}\n\n` +
            `💡 **Indices révélés :**\n${revealedHints}\n\n` +
            `🎲 **Tentatives restantes :** ${attemptsLeft}\n` +
            `📝 **Indice actuel :** ${gameData.currentHintIndex + 1}/${gameData.hints.length}\n\n` +
            `Continue à chercher mon petit secret ! 😈`
        );

        const guessButton = new ButtonBuilder()
            .setCustomId(`mystery_guess_${gameData.id}`)
            .setLabel('Nouvelle proposition')
            .setEmoji('🎯')
            .setStyle(ButtonStyle.Primary);

        const nextHintButton = new ButtonBuilder()
            .setCustomId(`mystery_hint_${gameData.id}`)
            .setLabel('Indice suivant')
            .setEmoji('💡')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(gameData.currentHintIndex >= gameData.hints.length - 1);

        const abandonButton = new ButtonBuilder()
            .setCustomId(`mystery_abandon_${gameData.id}`)
            .setLabel('Abandonner')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(guessButton, nextHintButton, abandonButton);

        await interaction.editReply({ embeds: [embed], components: [row] }); // Use editReply on the deferred modalSubmission
    }
}

async function handleNextHint(interaction, gameData) {
    if (gameData.currentHintIndex >= gameData.hints.length - 1) {
        return interaction.reply({
            content: 'Tu as déjà tous les indices, petit·e coquin·e ! 😏',
            flags: MessageFlags.Ephemeral // Utiliser flags à la place de ephemeral
        });
    }

    gameData.currentHintIndex++;
    const newHint = gameData.hints[gameData.currentHintIndex];

    // Afficher tous les indices révélés
    const revealedHints = gameData.hints.slice(0, gameData.currentHintIndex + 1)
        .map((hint, i) => `${i + 1}. ${hint}`)
        .join('\n');

    const categoryEmojis = {
        objets: '🔗',
        pratiques: '💫',
        sentiments: '💕',
        roles: '🎭'
    };

    const embed = GameUtils.createGameEmbed(
        '💡 Nouvel Indice Coquin',
        `Voici un nouvel indice pour t'aider, vilain·e ! 😈\n\n` +
        `${categoryEmojis[gameData.category] || '🎯'} **Catégorie :** ${gameData.category}\n\n` +
        `💡 **Tous les indices révélés :**\n${revealedHints}\n\n` +
        `🎲 **Tentatives restantes :** ${gameData.maxAttempts - gameData.attempts}\n` +
        `📝 **Indice actuel :** ${gameData.currentHintIndex + 1}/${gameData.hints.length}\n\n` +
        `Maintenant tu devrais pouvoir trouver ! 💋`,
        '#FFA500'
    );

    const guessButton = new ButtonBuilder()
        .setCustomId(`mystery_guess_${gameData.id}`)
        .setLabel('Proposer une solution')
        .setEmoji('🎯')
        .setStyle(ButtonStyle.Primary);

    const nextHintButton = new ButtonBuilder()
        .setCustomId(`mystery_hint_${gameData.id}`)
        .setLabel('Indice suivant')
        .setEmoji('💡')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(gameData.currentHintIndex >= gameData.hints.length - 1);

    const abandonButton = new ButtonBuilder()
        .setCustomId(`mystery_abandon_${gameData.id}`)
        .setLabel('Abandonner')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(guessButton, nextHintButton, abandonButton);

    await interaction.editReply({ embeds: [embed], components: [row] }); // Use editReply on the deferred interaction
}

async function handleAbandon(interaction, gameData) {
    const allHints = gameData.hints.map((hint, i) => `${i + 1}. ${hint}`).join('\n');

    const embed = GameUtils.createGameEmbed(
        '💔 Abandon',
        `Tu abandonnes déjà ? Dommage petit·e fripon·ne ! 😔\n\n` +
        `💡 **La solution était :** ${gameData.word}\n` +
        `📂 **Catégorie :** ${gameData.category}\n\n` +
        `🔍 **Tous les indices :**\n${allHints}\n\n` +
        `📊 **Tes tentatives :** ${gameData.guesses.join(' → ') || 'Aucune'}\n\n` +
        `Ne sois pas triste, tu peux toujours rejouer ! 💕`,
        '#FFA500'
    );

    const replayButton = new ButtonBuilder()
        .setCustomId(`mystery_replay_${gameData.id}`)
        .setLabel('Rejouer')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(replayButton);

    await interaction.editReply({ embeds: [embed], components: [row] }); // Use editReply on the deferred interaction
    activeGames.delete(gameData.id);
}

function getCategoryBonus(category) {
    const bonus = {
        objets: 15,
        pratiques: 20,
        sentiments: 25,
        roles: 30
    };
    return bonus[category] || 20;
}
