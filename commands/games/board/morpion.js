const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

// Map pour stocker les parties de Morpion en cours
const activeGames = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('morpion')
        .setDescription('Joue à une partie de Morpion.')
        .addUserOption(option =>
            option.setName('adversaire')
                .setDescription('Le joueur que vous voulez défier ou laisser vide pour jouer contre l\'IA.')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('taille')
                .setDescription('Taille de la grille (3 pour 3x3, 5 pour 5x5). Par défaut 3x3.')
                .setRequired(false)
                .addChoices(
                    { name: '3x3', value: 3 },
                    { name: '5x5', value: 5 }
                )),
    async execute(interaction) {
        const opponent = interaction.options.getUser('adversaire');
        const boardSize = interaction.options.getInteger('taille') || 3;
        const player1 = interaction.user;
        let player2;
        let isAI = false;

        if (opponent) {
            if (opponent.bot) {
                return interaction.reply({ content: 'Vous ne pouvez pas défier un bot.', ephemeral: true });
            }
            if (opponent.id === player1.id) {
                return interaction.reply({ content: 'Vous ne pouvez pas vous défier vous-même.', ephemeral: true });
            }
            player2 = opponent;
        } else {
            isAI = true;
            player2 = { id: 'AI', username: 'IA', tag: 'IA#0000' }; // Représentation simple de l'IA
        }

        const gameId = `${interaction.channel.id}-${player1.id}-${player2.id}`;
        if (activeGames.has(gameId)) {
            return interaction.reply({ content: 'Une partie est déjà en cours dans ce salon avec ces joueurs.', ephemeral: true });
        }

        const board = Array(boardSize).fill(null).map(() => Array(boardSize).fill(' '));
        const currentPlayer = player1; // Le joueur 1 commence
        const players = { [player1.id]: 'X', [player2.id]: 'O' };
        const game = {
            id: gameId,
            board,
            currentPlayer,
            players,
            isAI,
            boardSize,
            message: null, // Pour stocker le message du jeu et le mettre à jour
            interactionChannel: interaction.channel,
            player1User: player1,
            player2User: player2,
        };
        activeGames.set(gameId, game);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Morpion - ${player1.username} (X) vs ${player2.username} (O)`)
            .setDescription(`C'est au tour de ${currentPlayer.username} (${players[currentPlayer.id]})`);

        const components = createBoardComponents(board, boardSize);

        const reply = await interaction.reply({
            embeds: [embed],
            components: components,
            fetchReply: true,
        });
        game.message = reply;

        if (isAI && currentPlayer.id === 'AI') {
            // Si l'IA commence, faire jouer l'IA immédiatement
            console.log(`[MORPION] L'IA (${game.player2User.username}) va jouer dans 1 seconde.`);
            setTimeout(() => makeAIMove(game), 1000);
        }
    },
};

function createBoardComponents(board, boardSize) {
    const rows = [];
    for (let i = 0; i < boardSize; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < boardSize; j++) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`morpion_${i}_${j}`)
                    .setLabel(board[i][j] === ' ' ? '\u200b' : board[i][j]) // Utilise un espace invisible si vide
                    .setStyle(board[i][j] === 'X' ? ButtonStyle.Primary : (board[i][j] === 'O' ? ButtonStyle.Danger : ButtonStyle.Secondary))
                    .setDisabled(board[i][j] !== ' ')
            );
        }
        rows.push(row);
    }
    return rows;
}

function updateBoardMessage(game) {
    const { board, currentPlayer, players, boardSize, message, player1User, player2User } = game;
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Morpion - ${player1User.username} (X) vs ${player2User.username} (O)`)
        .setDescription(`C'est au tour de ${currentPlayer.username} (${players[currentPlayer.id]})`);

    const components = createBoardComponents(board, boardSize);
    message.edit({ embeds: [embed], components: components });
}

function checkWin(board, playerSymbol, boardSize) {
    // Vérification des lignes
    for (let i = 0; i < boardSize; i++) {
        if (board[i].every(cell => cell === playerSymbol)) return true;
    }

    // Vérification des colonnes
    for (let j = 0; j < boardSize; j++) {
        if (board.every(row => row[j] === playerSymbol)) return true;
    }

    // Vérification des diagonales
    let diag1 = true;
    let diag2 = true;
    for (let i = 0; i < boardSize; i++) {
        if (board[i][i] !== playerSymbol) diag1 = false;
        if (board[i][boardSize - 1 - i] !== playerSymbol) diag2 = false;
    }
    if (diag1 || diag2) return true;

    return false;
}

