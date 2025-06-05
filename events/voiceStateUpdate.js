const { Events } = require('discord.js');
const { addCurrency } = require('../utils/currencyManager');
const voiceLogger = require('../utils/voiceLogger');

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
        const member = newState.member;
        const guild = newState.guild || oldState.guild;

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
                    if (minutesEarned > 0) {
                        pointsEarned = minutesEarned * POINTS_PER_MINUTE;
                        await addCurrency(userId, pointsEarned);
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

                    const voiceLogChannelId = require('../config.json').voiceLogChannelId;
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
            // Cas 4: Changements d'état (mute, deafen, stream, etc.)
            else if (isInVoice && wasInVoice && oldState.channelId === newState.channelId) {
                const changes = voiceLogger.analyzeStateChanges(oldState, newState);
                
                if (changes.length > 0) {
                    await voiceLogger.sendLog(guild, {
                        type: 'stateChange',
                        member: member,
                        oldChannel: oldState.channel,
                        newChannel: newState.channel,
                        changes: changes
                    });
                }
            }

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
                    if (minutesEarned > 0) {
                        const pointsEarned = minutesEarned * POINTS_PER_MINUTE;
                        await addCurrency(userId, pointsEarned);
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
                    if (minutesEarned > 0) {
                        const pointsEarned = minutesEarned * POINTS_PER_MINUTE;
                        await addCurrency(userId, pointsEarned);
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
module.exports.POINTS_PER_MINUTE = POINTS_PER_MINUTE;
