const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');

// Cache pour stocker les mots
let wordCache = [];
const CACHE_SIZE = 50; // Nombre de mots à garder en cache

// Fonction pour obtenir un mot aléatoire
async function getRandomWord() {
    try {
        // Si le cache est vide, le remplir avec de nouveaux mots
        if (wordCache.length === 0) {
            const response = await fetch(`https://trouve-mot.fr/api/random/${CACHE_SIZE}`);
            if (!response.ok) throw new Error('Erreur API');
            const words = await response.json();
            wordCache = words.map(word => word.name.toUpperCase());
        }
        
        // Retourner et retirer un mot du cache
        return wordCache.pop();
    } catch (error) {
        console.error('Erreur lors de la récupération du mot:', error);
        // Mots de secours en cas d'erreur API
        const fallbackWords = [
            'DISCORD', 'SERVEUR', 'COMMUNAUTE', 'MODERATEUR', 'EMOJI',
            'MESSAGE', 'VOCAL', 'SALON', 'ROLE', 'MEMBRE'
        ];
        return fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
    }
}

const hangmanStages = [
    '```\n\n\n\n\n_______```',
    '```\n|\n|\n|\n|\n|_______```',
    '```\n|-----\n|\n|\n|\n|_______```',
    '```\n|-----\n|    O\n|\n|\n|_______```',
    '```\n|-----\n|    O\n|    |\n|\n|_______```',
    '```\n|-----\n|    O\n|   /|\n|\n|_______```',
    '```\n|-----\n|    O\n|   /|\\\n|\n|_______```',
    '```\n|-----\n|    O\n|   /|\\\n|   /\n|_______```',
    '```\n|-----\n|    O\n|   /|\\\n|   / \\\n|_______```'
];

class HangmanGame {
    constructor() {
        this.word = null;
        this.guessedLetters = new Set();
        this.remainingTries = 8;
        this.isGameOver = false;
    }

    guessLetter(letter) {
        letter = letter.toUpperCase();
        if (this.guessedLetters.has(letter)) return false;
        
        this.guessedLetters.add(letter);
        if (!this.word.includes(letter)) {
            this.remainingTries--;
        }

        if (this.remainingTries <= 0 || this.isWordGuessed()) {
            this.isGameOver = true;
        }

        return true;
    }

    isWordGuessed() {
        return [...this.word].every(letter => this.guessedLetters.has(letter));
    }

    getDisplayWord() {
        return [...this.word]
            .map(letter => this.guessedLetters.has(letter) ? letter : '_')
            .join(' ');
    }

    getGameEmbed() {
        const embed = new EmbedBuilder()
            .setTitle('Jeu du Pendu')
            .setColor(this.isGameOver ? (this.isWordGuessed() ? '#00FF00' : '#FF0000') : '#0099FF')
            .setDescription(hangmanStages[8 - this.remainingTries])
            .addFields(
                { name: 'Mot à deviner', value: this.getDisplayWord(), inline: false },
                { name: 'Lettres utilisées', value: Array.from(this.guessedLetters).join(', ') || 'Aucune', inline: true },
                { name: 'Essais restants', value: this.remainingTries.toString(), inline: true }
            );

        if (this.isGameOver) {
            embed.addFields({
                name: 'Fin de la partie !',
                value: this.isWordGuessed() ? '🎉 Félicitations ! Vous avez gagné !' : `💀 Perdu ! Le mot était : ${this.word}`,
                inline: false
            });
        }

        return embed;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pendu')
        .setDescription('Jouer au jeu du pendu')
        .addIntegerOption(option =>
            option.setName('longueur_minimum')
                .setDescription('Longueur minimum du mot (optionnel)')
                .setMinValue(3)
                .setMaxValue(15)
                .setRequired(false)),

    async execute(interaction) {
        const game = new HangmanGame();
        game.word = await getRandomWord();
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        // Créer les boutons pour chaque lettre (6 rangées de 5 boutons maximum)
        const rows = [];
        for (let i = 0; i < Math.ceil(alphabet.length / 5); i++) {
            const row = new ActionRowBuilder();
            const start = i * 5;
            const end = Math.min(start + 5, alphabet.length);
            
            for (let j = start; j < end; j++) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`letter_${alphabet[j]}`)
                        .setLabel(alphabet[j])
                        .setStyle(ButtonStyle.Primary)
                );
            }
            rows.push(row);
        }

        // Envoyer le message initial
        const response = await interaction.reply({
            embeds: [game.getGameEmbed()],
            components: rows,
            fetchReply: true
        });

        // Créer le collecteur de boutons
        const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 300000 // 5 minutes
        });

        collector.on('collect', async i => {
            const letter = i.customId.split('_')[1];
            
            if (game.guessLetter(letter)) {
                // Désactiver le bouton utilisé
                const buttonRow = rows.find(row =>
                    row.components.some(button => button.data.custom_id === `letter_${letter}`)
                );
                if (buttonRow) {
                    const button = buttonRow.components.find(b => b.data.custom_id === `letter_${letter}`);
                    button.setDisabled(true);
                    if (game.word.includes(letter)) {
                        button.setStyle(ButtonStyle.Success);
                    } else {
                        button.setStyle(ButtonStyle.Danger);
                    }
                }

                await i.update({
                    embeds: [game.getGameEmbed()],
                    components: rows
                });

                if (game.isGameOver) {
                    collector.stop();
                }
            } else {
                await i.reply({ content: 'Cette lettre a déjà été utilisée !', ephemeral: true });
            }
        });

        collector.on('end', () => {
            if (!game.isGameOver) {
                interaction.editReply({
                    embeds: [game.getGameEmbed().setFooter({ text: 'Partie terminée - Temps écoulé' })],
                    components: []
                });
            }
        });
    }
};