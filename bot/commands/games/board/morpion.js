const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

// Map pour stocker les parties de Morpion en cours
const activeGames = new Map();

// Map pour éviter les doubles clics
const interactionLocks = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('morpion')
        .setDescription('🎯 Joue à une partie de Morpion (Tic-Tac-Toe) !')
        .addUserOption(option =>
            option.setName('adversaire')
                .setDescription('Le joueur que vous voulez défier ou laisser vide pour jouer contre l\'IA.')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('taille')
                .setDescription('Taille de la grille (3 pour 3x3, 5 pour 5x5). Par défaut 3x3.')
                .setRequired(false)
                .addChoices(
                    { name: '🎯 3x3 (Classique)', value: 3 },
                    { name: '🎲 5x5 (Avancé)', value: 5 }
                )),
    async execute(interaction) {
        const opponent = interaction.options.getUser('adversaire');
        const boardSize = interaction.options.getInteger('taille') || 3;
        const player1 = interaction.user;
        let player2;
        let isAI = false;

        if (opponent) {
            if (opponent.bot) {
                return interaction.reply({ 
                    content: '🤖 Vous ne pouvez pas défier un bot.', 
                    ephemeral: true 
                });
            }
            if (opponent.id === player1.id) {
                return interaction.reply({ 
                    content: '🪞 Vous ne pouvez pas vous défier vous-même.', 
                    ephemeral: true 
                });
            }
            player2 = opponent;
        } else {
            isAI = true;
            player2 = { id: 'AI', username: 'IA', tag: 'IA#0000' };
        }

        const gameId = `${interaction.channel.id}-${player1.id}-${player2.id}`;
        if (activeGames.has(gameId)) {
            return interaction.reply({ 
                content: '⚠️ Une partie est déjà en cours dans ce salon avec ces joueurs.', 
                ephemeral: true 
            });
        }

        const board = Array(boardSize).fill(null).map(() => Array(boardSize).fill(' '));
        const currentPlayer = player1;
        const players = { [player1.id]: 'X', [player2.id]: 'O' };
        const game = {
            id: gameId,
            board,
            currentPlayer,
            players,
            isAI,
            boardSize,
            message: null,
            interactionChannel: interaction.channel,
            player1User: player1,
            player2User: player2,
            gameEnded: false,
            winningPositions: []
        };
        activeGames.set(gameId, game);

        const embed = new EmbedBuilder()
            .setColor('#42A5F5')
            .setTitle(`🎯 Morpion ${boardSize}x${boardSize}`)
            .setDescription(`🎮 **C'est au tour de ${currentPlayer.username}** (${players[currentPlayer.id]})\n\n${formatBoard(board, boardSize)}`)
            .addFields(
                { name: '❌ Joueur X', value: `${player1.username}`, inline: true },
                { name: '⭕ Joueur O', value: `${player2.username}`, inline: true },
                { name: '🎯 Objectif', value: boardSize === 3 ? 'Alignez 3 symboles' : 'Alignez 5 symboles', inline: true }
            )
            .setFooter({ text: 'Cliquez sur une case pour jouer !' });

        const components = createBoardComponents(board, boardSize);

        const reply = await interaction.reply({
            embeds: [embed],
            components: components,
            fetchReply: true,
        });
        game.message = reply;

        // Démarrer le collecteur d'interactions
        startGameCollector(game);

        if (isAI && currentPlayer.id === 'AI') {
            setTimeout(() => makeAIMove(game), 1000);
        }
    },
    
    // Exporter pour les interactions
    activeGames,
    handlePlayerMove
};

