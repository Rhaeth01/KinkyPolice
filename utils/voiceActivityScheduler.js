const { userVoiceStates, getVoiceConfig } = require('../events/voiceStateUpdate');
const { addCurrency, isSourceEnabled } = require('./currencyManager');
const { updateVoiceTimestamp } = require('./persistentState');
const { handleVoiceXp } = require('./levelEventHandler');

const CHECK_INTERVAL_MS = 60 * 1000; // Vérifier toutes les minutes

function startVoiceActivityScheduler() {
    setInterval(async () => {
        // Vérifier si le système vocal est activé
        if (!isSourceEnabled('voice')) {
            return;
        }

        const voiceConfig = getVoiceConfig();
        const now = Date.now();
        
        for (const [userId, state] of userVoiceStates.entries()) {
            // Vérifier si l'utilisateur est en vocal et respecte les conditions
            const isInChannel = state.channelId;
            const isUnmuted = !state.selfMute && !state.selfDeaf && !state.suppress;
            
            // Appliquer les conditions selon la configuration
            const meetsRequirements = isInChannel && 
                (!voiceConfig.requireUnmuted || isUnmuted) &&
                voiceConfig.requireInChannel;

            if (meetsRequirements) {
                // Protection anti-manipulation temporelle
                const timeSinceLastAward = now - state.lastPointAwardTime;
                const minutesToAward = Math.floor(timeSinceLastAward / CHECK_INTERVAL_MS);

                // Sécurité: Limiter les gains à maximum 5 minutes d'un coup (évite les exploits)
                const maxMinutesPerCheck = Math.min(minutesToAward, 5);

                if (maxMinutesPerCheck >= 1) {
                    const pointsEarned = maxMinutesPerCheck * voiceConfig.pointsPerMinute;
                    const success = await addCurrency(userId, pointsEarned, 'voice');
                    
                    if (success) {
                        // Mettre à jour le temps seulement en cas de succès (stockage persistant)
                        const newTimestamp = state.lastPointAwardTime + (maxMinutesPerCheck * CHECK_INTERVAL_MS);
                        state.lastPointAwardTime = newTimestamp;
                        await updateVoiceTimestamp(userId, newTimestamp);
                    }
                    
                    // Log de sécurité pour détecter les comportements suspects
                    if (minutesToAward > 5) {
                        console.warn(`[VOICE SECURITY] Comportement suspect détecté - userId: ${userId}, minutesToAward: ${minutesToAward}, accordé: ${maxMinutesPerCheck}`);
                    }
                    
                    // Système de niveaux et XP pour l'activité vocale
                    // On récupère le guild member via la state si possible
                    try {
                        // Pour chaque minute active, donner de l'XP
                        for (let i = 0; i < maxMinutesPerCheck; i++) {
                            const client = global.client; // Le client Discord global
                            if (client) {
                                const guild = client.guilds.cache.find(g => g.members.cache.has(userId));
                                if (guild) {
                                    const member = guild.members.cache.get(userId);
                                    if (member) {
                                        await handleVoiceXp(userId, member, client);
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error('[VOICE XP] Erreur lors du traitement XP vocal:', error);
                    }
                }
            }
        }
    }, CHECK_INTERVAL_MS);
}

module.exports = {
    startVoiceActivityScheduler,
};
