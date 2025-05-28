const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, MessageFlags, InteractionResponse } = require('discord.js');

const ROWS = 6;
const COLUMNS = 7;
const EMPTY = '⚫'; // Jeton vide (trou vide)
const PLAYER1_SYMBOL = '🔴'; // Jeton joueur 1
const PLAYER2_SYMBOL = '🟡'; // Jeton joueur 2

// Map pour stocker les parties en cours
const activeGames = new Map();

// Map pour éviter les doubles clics (verrouillage temporaire)
const interactionLocks = new Map();

function createBoard() {
    return Array(ROWS).fill(0).map(() => Array(COLUMNS).fill(EMPTY));
}

function formatBoard(board) {
    let boardString = '```\n'; // Utiliser un bloc de code pour un meilleur alignement
    const topNumbers = '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣'; // Numéros de colonne
    boardString += '⬇️' + topNumbers + '⬇️\n'; // Ajouter les numéros en haut avec des flèches

    for (let r = 0; r < ROWS; r++) {
        boardString += '🟦'; // Bordure gauche
        for (let c = 0; c < COLUMNS; c++) {
            boardString += board[r][c];
        }
        boardString += '🟦\n'; // Bordure droite
    }
    boardString += '⬆️' + '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣' + '⬆️\n'; // Numéros de colonne en bas aussi
    boardString += '```';
    return boardString;
}


async function startGameCollector(game, interaction) {
    // Assurez-vous que game.message est bien le message de l'interaction
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
            await i.reply({ content: 'La partie est terminée.', flags: MessageFlags.Ephemeral });
            return;
        }

        const activePlayerUser = game.currentPlayerSymbol === PLAYER1_SYMBOL ? game.player1 : game.player2;
        if (i.user.id !== activePlayerUser.id) {
            await i.reply({ content: `Ce n'est pas votre tour ! C'est au tour de ${activePlayerUser}.`, flags: MessageFlags.Ephemeral });
            return;
        }

        const col = parseInt(i.customId.split('_')[1]);
        await handlePlayerMove(i, game, col, gameCollector);
    });

    gameCollector.on('end', collected => {
        if (!game.gameEnded) {
            const embed = new EmbedBuilder()
                .setTitle('Puissance 4')
                .setDescription(`La partie est terminée (temps écoulé).\n\n${formatBoard(game.board)}`)
                .setColor('Red');
            game.message.edit({ embeds: [embed], components: [] });
            activeGames.delete(game.id); // Supprimer la partie des jeux actifs
        }
    });
}

async function handlePlayerMove(interaction, game, col, gameCollector) {
    let placed = false;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (game.board[r][col] === EMPTY) {
            game.board[r][col] = game.currentPlayerSymbol;
            placed = true;
            break;
        }
    }

    if (!placed) {
        await interaction.reply({ content: 'Cette colonne est pleine ! Choisissez une autre colonne.', flags: MessageFlags.Ephemeral });
        return;
    }

    // Vérifier la victoire
    if (checkWin(game.board, game.currentPlayerSymbol)) {
        const winner = game.currentPlayerSymbol === PLAYER1_SYMBOL ? game.player1 : game.player2;
        const embed = new EmbedBuilder()
            .setTitle('Puissance 4')
            .setDescription(`🎉 ${winner} (${game.currentPlayerSymbol}) a gagné !\n\n${formatBoard(game.board)}`)
            .setColor('Green');
        game.gameEnded = true;
        await interaction.update({ embeds: [embed], components: [] });
        gameCollector.stop(); // Arrêter le collecteur
        activeGames.delete(game.id); // Supprimer la partie des jeux actifs
        return;
    }

    // Vérifier l'égalité
    if (checkDraw(game.board)) {
        const embed = new EmbedBuilder()
            .setTitle('Puissance 4')
            .setDescription(`🤝 Match nul !\n\n${formatBoard(game.board)}`)
            .setColor('Yellow');
        game.gameEnded = true;
        await interaction.update({ embeds: [embed], components: [] });
        gameCollector.stop(); // Arrêter le collecteur
        activeGames.delete(game.id); // Supprimer la partie des jeux actifs
        return;
    }

    // Changer de joueur
    game.currentPlayerSymbol = game.currentPlayerSymbol === PLAYER1_SYMBOL ? PLAYER2_SYMBOL : PLAYER1_SYMBOL;
    const nextPlayerUser = game.currentPlayerSymbol === PLAYER1_SYMBOL ? game.player1 : game.player2;
    const embed = new EmbedBuilder()
        .setTitle('Puissance 4')
        .setDescription(`C'est au tour de ${nextPlayerUser} (${game.currentPlayerSymbol})\n${game.player1} (${PLAYER1_SYMBOL}) contre ${game.player2} (${PLAYER2_SYMBOL})\n\n${formatBoard(game.board)}`)
        .setColor(game.currentPlayerSymbol === PLAYER1_SYMBOL ? 'Red' : 'Yellow'); // Mettre à jour la couleur de l'embed
    // Si c'est le tour du bot en mode PvE
    if (game.isPvE && game.currentPlayerSymbol === PLAYER2_SYMBOL) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Délai pour l'expérience utilisateur
        const botCol = getBotMove(game.board);
        // Utiliser game.message.edit pour mettre à jour le message du jeu
        await game.message.edit({ embeds: [embed], components: createGameButtons() });
        await handlePlayerMove(interaction, game, botCol, gameCollector);
    } else {
        // Pour le tour du joueur, utiliser interaction.update
        await interaction.update({ embeds: [embed], components: createGameButtons() });
    }
}

