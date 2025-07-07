const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

const ROWS = 6;
const COLUMNS = 7;
const EMPTY = '⚫'; // Case vide (noir pour contraste)
const PLAYER1_SYMBOL = '🔴'; // Jeton joueur 1 (rouge)
const PLAYER2_SYMBOL = '🟨'; // Jeton joueur 2 (jaune vif)
const BOARD_FRAME = '🔵'; // Cadre du plateau
const WIN_SYMBOL = '✨'; // Symbole pour marquer les jetons gagnants

// Map pour stocker les parties en cours
const activeGames = new Map();

// Map pour éviter les doubles clics (verrouillage temporaire)
const interactionLocks = new Map();

function createBoard() {
    return Array(ROWS).fill(0).map(() => Array(COLUMNS).fill(EMPTY));
}

function formatBoard(board, winningPositions = []) {
    let boardString = '';
    
    // En-tête avec numéros de colonnes
    boardString += '```\n';
    boardString += '  1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣\n';
    boardString += '┌─────────────────────┐\n';

    // Plateau de jeu
    for (let r = 0; r < ROWS; r++) {
        boardString += '│';
        for (let c = 0; c < COLUMNS; c++) {
            let cell = board[r][c];
            // Marquer les jetons gagnants avec des étoiles
            if (winningPositions.some(pos => pos.row === r && pos.col === c)) {
                cell = cell === PLAYER1_SYMBOL ? '🌟' : '💫';
            }
            boardString += cell;
        }
        boardString += '│\n';
    }
    
    boardString += '└─────────────────────┘\n';
    boardString += '  1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣\n';
    boardString += '```';
    
    return boardString;
}

async function startGameCollector(game, interaction) {
    // Récupérer le message de la réponse
    if (!game.message) {
        game.message = await interaction.fetchReply();
    }

    const gameCollector = game.message.createMessageComponentCollector({
        filter: i => i.customId.startsWith('col_') && (i.user.id === game.player1.id || (game.player2 && i.user.id === game.player2.id)),
        time: 600000, // 10 minutes pour la partie
    });

    gameCollector.on('collect', async i => {
        // Vérifier le verrouillage pour éviter les doubles clics
        const lockKey = `${i.user.id}_${i.customId}`;
        if (interactionLocks.has(lockKey)) {
            console.log(`[PUISSANCE4] Double clic détecté pour: ${i.customId}, LockKey: ${lockKey}`);
            return;
        }
        interactionLocks.set(lockKey, Date.now());
        setTimeout(() => interactionLocks.delete(lockKey), 3000);

        if (game.gameEnded) {
            await i.reply({ content: '🚫 La partie est terminée.', ephemeral: true });
            return;
        }

        const activePlayerUser = game.currentPlayerSymbol === PLAYER1_SYMBOL ? game.player1 : game.player2;
        if (i.user.id !== activePlayerUser.id) {
            await i.reply({ content: `⏰ Ce n'est pas votre tour ! C'est au tour de ${activePlayerUser}.`, ephemeral: true });
            return;
        }

        const col = parseInt(i.customId.split('_')[1]);
        await handlePlayerMove(i, game, col, gameCollector);
    });

    gameCollector.on('end', collected => {
        if (!game.gameEnded) {
            const embed = new EmbedBuilder()
                .setTitle('🎮 Puissance 4 - Temps écoulé')
                .setDescription(`⏰ La partie est terminée (temps écoulé).\n\n${formatBoard(game.board)}`)
                .setColor('#FF6B6B')
                .setFooter({ text: 'Partie terminée automatiquement après 10 minutes d\'inactivité' });
            game.message.edit({ embeds: [embed], components: [] });
            activeGames.delete(game.id);
        }
    });
}