function formatBoard(board, boardSize, winningPositions = []) {
    let boardString = '```\n';
    
    // En-tête avec numéros de colonnes
    boardString += '   ';
    for (let j = 0; j < boardSize; j++) {
        boardString += ` ${j + 1} `;
    }
    boardString += '\n';
    
    // Ligne de séparation
    boardString += '  ┌';
    for (let j = 0; j < boardSize; j++) {
        boardString += '───';
        if (j < boardSize - 1) boardString += '┬';
    }
    boardString += '┐\n';
    
    // Lignes du plateau
    for (let i = 0; i < boardSize; i++) {
        boardString += `${i + 1} │`;
        for (let j = 0; j < boardSize; j++) {
            let cell = board[i][j];
            if (cell === ' ') {
                cell = '   ';
            } else {
                // Marquer les cases gagnantes avec des emojis plus visibles
                if (winningPositions.some(pos => pos.row === i && pos.col === j)) {
                    cell = cell === 'X' ? ' 🌟 ' : ' 💫 ';
                } else {
                    cell = cell === 'X' ? ' ❌ ' : ' ⭕ ';
                }
            }
            boardString += cell;
            if (j < boardSize - 1) boardString += '│';
        }
        boardString += '│\n';
        
        // Ligne de séparation entre les rangées
        if (i < boardSize - 1) {
            boardString += '  ├';
            for (let j = 0; j < boardSize; j++) {
                boardString += '───';
                if (j < boardSize - 1) boardString += '┼';
            }
            boardString += '┤\n';
        }
    }
    
    // Ligne de fermeture
    boardString += '  └';
    for (let j = 0; j < boardSize; j++) {
        boardString += '───';
        if (j < boardSize - 1) boardString += '┴';
    }
    boardString += '┘\n```';
    
    return boardString;
}

function createBoardComponents(board, boardSize, gameEnded = false) {
    const rows = [];
    for (let i = 0; i < boardSize; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < boardSize; j++) {
            const isEmpty = board[i][j] === ' ';
            const label = isEmpty ? '\u200b' : (board[i][j] === 'X' ? '❌' : '⭕');
            
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`morpion_${i}_${j}`)
                    .setLabel(label)
                    .setStyle(isEmpty ? ButtonStyle.Secondary : 
                             (board[i][j] === 'X' ? ButtonStyle.Danger : ButtonStyle.Primary))
                    .setDisabled(!isEmpty || gameEnded)
            );
        }
        rows.push(row);
    }
    return rows;
}

function startGameCollector(game) {
    const gameCollector = game.message.createMessageComponentCollector({
        filter: i => i.customId.startsWith('morpion_') && 
                    (i.user.id === game.player1User.id || 
                     (game.player2User.id !== 'AI' && i.user.id === game.player2User.id)),
        time: 600000, // 10 minutes
    });

    gameCollector.on('collect', async i => {
        // Vérifier le verrouillage pour éviter les doubles clics
        const lockKey = `${i.user.id}_${i.customId}`;
        if (interactionLocks.has(lockKey)) {
            return;
        }
        interactionLocks.set(lockKey, Date.now());
        setTimeout(() => interactionLocks.delete(lockKey), 3000);

        if (game.gameEnded) {
            await i.reply({ content: '🚫 La partie est terminée.', ephemeral: true });
            return;
        }

        const parts = i.customId.split('_');
        const row = parseInt(parts[1]);
        const col = parseInt(parts[2]);

        await i.deferUpdate();
        await handlePlayerMove(game, row, col, i.user);
    });

    gameCollector.on('end', () => {
        if (!game.gameEnded) {
            const embed = new EmbedBuilder()
                .setTitle('⏰ Morpion - Temps écoulé')
                .setDescription('La partie est terminée (temps écoulé).')
                .setColor('#FF6B6B');
            game.message.edit({ embeds: [embed], components: [] });
            activeGames.delete(game.id);
        }
    });
}

