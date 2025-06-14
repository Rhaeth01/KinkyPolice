const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GameUtils = require('../../utils/gameUtils');
const { safeUpdateInteraction, safeSendMessage } = require('../../utils/interactionUtils');
const { addCurrency, removeCurrency, getUserBalance } = require('../../utils/currencyManager');

// Map pour stocker les parties en cours
const activeGames = new Map();

// Map pour éviter les doubles clics (verrouillage temporaire)
const interactionLocks = new Map();

// Séquences d'emojis kinky pour le jeu de mémoire
const kinkyEmojis = ['🔥', '💋', '😈', '💕', '🎭', '🔗', '💫', '🌹', '🍷', '🎪', '🦋', '⭐'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('memory-kinky')
        .setDescription('Jeu de mémoire coquin ! Mémorise la séquence 🧠😈')
        .addIntegerOption(option =>
            option.setName('longueur')
                .setDescription('Longueur de la séquence (défaut: 4)')
                .setRequired(false)
                .setMinValue(3)
                .setMaxValue(8))
        .addStringOption(option =>
            option.setName('vitesse')
                .setDescription('Vitesse d\'affichage')
                .setRequired(false)
                .addChoices(
                    { name: 'Lente (2s par emoji)', value: 'slow' },
                    { name: 'Normale (1.5s par emoji)', value: 'normal' },
                    { name: 'Rapide (1s par emoji)', value: 'fast' },
                    { name: 'Très rapide (0.7s par emoji)', value: 'very_fast' }
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

        const sequenceLength = interaction.options.getInteger('longueur') || 4;
        const speed = interaction.options.getString('vitesse') || 'normal';

        const gameId = GameUtils.generateGameId(interaction.user.id, 'memory');

        // Générer une séquence aléatoire
        const sequence = [];
        for (let i = 0; i < sequenceLength; i++) {
            sequence.push(GameUtils.getRandomElement(kinkyEmojis));
        }

        // Créer la partie
        const gameData = {
            id: gameId,
            player: interaction.user,
            sequence: sequence,
            userSequence: [],
            currentStep: 0,
            speed: speed,
            startTime: Date.now(),
            showingSequence: true,
            attempts: 0,
            maxAttempts: 3,
            bet: betAmount
        };

        activeGames.set(gameId, gameData);

        // Afficher l'introduction
        await showIntroduction(interaction, gameData);
    }
};

async function showIntroduction(interaction, gameData) {
    const speedTexts = {
        slow: 'Lente (2s)',
        normal: 'Normale (1.5s)',
        fast: 'Rapide (1s)',
        very_fast: 'Très rapide (0.7s)'
    };

    const embed = GameUtils.createGameEmbed(
        '🧠 Memory Kinky',
        `Prépare-toi à mémoriser une séquence coquine ! 😈\n\n` +
        `🎯 **Longueur de séquence :** ${gameData.sequence.length} emojis\n` +
        `⚡ **Vitesse :** ${speedTexts[gameData.speed]}\n` +
        `🎲 **Tentatives :** ${gameData.maxAttempts}\n\n` +
        `**Comment jouer :**\n` +
        `1. Je vais te montrer une séquence d'emojis\n` +
        `2. Mémorise bien l'ordre !\n` +
        `3. Reproduis la séquence en cliquant sur les boutons\n\n` +
        `Es-tu prêt(e) à tester ta mémoire coquine ? 💋`
    );

    const startButton = new ButtonBuilder()
        .setCustomId(`memory_start_${gameData.id}`)
        .setLabel('Commencer !')
        .setEmoji('🚀')
        .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
        .setCustomId(`memory_cancel_${gameData.id}`)
        .setLabel('Annuler')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(startButton, cancelButton);

    const reply = await interaction.reply({ embeds: [embed], components: [row] });

    // Collecteur pour le démarrage avec filtre robuste
    const collector = reply.createMessageComponentCollector({
        filter: i => {
            // Vérifier si c'est une interaction de memory game
            if (!i.customId.startsWith('memory_')) return false;
            // Vérifier si c'est le bon utilisateur
            if (i.user.id !== interaction.user.id) return false;
            // Vérifier si c'est le bon jeu
            if (!i.customId.includes(gameData.id)) return false;
            return true;
        },
        time: 60000
    });

    collector.on('collect', async i => {
        try {
            console.log(`[MEMORY_KINKY] Interaction start collectée: ${i.customId} par ${i.user.tag}`);

            // Créer une clé unique pour cette interaction
            const lockKey = `${i.user.id}_${i.customId}`;

            // Vérifier si l'interaction n'a pas déjà été répondue
            if (i.replied || i.deferred) {
                console.log(`[MEMORY_KINKY] Interaction déjà traitée (replied/deferred): ${i.customId}, LockKey: ${lockKey}`);
                return;
            }

        // Vérifier le verrouillage pour éviter les doubles clics
        if (interactionLocks.has(lockKey)) {
            console.log(`[MEMORY_KINKY] Double clic détecté pour: ${i.customId}, LockKey: ${lockKey}`);
            return;
        }

        // Verrouiller temporairement cette interaction
        interactionLocks.set(lockKey, Date.now());
        
        // Nettoyer le verrou après 3 secondes
        setTimeout(() => {
            interactionLocks.delete(lockKey);
        }, 10000); // Sécurité: timeout augmenté

            if (i.customId === `memory_start_${gameData.id}`) {
                collector.stop(); // Arrêter le collecteur immédiatement
                await startSequenceDisplay(i, gameData);
            } else if (i.customId === `memory_cancel_${gameData.id}`) {
                collector.stop(); // Arrêter le collecteur immédiatement
                await i.update({ content: '❌ Jeu annulé !', embeds: [], components: [] });
                activeGames.delete(gameData.id);
            }
        } catch (error) {
            console.error(`[MEMORY_KINKY] Erreur lors du traitement de l'interaction start ${i.customId}:`, error);
            if (!i.replied && !i.deferred) {
                await i.reply({
                    content: '❌ Une erreur est survenue lors du démarrage.',
                    ephemeral: true
                }).catch(console.error);
            }
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time' && activeGames.has(gameData.id)) {
            activeGames.delete(gameData.id);
        }
    });
}

async function startSequenceDisplay(interaction, gameData) {
    const speeds = {
        slow: 2000,
        normal: 1500,
        fast: 1000,
        very_fast: 700
    };

    const displayTime = speeds[gameData.speed];

    // Afficher "Attention !"
    const attentionEmbed = GameUtils.createGameEmbed(
        '⚠️ Attention !',
        `La séquence va commencer dans 3 secondes...\n\n` +
        `Concentre-toi bien ! 😈`,
        '#FFA500'
    );

    // Utiliser editReply si l'interaction est déjà différée, sinon update
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [attentionEmbed], components: [] });
    } else {
        await interaction.update({ embeds: [attentionEmbed], components: [] });
    }

    // Attendre 3 secondes
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Afficher chaque emoji de la séquence
    for (let i = 0; i < gameData.sequence.length; i++) {
        const currentEmoji = gameData.sequence[i];
        const position = i + 1;

        const embed = GameUtils.createGameEmbed(
            '🧠 Mémorise bien !',
            `**Position ${position}/${gameData.sequence.length}**\n\n` +
            `# ${currentEmoji}\n\n` +
            `Retiens bien cet emoji ! 😈`,
            '#9B59B6'
        );

        await interaction.editReply({ embeds: [embed], components: [] });
        await new Promise(resolve => setTimeout(resolve, displayTime));
    }

    // Transition vers la phase de reproduction
    const transitionEmbed = GameUtils.createGameEmbed(
        '🎯 À ton tour !',
        `Parfait ! Maintenant reproduis la séquence ! 💋\n\n` +
        `**Séquence à reproduire :** ${gameData.sequence.length} emojis\n` +
        `**Tentatives restantes :** ${gameData.maxAttempts}\n\n` +
        `Clique sur les emojis dans le bon ordre ! 😈`,
        '#2ECC71'
    );

    // Utiliser editReply si l'interaction est déjà différée, sinon update
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [transitionEmbed], components: [] });
    } else {
        await interaction.update({ embeds: [transitionEmbed], components: [] });
    }
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Démarrer la phase de reproduction
    gameData.showingSequence = false;
    await showReproductionPhase(interaction, gameData);
}

