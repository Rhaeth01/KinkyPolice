const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

/**
 * @file commands/config/menus/economyMenu.js
 * @description Menu de configuration du système économique
 */

class EconomyMenu {
    /**
     * Crée l'embed de configuration de l'économie
     * @param {Object} config - Configuration actuelle
     * @param {import('discord.js').Guild} guild - Le serveur Discord
     * @returns {import('discord.js').EmbedBuilder} L'embed de configuration
     */
    static createEmbed(config, guild) {
        const economyConfig = config.economy || {};
        
        const embed = new EmbedBuilder()
            .setTitle('💰 Configuration de l\'Économie')
            .setDescription('Gestion du système de points et récompenses')
            .setColor(economyConfig.enabled ? 0x00FF00 : 0xFF0000)
            .addFields([
                {
                    name: '🔄 Système Économique',
                    value: economyConfig.enabled ? '✅ Activé' : '❌ Désactivé',
                    inline: true
                },
                {
                    name: '🔊 Activité Vocale',
                    value: this.getVoiceActivityText(economyConfig.voiceActivity),
                    inline: true
                },
                {
                    name: '💬 Activité Messages',
                    value: this.getMessageActivityText(economyConfig.messageActivity),
                    inline: true
                },
                {
                    name: '📚 Quiz Quotidien',
                    value: this.getDailyQuizText(economyConfig.dailyQuiz),
                    inline: true
                },
                {
                    name: '🎮 Système de Jeux',
                    value: economyConfig.games?.enabled ? '✅ Activé' : '❌ Désactivé',
                    inline: true
                },
                {
                    name: '🎯 Quêtes',
                    value: economyConfig.quests?.enabled ? '✅ Activé' : '❌ Désactivé',
                    inline: true
                }
            ])
            .setFooter({ text: 'Configuration > Économie' });

        return embed;
    }

