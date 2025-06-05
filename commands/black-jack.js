const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder, ComponentType } = require('discord.js');
const { addCurrency, removeCurrency, getUserBalance } = require('../utils/currencyManager');

// Map pour stocker les parties en cours
const activeGames = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Joue à un mini-jeu de BlackJack !')
        .addBooleanOption(option =>
            option.setName('multijoueur')
                .setDescription('Permettre à d\'autres joueurs de rejoindre la partie')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('mise')
                .setDescription('Le montant de Kinky Points à miser pour cette partie.')
                .setRequired(false)
                .setMinValue(1)),
    async execute(interaction) {
        const isMultiplayer = interaction.options.getBoolean('multijoueur') || false;
        const betAmount = interaction.options.getInteger('mise') || 0;
        const gameId = `${interaction.user.id}_${Date.now()}`;

        if (betAmount > 0) {
            const userBalance = await getUserBalance(interaction.user.id);
            if (userBalance < betAmount) {
                return interaction.reply({
                    content: `Tu n'as pas assez de Kinky Points pour miser ${betAmount} ! Ton solde actuel est de ${userBalance} Kinky Points.`,
                    ephemeral: true
                });
            }
            await removeCurrency(interaction.user.id, betAmount);
        }

        // Initialisation du jeu
        const gameData = {
            id: gameId,
            host: interaction.user.id,
            players: new Map(),
            dealerHand: [],
            deck: createDeck(),
            isMultiplayer: isMultiplayer,
            gameStarted: false,
            currentPlayerIndex: 0,
            bet: betAmount
        };

        shuffleDeck(gameData.deck);
        
        // Ajouter le créateur comme premier joueur
        gameData.players.set(interaction.user.id, {
            user: interaction.user,
            hand: [],
            finished: false,
            busted: false,
            bet: betAmount // Chaque joueur mise le même montant
        });

        activeGames.set(gameId, gameData);

        if (isMultiplayer) {
            // Mode multijoueur - permettre d'inviter des joueurs
            const inviteEmbed = new EmbedBuilder()
                .setTitle('🃏 BlackJack - Mode Multijoueur')
                .setDescription(`**${interaction.user.tag}** a créé une partie de BlackJack !\n\nUtilisez les boutons ci-dessous pour rejoindre ou démarrer la partie.`)
                .addFields(
                    { name: '👥 Joueurs', value: `${interaction.user.tag}`, inline: true },
                    { name: '🎮 Statut', value: 'En attente de joueurs', inline: true }
                )
                .setColor('#9B59B6')
                .setTimestamp();

            const joinButton = new ButtonBuilder()
                .setCustomId(`blackjack_join_${gameId}`)
                .setLabel('Rejoindre')
                .setEmoji('🎯')
                .setStyle(ButtonStyle.Success);

            const startButton = new ButtonBuilder()
                .setCustomId(`blackjack_start_${gameId}`)
                .setLabel('Démarrer')
                .setEmoji('🚀')
                .setStyle(ButtonStyle.Primary);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`blackjack_cancel_${gameId}`)
                .setLabel('Annuler')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(joinButton, startButton, cancelButton);

            const reply = await interaction.reply({ embeds: [inviteEmbed], components: [row] }).then(() => interaction.fetchReply());

            // Collecteur pour les boutons de lobby
            const lobbyCollector = reply.createMessageComponentCollector({ time: 300000 }); // 5 minutes

            lobbyCollector.on('collect', async i => {
                if (i.customId === `blackjack_join_${gameId}`) {
                    if (gameData.players.has(i.user.id)) {
                        return i.reply({ content: 'Vous participez déjà à cette partie !', ephemeral: true });
                    }
                    if (gameData.players.size >= 4) {
                        return i.reply({ content: 'Cette partie est complète (maximum 4 joueurs) !', ephemeral: true });
                    }

                    gameData.players.set(i.user.id, {
                        user: i.user,
                        hand: [],
                        finished: false,
                        busted: false
                    });

                    const playersList = Array.from(gameData.players.values()).map(p => p.user.tag).join('\n');
                    const updatedEmbed = EmbedBuilder.from(inviteEmbed)
                        .setFields(
                            { name: '👥 Joueurs', value: playersList, inline: true },
                            { name: '🎮 Statut', value: 'En attente de joueurs', inline: true }
                        );

                    await i.update({ embeds: [updatedEmbed], components: [row] });
                }
                else if (i.customId === `blackjack_start_${gameId}`) {
                    if (i.user.id !== gameData.host) {
                        return i.reply({ content: 'Seul le créateur de la partie peut la démarrer !', ephemeral: true });
                    }
                    
                    lobbyCollector.stop();
                    await i.deferUpdate();
                    await startGame(i, gameData);
                }
                else if (i.customId === `blackjack_cancel_${gameId}`) {
                    if (i.user.id !== gameData.host) {
                        return i.reply({ content: 'Seul le créateur de la partie peut l\'annuler !', ephemeral: true });
                    }
                    
                    activeGames.delete(gameId);
                    lobbyCollector.stop();
                    await i.update({ content: '❌ Partie annulée.', embeds: [], components: [] });
                }
            });

            lobbyCollector.on('end', async () => {
                if (activeGames.has(gameId) && !gameData.gameStarted) {
                    activeGames.delete(gameId);
                    // Rembourser les mises si la partie n'a pas démarré
                    for (const player of gameData.players.values()) {
                        if (gameData.bet > 0) {
                            await addCurrency(player.user.id, gameData.bet);
                        }
                    }
                }
            });

        } else {
            // Mode solo - démarrer immédiatement
            await interaction.deferReply();
            await startGame(interaction, gameData);
        }

        // Fonctions utilitaires
        async function startGame(interaction, gameData) {
            gameData.gameStarted = true;
            
            // Distribuer 2 cartes à chaque joueur et au croupier
            for (const player of gameData.players.values()) {
                player.hand.push(gameData.deck.pop(), gameData.deck.pop());
            }
            gameData.dealerHand.push(gameData.deck.pop(), gameData.deck.pop());

            await updateGameDisplay(interaction, gameData);
        }

        async function updateGameDisplay(interaction, gameData) {
            const playersArray = Array.from(gameData.players.values());
            
            // Vérifier si on a dépassé le nombre de joueurs
            if (gameData.currentPlayerIndex >= playersArray.length) {
                await endGame(interaction, gameData);
                return;
            }
            
            const currentPlayer = playersArray[gameData.currentPlayerIndex];
            
            let description = `**Tour de ${currentPlayer.user.tag}**\n\n`;
            
            // Afficher les mains de tous les joueurs
            for (const [userId, player] of gameData.players) {
                const status = player.finished ? (player.busted ? '💥 Bust' : '✅ Fini') : (userId === currentPlayer.user.id ? '🎯 En cours' : '⏳ En attente');
                description += `**${player.user.tag}** ${status}\n`;
                description += `Main : ${formatHand(player.hand)} (Total : ${handValue(player.hand)})\n\n`;
            }
            
            description += `**Croupier**\nMain : ${gameData.dealerHand[0]} et ?? (Total : ??)`;

            const embed = new EmbedBuilder()
                .setTitle('🃏 BlackJack - Partie en cours')
                .setDescription(description)
                .setColor('#9B59B6')
                .setTimestamp();

            // Boutons pour le joueur actuel
            const hitButton = new ButtonBuilder()
                .setCustomId(`blackjack_hit_${gameData.id}`)
                .setLabel('Tirer')
                .setStyle(ButtonStyle.Primary);

            const standButton = new ButtonBuilder()
                .setCustomId(`blackjack_stand_${gameData.id}`)
                .setLabel('Rester')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(hitButton, standButton);

            // Vérifier si tous les joueurs ont terminé
            const allFinished = Array.from(gameData.players.values()).every(p => p.finished);
            
            if (allFinished) {
                await endGame(interaction, gameData);
                return;
            }

            const reply = await interaction.editReply({ embeds: [embed], components: [row] });

            // Collecteur pour les actions de jeu
            const gameCollector = reply.createMessageComponentCollector({ 
                filter: i => i.user.id === currentPlayer.user.id,
                time: 60000 
            });

            gameCollector.on('collect', async i => {
                if (i.customId === `blackjack_hit_${gameData.id}`) {
                    await i.deferUpdate();
                    currentPlayer.hand.push(gameData.deck.pop());
                    
                    if (handValue(currentPlayer.hand) > 21) {
                        currentPlayer.busted = true;
                        currentPlayer.finished = true;
                        gameData.currentPlayerIndex++;
                    }
                    
                    gameCollector.stop();
                    await updateGameDisplay(i, gameData);
                }
                else if (i.customId === `blackjack_stand_${gameData.id}`) {
                    await i.deferUpdate();
                    currentPlayer.finished = true;
                    gameData.currentPlayerIndex++;
                    
                    gameCollector.stop();
                    await updateGameDisplay(i, gameData);
                }
            });

            gameCollector.on('end', (collected, reason) => {
                if (reason === 'time' && !currentPlayer.finished) {
                    currentPlayer.finished = true;
                    gameData.currentPlayerIndex++;
                    updateGameDisplay(interaction, gameData);
                }
            });
        }

        async function endGame(interaction, gameData) {
            // Tour du croupier
            while (handValue(gameData.dealerHand) < 17) {
                gameData.dealerHand.push(gameData.deck.pop());
            }

            const dealerTotal = handValue(gameData.dealerHand);
            const dealerBusted = dealerTotal > 21;
            
            // Créer l'embed avec des champs séparés pour une meilleure lisibilité
            const finalEmbed = new EmbedBuilder()
                .setTitle('🎰 BlackJack - Résultats Finaux')
                .setColor(dealerBusted ? '#2ECC71' : '#E74C3C')
                .setTimestamp();

            // Champ pour le croupier
            const dealerStatus = dealerBusted ? '💥 Bust!' : '✅ Valide';
            finalEmbed.addFields({
                name: '🎩 Croupier',
                value: `${formatHand(gameData.dealerHand)}\n**Total:** ${dealerTotal} ${dealerStatus}`,
                inline: false
            });

            // Champs pour chaque joueur avec résultats
            for (const player of gameData.players.values()) {
                const playerTotal = handValue(player.hand);
                let result, emoji, color;
                let winnings = 0;
                
                if (player.busted) {
                    result = 'Perdu (Bust)';
                    emoji = '💥';
                    color = '🔴';
                    if (gameData.bet > 0) {
                        finalEmbed.setDescription((finalEmbed.data.description || '') + `\n💸 ${player.user.displayName} perd **${gameData.bet}** Kinky Points.`);
                    }
                } else if (dealerBusted) {
                    result = 'Gagné (Croupier bust)';
                    emoji = '🎉';
                    color = '🟢';
                    winnings = gameData.bet > 0 ? gameData.bet * 2 : 20; // Gain de base ou double de la mise
                    await addCurrency(player.user.id, winnings);
                    finalEmbed.setDescription((finalEmbed.data.description || '') + `\n💰 ${player.user.displayName} gagne **${winnings}** Kinky Points !`);
                } else if (playerTotal > dealerTotal) {
                    result = 'Gagné';
                    emoji = '🎉';
                    color = '🟢';
                    winnings = gameData.bet > 0 ? gameData.bet * 2 : 20; // Gain de base ou double de la mise
                    await addCurrency(player.user.id, winnings);
                    finalEmbed.setDescription((finalEmbed.data.description || '') + `\n💰 ${player.user.displayName} gagne **${winnings}** Kinky Points !`);
                } else if (playerTotal < dealerTotal) {
                    result = 'Perdu';
                    emoji = '💥';
                    color = '🔴';
                    if (gameData.bet > 0) {
                        finalEmbed.setDescription((finalEmbed.data.description || '') + `\n💸 ${player.user.displayName} perd **${gameData.bet}** Kinky Points.`);
                    }
                } else {
                    result = 'Égalité';
                    emoji = '🤝';
                    color = '🟡';
                    if (gameData.bet > 0) {
                        await addCurrency(player.user.id, gameData.bet); // Rembourser la mise en cas d'égalité
                        finalEmbed.setDescription((finalEmbed.data.description || '') + `\n🤝 ${player.user.displayName} récupère sa mise de **${gameData.bet}** Kinky Points.`);
                    }
                }
                
                finalEmbed.addFields({
                    name: `${emoji} ${player.user.displayName}`,
                    value: `${formatHand(player.hand)}\n**Total:** ${playerTotal}\n${color} **${result}**`,
                    inline: true
                });
            }

            // Ajouter un footer avec des statistiques
            const winners = Array.from(gameData.players.values()).filter(p =>
                !p.busted && (dealerBusted || handValue(p.hand) > dealerTotal)
            ).length;
            
            finalEmbed.setFooter({
                text: `🏆 ${winners}/${gameData.players.size} joueur(s) gagnant(s)`
            });

            await interaction.editReply({ embeds: [finalEmbed], components: [] });
            activeGames.delete(gameData.id);
        }

        function createDeck() {
            const suits = ['♠️', '♥️', '♦️', '♣️'];
            const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
            const deck = [];
            for (const suit of suits) {
                for (const value of values) {
                    deck.push(`${value}${suit}`);
                }
            }
            return deck;
        }

        function shuffleDeck(deck) {
            for (let i = deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [deck[i], deck[j]] = [deck[j], deck[i]];
            }
        }

        function cardValue(card) {
            const value = card.slice(0, -2).replace(/[^A-Z0-9]/gi, '');
            if (value === 'A') return 11;
            if (['K', 'Q', 'J'].includes(value)) return 10;
            return parseInt(value);
        }

        function handValue(hand) {
            let total = 0;
            let aces = 0;
            for (const card of hand) {
                if (card.startsWith('A')) aces++;
                total += cardValue(card);
            }
            while (total > 21 && aces > 0) {
                total -= 10;
                aces--;
            }
            return total;
        }

        function formatHand(hand) {
            return hand.join(' ');
        }
    }
};