function updateBoardMessage(game) {
    const { board, currentPlayer, players, boardSize, message, player1User, player2User, gameEnded, winningPositions } = game;
    
    let description;
    let color;
    
    if (gameEnded) {
        return; // Ne pas mettre à jour si le jeu est terminé
    }
    
    description = `🎮 **C'est au tour de ${currentPlayer.username}** (${players[currentPlayer.id]})\n\n${formatBoard(board, boardSize, winningPositions)}`;
    color = currentPlayer.id === player1User.id ? '#E53E3E' : '#3182CE';
    
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`🎯 Morpion ${boardSize}x${boardSize}`)
        .setDescription(description)
        .addFields(
            { name: '❌ Joueur X', value: `${player1User.username}`, inline: true },
            { name: '⭕ Joueur O', value: `${player2User.username}`, inline: true },
            { name: '⏰ Tour actuel', value: `${currentPlayer.username}`, inline: true }
        )
        .setFooter({ text: 'Cliquez sur une case pour jouer !' });

    const components = createBoardComponents(board, boardSize, gameEnded);
    message.edit({ embeds: [embed], components: components });
}

function checkWin(board, playerSymbol, boardSize) {
    const winLength = boardSize === 3 ? 3 : 5;
    const winningPositions = [];

    // Vérification des lignes
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j <= boardSize - winLength; j++) {
            let count = 0;
            const positions = [];
            for (let k = 0; k < winLength; k++) {
                if (board[i][j + k] === playerSymbol) {
                    count++;
                    positions.push({ row: i, col: j + k });
                } else {
                    break;
                }
            }
            if (count === winLength) {
                return { hasWon: true, winningPositions: positions, winType: 'Ligne horizontale' };
            }
        }
    }

    // Vérification des colonnes
    for (let j = 0; j < boardSize; j++) {
        for (let i = 0; i <= boardSize - winLength; i++) {
            let count = 0;
            const positions = [];
            for (let k = 0; k < winLength; k++) {
                if (board[i + k][j] === playerSymbol) {
                    count++;
                    positions.push({ row: i + k, col: j });
                } else {
                    break;
                }
            }
            if (count === winLength) {
                return { hasWon: true, winningPositions: positions, winType: 'Ligne verticale' };
            }
        }
    }

    // Vérification des diagonales (haut-gauche vers bas-droite)
    for (let i = 0; i <= boardSize - winLength; i++) {
        for (let j = 0; j <= boardSize - winLength; j++) {
            let count = 0;
            const positions = [];
            for (let k = 0; k < winLength; k++) {
                if (board[i + k][j + k] === playerSymbol) {
                    count++;
                    positions.push({ row: i + k, col: j + k });
                } else {
                    break;
                }
            }
            if (count === winLength) {
                return { hasWon: true, winningPositions: positions, winType: 'Diagonale descendante' };
            }
        }
    }

    // Vérification des diagonales (haut-droite vers bas-gauche)
    for (let i = 0; i <= boardSize - winLength; i++) {
        for (let j = winLength - 1; j < boardSize; j++) {
            let count = 0;
            const positions = [];
            for (let k = 0; k < winLength; k++) {
                if (board[i + k][j - k] === playerSymbol) {
                    count++;
                    positions.push({ row: i + k, col: j - k });
                } else {
                    break;
                }
            }
            if (count === winLength) {
                return { hasWon: true, winningPositions: positions, winType: 'Diagonale montante' };
            }
        }
    }

    return { hasWon: false, winningPositions: [], winType: null };
}

function checkDraw(board) {
    return board.flat().every(cell => cell !== ' ');
}