async function handlePlayerMove(interaction, game, col, gameCollector) {
    let placed = false;
    let placedRow = -1;
    
    // Trouver la première case vide dans la colonne (de bas en haut)
    for (let r = ROWS - 1; r >= 0; r--) {
        if (game.board[r][col] === EMPTY) {
            game.board[r][col] = game.currentPlayerSymbol;
            placedRow = r;
            placed = true;
            break;
        }
    }

    if (!placed) {
        await interaction.reply({ content: '❌ Cette colonne est pleine ! Choisissez une autre colonne.', ephemeral: true });
        return;
    }

    // Vérifier la victoire
    const winResult = checkWin(game.board, game.currentPlayerSymbol);
    if (winResult.hasWon) {
        const winner = game.currentPlayerSymbol === PLAYER1_SYMBOL ? game.player1 : game.player2;
        const embed = new EmbedBuilder()
            .setTitle('🎉 Puissance 4 - Victoire !')
            .setDescription(`🏆 **${winner}** (${game.currentPlayerSymbol}) a gagné !\n\n${formatBoard(game.board, winResult.winningPositions)}`)
            .setColor('#4CAF50')
            .addFields(
                { name: '🥇 Vainqueur', value: `${winner}`, inline: true },
                { name: '🎯 Type de victoire', value: winResult.winType, inline: true },
                { name: '🎮 Mode', value: game.isPvE ? 'Joueur vs IA' : 'Joueur vs Joueur', inline: true }
            )
            .setFooter({ text: 'Félicitations ! 🎊' });
        
        game.gameEnded = true;
        await interaction.update({ embeds: [embed], components: [] });
        gameCollector.stop();
        activeGames.delete(game.id);
        return;
    }

    // Vérifier l'égalité
    if (checkDraw(game.board)) {
        const embed = new EmbedBuilder()
            .setTitle('🤝 Puissance 4 - Match nul')
            .setDescription(`🤝 Match nul ! Toutes les cases sont remplies.\n\n${formatBoard(game.board)}`)
            .setColor('#FFA726')
            .addFields(
                { name: '👥 Joueurs', value: `${game.player1} vs ${game.player2}`, inline: false },
                { name: '🎮 Résultat', value: 'Égalité parfaite !', inline: false }
            )
            .setFooter({ text: 'Bien joué à tous les deux ! 👏' });
        
        game.gameEnded = true;
        await interaction.update({ embeds: [embed], components: [] });
        gameCollector.stop();
        activeGames.delete(game.id);
        return;
    }

    // Changer de joueur
    game.currentPlayerSymbol = game.currentPlayerSymbol === PLAYER1_SYMBOL ? PLAYER2_SYMBOL : PLAYER1_SYMBOL;
    const nextPlayerUser = game.currentPlayerSymbol === PLAYER1_SYMBOL ? game.player1 : game.player2;
    
    const embed = new EmbedBuilder()
        .setTitle('🎮 Puissance 4')
        .setDescription(`🎯 **C'est au tour de ${nextPlayerUser}** (${game.currentPlayerSymbol})\n\n${formatBoard(game.board)}`)
        .setColor(game.currentPlayerSymbol === PLAYER1_SYMBOL ? '#E53E3E' : '#F6E05E')
        .addFields(
            { name: '🔴 Joueur 1', value: `${game.player1}`, inline: true },
            { name: '🟡 Joueur 2', value: `${game.player2}`, inline: true },
            { name: '⏰ Tour actuel', value: `${nextPlayerUser}`, inline: true }
        )
        .setFooter({ text: 'Cliquez sur un bouton pour jouer dans cette colonne' });

    // Si c'est le tour du bot en mode PvE
    if (game.isPvE && game.currentPlayerSymbol === PLAYER2_SYMBOL) {
        await interaction.update({ embeds: [embed], components: createGameButtons() });
        
        // Délai pour l'expérience utilisateur
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const botCol = getBotMove(game.board, game.difficulty);
        
        // Créer une fausse interaction pour le bot
        const botInteraction = {
            update: async (options) => {
                await game.message.edit(options);
            },
            reply: async () => {} // Le bot ne peut pas avoir d'erreurs
        };
        
        await handlePlayerMove(botInteraction, game, botCol, gameCollector);
    } else {
        // Pour le tour du joueur humain
        await interaction.update({ embeds: [embed], components: createGameButtons() });
    }
}

function getBotMove(board, difficulty = 'hard') {
    // Configuration des niveaux de difficulté
    const difficultySettings = {
        'easy': { depth: 1, randomness: 0.5 },
        'medium': { depth: 3, randomness: 0.2 },
        'hard': { depth: 5, randomness: 0.05 },
        'expert': { depth: 7, randomness: 0 }
    };
    
    const settings = difficultySettings[difficulty] || difficultySettings['hard'];
    
    // Ajouter de la randomness pour les niveaux faciles
    if (Math.random() < settings.randomness) {
        const availableCols = [];
        for (let c = 0; c < COLUMNS; c++) {
            if (board[0][c] === EMPTY) {
                availableCols.push(c);
            }
        }
        return availableCols[Math.floor(Math.random() * availableCols.length)];
    }
    
    // Utiliser l'algorithme minimax avec élagage alpha-beta
    const result = minimax(board, settings.depth, -Infinity, Infinity, true);
    return result.column;
}

