const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const GAME_STATES = {
    SETUP: 'setup',
    PLAYING: 'playing',
    ENDED: 'ended'
};

const BOARD_SIZE = 10;
const SHIPS = [
    { name: 'Porte-avions', size: 5 },
    { name: 'Cuirassé', size: 4 },
    { name: 'Croiseur', size: 3 },
    { name: 'Sous-marin', size: 3 },
    { name: 'Torpilleur', size: 2 }
];

class BattleshipGame {
    constructor(player1, player2) {
        this.player1 = player1;
        this.player2 = player2;
        this.currentPlayer = player1;
        this.state = GAME_STATES.SETUP;
        this.boards = {
            [player1.id]: this.createEmptyBoard(),
            [player2.id]: this.createEmptyBoard()
        };
        this.ships = {
            [player1.id]: [],
            [player2.id]: []
        };
        this.hits = {
            [player1.id]: 0,
            [player2.id]: 0
        };
        this.totalShipCells = SHIPS.reduce((acc, ship) => acc + ship.size, 0);
    }

    createEmptyBoard() {
        return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill('🌊')); // 🌊 = eau
    }

    placeShip(playerId, ship, startRow, startCol, orientation) {
        const board = this.boards[playerId];
        const newShips = this.ships[playerId];

        const { size } = ship;
        const cells = [];

        if (orientation === 'horizontal') {
            if (startCol + size > BOARD_SIZE) return false;
            for (let i = 0; i < size; i++) {
                cells.push({ row: startRow, col: startCol + i });
            }
        } else { // vertical
            if (startRow + size > BOARD_SIZE) return false;
            for (let i = 0; i < size; i++) {
                cells.push({ row: startRow + i, col: startCol });
            }
        }

        // Vérifier les chevauchements
        for (const cell of cells) {
            if (board[cell.row][cell.col] !== '🌊') {
                return false;
            }
        }

        // Placer le navire
        for (const cell of cells) {
            board[cell.row][cell.col] = '🚢'; // 🚢 = navire
        }
        newShips.push({ ...ship, cells });
        return true;
    }

    // Fonction pour générer un placement aléatoire des navires
    autoPlaceShips(playerId) {
        const board = this.boards[playerId];
        this.ships[playerId] = []; // Réinitialiser les navires pour le placement automatique

        for (const ship of SHIPS) {
            let placed = false;
            while (!placed) {
                const startRow = Math.floor(Math.random() * BOARD_SIZE);
                const startCol = Math.floor(Math.random() * BOARD_SIZE);
                const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';

                // Réinitialiser la case pour le placement
                for (let r = 0; r < BOARD_SIZE; r++) {
                    for (let c = 0; c < BOARD_SIZE; c++) {
                        if (board[r][c] === '🚢') {
                            board[r][c] = '🌊';
                        }
                    }
                }
                this.ships[playerId] = []; // Réinitialiser les navires pour le placement

                placed = this.placeShip(playerId, ship, startRow, startCol, orientation);
            }
        }
    }

    takeShot(targetPlayerId, row, col) {
        const targetBoard = this.boards[targetPlayerId];
        const targetShips = this.ships[targetPlayerId];

        if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
            return 'invalid'; // Hors limites
        }

        if (targetBoard[row][col] === '❌' || targetBoard[row][col] === '🔥') {
            return 'already_shot'; // Déjà tiré ici
        }

        if (targetBoard[row][col] === '🚢') {
            targetBoard[row][col] = '🔥'; // 🔥 = touché
            this.hits[this.currentPlayer.id]++;

            // Vérifier si un navire est coulé
            let sunkShip = null;
            for (const ship of targetShips) {
                const allCellsHit = ship.cells.every(cell => targetBoard[cell.row][cell.col] === '🔥');
                if (allCellsHit && !ship.sunk) {
                    ship.sunk = true;
                    sunkShip = ship.name;
                    break;
                }
            }

            if (this.hits[this.currentPlayer.id] === this.totalShipCells) {
                this.state = GAME_STATES.ENDED;
                return 'win'; // Le joueur actuel a gagné
            }
            return sunkShip ? `hit_and_sunk:${sunkShip}` : 'hit';
        } else {
            targetBoard[row][col] = '❌'; // ❌ = raté
            return 'miss';
        }
    }

    switchPlayer() {
        this.currentPlayer = (this.currentPlayer.id === this.player1.id) ? this.player2 : this.player1;
    }

    getBoardDisplay(playerId, showShips = false) {
        let display = '  A B C D E F G H I J\n';
        for (let r = 0; r < BOARD_SIZE; r++) {
            display += `${r < 9 ? ' ' : ''}${r + 1}`;
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = this.boards[playerId][r][c];
                if (!showShips && cell === '🚢') {
                    display += ' 🌊'; // Cacher les navires de l'adversaire
                } else {
                    display += ` ${cell}`;
                }
            }
            display += '\n';
        }
        return `\`\`\`\n${display}\`\`\``;
    }

    getOpponent(playerId) {
        return playerId === this.player1.id ? this.player2 : this.player1;
    }
}