async function endGame(game, winner = null, winResult = null) {
    const { message, player1User, player2User, board, boardSize, id } = game;
    activeGames.delete(id);
    game.gameEnded = true;

    let description;
    let color;
    let title;

    if (winner) {
        title = '🎉 Morpion - Victoire !';
        description = `🏆 **${winner.username}** a gagné la partie !\n\n${formatBoard(board, boardSize, winResult.winningPositions)}`;
        color = '#4CAF50';
    } else {
        title = '🤝 Morpion - Match nul';
        description = `🤝 Match nul ! Toutes les cases sont remplies.\n\n${formatBoard(board, boardSize)}`;
        color = '#FFA726';
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .addFields(
            { name: '❌ Joueur X', value: player1User.username, inline: true },
            { name: '⭕ Joueur O', value: player2User.username, inline: true },
            { name: '🎯 Résultat', value: winner ? `Victoire de ${winner.username}` : 'Match nul', inline: true }
        );

    if (winner && winResult) {
        embed.addFields({ name: '🏅 Type de victoire', value: winResult.winType, inline: false });
    }

    embed.setFooter({ text: winner ? 'Félicitations ! 🎊' : 'Bien joué à tous les deux ! 👏' });

    // Désactiver tous les boutons
    const disabledComponents = createBoardComponents(board, boardSize, true);

    await message.edit({ embeds: [embed], components: disabledComponents });
}

// IA améliorée
function makeAIMove(game) {
    const { board, boardSize } = game;
    const winLength = boardSize === 3 ? 3 : 5;
    
    // 1. Vérifier si l'IA peut gagner
    const winMove = findWinningMove(board, 'O', boardSize, winLength);
    if (winMove) {
        handlePlayerMove(game, winMove.row, winMove.col, game.player2User);
        return;
    }
    
    // 2. Vérifier si l'IA doit bloquer le joueur
    const blockMove = findWinningMove(board, 'X', boardSize, winLength);
    if (blockMove) {
        handlePlayerMove(game, blockMove.row, blockMove.col, game.player2User);
        return;
    }
    
    // 3. Jouer au centre si possible (pour 3x3)
    if (boardSize === 3) {
        const center = Math.floor(boardSize / 2);
        if (board[center][center] === ' ') {
            handlePlayerMove(game, center, center, game.player2User);
            return;
        }
    }
    
    // 4. Jouer dans un coin (pour 3x3)
    if (boardSize === 3) {
        const corners = [[0, 0], [0, 2], [2, 0], [2, 2]];
        for (const [row, col] of corners) {
            if (board[row][col] === ' ') {
                handlePlayerMove(game, row, col, game.player2User);
                return;
            }
        }
    }
    
    // 5. Jouer dans une case aléatoire
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
        const move = emptyCells[randomIndex];
        handlePlayerMove(game, move.row, move.col, game.player2User);
    }
}

function findWinningMove(board, player, boardSize, winLength) {
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
            if (board[i][j] === ' ') {
                // Tester ce mouvement
                board[i][j] = player;
                const winResult = checkWin(board, player, boardSize);
                board[i][j] = ' '; // Annuler le mouvement
                
                if (winResult.hasWon) {
                    return { row: i, col: j };
                }
            }
        }
    }
    return null;
}

async function handlePlayerMove(game, row, col, playerMakingMove) {
    const { board, currentPlayer, players, isAI, player1User, player2User, boardSize } = game;

    // Vérifier si c'est le bon joueur qui joue
    if (playerMakingMove.id !== currentPlayer.id) {
        return;
    }

    // Vérifier si la case est vide
    if (board[row][col] !== ' ') {
        return;
    }

    board[row][col] = players[currentPlayer.id];

    // Vérifier la victoire
    const winResult = checkWin(board, players[currentPlayer.id], boardSize);
    if (winResult.hasWon) {
        game.winningPositions = winResult.winningPositions;
        await endGame(game, currentPlayer, winResult);
        return;
    }

    // Vérifier l'égalité
    if (checkDraw(board)) {
        await endGame(game, null);
        return;
    }

    // Changer de joueur
    game.currentPlayer = (currentPlayer.id === player1User.id) ? player2User : player1User;
    updateBoardMessage(game);

    // Si c'est au tour de l'IA, faire jouer l'IA
    if (game.isAI && game.currentPlayer.id === 'AI') {
        setTimeout(() => makeAIMove(game), 1500);
    }
}