// Algorithme minimax avec élagage alpha-beta
function minimax(board, depth, alpha, beta, isMaximizing) {
    // Vérifier les conditions de fin
    const botWin = checkWin(board, PLAYER2_SYMBOL);
    const playerWin = checkWin(board, PLAYER1_SYMBOL);
    
    if (botWin.hasWon) return { score: 1000 + depth, column: -1 };
    if (playerWin.hasWon) return { score: -1000 - depth, column: -1 };
    if (checkDraw(board) || depth === 0) {
        return { score: evaluatePosition(board), column: -1 };
    }
    
    const availableCols = [];
    for (let c = 0; c < COLUMNS; c++) {
        if (board[0][c] === EMPTY) {
            availableCols.push(c);
        }
    }
    
    // Ordonner les colonnes (centre d'abord pour un meilleur élagage)
    availableCols.sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));
    
    if (isMaximizing) {
        let maxScore = -Infinity;
        let bestCol = availableCols[0];
        
        for (const col of availableCols) {
            const row = getNextRow(board, col);
            if (row !== -1) {
                board[row][col] = PLAYER2_SYMBOL;
                const score = minimax(board, depth - 1, alpha, beta, false).score;
                board[row][col] = EMPTY;
                
                if (score > maxScore) {
                    maxScore = score;
                    bestCol = col;
                }
                
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break; // Élagage alpha-beta
            }
        }
        
        return { score: maxScore, column: bestCol };
    } else {
        let minScore = Infinity;
        let bestCol = availableCols[0];
        
        for (const col of availableCols) {
            const row = getNextRow(board, col);
            if (row !== -1) {
                board[row][col] = PLAYER1_SYMBOL;
                const score = minimax(board, depth - 1, alpha, beta, true).score;
                board[row][col] = EMPTY;
                
                if (score < minScore) {
                    minScore = score;
                    bestCol = col;
                }
                
                beta = Math.min(beta, score);
                if (beta <= alpha) break; // Élagage alpha-beta
            }
        }
        
        return { score: minScore, column: bestCol };
    }
}

// Fonction d'évaluation de position sophistiquée
function evaluatePosition(board) {
    let score = 0;
    
    // Évaluer le contrôle du centre
    score += evaluateCenterControl(board);
    
    // Évaluer les menaces et opportunités
    score += evaluateThreats(board, PLAYER2_SYMBOL) * 10;
    score -= evaluateThreats(board, PLAYER1_SYMBOL) * 10;
    
    // Évaluer les alignements partiels
    score += evaluateAlignments(board, PLAYER2_SYMBOL);
    score -= evaluateAlignments(board, PLAYER1_SYMBOL);
    
    // Évaluer la structure positionnelle
    score += evaluatePositionalStructure(board);
    
    return score;
}

function evaluateCenterControl(board) {
    let score = 0;
    const centerCol = 3;
    
    for (let r = 0; r < ROWS; r++) {
        if (board[r][centerCol] === PLAYER2_SYMBOL) score += 3;
        else if (board[r][centerCol] === PLAYER1_SYMBOL) score -= 3;
    }
    
    return score;
}

function evaluateThreats(board, player) {
    let threats = 0;
    
    // Vérifier toutes les positions pour des menaces (3 en ligne avec 1 espace)
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLUMNS; c++) {
            if (board[r][c] === EMPTY) {
                // Simuler un coup et vérifier si cela crée une menace
                board[r][c] = player;
                if (checkWin(board, player).hasWon) {
                    threats++;
                }
                board[r][c] = EMPTY;
            }
        }
    }
    
    return threats;
}

function evaluateAlignments(board, player) {
    let score = 0;
    
    // Vérifier tous les alignements de 2 et 3 jetons
    score += countAlignments(board, player, 2) * 2;
    score += countAlignments(board, player, 3) * 5;
    
    return score;
}

function countAlignments(board, player, length) {
    let count = 0;
    
    // Directions: horizontal, vertical, diagonal /, diagonal \
    const directions = [
        [0, 1],   // horizontal
        [1, 0],   // vertical
        [1, 1],   // diagonal \
        [1, -1]   // diagonal /
    ];
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLUMNS; c++) {
            for (const [dr, dc] of directions) {
                if (isValidAlignment(board, r, c, dr, dc, player, length)) {
                    count++;
                }
            }
        }
    }
    
    return count;
}

function isValidAlignment(board, startR, startC, dr, dc, player, length) {
    let playerCount = 0;
    let emptyCount = 0;
    
    for (let i = 0; i < 4; i++) {
        const r = startR + i * dr;
        const c = startC + i * dc;
        
        if (r < 0 || r >= ROWS || c < 0 || c >= COLUMNS) return false;
        
        if (board[r][c] === player) playerCount++;
        else if (board[r][c] === EMPTY) emptyCount++;
        else return false; // Bloqué par l'adversaire
    }
    
    return playerCount === length && emptyCount === (4 - length);
}

