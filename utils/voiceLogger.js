const { EmbedBuilder } = require('discord.js');
const configManager = require('./configManager');
const webhookLogger = require('./webhookLogger');

class VoiceLogger {
    constructor() {
        this.colors = {
            join: '#32CD32',      // Vert lime pour rejoindre
            leave: '#DC143C',     // Rouge crimson pour quitter
            move: '#4169E1',      // Bleu royal pour déplacement
            mute: '#ff9900',      // Orange pour mute (non utilisé)
            unmute: '#00ff99',    // Vert clair pour unmute (non utilisé)
            deafen: '#ff0099',    // Rose pour deafen (non utilisé)
            undeafen: '#99ff00',  // Vert lime pour undeafen (non utilisé)
            stream: '#9900ff',    // Violet pour stream (non utilisé)
            camera: '#ffff00',    // Jaune pour caméra (non utilisé)
            suppress: '#666666'   // Gris pour suppress (non utilisé)
        };

        this.icons = {
            join: '🟢',
            leave: '🔴',
            move: '🔄',
            mute: '🔇',
            unmute: '🔊',
            deafen: '🔕',
            undeafen: '🔔',
            stream: '📺',
            camera: '📷',
            suppress: '🚫',
            voice: '🎙️',
            user: '👤',
            time: '⏰',
            channel: '🔊'
        };
    }

    /**
     * Envoie un log vocal formaté via webhook
     * @param {Guild} guild - Le serveur Discord
     * @param {Object} logData - Les données du log
     */
    async sendLog(guild, logData) {
        // Filtrer pour ne garder que join, leave et move
        if (!['join', 'leave', 'move'].includes(logData.type)) {
            return; // Ignorer les autres types d'événements
        }

        const embed = this.createEmbed(logData);
        
        // Utiliser le webhook logger au lieu d'envoyer directement
        await webhookLogger.log('voice', embed);
    }

    /**
     * Crée un embed formaté pour le log
     * @param {Object} logData - Les données du log
     * @returns {EmbedBuilder} L'embed créé
     */
    createEmbed(logData) {
        const { type, member, oldChannel, newChannel, changes } = logData;
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setFooter({ text: `ID: ${member.id}` });

        switch (type) {
            case 'join':
                embed
                    .setColor('#32CD32')
                    .setAuthor({ 
                        name: 'Connexion Vocale', 
                        iconURL: member.user.displayAvatarURL({ dynamic: true }) 
                    })
                    .setDescription(`${this.icons.join} **${member.user.tag}** a rejoint le salon vocal`)
                    .addFields(
                        { 
                            name: `${this.icons.user} Utilisateur`, 
                            value: `${member}`, 
                            inline: true 
                        },
                        { 
                            name: `${this.icons.channel} Salon`, 
                            value: `${newChannel}`, 
                            inline: true 
                        },
                        { 
                            name: `${this.icons.time} Heure`, 
                            value: `<t:${Math.floor(Date.now() / 1000)}:T>`, 
                            inline: true 
                        }
                    );
                break;

            case 'leave':
                embed
                    .setColor('#DC143C')
                    .setAuthor({ 
                        name: 'Déconnexion Vocale', 
                        iconURL: member.user.displayAvatarURL({ dynamic: true }) 
                    })
                    .setDescription(`${this.icons.leave} **${member.user.tag}** a quitté le salon vocal`)
                    .addFields(
                        { 
                            name: `${this.icons.user} Utilisateur`, 
                            value: `${member}`, 
                            inline: true 
                        },
                        { 
                            name: `${this.icons.channel} Salon`, 
                            value: `${oldChannel}`, 
                            inline: true 
                        },
                        { 
                            name: `${this.icons.time} Heure`, 
                            value: `<t:${Math.floor(Date.now() / 1000)}:T>`, 
                            inline: true 
                        }
                    );
                break;

            case 'move':
                embed
                    .setColor('#4169E1')
                    .setAuthor({ 
                        name: 'Déplacement Vocal', 
                        iconURL: member.user.displayAvatarURL({ dynamic: true }) 
                    })
                    .setDescription(`${this.icons.move} **${member.user.tag}** a changé de salon vocal`)
                    .addFields(
                        { 
                            name: `${this.icons.user} Utilisateur`, 
                            value: `${member}`, 
                            inline: true 
                        },
                        { 
                            name: '📤 Ancien salon', 
                            value: `${oldChannel}`, 
                            inline: true 
                        },
                        { 
                            name: '📥 Nouveau salon', 
                            value: `${newChannel}`, 
                            inline: true 
                        }
                    );
                break;

            case 'stateChange':
                embed
                    .setAuthor({ 
                        name: 'Changement d\'état vocal', 
                        iconURL: member.user.displayAvatarURL({ dynamic: true }) 
                    })
                    .setDescription(`**${member.user.tag}** a modifié son état vocal`)
                    .addFields(
                        { 
                            name: `${this.icons.user} Utilisateur`, 
                            value: `${member}`, 
                            inline: true 
                        },
                        { 
                            name: `${this.icons.channel} Salon`, 
                            value: `${newChannel || oldChannel}`, 
                            inline: true 
                        }
                    );

                // Ajouter les changements d'état
                if (changes.length > 0) {
                    const changesText = changes.map(change => {
                        const icon = this.icons[change.type] || '•';
                        return `${icon} ${change.description}`;
                    }).join('\n');

                    embed.addFields({
                        name: '📊 Changements',
                        value: changesText,
                        inline: false
                    });

                    // Définir la couleur selon le premier changement
                    const firstChange = changes[0];
                    embed.setColor(this.colors[firstChange.type] || '#808080');
                }
                break;
        }

        return embed;
    }

