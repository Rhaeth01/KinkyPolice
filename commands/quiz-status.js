const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quiz-status')
        .setDescription('Affiche le statut du système de quiz quotidien (Admin seulement)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            const config = configManager.getConfig();
            const quizConfig = config.economy?.dailyQuiz;
            const gameChannel = config.games?.gameChannel;
            
            const now = new Date();
            const currentTime = now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
            const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            const embed = new EmbedBuilder()
                .setTitle('📊 Statut du Quiz Quotidien')
                .setColor('#4CAF50')
                .addFields([
                    {
                        name: '⚙️ Configuration',
                        value: `**Activé:** ${quizConfig?.enabled ? '✅' : '❌'}\n` +
                               `**Heure:** ${String(quizConfig?.hour || 13).padStart(2, '0')}:${String(quizConfig?.minute || 0).padStart(2, '0')}\n` +
                               `**Points:** ${quizConfig?.pointsPerCorrectAnswer || 100} par réponse`,
                        inline: true
                    },
                    {
                        name: '📺 Canal',
                        value: gameChannel ? `<#${gameChannel}>` : '❌ Non configuré',
                        inline: true
                    },
                    {
                        name: '🕐 Temps',
                        value: `**Heure actuelle (Paris):** ${currentTime}\n` +
                               `**Timezone système:** ${systemTimezone}`,
                        inline: false
                    }
                ]);
            
            // Calculer le prochain quiz
            if (quizConfig?.enabled && gameChannel) {
                const target = new Date(now);
                target.setHours(quizConfig.hour || 13, quizConfig.minute || 0, 0, 0);
                
                if (now > target) {
                    target.setDate(target.getDate() + 1);
                }
                
                const delay = target.getTime() - now.getTime();
                const hours = Math.floor(delay / (1000 * 60 * 60));
                const minutes = Math.floor((delay % (1000 * 60 * 60)) / (1000 * 60));
                
                embed.addFields({
                    name: '⏰ Prochain Quiz',
                    value: `**Date:** ${target.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}\n` +
                           `**Dans:** ${hours}h ${minutes}min`,
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '⚠️ Problème',
                    value: 'Le quiz ne peut pas être planifié. Vérifiez la configuration.',
                    inline: false
                });
            }
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
            
        } catch (error) {
            console.error('[QUIZ-STATUS] Erreur:', error);
            await interaction.reply({
                content: '❌ Erreur lors de la récupération du statut',
                ephemeral: true
            });
        }
    },
};