function evaluatePositionalStructure(board) {
    let score = 0;
    
    // Favoriser les positions basses et connectées
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLUMNS; c++) {
            if (board[r][c] === PLAYER2_SYMBOL) {
                // Bonus pour les positions basses
                score += (ROWS - r);
                
                // Bonus pour la connectivité
                score += countAdjacentPieces(board, r, c, PLAYER2_SYMBOL);
            } else if (board[r][c] === PLAYER1_SYMBOL) {
                score -= (ROWS - r);
                score -= countAdjacentPieces(board, r, c, PLAYER1_SYMBOL);
            }
        }
    }
    
    return score;
}

function countAdjacentPieces(board, r, c, player) {
    let count = 0;
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    
    for (const [dr, dc] of directions) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLUMNS && board[nr][nc] === player) {
            count++;
        }
    }
    
    return count;
}

function getNextRow(board, col) {
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][col] === EMPTY) {
            return r;
        }
    }
    return -1;
}

function createGameButtons() {
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('col_0').setLabel('1️⃣').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('col_1').setLabel('2️⃣').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('col_2').setLabel('3️⃣').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('col_3').setLabel('4️⃣').setStyle(ButtonStyle.Primary),
        );
    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('col_4').setLabel('5️⃣').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('col_5').setLabel('6️⃣').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('col_6').setLabel('7️⃣').setStyle(ButtonStyle.Primary),
        );
    return [row1, row2];
}

function checkWin(board, player) {
    const winningPositions = [];
    
    // Vérifier les lignes
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c <= COLUMNS - 4; c++) {
            if (board[r][c] === player &&
                board[r][c + 1] === player &&
                board[r][c + 2] === player &&
                board[r][c + 3] === player) {
                for (let i = 0; i < 4; i++) {
                    winningPositions.push({ row: r, col: c + i });
                }
                return { hasWon: true, winningPositions, winType: 'Ligne horizontale' };
            }
        }
    }

    // Vérifier les colonnes
    for (let c = 0; c < COLUMNS; c++) {
        for (let r = 0; r <= ROWS - 4; r++) {
            if (board[r][c] === player &&
                board[r + 1][c] === player &&
                board[r + 2][c] === player &&
                board[r + 3][c] === player) {
                for (let i = 0; i < 4; i++) {
                    winningPositions.push({ row: r + i, col: c });
                }
                return { hasWon: true, winningPositions, winType: 'Ligne verticale' };
            }
        }
    }

    // Vérifier les diagonales (du bas gauche au haut droit)
    for (let r = 3; r < ROWS; r++) {
        for (let c = 0; c <= COLUMNS - 4; c++) {
            if (board[r][c] === player &&
                board[r - 1][c + 1] === player &&
                board[r - 2][c + 2] === player &&
                board[r - 3][c + 3] === player) {
                for (let i = 0; i < 4; i++) {
                    winningPositions.push({ row: r - i, col: c + i });
                }
                return { hasWon: true, winningPositions, winType: 'Diagonale montante' };
            }
        }
    }

    // Vérifier les diagonales (du haut gauche au bas droit)
    for (let r = 0; r <= ROWS - 4; r++) {
        for (let c = 0; c <= COLUMNS - 4; c++) {
            if (board[r][c] === player &&
                board[r + 1][c + 1] === player &&
                board[r + 2][c + 2] === player &&
                board[r + 3][c + 3] === player) {
                for (let i = 0; i < 4; i++) {
                    winningPositions.push({ row: r + i, col: c + i });
                }
                return { hasWon: true, winningPositions, winType: 'Diagonale descendante' };
            }
        }
    }

    return { hasWon: false, winningPositions: [], winType: null };
}