function checkDraw(board) {
    return board.flat().every(cell => cell !== ' ');
}

async function endGame(game, winner = null) {
    const { message, player1User, player2User, board, interactionChannel, id } = game;
    activeGames.delete(id); // Supprimer la partie des jeux actifs

    let description;
    let color;
    if (winner) {
        description = `🎉 ${winner.username} a gagné la partie !`;
        color = '#00FF00'; // Vert pour la victoire
    } else {
        description = '🤝 Match nul !';
        color = '#FFA500'; // Orange pour le match nul
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`Morpion - Partie terminée !`)
        .setDescription(description)
        .addFields(
            { name: 'Joueur X', value: player1User.username, inline: true },
            { name: 'Joueur O', value: player2User.username, inline: true }
        );

    // Désactiver tous les boutons à la fin du jeu
    const disabledComponents = createBoardComponents(board, game.boardSize).map(row => {
        row.components.forEach(button => button.setDisabled(true));
        return row;
    });

    await message.edit({ embeds: [embed], components: disabledComponents });
    interactionChannel.send(`La partie de Morpion entre ${player1User} et ${player2User} est terminée.`);
}

// Logique de l'IA (très basique pour l'instant)
function makeAIMove(game) {
    const { board, boardSize } = game;
    let bestMove = null;
    
    // Chercher une case vide aléatoire
    const emptyCells = [];
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
            if (board[i][j] === ' ') {
                emptyCells.push({ row: i, col: j });
            }
        }
    }

    if (emptyCells.length > 0) {
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        bestMove = emptyCells[randomIndex];
    }

    if (bestMove) {
        handlePlayerMove(game, bestMove.row, bestMove.col, game.player2User); // L'IA est toujours player2
    } else {
        // Si aucune case vide, c'est un match nul (devrait être géré par checkDraw avant)
        endGame(game, null);
    }
}

// Gérer le coup d'un joueur (humain ou IA)
async function handlePlayerMove(game, row, col, playerMakingMove) {
    const { board, currentPlayer, players, isAI, player1User, player2User } = game;

    // Vérifier si c'est le bon joueur qui joue
    if (playerMakingMove.id !== currentPlayer.id) {
        // Si c'est une interaction de bouton, répondre de manière éphémère
        if (playerMakingMove.id !== 'AI') { // Ne pas répondre si c'est l'IA
            const interaction = game.message.interaction; // Récupérer l'interaction originale du message
            if (interaction && !interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Ce n\'est pas votre tour !', ephemeral: true });
            } else if (interaction && interaction.deferred && !interaction.replied) {
                await interaction.followUp({ content: 'Ce n\'est pas votre tour !', ephemeral: true });
            }
        }
        return;
    }

    // Vérifier si la case est vide
    if (board[row][col] !== ' ') {
        if (playerMakingMove.id !== 'AI') {
            const interaction = game.message.interaction;
            if (interaction && !interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Cette case est déjà prise !', ephemeral: true });
            } else if (interaction && interaction.deferred && !interaction.replied) {
                await interaction.followUp({ content: 'Cette case est déjà prise !', ephemeral: true });
            }
        }
        return;
    }

    board[row][col] = players[currentPlayer.id]; // Placer le symbole du joueur

    if (checkWin(board, players[currentPlayer.id], game.boardSize)) {
        endGame(game, currentPlayer);
        return;
    }

    if (checkDraw(board)) {
        endGame(game, null);
        return;
    }

    // Changer de joueur
    game.currentPlayer = (currentPlayer.id === player1User.id) ? player2User : player1User;
    updateBoardMessage(game);

    // Si c'est au tour de l'IA, faire jouer l'IA
    if (game.isAI && game.currentPlayer.id === 'AI') {
        setTimeout(() => makeAIMove(game), 1000);
    }
}

// Gérer les interactions des boutons (clics sur les cases)
// Cette partie doit être gérée dans events/interactionCreate.js
// Pour l'instant, nous allons simuler l'appel à handlePlayerMove
// depuis l'interactionCreate.js en exportant activeGames.
module.exports.activeGames = activeGames;
module.exports.handlePlayerMove = handlePlayerMove;