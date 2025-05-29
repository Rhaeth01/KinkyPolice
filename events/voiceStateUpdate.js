const { Events, EmbedBuilder } = require('discord.js');
const { addCurrency } = require('../utils/currencyManager');
const config = require('../config.json');

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

        const logChannelId = config.logChannelId;
        const logChannel = guild.channels.cache.get(logChannelId);

        if (!logChannel) {
            console.error(`Le salon de log avec l'ID ${logChannelId} n'a pas été trouvé.`);
            return;
        }

        // Cas 1: L'utilisateur rejoint un vocal
        if (isInVoice && !wasInVoice) {
            currentState.startTime = Date.now();
            currentState.lastPointAwardTime = Date.now();
            userVoiceStates.set(userId, currentState);
            console.log(`[VoiceActivity] ${userTag} a rejoint le vocal.`);

            const joinEmbed = new EmbedBuilder()
                .setColor('#00ff00') // Vert pour la jointure
                .setTitle('Entrée en vocal')
                .setDescription(`${member} a rejoint le salon vocal ${newState.channel.name}.`)
                .addFields(
                    { name: 'Utilisateur', value: `${member.user.tag} (${userId})`, inline: true },
                    { name: 'Salon', value: newState.channel.name, inline: true }
                )
                .setTimestamp();
            
            logChannel.send({ embeds: [joinEmbed] });

        }
        // Cas 2: L'utilisateur quitte un vocal
        else if (!isInVoice && wasInVoice) {
            if (userVoiceStates.has(userId) && userVoiceStates.get(userId).startTime) {
                const { startTime, lastPointAwardTime } = userVoiceStates.get(userId);
                const durationSinceLastAward = Date.now() - lastPointAwardTime;
                
                // Attribuer les points pour la dernière période active
                const minutesEarned = Math.floor(durationSinceLastAward / (60 * 1000));
                if (minutesEarned > 0) {
                    const pointsEarned = minutesEarned * POINTS_PER_MINUTE;
                    await addCurrency(userId, pointsEarned);
                }
            }
            userVoiceStates.delete(userId); // Supprimer l'utilisateur de la map
            console.log(`[VoiceActivity] ${userTag} a quitté le vocal.`);

            const leaveEmbed = new EmbedBuilder()
                .setColor('#ff0000') // Rouge pour le départ
                .setTitle('Sortie de vocal')
                .setDescription(`${member} a quitté le salon vocal ${oldState.channel.name}.`)
                .addFields(
                    { name: 'Utilisateur', value: `${member.user.tag} (${userId})`, inline: true },
                    { name: 'Salon', value: oldState.channel.name, inline: true }
                )
                .setTimestamp();
            
            logChannel.send({ embeds: [leaveEmbed] });
        }
        // Cas 3: L'utilisateur change de canal vocal
        else if (isInVoice && wasInVoice && oldState.channelId !== newState.channelId) {
            console.log(`[VoiceActivity] ${userTag} a changé de canal vocal.`);

            const moveEmbed = new EmbedBuilder()
                .setColor('#0000ff') // Bleu pour le déplacement
                .setTitle('Déplacement vocal')
                .setDescription(`${member} a changé de salon vocal de ${oldState.channel.name} à ${newState.channel.name}.`)
                .addFields(
                    { name: 'Utilisateur', value: `${member.user.tag} (${userId})`, inline: true },
                    { name: 'Ancien Salon', value: oldState.channel.name, inline: true },
                    { name: 'Nouveau Salon', value: newState.channel.name, inline: true }
                )
                .setTimestamp();
            
            logChannel.send({ embeds: [moveEmbed] });
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
    },
};

// Exporter la map pour le scheduler
module.exports.userVoiceStates = userVoiceStates;
module.exports.POINTS_PER_MINUTE = POINTS_PER_MINUTE;