function checkDraw(board) {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLUMNS; c++) {
            if (board[r][c] === EMPTY) {
                return false;
            }
        }
    }
    return true;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('puissance4')
        .setDescription('🎮 Joue à une partie de Puissance 4 !')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Choisissez le mode de jeu')
                .setRequired(true)
                .addChoices(
                    { name: '👥 Joueur contre Joueur (PvP)', value: 'pvp' },
                    { name: '🤖 Joueur contre IA (PvE)', value: 'pve' }
                ))
        .addStringOption(option =>
            option.setName('difficulte')
                .setDescription('Niveau de difficulté de l\'IA (seulement en mode PvE)')
                .setRequired(false)
                .addChoices(
                    { name: '🟢 Facile - IA débutante', value: 'easy' },
                    { name: '🟡 Moyen - IA standard', value: 'medium' },
                    { name: '🔴 Difficile - IA experte', value: 'hard' },
                    { name: '⚫ Expert - IA parfaite', value: 'expert' }
                )),
    async execute(interaction) {
        const gameMode = interaction.options.getString('mode');
        const difficulty = interaction.options.getString('difficulte') || 'hard';
        const gameId = `${interaction.channel.id}-${interaction.user.id}`;
        
        if (activeGames.has(gameId)) {
            return interaction.reply({ 
                content: '⚠️ Une partie est déjà en cours dans ce salon pour vous.', 
                ephemeral: true 
            });
        }

        const game = {
            id: gameId,
            board: createBoard(),
            player1: interaction.user,
            player2: null,
            currentPlayerSymbol: PLAYER1_SYMBOL,
            gameEnded: false,
            isPvE: gameMode === 'pve',
            difficulty: difficulty,
            message: null,
            interactionChannel: interaction.channel,
        };

        activeGames.set(gameId, game);

        if (game.isPvE) {
            game.player2 = interaction.client.user;
        }

        const embed = new EmbedBuilder()
            .setTitle('🎮 Puissance 4')
            .setColor('#F44336');

        let embedDescription;
        if (game.isPvE) {
            const difficultyIcons = {
                'easy': '🟢 Facile',
                'medium': '🟡 Moyen', 
                'hard': '🔴 Difficile',
                'expert': '⚫ Expert'
            };
            embedDescription = `🎯 **C'est au tour de ${game.player1}** (${PLAYER1_SYMBOL})\n\n${formatBoard(game.board)}`;
            embed.addFields(
                { name: '🔴 Joueur 1', value: `${game.player1}`, inline: true },
                { name: '🤖 IA', value: `${game.player2}`, inline: true },
                { name: '🎯 Difficulté', value: difficultyIcons[game.difficulty], inline: true }
            );
        } else {
            embedDescription = `🔍 **En attente d'un deuxième joueur...**\n\n${formatBoard(game.board)}`;
            embed.addFields(
                { name: '🔴 Joueur 1', value: `${game.player1}`, inline: true },
                { name: '🟡 Joueur 2', value: `En attente...`, inline: true },
                { name: '🎮 Mode', value: 'Joueur vs Joueur', inline: true }
            );
        }
        
        embed.setDescription(embedDescription);
        embed.setFooter({ text: 'Alignez 4 jetons pour gagner !' });

        if (game.isPvE) {
            await interaction.reply({
                embeds: [embed],
                components: createGameButtons(),
                fetchReply: true,
            });
            game.message = await interaction.fetchReply();
            startGameCollector(game, interaction);
        } else {
            const joinButton = new ButtonBuilder()
                .setCustomId(`join_game_${game.id}`)
                .setLabel('🎮 Rejoindre la partie')
                .setStyle(ButtonStyle.Success);
            const initialRow = new ActionRowBuilder().addComponents(joinButton);
            
            await interaction.reply({
                embeds: [embed],
                components: [initialRow],
                fetchReply: true,
            });
            game.message = await interaction.fetchReply();

            const joinCollector = game.message.createMessageComponentCollector({
                filter: i => i.customId === `join_game_${game.id}` && i.user.id !== game.player1.id,
                max: 1,
                time: 60000,
            });

            joinCollector.on('collect', async i => {
                const lockKey = `${i.user.id}_${i.customId}`;
                if (interactionLocks.has(lockKey)) {
                    return;
                }
                interactionLocks.set(lockKey, Date.now());
                setTimeout(() => interactionLocks.delete(lockKey), 3000);

                game.player2 = i.user;
                embed.setDescription(`🎯 **C'est au tour de ${game.player1}** (${PLAYER1_SYMBOL})\n\n${formatBoard(game.board)}`);
                embed.spliceFields(1, 1, { name: '🟡 Joueur 2', value: `${game.player2}`, inline: true });
                
                await i.update({ embeds: [embed], components: createGameButtons() });
                startGameCollector(game, interaction);
            });

            joinCollector.on('end', async collected => {
                if (!game.player2 && !game.gameEnded) {
                    embed.setDescription('⏰ **Personne n\'a rejoint la partie.** La partie est annulée.');
                    embed.setColor('#FF6B6B');
                    await game.message.edit({ embeds: [embed], components: [] });
                    activeGames.delete(game.id);
                }
            });
        }
    },
    
    // Exporter pour les interactions de boutons
    activeGames,
    handlePlayerMove
};
