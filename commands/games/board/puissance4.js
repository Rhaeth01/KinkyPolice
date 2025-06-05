const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const ROWS = 6;
const COLUMNS = 7;
const EMPTY = '⚪'; // Case vide
const PLAYER1_SYMBOL = '🔴'; // Jeton joueur 1 (rouge)
const PLAYER2_SYMBOL = '🟡'; // Jeton joueur 2 (jaune)
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
                cell = cell === PLAYER1_SYMBOL ? '🌟' : '⭐';
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
            await i.reply({ content: '🚫 La partie est terminée.', flags: MessageFlags.Ephemeral });
            return;
        }

        const activePlayerUser = game.currentPlayerSymbol === PLAYER1_SYMBOL ? game.player1 : game.player2;
        if (i.user.id !== activePlayerUser.id) {
            await i.reply({ content: `⏰ Ce n'est pas votre tour ! C'est au tour de ${activePlayerUser}.`, flags: MessageFlags.Ephemeral });
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
        await interaction.reply({ content: '❌ Cette colonne est pleine ! Choisissez une autre colonne.', flags: MessageFlags.Ephemeral });
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
        .setColor(game.currentPlayerSymbol === PLAYER1_SYMBOL ? '#F44336' : '#FFEB3B')
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
        
        const botCol = getBotMove(game.board);
        
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

function getBotMove(board) {
    // IA améliorée avec stratégie
    
    // 1. Vérifier si le bot peut gagner
    for (let c = 0; c < COLUMNS; c++) {
        if (board[0][c] === EMPTY) {
            const testBoard = board.map(row => [...row]);
            for (let r = ROWS - 1; r >= 0; r--) {
                if (testBoard[r][c] === EMPTY) {
                    testBoard[r][c] = PLAYER2_SYMBOL;
                    if (checkWin(testBoard, PLAYER2_SYMBOL).hasWon) {
                        return c; // Jouer pour gagner
                    }
                    break;
                }
            }
        }
    }
    
    // 2. Vérifier si le bot doit bloquer le joueur
    for (let c = 0; c < COLUMNS; c++) {
        if (board[0][c] === EMPTY) {
            const testBoard = board.map(row => [...row]);
            for (let r = ROWS - 1; r >= 0; r--) {
                if (testBoard[r][c] === EMPTY) {
                    testBoard[r][c] = PLAYER1_SYMBOL;
                    if (checkWin(testBoard, PLAYER1_SYMBOL).hasWon) {
                        return c; // Bloquer le joueur
                    }
                    break;
                }
            }
        }
    }
    
    // 3. Jouer au centre si possible
    if (board[0][3] === EMPTY) {
        return 3;
    }
    
    // 4. Jouer dans une colonne aléatoire disponible
    const availableCols = [];
    for (let c = 0; c < COLUMNS; c++) {
        if (board[0][c] === EMPTY) {
            availableCols.push(c);
        }
    }
    
    return availableCols[Math.floor(Math.random() * availableCols.length)];
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
                )),
    async execute(interaction) {
        const gameMode = interaction.options.getString('mode');
        const gameId = `${interaction.channel.id}-${interaction.user.id}`;
        
        if (activeGames.has(gameId)) {
            return interaction.reply({ 
                content: '⚠️ Une partie est déjà en cours dans ce salon pour vous.', 
                flags: MessageFlags.Ephemeral 
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
            embedDescription = `🎯 **C'est au tour de ${game.player1}** (${PLAYER1_SYMBOL})\n\n${formatBoard(game.board)}`;
            embed.addFields(
                { name: '🔴 Joueur 1', value: `${game.player1}`, inline: true },
                { name: '🤖 IA', value: `${game.player2}`, inline: true },
                { name: '🎮 Mode', value: 'Joueur vs IA', inline: true }
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
    handlePlayerMove: async (interaction, gameId, col) => {
        const game = activeGames.get(gameId);
        if (!game) {
            return interaction.reply({ content: '❌ Partie introuvable.', flags: MessageFlags.Ephemeral });
        }
        
        const gameCollector = { stop: () => {} }; // Mock collector pour la compatibilité
        await handlePlayerMove(interaction, game, col, gameCollector);
    }
};
