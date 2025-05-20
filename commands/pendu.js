const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');

// Cache pour stocker les mots
let wordCache = [];
const CACHE_SIZE = 50; // Nombre de mots à garder en cache

// Fonction pour obtenir un mot aléatoire
async function getRandomWord(minLength = 3) {
    try {
        // Si le cache est vide, le remplir avec de nouveaux mots
        if (wordCache.length === 0) {
            const response = await fetch(`https://trouve-mot.fr/api/random/${CACHE_SIZE}?min=${minLength}`);
            if (!response.ok) throw new Error(`Erreur API (${response.status})`);
            const words = await response.json();
            // Filtrer les mots sans accents (lettres accentuées)
            const regexNoAccent = /^[A-Z0-9]+$/i;
            wordCache = words
                .map(word => word.name.toUpperCase())
                .filter(word => regexNoAccent.test(word));
            // Si aucun mot sans accent, fallback sur tous les mots
            if (wordCache.length === 0) {
                wordCache = words.map(word => word.name.toUpperCase());
            }
        }
        // Retourner et retirer un mot du cache
        return wordCache.pop();
    } catch (error) {
        console.error('Erreur API :', error);
        // Mots de secours en cas d'erreur API
        const fallbackWords = [
            'DISCORD', 'SERVEUR', 'COMMUNAUTE', 'MODERATEUR', 'EMOJI',
            'MESSAGE', 'VOCAL', 'SALON', 'ROLE', 'MEMBRE'
        ];
        return fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
    }
}

// Étapes du pendu avec des caractères ASCII
const hangmanStages = [
    '```\n\n\n\n\n```',
    '```\n\n\n\n_______```',
    '```\n|\n|\n|\n|_______```',
    '```\n|/\n|\n|\n|_______```',
    '```\n|/---\n|\n|\n|_______```',
    '```\n|/---\n|  O\n|\n|_______```',
    '```\n|/---\n|  O\n|  |\n|_______```',
    '```\n|/---\n|  O\n| /|\n|_______```',
    '```\n|/---\n|  O\n| /|\\\n|_______```',
    '```\n|/---\n|  O\n| /|\\\n| /\n|_______```',
    '```\n|/---\n|  O\n| /|\\\n| / \\\n|_______```'
];

class HangmanGame {
    constructor() {
        this.word = null;
        this.guessedLetters = new Set();
        this.remainingTries = 8;
        this.isGameOver = false;
        this.startTime = null;
    }

    async initialize(minLength = 5) {
        this.word = await getRandomWord(minLength);
        this.startTime = Date.now();
        return this;
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
        const stageIndex = 8 - this.remainingTries;
        const stage = hangmanStages[stageIndex] || hangmanStages[0];
        
        // Tri des lettres utilisées pour une meilleure lisibilité
        const usedLetters = [...this.guessedLetters].sort().join(' ');
        
        let title, description, color;
        
        if (this.isGameOver) {
            if (this.isWordGuessed()) {
                title = '🎉 Victoire !';
                description = `Bravo ! Vous avez trouvé le mot : **${this.word}**`;
                color = '#2ECC71'; // Vert
            } else {
                title = '💀 Défaite';
                description = `Dommage ! Le mot était : **${this.word}**`;
                color = '#E74C3C'; // Rouge
            }
        } else {
            title = '🎮 Jeu du Pendu';
            description = 'Devinez le mot en sélectionnant les lettres !';
            color = '#3498DB'; // Bleu
        }
        
        // Calcul du temps écoulé
        const elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .addFields(
                { name: 'Mot à deviner', value: `\`\`\`${this.getDisplayWord()}\`\`\``, inline: false },
                { name: 'Lettres utilisées', value: usedLetters || 'Aucune', inline: true },
                { name: 'Erreurs', value: `${8 - this.remainingTries}/8`, inline: true },
                { name: 'Temps', value: timeString, inline: true }
            )
            .setFooter({ text: 'Cliquez sur les boutons pour proposer une lettre' })
            .setTimestamp();
            
        // Ajouter le dessin du pendu
        embed.addFields({ name: '\u200b', value: stage, inline: false });
        
        return embed;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pendu')
        .setDescription('Joue au jeu du pendu')
        .addIntegerOption(option => 
            option.setName('longueur')
                .setDescription('Longueur minimale du mot (3-12)')
                .setMinValue(3)
                .setMaxValue(12)
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const minLength = interaction.options.getInteger('longueur') || 5;
            const game = await new HangmanGame().initialize(minLength);
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const rows = [];
            
            // Limiter à 5 rangées maximum (contrainte Discord)
            for (let i = 0; i < Math.min(alphabet.length, 25); i += 5) {
                const row = new ActionRowBuilder();
                const endIndex = Math.min(i + 5, alphabet.length);
                
                for (let j = i; j < endIndex; j++) {
                    const letter = alphabet[j];
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`letter_${letter}`)
                            .setLabel(letter)
                            .setStyle(ButtonStyle.Primary)
                    );
                }
                
                if (rows.length < 5) { // Ne pas dépasser 5 rangées
                    rows.push(row);
                }
            }

            // Envoyer le message initial
            const response = await interaction.editReply({
                embeds: [game.getGameEmbed()],
                components: rows,
                fetchReply: true
            });

            // Créer le collecteur de boutons
            const collector = response.createMessageComponentCollector({
                filter: i => {
                    // Vérifier si l'interaction vient d'un membre du serveur
                    if (!i.member) return false;
                    // Vérifier si le jeu n'est pas terminé
                    if (game.isGameOver) return false;
                    return true;
                },
                time: 300000 // 5 minutes
            });

            collector.on('collect', async i => {
                const letter = i.customId.split('_')[1];
                
                if (game.guessLetter(letter)) {
                    // Mettre à jour visuellement le bouton
                    for (const row of rows) {
                        for (const button of row.components) {
                            if (button.data.custom_id === `letter_${letter}`) {
                                button.setDisabled(true);
                                if (game.word.includes(letter)) {
                                    button.setStyle(ButtonStyle.Success);
                                } else {
                                    button.setStyle(ButtonStyle.Danger);
                                }
                            }
                        }
                    }

                    await i.update({
                        embeds: [game.getGameEmbed()],
                        components: game.isGameOver ? [] : rows
                    });

                    if (game.isGameOver) {
                        collector.stop();
                    }
                } else {
                    await i.reply({ 
                        content: 'Cette lettre a déjà été utilisée !', 
                        ephemeral: true 
                    });
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
            
        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande pendu:', error);
            await interaction.editReply({
                content: '⚠️ Une erreur est survenue lors du démarrage du jeu.',
                embeds: [],
                components: []
            });
        }
    }
};