async function showReproductionPhase(interaction, gameData) {
    const embed = GameUtils.createGameEmbed(
        '🎯 Reproduis la séquence',
        `**Séquence à reproduire :** ${gameData.sequence.length} emojis\n` +
        `**Position actuelle :** ${gameData.userSequence.length + 1}/${gameData.sequence.length}\n` +
        `**Tentatives restantes :** ${gameData.maxAttempts - gameData.attempts}\n\n` +
        `**Ta séquence :** ${gameData.userSequence.join(' ') || '(vide)'}\n\n` +
        `Clique sur le bon emoji ! 😈`
    );

    // Créer les boutons avec tous les emojis possibles (mélangés)
    const shuffledEmojis = GameUtils.shuffleArray([...kinkyEmojis]);
    const buttons = [];

    for (let i = 0; i < Math.min(12, shuffledEmojis.length); i++) {
        const emoji = shuffledEmojis[i];
        const button = new ButtonBuilder()
            .setCustomId(`memory_emoji_${gameData.id}_${emoji}`)
            .setLabel(emoji)
            .setStyle(ButtonStyle.Secondary);
        
        buttons.push(button);
    }

    // Diviser en rows (max 4 boutons par row pour une meilleure lisibilité)
    const rows = [];
    for (let i = 0; i < buttons.length; i += 4) {
        const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 4));
        rows.push(row);
    }

    // Ajouter bouton de reset et abandon
    const resetButton = new ButtonBuilder()
        .setCustomId(`memory_reset_${gameData.id}`)
        .setLabel('Recommencer cette tentative')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary);

    const abandonButton = new ButtonBuilder()
        .setCustomId(`memory_abandon_${gameData.id}`)
        .setLabel('Abandonner')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger);

    const controlRow = new ActionRowBuilder().addComponents(resetButton, abandonButton);
    rows.push(controlRow);

    // Utiliser editReply si l'interaction est déjà différée, sinon update
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed], components: rows });
    } else {
        await interaction.update({ embeds: [embed], components: rows });
    }

    // Collecteur pour les réponses
    const collector = interaction.message.createMessageComponentCollector({
        filter: i => {
            // Vérifier si c'est une interaction de memory game
            if (!i.customId.startsWith('memory_')) return false;
            // Vérifier si c'est le bon utilisateur
            if (i.user.id !== interaction.user.id) return false;
            // Vérifier si c'est le bon jeu
            if (!i.customId.includes(gameData.id)) return false;
            return true;
        },
        time: 120000 // 2 minutes
    });

    collector.on('collect', async i => {
        try {
            console.log(`[MEMORY_KINKY] Interaction collectée: ${i.customId} par ${i.user.tag}`);
            // Créer une clé unique pour cette interaction
            const lockKey = `${i.user.id}_${i.customId}`;

            // Vérifier si l'interaction n'a pas déjà été répondue
            if (i.replied || i.deferred) {
                console.log(`[MEMORY_KINKY] Interaction déjà traitée (replied/deferred): ${i.customId}, LockKey: ${lockKey}`);
                return;
            }

        // Vérifier le verrouillage pour éviter les doubles clics
        if (interactionLocks.has(lockKey)) {
            console.log(`[MEMORY_KINKY] Double clic détecté pour: ${i.customId}, LockKey: ${lockKey}`);
            return;
        }

        // Verrouiller temporairement cette interaction
        interactionLocks.set(lockKey, Date.now());
        
        // Nettoyer le verrou après 3 secondes
        setTimeout(() => {
            interactionLocks.delete(lockKey);
        }, 10000); // Sécurité: timeout augmenté

        if (i.customId.startsWith(`memory_emoji_${gameData.id}`)) {
            const selectedEmoji = i.customId.split('_').pop();
            await handleEmojiSelection(i, gameData, selectedEmoji);
        } else if (i.customId === `memory_reset_${gameData.id}`) {
            await i.deferUpdate();
            await handleReset(i, gameData);
        } else if (i.customId === `memory_abandon_${gameData.id}`) {
            await i.deferUpdate();
            await handleAbandon(i, gameData);
            collector.stop();
        }
        } catch (error) {
            console.error(`[MEMORY_KINKY] Erreur lors du traitement de l'interaction ${i.customId}:`, error);
            if (!i.replied && !i.deferred) {
                await i.reply({
                    content: '❌ Une erreur est survenue lors du traitement de votre action.',
                    ephemeral: true
                }).catch(console.error);
            }
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time' && activeGames.has(gameData.id)) {
            handleTimeout(interaction, gameData);
        }
    });
}

