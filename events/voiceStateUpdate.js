const { Events } = require('discord.js');
const { addCurrency, isSourceEnabled } = require('../utils/currencyManager');
const voiceLogger = require('../utils/voiceLogger');
const configManager = require('../utils/configManager');
const { getVoiceTimestamp, updateVoiceTimestamp } = require('../utils/persistentState');

// Map pour stocker l'état vocal de chaque utilisateur (données temporaires de session)
// userId -> { channelId: string, selfMute: boolean, selfDeaf: boolean, suppress: boolean, startTime: timestamp }
const userVoiceStates = new Map();

// Fonction pour obtenir les paramètres vocaux depuis la config
function getVoiceConfig() {
    const config = configManager.getConfig();
    return config.economy?.voiceActivity || {
        enabled: true,
        pointsPerMinute: 1,
        requireUnmuted: true,
        requireInChannel: true,
        maxPointsPerHour: 60
    };
}

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const userId = newState.member.id;
        const userTag = newState.member.user.tag;
        const member = newState.member;
        const guild = newState.guild || oldState.guild;

        const oldVoiceState = userVoiceStates.get(userId) || {};

        // Mettre à jour l'état actuel de l'utilisateur (avec récupération persistante)
        const currentState = {
            channelId: newState.channelId,
            selfMute: newState.selfMute,
            selfDeaf: newState.selfDeaf,
            suppress: newState.suppress,
            startTime: oldVoiceState.startTime || null, // Conserver le startTime si déjà en vocal
            lastPointAwardTime: oldVoiceState.lastPointAwardTime || await getVoiceTimestamp(userId), // Récupérer depuis le stockage persistant
        };

        const wasInVoice = oldState.channelId;
        const isInVoice = newState.channelId;
        const wasMuted = oldState.selfMute || oldState.selfDeaf || oldState.suppress;
        const isMuted = newState.selfMute || newState.selfDeaf || newState.suppress;

        try {
            // Cas 1: L'utilisateur rejoint un vocal
            if (isInVoice && !wasInVoice) {
                currentState.startTime = Date.now();
                currentState.lastPointAwardTime = Date.now();
                userVoiceStates.set(userId, currentState);
                console.log(`[VoiceActivity] ${userTag} a rejoint le vocal.`);

                await voiceLogger.sendLog(guild, {
                    type: 'join',
                    member: member,
                    newChannel: newState.channel
                });
            }
            // Cas 2: L'utilisateur quitte un vocal
            else if (!isInVoice && wasInVoice) {
                let pointsEarned = 0;
                let duration = 0;

                if (userVoiceStates.has(userId) && userVoiceStates.get(userId).startTime) {
                    const { startTime, lastPointAwardTime } = userVoiceStates.get(userId);
                    const durationSinceLastAward = Date.now() - lastPointAwardTime;
                    duration = Date.now() - startTime;
                    
                    // Attribuer les points pour la dernière période active
                    const minutesEarned = Math.floor(durationSinceLastAward / (60 * 1000));
                    if (minutesEarned > 0 && isSourceEnabled('voice')) {
                        const voiceConfig = getVoiceConfig();
                        pointsEarned = minutesEarned * voiceConfig.pointsPerMinute;
                        await addCurrency(userId, pointsEarned, 'voice');
                    }
                }
                userVoiceStates.delete(userId); // Supprimer l'utilisateur de la map
                console.log(`[VoiceActivity] ${userTag} a quitté le vocal.`);

                await voiceLogger.sendLog(guild, {
                    type: 'leave',
                    member: member,
                    oldChannel: oldState.channel
                });

                // Envoyer un résumé de session si l'utilisateur a gagné des points
                if (pointsEarned > 0 || duration > 60000) { // Si plus d'une minute
                    const sessionSummary = voiceLogger.createSessionSummary({
                        member: member,
                        channel: oldState.channel,
                        duration: duration,
                        pointsEarned: pointsEarned
                    });

                    const voiceLogChannelId = configManager.voiceLogChannelId;
                    if (voiceLogChannelId) {
                        const logChannel = guild.channels.cache.get(voiceLogChannelId);
                        if (logChannel) {
                            await logChannel.send({ embeds: [sessionSummary] });
                        }
                    }
                }
            }
            // Cas 3: L'utilisateur change de canal vocal
            else if (isInVoice && wasInVoice && oldState.channelId !== newState.channelId) {
                console.log(`[VoiceActivity] ${userTag} a changé de canal vocal.`);

                await voiceLogger.sendLog(guild, {
                    type: 'move',
                    member: member,
                    oldChannel: oldState.channel,
                    newChannel: newState.channel
                });
            }
            // ✅ Seuls join, leave et move sont loggés (pas de mute/deafen/stream/etc.)

            // Gérer les changements de mute/deaf pour le suivi des points
            if (isInVoice && !wasInVoice && !isMuted) { // Rejoint et micro allumé
                currentState.startTime = Date.now();
                currentState.lastPointAwardTime = Date.now();
                userVoiceStates.set(userId, currentState);
            } else if ((!isInVoice && wasInVoice) || (isInVoice && wasMuted && !isMuted) || (isInVoice && !wasMuted && isMuted)) { // Quitte ou change d'état micro
                if (userVoiceStates.has(userId) && userVoiceStates.get(userId).startTime) {
                    const { startTime, lastPointAwardTime } = userVoiceStates.get(userId);
                    const durationSinceLastAward = Date.now() - lastPointAwardTime;
                    
                    const minutesEarned = Math.floor(durationSinceLastAward / (60 * 1000));
                    if (minutesEarned > 0 && isSourceEnabled('voice')) {
                        const voiceConfig = getVoiceConfig();
                        const pointsEarned = minutesEarned * voiceConfig.pointsPerMinute;
                        await addCurrency(userId, pointsEarned, 'voice');
                    }
                }
                userVoiceStates.delete(userId);
            } else if (isInVoice && wasMuted && !isMuted) { // Active son micro
                currentState.startTime = Date.now();
                currentState.lastPointAwardTime = Date.now();
                userVoiceStates.set(userId, currentState);
            } else if (isInVoice && !wasMuted && isMuted) { // Coupe son micro
                if (userVoiceStates.has(userId) && userVoiceStates.get(userId).startTime) {
                    const { startTime, lastPointAwardTime } = userVoiceStates.get(userId);
                    const durationSinceLastAward = Date.now() - lastPointAwardTime;
                    
                    const minutesEarned = Math.floor(durationSinceLastAward / (60 * 1000));
                    if (minutesEarned > 0 && isSourceEnabled('voice')) {
                        const voiceConfig = getVoiceConfig();
                        const pointsEarned = minutesEarned * voiceConfig.pointsPerMinute;
                        await addCurrency(userId, pointsEarned, 'voice');
                    }
                }
                userVoiceStates.delete(userId);
            } else if (isInVoice && wasInVoice && oldState.channelId !== newState.channelId && !isMuted) { // Change de canal et micro allumé
                userVoiceStates.set(userId, currentState);
            }
        } catch (error) {
            console.error('[VoiceStateUpdate] Erreur lors du traitement:', error);
        }
    },
};

// Exporter la map pour le scheduler
module.exports.userVoiceStates = userVoiceStates;
module.exports.getVoiceConfig = getVoiceConfig;