const activeGames = new Map(); // Map pour stocker les parties en cours

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bataille-navale')
        .setDescription('Joue à une partie de Bataille Navale.')
        .addUserOption(option =>
            option.setName('adversaire')
                .setDescription('La personne contre qui vous voulez jouer')
                .setRequired(true)),
    async execute(interaction) {
        const opponent = interaction.options.getUser('adversaire');
        const player1 = interaction.user;
        const player2 = opponent;

        if (player1.id === player2.id) {
            return interaction.reply({ content: 'Vous ne pouvez pas jouer contre vous-même !', ephemeral: true });
        }

        if (activeGames.has(player1.id) || activeGames.has(player2.id)) {
            return interaction.reply({ content: 'L\'un des joueurs est déjà dans une partie !', ephemeral: true });
        }

        const game = new BattleshipGame(player1, player2);
        activeGames.set(player1.id, game);
        activeGames.set(player2.id, game);

        // Demander aux joueurs de placer leurs navires
        const setupEmbed = new EmbedBuilder()
            .setTitle('Bataille Navale - Placement des navires')
            .setDescription(`C'est au tour de ${player1} et ${player2} de placer leurs navires.`)
            .setColor('#0099ff');

        const setupButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('battleship_auto_place')
                    .setLabel('Placement automatique')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('battleship_manual_place')
                    .setLabel('Placement manuel (à venir)')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true) // Désactiver pour l'instant
            );

        await interaction.reply({ embeds: [setupEmbed], components: [setupButtons] });

        // Gérer les interactions des boutons
        const filter = i => i.customId.startsWith('battleship_') && (i.user.id === player1.id || i.user.id === player2.id);
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 600000 }); // 10 minutes pour le setup

        let playersReady = {
            [player1.id]: false,
            [player2.id]: false
        };

        collector.on('collect', async i => {
            const game = activeGames.get(i.user.id);
            if (!game) return i.reply({ content: 'Cette partie n\'existe plus.', ephemeral: true });

            if (i.customId === 'battleship_auto_place') {
                if (playersReady[i.user.id]) {
                    return i.reply({ content: 'Vous avez déjà placé vos navires !', ephemeral: true });
                }
                game.autoPlaceShips(i.user.id);
                playersReady[i.user.id] = true;
                await i.reply({ content: `Vos navires ont été placés automatiquement. Voici votre plateau :\n${game.getBoardDisplay(i.user.id, true)}`, ephemeral: true });

                if (playersReady[player1.id] && playersReady[player2.id]) {
                    game.state = GAME_STATES.PLAYING;
                    collector.stop('setup_complete'); // Arrêter le collecteur de setup

                    const gameStartEmbed = new EmbedBuilder()
                        .setTitle('Bataille Navale - La partie commence !')
                        .setDescription(`Les navires sont placés ! C'est au tour de ${game.currentPlayer} de jouer.`)
                        .setColor('#00ff00');

                    await interaction.followUp({ embeds: [gameStartEmbed] });
                    await sendGameTurnMessage(interaction.channel, game);
                }
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason !== 'setup_complete') {
                activeGames.delete(player1.id);
                activeGames.delete(player2.id);
                interaction.followUp({ content: 'La phase de placement des navires a expiré. La partie est annulée.', ephemeral: true });
            }
        });
    },
};