async function handleEmojiSelection(interaction, gameData, selectedEmoji) {
    const expectedEmoji = gameData.sequence[gameData.userSequence.length];
    gameData.userSequence.push(selectedEmoji);

    if (selectedEmoji === expectedEmoji) {
        // Bonne réponse
        if (gameData.userSequence.length === gameData.sequence.length) {
            // Séquence complète et correcte !
            await showVictory(interaction, gameData);
        } else {
            // Continuer avec le prochain emoji
            await showReproductionPhase(interaction, gameData);
        }
    } else {
        // Mauvaise réponse
        gameData.attempts++;
        if (gameData.attempts >= gameData.maxAttempts) {
            await showDefeat(interaction, gameData);
        } else {
            await showMistake(interaction, gameData, selectedEmoji, expectedEmoji);
        }
    }
}

async function showMistake(interaction, gameData, selectedEmoji, expectedEmoji) {
    const kinkyMistakes = [
        "Oups ! Pas le bon emoji petit·e coquin·e ! 😅",
        "Presque ! Mais ce n'était pas celui-là ! 😏",
        "Raté ! Ta mémoire te joue des tours ! 💭",
        "Dommage ! Concentre-toi mieux ! 😈",
        "Pas cette fois ! Allez, encore un effort ! 💪"
    ];

    const mistakeMessage = GameUtils.getRandomElement(kinkyMistakes);

    const embed = GameUtils.createGameEmbed(
        '❌ Erreur !',
        `${mistakeMessage}\n\n` +
        `**Tu as choisi :** ${selectedEmoji}\n` +
        `**Il fallait :** ${expectedEmoji}\n\n` +
        `**Tentatives restantes :** ${gameData.maxAttempts - gameData.attempts}\n\n` +
        `Recommence cette tentative ! 💋`,
        '#E74C3C'
    );

    // Reset pour cette tentative
    gameData.userSequence = [];

    const retryButton = new ButtonBuilder()
        .setCustomId(`memory_retry_${gameData.id}`)
        .setLabel('Réessayer')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary);

    const abandonButton = new ButtonBuilder()
        .setCustomId(`memory_abandon_${gameData.id}`)
        .setLabel('Abandonner')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(retryButton, abandonButton);

    // Utiliser editReply si l'interaction est déjà différée, sinon update
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
        await interaction.update({ embeds: [embed], components: [row] });
    }

    // Collecteur pour retry
    const collector = interaction.message.createMessageComponentCollector({
        filter: i => {
            // Vérifier si c'est une interaction de memory game
            if (!i.customId.startsWith('memory_')) return false;
            // Vérifier si c'est le bon utilisateur
            if (i.user.id !== interaction.user.id) return false;
            // Vérifier si c'est le bon jeu
            if (!i.customId.includes(gameData.id)) return false;
            return true;
        },
        time: 30000
    });

    collector.on('collect', async i => {
        try {
            console.log(`[MEMORY_KINKY] Interaction retry collectée: ${i.customId} par ${i.user.tag}`);

            // Créer une clé unique pour cette interaction
            const lockKey = `${i.user.id}_${i.customId}`;

            // Vérifier si l'interaction n'a pas déjà été répondue
            if (i.replied || i.deferred) {
                console.log(`[MEMORY_KINKY] Interaction déjà traitée (replied/deferred): ${i.customId}, LockKey: ${lockKey}`);
                return;
            }

            // Vérifier le verrouillage pour éviter les doubles clics
            if (interactionLocks.has(lockKey)) {
                console.log(`[MEMORY_KINKY] Double clic détecté pour: ${i.customId}, LockKey: ${lockKey}`);
                return;
            }

            // Verrouiller temporairement cette interaction
            interactionLocks.set(lockKey, Date.now());

            // Nettoyer le verrou après 10 secondes
            setTimeout(() => {
                interactionLocks.delete(lockKey);
            }, 10000);

            if (i.customId === `memory_retry_${gameData.id}`) {
                await showReproductionPhase(i, gameData);
            } else if (i.customId === `memory_abandon_${gameData.id}`) {
                await i.deferUpdate();
                await handleAbandon(i, gameData);
            }
            collector.stop();
        } catch (error) {
            console.error(`[MEMORY_KINKY] Erreur lors du traitement de l'interaction retry ${i.customId}:`, error);
            if (!i.replied && !i.deferred) {
                await i.reply({
                    content: '❌ Une erreur est survenue lors du traitement de votre action.',
                    ephemeral: true
                }).catch(console.error);
            }
        }
    });
}

