const fs = require('node:fs');
const path = require('node:path');

const messagesFilePath = path.join(__dirname, '..', 'config', 'messages.json');
let messages = {};

try {
    messages = JSON.parse(fs.readFileSync(messagesFilePath, 'utf8'));
} catch (error) {
    console.error('Erreur lors du chargement des messages:', error);
    messages = {
        errors: {
            generic: "Une erreur s'est produite lors de l'exécution de cette commande !",
            commandNotFound: "Aucune commande correspondante n'a été trouvée.",
            noPermission: "Vous n'avez pas la permission d'effectuer cette action.",
            interactionExpired: "L'interaction a expiré. Veuillez réessayer."
        },
        quizGame: {
            replayPrompt: "🎮 Pour rejouer, utilisez la commande `/{commandName}` !",
            reviewNotAvailable: "📖 La fonctionnalité de révision des réponses pour ce type de jeu sera bientôt disponible !",
            reviewDataNotFound: "❌ Les données de cette partie de quiz ne sont plus disponibles pour la révision."
        },
        leaderboard: {
            noScores: "Aucun score enregistré pour le jeu \"{gameType}\"."
        },
        rulesAcceptance: {
            successAddedRoles: "✅ Rôle(s) attribué(s): {roles}\n",
            successRemovedRoles: "❌ Rôle(s) retiré(s): {roles}\n",
            errorRoles: "⚠️ Erreurs: {errors}\n",
            thankYou: "\n🎉 Merci d'avoir accepté le règlement !",
            actionCompleted: "Action effectuée.",
            configError: "Une erreur de configuration empêche cette action. Veuillez contacter un administrateur."
        }
    };
}

function getMessage(key, replacements = {}) {
    let message = messages;
    const parts = key.split('.');
    for (const part of parts) {
        if (message && typeof message === 'object' && message.hasOwnProperty(part)) {
            message = message[part];
        } else {
            console.warn(`Message key "${key}" not found. Returning default or empty string.`);
            return `Message key "${key}" not found.`; // Fallback message
        }
    }

    if (typeof message === 'string') {
        for (const placeholder in replacements) {
            message = message.replace(new RegExp(`{${placeholder}}`, 'g'), replacements[placeholder]);
        }
        return message;
    } else {
        console.warn(`Message for key "${key}" is not a string. Returning default or empty string.`);
        return `Message for key "${key}" is not a string.`; // Fallback message
    }
}

module.exports = {
    getMessage
};