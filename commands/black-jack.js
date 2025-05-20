const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Joue à un mini-jeu de BlackJack !'),
    async execute(interaction) {
        // Initialisation du jeu
        let playerHand = [];
        let dealerHand = [];
        let deck = createDeck();
        shuffleDeck(deck);

        // Distribuer 2 cartes à chaque joueur
        playerHand.push(deck.pop(), deck.pop());
        dealerHand.push(deck.pop(), deck.pop());

        // Embed de départ
        const embed = new EmbedBuilder()
            .setTitle('🃏 BlackJack')
            .setDescription(`Votre main : ${formatHand(playerHand)} (Total : ${handValue(playerHand)})\nMain du croupier : ${dealerHand[0]} et ??`)
            .setColor('#9B59B6')
            .setTimestamp();

        // Boutons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('hit')
                .setLabel('Tirer')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('stand')
                .setLabel('Rester')
                .setStyle(ButtonStyle.Secondary)
        );

        // Envoie le message initial
        const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        // Collecteur de boutons
        const filter = i => i.user.id === interaction.user.id && ['hit', 'stand'].includes(i.customId);
        const collector = reply.createMessageComponentCollector({ filter, time: 120000 });

        collector.on('collect', async i => {
            if (i.customId === 'hit') {
                playerHand.push(deck.pop());
                if (handValue(playerHand) > 21) {
                    // Perdu
                    collector.stop('bust');
                    return await i.update({
                        embeds: [getEndEmbed(playerHand, dealerHand, 'perdu')],
                        components: []
                    });
                } else {
                    // Continue
                    await i.update({
                        embeds: [getGameEmbed(playerHand, dealerHand)],
                        components: [row]
                    });
                }
            } else if (i.customId === 'stand') {
                // Tour du croupier
                while (handValue(dealerHand) < 17) {
                    dealerHand.push(deck.pop());
                }
                collector.stop('stand');
                // Résultat final
                await i.update({
                    embeds: [getEndEmbed(playerHand, dealerHand)],
                    components: []
                });
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason !== 'bust' && reason !== 'stand') {
                await interaction.editReply({ content: '⏰ Temps écoulé, partie annulée.', embeds: [], components: [] });
            }
        });

        // Fonctions utilitaires internes
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
        function getGameEmbed(playerHand, dealerHand) {
            return new EmbedBuilder()
                .setTitle('🃏 BlackJack')
                .setDescription(`Votre main : ${formatHand(playerHand)} (Total : ${handValue(playerHand)})\nMain du croupier : ${dealerHand[0]} et ??`)
                .setColor('#9B59B6')
                .setTimestamp();
        }
        function getEndEmbed(playerHand, dealerHand, forceLose = null) {
            const playerTotal = handValue(playerHand);
            const dealerTotal = handValue(dealerHand);
            let result;
            if (forceLose === 'perdu' || playerTotal > 21) {
                result = '💥 **Perdu !** Vous avez dépassé 21.';
            } else if (dealerTotal > 21) {
                result = '🎉 **Gagné !** Le croupier a dépassé 21.';
            } else if (playerTotal > dealerTotal) {
                result = '🎉 **Gagné !** Votre main est supérieure à celle du croupier.';
            } else if (playerTotal < dealerTotal) {
                result = '💥 **Perdu !** Le croupier a une meilleure main.';
            } else {
                result = '🤝 **Égalité !**';
            }
            return new EmbedBuilder()
                .setTitle('🃏 BlackJack - Résultat')
                .setDescription(`${result}\n\nVotre main : ${formatHand(playerHand)} (Total : ${playerTotal})\nMain du croupier : ${formatHand(dealerHand)} (Total : ${dealerTotal})`)
                .setColor('#9B59B6')
                .setTimestamp();
        }
    }
};