async function handleReset(interaction, gameData) {
    gameData.userSequence = [];
    await showReproductionPhase(interaction, gameData);
}

async function showVictory(interaction, gameData) {
    const playTime = GameUtils.formatTime(Date.now() - gameData.startTime);
    const result = GameUtils.formatGameResult(true, gameData.attempts + 1, gameData.sequence.join(' '), 'memory');
    
    const embed = GameUtils.createGameEmbed(result.title, result.description, result.color);
    
    let winnings = getDifficultyBonusMemory(gameData.sequence.length, gameData.speed, gameData.attempts);

    if (gameData.bet > 0) {
        winnings += gameData.bet * 2; // Double la mise en cas de victoire
        embed.setDescription(embed.data.description + `\n\n**Gains :** ${winnings} Kinky Points ! 💰`);
        await addCurrency(interaction.user.id, winnings);
    } else {
        // Si pas de mise, pas de gain de points
        embed.setDescription(embed.data.description + `\n\n**Pas de mise, pas de gain de Kinky Points.**`);
    }

    embed.addFields(
        { name: '🎯 Séquence', value: gameData.sequence.join(' '), inline: true },
        { name: '⏱️ Temps', value: playTime, inline: true },
        { name: '🎲 Tentatives', value: `${gameData.attempts + 1}/${gameData.maxAttempts}`, inline: true },
        { name: '⚡ Vitesse', value: gameData.speed, inline: true }
    );

    const replayButton = new ButtonBuilder()
        .setCustomId(`memory_replay_${gameData.id}`)
        .setLabel('Rejouer')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(replayButton);

    // Utiliser editReply si l'interaction est déjà différée, sinon update
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
        await interaction.update({ embeds: [embed], components: [row] });
    }
    activeGames.delete(gameData.id);
}

