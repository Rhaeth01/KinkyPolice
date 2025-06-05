/**
 * Utilitaires communs pour les mini-jeux KinkyPolice
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class GameUtils {
    /**
     * Mélange un tableau de manière aléatoire (algorithme Fisher-Yates)
     * @param {Array} array - Le tableau à mélanger
     * @returns {Array} Le tableau mélangé
     */
    static shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Génère un nombre aléatoire entre min et max (inclus)
     * @param {number} min - Valeur minimum
     * @param {number} max - Valeur maximum
     * @returns {number} Nombre aléatoire
     */
    static generateRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Sélectionne un élément aléatoire dans un tableau
     * @param {Array} array - Le tableau
     * @returns {*} Élément aléatoire
     */
    static getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Crée un embed de jeu avec le style KinkyPolice
     * @param {string} title - Titre de l'embed
     * @param {string} description - Description de l'embed
     * @param {string} color - Couleur hex (défaut: violet KinkyPolice)
     * @returns {EmbedBuilder} L'embed configuré
     */
    static createGameEmbed(title, description, color = '#9B59B6') {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp();
    }

    /**
     * Formate le résultat d'un jeu
     * @param {boolean} won - Si le joueur a gagné
     * @param {number} attempts - Nombre de tentatives utilisées
     * @param {*} target - La réponse correcte
     * @param {string} gameType - Type de jeu pour personnaliser le message
     * @returns {object} Objet avec title, description et color
     */
    static formatGameResult(won, attempts, target, gameType = 'jeu') {
        const kinkyMessages = {
            win: [
                "🎉 Bravo coquin·e ! Tu as trouvé !",
                "💋 Excellent ! Tu maîtrises l'art du jeu !",
                "🔥 Parfait ! Tu es vraiment doué(e) !",
                "😈 Magnifique ! Tu m'as impressionné(e) !",
                "🎭 Fantastique ! Tu es un(e) vrai(e) expert(e) !"
            ],
            lose: [
                "💔 Dommage petit·e fripon·ne, tu n'as pas trouvé...",
                "😔 Pas cette fois ! Mais ne baisse pas les bras !",
                "🙈 Oups ! Ce n'était pas la bonne réponse !",
                "💭 Presque ! Tu feras mieux la prochaine fois !",
                "🎲 Pas de chance cette fois, mais continue à jouer !"
            ]
        };

        const messages = won ? kinkyMessages.win : kinkyMessages.lose;
        const randomMessage = this.getRandomElement(messages);
        
        let description = `${randomMessage}\n\n`;
        
        if (won) {
            description += `✨ **Réponse trouvée en ${attempts} tentative${attempts > 1 ? 's' : ''} !**\n`;
        } else {
            description += `💡 **La réponse était :** ${target}\n`;
        }

        return {
            title: won ? '🏆 Victoire !' : '💥 Défaite !',
            description,
            color: won ? '#2ECC71' : '#E74C3C'
        };
    }

    /**
     * Crée des boutons de jeu standards
     * @param {string} gameId - ID unique du jeu
     * @param {Array} customButtons - Boutons personnalisés supplémentaires
     * @returns {ActionRowBuilder} Row avec les boutons
     */
    static createGameButtons(gameId, customButtons = []) {
        const buttons = [];

        // Boutons personnalisés en premier
        customButtons.forEach(btn => buttons.push(btn));

        // Boutons standards
        const abandonButton = new ButtonBuilder()
            .setCustomId(`game_abandon_${gameId}`)
            .setLabel('Abandonner')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger);

        const replayButton = new ButtonBuilder()
            .setCustomId(`game_replay_${gameId}`)
            .setLabel('Rejouer')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Secondary);

        buttons.push(abandonButton);

        return new ActionRowBuilder().addComponents(buttons.slice(0, 5)); // Max 5 boutons par row
    }

    /**
     * Vérifie si un salon est NSFW (requis pour les jeux kinky)
     * @param {Interaction} interaction - L'interaction Discord
     * @returns {boolean} True si le salon est NSFW
     */
    static checkNSFWChannel(interaction) {
        if (!interaction.channel.isTextBased() || !interaction.channel.nsfw) {
            interaction.reply({ 
                content: 'Ces jeux coquins ne peuvent être utilisés que dans un salon NSFW. 😈', 
                ephemeral: true 
            });
            return false;
        }
        return true;
    }

    /**
     * Génère un ID unique pour une partie
     * @param {string} userId - ID de l'utilisateur
     * @param {string} gameType - Type de jeu
     * @returns {string} ID unique
     */
    static generateGameId(userId, gameType) {
        return `${gameType}_${userId}_${Date.now()}`;
    }

    /**
     * Mélange les lettres d'un mot pour créer un anagramme
     * @param {string} word - Le mot à mélanger
     * @returns {string} Les lettres mélangées
     */
    static scrambleWord(word) {
        const letters = word.split('');
        let scrambled;
        
        // S'assurer que le mot mélangé est différent de l'original
        do {
            scrambled = this.shuffleArray(letters).join('');
        } while (scrambled === word && word.length > 1);
        
        return scrambled;
    }

    /**
     * Normalise une chaîne pour la comparaison (supprime accents, espaces, casse)
     * @param {string} str - La chaîne à normaliser
     * @returns {string} Chaîne normalisée
     */
    static normalizeString(str) {
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
            .replace(/[^a-z0-9]/g, ''); // Garde seulement lettres et chiffres
    }

    /**
     * Formate un temps en millisecondes en format lisible
     * @param {number} ms - Temps en millisecondes
     * @returns {string} Temps formaté
     */
    static formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        
        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
    }

    /**
     * Crée une barre de progression visuelle
     * @param {number} current - Valeur actuelle
     * @param {number} max - Valeur maximum
     * @param {number} length - Longueur de la barre (défaut: 10)
     * @returns {string} Barre de progression
     */
    static createProgressBar(current, max, length = 10) {
        const filled = Math.round((current / max) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
}

module.exports = GameUtils;