function getBotMove(board) {
    const availableCols = [];
    for (let c = 0; c < COLUMNS; c++) {
        if (board[0][c] === EMPTY) { // Vérifie si la colonne n'est pas pleine
            availableCols.push(c);
        }
    }
    // IA simple: choisir une colonne aléatoire parmi les disponibles
    return availableCols[Math.floor(Math.random() * availableCols.length)];
}


function createGameButtons() {
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('col_0').setLabel('1').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('col_1').setLabel('2').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('col_2').setLabel('3').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('col_3').setLabel('4').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('col_4').setLabel('5').setStyle(ButtonStyle.Primary),
        );
    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('col_5').setLabel('6').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('col_6').setLabel('7').setStyle(ButtonStyle.Primary),
        );
    return [row1, row2];
}

function checkWin(board, player) {
    // Vérifier les lignes
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c <= COLUMNS - 4; c++) {
            if (board[r][c] === player &&
                board[r][c + 1] === player &&
                board[r][c + 2] === player &&
                board[r][c + 3] === player) {
                return true;
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
                return true;
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
                return true;
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
                return true;
            }
        }
    }

    return false;
}

function checkDraw(board) {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLUMNS; c++) {
            if (board[r][c] === EMPTY) {
                return false; // Il y a encore des cases vides
            }
        }
    }
    return true; // Toutes les cases sont remplies
}




module.exports = {
    data: new SlashCommandBuilder()
        .setName('puissance4')
        .setDescription('Joue à une partie de Puissance 4.')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Choisissez le mode de jeu')
                .setRequired(true)
                .addChoices(
                    { name: 'Joueur contre Joueur (PvP)', value: 'pvp' },
                    { name: 'Joueur contre Bot (PvE)', value: 'pve' }
                )),
    async execute(interaction) {
        const gameMode = interaction.options.getString('mode');
        const gameId = `${interaction.channel.id}-${interaction.user.id}`;
        if (activeGames.has(gameId)) {
            return interaction.reply({ content: 'Une partie est déjà en cours dans ce salon.', flags: MessageFlags.Ephemeral });
        }

        const game = {
            id: gameId,
            board: createBoard(),
            player1: interaction.user,
            player2: null,
            currentPlayerSymbol: PLAYER1_SYMBOL, // Jeton du joueur actuel
            gameEnded: false,
            isPvE: gameMode === 'pve',
            message: null, // Pour stocker le message du jeu
            interactionChannel: interaction.channel,
        };

        activeGames.set(gameId, game);

        if (game.isPvE) {
            game.player2 = interaction.client.user; // Le bot est le joueur 2
        }

        const embed = new EmbedBuilder()
            .setTitle('Puissance 4')
            .setColor('Red'); // Couleur du joueur 1

        let embedDescription;
        if (game.isPvE) {
            embedDescription = `C'est au tour de ${game.player1} (${PLAYER1_SYMBOL})\n${game.player1} (${PLAYER1_SYMBOL}) contre ${game.player2} (${PLAYER2_SYMBOL})\n\n${formatBoard(game.board)}`;
        } else {
            embedDescription = `En attente d'un deuxième joueur...\n${game.player1} (${PLAYER1_SYMBOL}) contre ? (${PLAYER2_SYMBOL})\n\n${formatBoard(game.board)}`;
        }
        embed.setDescription(embedDescription);

        if (game.isPvE) {
            await interaction.reply({
                embeds: [embed],
                components: createGameButtons(), // Utiliser la fonction qui retourne un tableau de ActionRowBuilder
                withResponse: true, // Utiliser withResponse à la place de fetchReply
            });
        } else {
            const joinButton = new ButtonBuilder()
                .setCustomId(`join_game_${game.id}`)
                .setLabel('Rejoindre la partie')
                .setStyle(ButtonStyle.Success);
            const initialRow = new ActionRowBuilder().addComponents(joinButton);
            await interaction.reply({
                embeds: [embed],
                components: [initialRow],
                withResponse: true, // Utiliser withResponse à la place de fetchReply
            });

            const joinCollector = game.message.createMessageComponentCollector({
                filter: i => i.customId === `join_game_${game.id}` && i.user.id !== game.player1.id,
                max: 1,
                time: 60000, // 60 secondes pour qu'un joueur rejoigne
            });

            joinCollector.on('collect', async i => {
                // Vérifier le verrouillage pour éviter les doubles clics
                const lockKey = `${i.user.id}_${i.customId}`;
                if (interactionLocks.has(lockKey)) {
                    console.log(`[PUISSANCE4] Double clic détecté pour: ${i.customId}, LockKey: ${lockKey}`);
                    return;
                }
                interactionLocks.set(lockKey, Date.now());
                setTimeout(() => interactionLocks.delete(lockKey), 3000);

                game.player2 = i.user;
                embed.setDescription(`C'est au tour de ${game.player1} (${PLAYER1_SYMBOL})\n${game.player1} (${PLAYER1_SYMBOL}) contre ${game.player2} (${PLAYER2_SYMBOL})\n\n${formatBoard(game.board)}`);
                await i.update({ embeds: [embed], components: createGameButtons() }); // Utiliser la fonction qui retourne un tableau de ActionRowBuilder
                startGameCollector(game, interaction); // Lancer le collecteur de jeu après qu'un joueur ait rejoint
            });

            joinCollector.on('end', async collected => {
                if (!game.player2 && !game.gameEnded) { // Vérifier si la partie n'a pas déjà commencé ou été annulée
                    embed.setDescription('Personne n\'a rejoint la partie. La partie est annulée.');
                    embed.setColor('Red');
                    await game.message.edit({ embeds: [embed], components: [] });
                    activeGames.delete(game.id); // Supprimer la partie des jeux actifs
                }
            });
            return; // Sortir pour ne pas lancer le gameCollector tout de suite en PvP
        }
        // Lancer le gameCollector directement si c'est PvE
        startGameCollector(game, interaction);
    },
};