async function showDefeat(interaction, gameData) {
    const result = GameUtils.formatGameResult(false, gameData.maxAttempts, gameData.sequence.join(' '), 'memory');
    
    const embed = GameUtils.createGameEmbed(result.title, result.description, result.color);
    
    embed.addFields(
        { name: '🎯 La séquence était', value: gameData.sequence.join(' '), inline: false },
        { name: '📊 Ta dernière tentative', value: gameData.userSequence.join(' ') || '(vide)', inline: false }
    );

    if (gameData.bet > 0) {
        embed.setDescription(embed.data.description + `\n\n**Perte :** ${gameData.bet} Kinky Points. 💸`);
    }

    const replayButton = new ButtonBuilder()
        .setCustomId(`memory_replay_${gameData.id}`)
        .setLabel('Rejouer')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(replayButton);

    // Utiliser editReply si l'interaction est déjà différée, sinon update
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
        await interaction.update({ embeds: [embed], components: [row] });
    }
    activeGames.delete(gameData.id);
}

async function handleAbandon(interaction, gameData) {
    const embed = GameUtils.createGameEmbed(
        '💔 Abandon',
        `Tu abandonnes déjà ? Dommage vilain·e ! 😔\n\n` +
        `🎯 **La séquence était :** ${gameData.sequence.join(' ')}\n` +
        `📊 **Ta progression :** ${gameData.userSequence.join(' ') || '(aucune)'}\n` +
        `🎲 **Tentatives utilisées :** ${gameData.attempts}/${gameData.maxAttempts}\n\n` +
        `Ne sois pas triste, tu peux toujours rejouer ! 💕`,
        '#FFA500'
    );

    const replayButton = new ButtonBuilder()
        .setCustomId(`memory_replay_${gameData.id}`)
        .setLabel('Rejouer')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(replayButton);

    // Utiliser editReply si l'interaction est déjà différée, sinon update
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
        await interaction.update({ embeds: [embed], components: [row] });
    }
    activeGames.delete(gameData.id);
}

async function handleTimeout(interaction, gameData) {
    const embed = GameUtils.createGameEmbed(
        '⏰ Temps écoulé',
        `Le temps est écoulé ! Tu as pris trop de temps petit·e fripon·ne ! 😅\n\n` +
        `🎯 **La séquence était :** ${gameData.sequence.join(' ')}\n` +
        `📊 **Ta progression :** ${gameData.userSequence.join(' ') || '(aucune)'}\n\n` +
        `Essaie d'être plus rapide la prochaine fois ! 💨`,
        '#FFA500'
    );

    const replayButton = new ButtonBuilder()
        .setCustomId(`memory_replay_${gameData.id}`)
        .setLabel('Rejouer')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(replayButton);

    await interaction.editReply({ embeds: [embed], components: [row] });
    activeGames.delete(gameData.id);
}

function getDifficultyBonusMemory(sequenceLength, speed, attemptsUsed) {
    let basePoints = 0;
    // Bonus basé sur la longueur de la séquence
    if (sequenceLength <= 4) {
        basePoints += 10;
    } else if (sequenceLength <= 6) {
        basePoints += 20;
    } else {
        basePoints += 30;
    }

    // Bonus basé sur la vitesse
    switch (speed) {
        case 'slow':
            basePoints += 5;
            break;
        case 'normal':
            basePoints += 10;
            break;
        case 'fast':
            basePoints += 15;
            break;
        case 'very_fast':
            basePoints += 20;
            break;
    }

    // Malus basé sur les tentatives utilisées (moins de tentatives = plus de points)
    const maxAttempts = 3; // Hardcoded in the game logic
    const attemptsFactor = (maxAttempts - attemptsUsed) / maxAttempts;
    return Math.round(basePoints * (1 + attemptsFactor));
}