    /**
     * Analyse les changements d'état entre deux états vocaux
     * @param {VoiceState} oldState - L'ancien état
     * @param {VoiceState} newState - Le nouvel état
     * @returns {Array} Liste des changements
     */
    analyzeStateChanges(oldState, newState) {
        const changes = [];

        // Vérifier le stream
        if (oldState.streaming !== newState.streaming) {
            changes.push({
                type: 'stream',
                description: newState.streaming ? 'A commencé un stream' : 'A arrêté son stream'
            });
        }

        // Vérifier la caméra
        if (oldState.selfVideo !== newState.selfVideo) {
            changes.push({
                type: 'camera',
                description: newState.selfVideo ? 'A activé sa caméra' : 'A désactivé sa caméra'
            });
        }

        // Vérifier le suppress (server mute/deafen)
        if (oldState.suppress !== newState.suppress) {
            changes.push({
                type: 'suppress',
                description: newState.suppress ? 'A été supprimé par le serveur' : 'N\'est plus supprimé'
            });
        }

        // Vérifier le server mute
        if (oldState.serverMute !== newState.serverMute) {
            changes.push({
                type: 'mute',
                description: newState.serverMute ? 'A été rendu muet par un modérateur' : 'N\'est plus muet (modérateur)'
            });
        }

        // Vérifier le server deafen
        if (oldState.serverDeaf !== newState.serverDeaf) {
            changes.push({
                type: 'deafen',
                description: newState.serverDeaf ? 'A été rendu sourd par un modérateur' : 'N\'est plus sourd (modérateur)'
            });
        }

        return changes;
    }

    /**
     * Crée un résumé de session vocale
     * @param {Object} sessionData - Les données de la session
     * @returns {EmbedBuilder} L'embed du résumé
     */
    createSessionSummary(sessionData) {
        const { member, channel, duration, pointsEarned } = sessionData;
        
        const durationMinutes = Math.floor(duration / 60000);
        const durationSeconds = Math.floor((duration % 60000) / 1000);
        const durationText = `${durationMinutes}m ${durationSeconds}s`;

        const embed = new EmbedBuilder()
            .setColor('#00ff99')
            .setAuthor({ 
                name: 'Résumé de session vocale', 
                iconURL: member.user.displayAvatarURL({ dynamic: true }) 
            })
            .setDescription(`Session terminée pour **${member.user.tag}**`)
            .addFields(
                { 
                    name: `${this.icons.user} Utilisateur`, 
                    value: `${member}`, 
                    inline: true 
                },
                { 
                    name: `${this.icons.channel} Salon`, 
                    value: `${channel}`, 
                    inline: true 
                },
                { 
                    name: '⏱️ Durée', 
                    value: durationText, 
                    inline: true 
                },
                { 
                    name: '💰 Points gagnés', 
                    value: `${pointsEarned || 0} points`, 
                    inline: true 
                }
            )
            .setTimestamp()
            .setFooter({ text: `ID: ${member.id}` });

        return embed;
    }
}

module.exports = new VoiceLogger();
