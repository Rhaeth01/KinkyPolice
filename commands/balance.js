const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserBalance, getUserLimitStats, isSourceEnabled } = require('../utils/currencyManager');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Affiche votre solde de KinkyCoins.'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const balance = await getUserBalance(userId);
        const config = configManager.getConfig();
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💰 Votre Solde de KinkyCoins')
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        let description = `Vous avez **${balance}** KinkyCoins.\n\n`;

        // Vérifier si l'économie est activée
        if (!config.economy?.enabled) {
            description += '⚠️ **Le système économique est actuellement désactivé.**';
            embed.setDescription(description);
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Afficher les limites si configurées
        const limitStats = getUserLimitStats(userId);
        if (limitStats) {
            description += '📊 **Limites de gains aujourd\'hui :**\n';
            description += `🕐 **Horaire :** ${limitStats.hourly.used}/${limitStats.hourly.limit} (${limitStats.hourly.remaining} restants)\n`;
            description += `📅 **Journalière :** ${limitStats.daily.used}/${limitStats.daily.limit} (${limitStats.daily.remaining} restants)\n\n`;
        }

        // Afficher les sources de revenus actives
        description += '💸 **Sources de revenus actives :**\n';
        if (isSourceEnabled('voice')) {
            const voiceConfig = config.economy.voiceActivity;
            description += `🔊 **Vocal :** ${voiceConfig.pointsPerMinute} points/min ${voiceConfig.requireUnmuted ? '(micro activé requis)' : ''}\n`;
        }
        if (isSourceEnabled('message')) {
            const msgConfig = config.economy.messageActivity;
            description += `💬 **Messages :** ${msgConfig.pointsPerReward} points tous les ${msgConfig.messagesRequired} messages\n`;
        }
        if (isSourceEnabled('quiz')) {
            const quizConfig = config.economy.dailyQuiz;
            description += `🧠 **Quiz quotidien :** ${quizConfig.pointsPerCorrectAnswer} points/bonne réponse\n`;
        }
        if (isSourceEnabled('games')) {
            description += `🎮 **Jeux :** Récompenses variables selon la performance\n`;
        }

        embed.setDescription(description);
        await interaction.editReply({ embeds: [embed] });
    },
};