async function sendGameTurnMessage(channel, game) {
    const currentPlayer = game.currentPlayer;
    const opponentPlayer = game.getOpponent(currentPlayer.id);

    const gameEmbed = new EmbedBuilder()
        .setTitle(`Bataille Navale - C'est au tour de ${currentPlayer.username} !`)
        .setDescription(`Votre plateau (vos navires) :\n${game.getBoardDisplay(currentPlayer.id, true)}\n\nPlateau de l'adversaire (vos tirs) :\n${game.getBoardDisplay(opponentPlayer.id, false)}`)
        .setColor('#ffcc00');

    await channel.send({ embeds: [gameEmbed] });
    await channel.send(`${currentPlayer}, veuillez entrer les coordonnées de votre tir (ex: A1, J10).`);

    const filter = m => m.author.id === currentPlayer.id && /^[A-Ja-j]([1-9]|10)$/.test(m.content);
    const collector = channel.createMessageCollector({ filter, time: 60000, max: 1 }); // 60 secondes pour tirer

    collector.on('collect', async m => {
        const game = activeGames.get(m.author.id);
        if (!game || game.state !== GAME_STATES.PLAYING || game.currentPlayer.id !== m.author.id) {
            return m.reply({ content: 'Ce n\'est pas votre tour ou la partie est terminée.', ephemeral: true });
        }

        const input = m.content.toUpperCase();
        const colChar = input.charAt(0);
        const rowNum = parseInt(input.substring(1));

        const col = colChar.charCodeAt(0) - 'A'.charCodeAt(0);
        const row = rowNum - 1;

        const result = game.takeShot(opponentPlayer.id, row, col);

        let replyContent = '';
        let gameOver = false;

        switch (result) {
            case 'invalid':
                replyContent = 'Coordonnées invalides. Veuillez réessayer (ex: A1, J10).';
                await sendGameTurnMessage(channel, game); // Redemander le tir
                return;
            case 'already_shot':
                replyContent = 'Vous avez déjà tiré à cet endroit. Veuillez réessayer.';
                await sendGameTurnMessage(channel, game); // Redemander le tir
                return;
            case 'hit':
                replyContent = 'Touché !';
                break;
            case 'miss':
                replyContent = 'Raté !';
                break;
            case 'win':
                replyContent = `Félicitations ${currentPlayer.username}, vous avez coulé tous les navires de l'adversaire et gagné la partie !`;
                gameOver = true;
                break;
            default:
                if (result.startsWith('hit_and_sunk:')) {
                    const sunkShipName = result.split(':')[1];
                    replyContent = `Touché et coulé ! Vous avez coulé le ${sunkShipName} de l'adversaire !`;
                }
                break;
        }

        await m.reply(replyContent);

        if (gameOver) {
            activeGames.delete(game.player1.id);
            activeGames.delete(game.player2.id);
            const finalEmbed = new EmbedBuilder()
                .setTitle('Partie terminée !')
                .setDescription(`${currentPlayer.username} a gagné la partie !`)
                .setColor('#00ff00');
            await channel.send({ embeds: [finalEmbed] });
        } else {
            game.switchPlayer();
            await sendGameTurnMessage(channel, game);
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const game = activeGames.get(currentPlayer.id);
            if (game && game.state === GAME_STATES.PLAYING) {
                activeGames.delete(game.player1.id);
                activeGames.delete(game.player2.id);
                await channel.send(`La partie de Bataille Navale entre ${game.player1} et ${game.player2} a été annulée car ${currentPlayer.username} n'a pas tiré à temps.`);
            }
        }
    });
}
