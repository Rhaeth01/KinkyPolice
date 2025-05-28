const { userVoiceStates, POINTS_PER_MINUTE } = require('../events/voiceStateUpdate');
const { addCurrency } = require('./currencyManager');

const CHECK_INTERVAL_MS = 60 * 1000; // Vérifier toutes les minutes

function startVoiceActivityScheduler() {
    setInterval(async () => {
        const now = Date.now();
        for (const [userId, state] of userVoiceStates.entries()) {
            // Vérifier si l'utilisateur est en vocal et a son micro allumé
            if (state.channelId && !state.selfMute && !state.selfDeaf && !state.suppress) {
                const timeSinceLastAward = now - state.lastPointAwardTime;
                const minutesToAward = Math.floor(timeSinceLastAward / CHECK_INTERVAL_MS);

                if (minutesToAward >= 1) {
                    const pointsEarned = minutesToAward * POINTS_PER_MINUTE;
                    await addCurrency(userId, pointsEarned);
                    state.lastPointAwardTime += minutesToAward * CHECK_INTERVAL_MS; // Mettre à jour le temps de la dernière attribution
                    console.log(`[VoiceActivityScheduler] Attribué ${pointsEarned} Kinky Points à ${userId} pour ${minutesToAward} minutes en vocal.`);
                }
            }
        }
    }, CHECK_INTERVAL_MS);
}

module.exports = {
    startVoiceActivityScheduler,
};
