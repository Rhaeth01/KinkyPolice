const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendQuiz } = require('../utils/dailyQuizScheduler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quiz-now')
        .setDescription('Envoie immédiatement le quiz quotidien (Admin seulement)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            console.log('[QUIZ-NOW] Commande déclenchée par', interaction.user.tag);
            
            // Envoyer le quiz immédiatement
            await sendQuiz(interaction.client);
            
            await interaction.editReply({
                content: '✅ Quiz quotidien envoyé ! Vérifiez le canal de jeux.'
            });
            
        } catch (error) {
            console.error('[QUIZ-NOW] Erreur:', error);
            
            const errorMessage = error.message || 'Une erreur inconnue s\'est produite';
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ Erreur lors de l'envoi du quiz: ${errorMessage}`
                });
            } else {
                await interaction.reply({
                    content: `❌ Erreur lors de l'envoi du quiz: ${errorMessage}`,
                    ephemeral: true
                });
            }
        }
    },
};