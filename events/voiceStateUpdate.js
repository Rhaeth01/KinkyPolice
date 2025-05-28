const { Events } = require('discord.js');
const { addCurrency } = require('../utils/currencyManager');

// Map pour stocker l'état vocal de chaque utilisateur
// userId -> { channelId: string, selfMute: boolean, selfDeaf: boolean, suppress: boolean, startTime: timestamp, lastPointAwardTime: timestamp }
const userVoiceStates = new Map();

// Intervalle de vérification et points par intervalle (pour le calcul périodique)
const POINTS_PER_MINUTE = 1; // 1 point par minute en vocal avec micro allumé

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const userId = newState.member.id;
        const userTag = newState.member.user.tag;

        const oldVoiceState = userVoiceStates.get(userId) || {};

        // Mettre à jour l'état actuel de l'utilisateur
        const currentState = {
            channelId: newState.channelId,
            selfMute: newState.selfMute,
            selfDeaf: newState.selfDeaf,
            suppress: newState.suppress,
            startTime: oldVoiceState.startTime || null, // Conserver le startTime si déjà en vocal
            lastPointAwardTime: oldVoiceState.lastPointAwardTime || null, // Conserver le lastPointAwardTime
        };

        const wasInVoice = oldState.channelId;
        const isInVoice = newState.channelId;
        const wasMuted = oldState.selfMute || oldState.selfDeaf || oldState.suppress;
        const isMuted = newState.selfMute || newState.selfDeaf || newState.suppress;

        // Cas 1: L'utilisateur rejoint un vocal et a son micro allumé
        if (isInVoice && !wasInVoice && !isMuted) {
            currentState.startTime = Date.now();
            currentState.lastPointAwardTime = Date.now();
            userVoiceStates.set(userId, currentState);
            console.log(`[VoiceActivity] ${userTag} a rejoint le vocal et a son micro allumé. Début du suivi.`);
        }
        // Cas 2: L'utilisateur quitte un vocal ou coupe son micro
        else if ((!isInVoice && wasInVoice) || (isInVoice && wasMuted && !isMuted) || (isInVoice && !wasMuted && isMuted)) {
            if (userVoiceStates.has(userId) && userVoiceStates.get(userId).startTime) {
                const { startTime, lastPointAwardTime } = userVoiceStates.get(userId);
                const durationSinceLastAward = Date.now() - lastPointAwardTime;
                
                // Attribuer les points pour la dernière période active
                const minutesEarned = Math.floor(durationSinceLastAward / (60 * 1000));
                if (minutesEarned > 0) {
                    const pointsEarned = minutesEarned * POINTS_PER_MINUTE;
                    await addCurrency(userId, pointsEarned);
                    console.log(`[VoiceActivity] ${userTag} a gagné ${pointsEarned} Kinky Points pour ${minutesEarned} minutes en vocal (fin de session/micro coupé).`);
                }
            }
            userVoiceStates.delete(userId); // Supprimer l'utilisateur de la map
            console.log(`[VoiceActivity] ${userTag} a quitté le vocal ou a coupé son micro. Fin du suivi.`);
        }
        // Cas 3: L'utilisateur active son micro (était déjà en vocal mais micro coupé/sourdine)
        else if (isInVoice && wasMuted && !isMuted) {
            currentState.startTime = Date.now(); // Réinitialiser le startTime pour le calcul des points
            currentState.lastPointAwardTime = Date.now();
            userVoiceStates.set(userId, currentState);
            console.log(`[VoiceActivity] ${userTag} a activé son micro. Début du suivi.`);
        }
        // Cas 4: L'utilisateur coupe son micro (était déjà en vocal mais micro activé)
        else if (isInVoice && !wasMuted && isMuted) {
            if (userVoiceStates.has(userId) && userVoiceStates.get(userId).startTime) {
                const { startTime, lastPointAwardTime } = userVoiceStates.get(userId);
                const durationSinceLastAward = Date.now() - lastPointAwardTime;
                
                const minutesEarned = Math.floor(durationSinceLastAward / (60 * 1000));
                if (minutesEarned > 0) {
                    const pointsEarned = minutesEarned * POINTS_PER_MINUTE;
                    await addCurrency(userId, pointsEarned);
                    console.log(`[VoiceActivity] ${userTag} a gagné ${pointsEarned} Kinky Points pour ${minutesEarned} minutes en vocal (micro coupé).`);
                }
            }
            userVoiceStates.delete(userId); // Supprimer l'utilisateur de la map
            console.log(`[VoiceActivity] ${userTag} a coupé son micro. Fin du suivi.`);
        }
        // Cas 5: L'utilisateur change de canal vocal (sans changer l'état du micro)
        else if (isInVoice && wasInVoice && oldState.channelId !== newState.channelId && !isMuted) {
            // Si l'utilisateur était déjà suivi avec micro allumé, on continue le suivi
            // Pas besoin de réinitialiser startTime ou lastPointAwardTime si le micro reste allumé
            userVoiceStates.set(userId, currentState);
            console.log(`[VoiceActivity] ${userTag} a changé de canal vocal. Suivi continu.`);
        }
    },
};

// Exporter la map pour le scheduler
module.exports.userVoiceStates = userVoiceStates;
module.exports.POINTS_PER_MINUTE = POINTS_PER_MINUTE;