    /**
     * Crée les composants de configuration de l'économie
     * @param {Object} economyConfig - Configuration actuelle de l'économie
     * @returns {Array<import('discord.js').ActionRowBuilder>} Les composants
     */
    static createComponents(economyConfig = {}) {
        const toggleRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_economy_toggle_main')
                .setLabel(`Système: ${economyConfig.enabled ? '✅' : '❌'}`)
                .setStyle(economyConfig.enabled ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('config_economy_toggle_voice')
                .setLabel(`Vocal: ${economyConfig.voiceActivity?.enabled ? '✅' : '❌'}`)
                .setStyle(economyConfig.voiceActivity?.enabled ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('config_economy_toggle_messages')
                .setLabel(`Messages: ${economyConfig.messageActivity?.enabled ? '✅' : '❌'}`)
                .setStyle(economyConfig.messageActivity?.enabled ? ButtonStyle.Success : ButtonStyle.Danger)
        ]);

        const configRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_economy_voice_settings')
                .setLabel('🔊 Config Vocal')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('config_economy_message_settings')
                .setLabel('💬 Config Messages')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('config_economy_quiz_settings')
                .setLabel('📚 Config Quiz')
                .setStyle(ButtonStyle.Primary)
        ]);

        const advancedRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_economy_games_settings')
                .setLabel('🎮 Config Jeux')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('config_economy_quests_settings')
                .setLabel('🎯 Config Quêtes')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('config_economy_limits_settings')
                .setLabel('⚠️ Limites')
                .setStyle(ButtonStyle.Secondary)
        ]);

        return [toggleRow, configRow, advancedRow];
    }

    /**
     * Crée l'embed de configuration vocale
     * @param {Object} voiceConfig - Configuration vocale actuelle
     * @returns {Object} Embed et composants
     */
    static createVoiceConfigEmbed(voiceConfig = {}) {
        const embed = new EmbedBuilder()
            .setTitle('🔊 Configuration Activité Vocale')
            .setDescription('Paramètres des récompenses pour l\'activité vocale')
            .setColor(0x5865F2)
            .addFields([
                {
                    name: '⚙️ État',
                    value: voiceConfig.enabled ? '✅ Activé' : '❌ Désactivé',
                    inline: true
                },
                {
                    name: '💎 Points par minute',
                    value: `${voiceConfig.pointsPerMinute || 1} point(s)`,
                    inline: true
                },
                {
                    name: '🔇 Exiger non-muet',
                    value: voiceConfig.requireUnmuted ? '✅ Oui' : '❌ Non',
                    inline: true
                },
                {
                    name: '👥 Exiger présence d\'autres',
                    value: voiceConfig.requireInChannel ? '✅ Oui' : '❌ Non',
                    inline: true
                },
                {
                    name: '⏰ Max points par heure',
                    value: `${voiceConfig.maxPointsPerHour || 60} point(s)`,
                    inline: true
                }
            ])
            .setFooter({ text: 'Configuration > Économie > Activité Vocale' });

        const toggleRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_economy_voice_toggle_unmuted')
                .setLabel(`Non-muet: ${voiceConfig.requireUnmuted ? '✅' : '❌'}`)
                .setStyle(voiceConfig.requireUnmuted ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('config_economy_voice_toggle_in_channel')
                .setLabel(`Présence autres: ${voiceConfig.requireInChannel ? '✅' : '❌'}`)
                .setStyle(voiceConfig.requireInChannel ? ButtonStyle.Success : ButtonStyle.Danger)
        ]);

        const valueRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_economy_voice_edit_points_per_minute')
                .setLabel('✏️ Points/min')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('config_economy_voice_edit_max_per_hour')
                .setLabel('✏️ Max/heure')
                .setStyle(ButtonStyle.Primary)
        ]);

        return { embed, components: [toggleRow, valueRow] };
    }

    /**
     * Crée le modal d'édition des valeurs numériques
     * @param {string} field - Champ à éditer
     * @param {number} currentValue - Valeur actuelle
     * @param {string} label - Libellé du champ
     * @param {string} placeholder - Texte d'aide
     * @returns {import('discord.js').ModalBuilder} Le modal
     */
    static createNumericModal(field, currentValue, label, placeholder) {
        const modal = new ModalBuilder()
            .setCustomId(`config_economy_numeric_modal_${field}`)
            .setTitle(`Modifier ${label}`);

        const input = new TextInputBuilder()
            .setCustomId('numeric_value')
            .setLabel(label)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(placeholder)
            .setValue(currentValue?.toString() || '0')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(input)
        );

        return modal;
    }

    /**
     * Crée l'embed de configuration du quiz quotidien
     * @param {Object} quizConfig - Configuration du quiz
     * @returns {Object} Embed et composants
     */
    static createQuizConfigEmbed(quizConfig = {}) {
        const embed = new EmbedBuilder()
            .setTitle('📚 Configuration Quiz Quotidien')
            .setDescription('Paramètres du quiz quotidien automatique')
            .setColor(0x5865F2)
            .addFields([
                {
                    name: '⚙️ État',
                    value: quizConfig.enabled ? '✅ Activé' : '❌ Désactivé',
                    inline: true
                },
                {
                    name: '💎 Points par bonne réponse',
                    value: `${quizConfig.pointsPerCorrectAnswer || 100} point(s)`,
                    inline: true
                },
                {
                    name: '⏰ Max points par jour',
                    value: `${quizConfig.maxPointsPerDay || 500} point(s)`,
                    inline: true
                },
                {
                    name: '🕐 Heure de publication',
                    value: `${String(quizConfig.hour || 13).padStart(2, '0')}:${String(quizConfig.minute || 0).padStart(2, '0')}`,
                    inline: true
                }
            ])
            .setFooter({ text: 'Configuration > Économie > Quiz Quotidien' });

        const configRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('config_economy_quiz_edit_points')
                .setLabel('✏️ Points/réponse')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('config_economy_quiz_edit_max_points')
                .setLabel('✏️ Max points/jour')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('config_economy_quiz_edit_time')
                .setLabel('✏️ Heure')
                .setStyle(ButtonStyle.Primary)
        ]);

        return { embed, components: [configRow] };
    }

    /**
     * Traite le toggle d'un paramètre booléen
     * @param {string} field - Champ à modifier
     * @param {Object} currentConfig - Configuration actuelle
     * @param {Function} addPendingChanges - Fonction pour ajouter des changements
     * @returns {Object} Les changements à appliquer
     */
    static handleToggle(field, currentConfig, addPendingChanges, userId) {
        const fieldPath = field.split('.');
        let currentValue = currentConfig.economy || {};
        
        // Navigation dans l'objet de configuration
        for (let i = 0; i < fieldPath.length - 1; i++) {
            currentValue = currentValue[fieldPath[i]] || {};
        }
        
        const finalField = fieldPath[fieldPath.length - 1];
        const newValue = !currentValue[finalField];
        
        // Construction de l'objet de changement
        const changes = { economy: {} };
        let changeRef = changes.economy;
        
        for (let i = 0; i < fieldPath.length - 1; i++) {
            changeRef[fieldPath[i]] = changeRef[fieldPath[i]] || {};
            changeRef = changeRef[fieldPath[i]];
        }
        
        changeRef[finalField] = newValue;
        
        addPendingChanges(userId, changes);
        return changes;
    }

    /**
     * Traite la modification d'une valeur numérique
     * @param {import('discord.js').ModalSubmitInteraction} interaction - L'interaction modal
     * @param {string} field - Champ à modifier
     * @param {Function} addPendingChanges - Fonction pour ajouter des changements
     * @returns {Object} Les changements à appliquer
     */
    static handleNumericModal(interaction, field, addPendingChanges) {
        const valueStr = interaction.fields.getTextInputValue('numeric_value').trim();
        const value = parseFloat(valueStr);
        
        if (isNaN(value) || value < 0) {
            throw new Error('La valeur doit être un nombre positif.');
        }
        
        // Validation spécifique selon le champ
        if (field.includes('hour') && (value < 0 || value > 23)) {
            throw new Error('L\'heure doit être comprise entre 0 et 23.');
        }
        
        if (field.includes('minute') && (value < 0 || value > 59)) {
            throw new Error('Les minutes doivent être comprises entre 0 et 59.');
        }
        
        if (field.includes('pointsPerMinute') && value > 10) {
            throw new Error('Les points par minute ne peuvent pas dépasser 10.');
        }

        const fieldPath = field.split('_');
        const changes = { economy: {} };
        let changeRef = changes.economy;
        
        // Navigation dans l'objet selon le champ
        if (fieldPath.includes('voice')) {
            changeRef.voiceActivity = changeRef.voiceActivity || {};
            changeRef = changeRef.voiceActivity;
        } else if (fieldPath.includes('message')) {
            changeRef.messageActivity = changeRef.messageActivity || {};
            changeRef = changeRef.messageActivity;
        } else if (fieldPath.includes('quiz')) {
            changeRef.dailyQuiz = changeRef.dailyQuiz || {};
            changeRef = changeRef.dailyQuiz;
        }
        
        // Détermination du nom du champ final
        const finalField = this.getFinalFieldName(fieldPath);
        changeRef[finalField] = Math.floor(value);
        
        addPendingChanges(interaction.user.id, changes);
        return changes;
    }

    /**
     * Détermine le nom du champ final basé sur le chemin
     * @param {Array} fieldPath - Chemin du champ
     * @returns {string} Nom du champ final
     */
    static getFinalFieldName(fieldPath) {
        if (fieldPath.includes('points') && fieldPath.includes('minute')) return 'pointsPerMinute';
        if (fieldPath.includes('max') && fieldPath.includes('hour')) return 'maxPointsPerHour';
        if (fieldPath.includes('points') && fieldPath.includes('answer')) return 'pointsPerCorrectAnswer';
        if (fieldPath.includes('max') && fieldPath.includes('points')) return 'maxPointsPerDay';
        if (fieldPath.includes('hour')) return 'hour';
        if (fieldPath.includes('minute')) return 'minute';
        return fieldPath[fieldPath.length - 1];
    }

    /**
     * Génère le texte de l'activité vocale
     * @param {Object} voiceConfig - Configuration vocale
     * @returns {string} Texte formaté
     */
    static getVoiceActivityText(voiceConfig = {}) {
        if (!voiceConfig.enabled) return '❌ Désactivé';
        return `✅ ${voiceConfig.pointsPerMinute || 1}pts/min (max: ${voiceConfig.maxPointsPerHour || 60}/h)`;
    }

    /**
     * Génère le texte de l'activité messages
     * @param {Object} messageConfig - Configuration des messages
     * @returns {string} Texte formaté
     */
    static getMessageActivityText(messageConfig = {}) {
        if (!messageConfig.enabled) return '❌ Désactivé';
        return `✅ ${messageConfig.pointsPerReward || 10}pts tous les ${messageConfig.messagesRequired || 10} messages`;
    }

    /**
     * Génère le texte du quiz quotidien
     * @param {Object} quizConfig - Configuration du quiz
     * @returns {string} Texte formaté
     */
    static getDailyQuizText(quizConfig = {}) {
        if (!quizConfig.enabled) return '❌ Désactivé';
        const time = `${String(quizConfig.hour || 13).padStart(2, '0')}:${String(quizConfig.minute || 0).padStart(2, '0')}`;
        return `✅ ${quizConfig.pointsPerCorrectAnswer || 100}pts/réponse à ${time}`;
    }
}

module.exports = EconomyMenu;