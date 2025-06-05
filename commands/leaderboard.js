const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../utils/gameScoresManager');
const { getMessage } = require('../utils/messageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Affiche le classement des jeux.')
        .addStringOption(option =>
            option.setName('jeu')
                .setDescription('Le jeu pour lequel afficher le classement.')
                .setRequired(true)
                .addChoices(
                    { name: 'Quiz Kinky', value: 'quiz' }
                    // Ajoutez d'autres jeux ici au fur et à mesure
                ))
        .addIntegerOption(option =>
            option.setName('limite')
                .setDescription('Nombre de joueurs à afficher (défaut: 10).')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(20)),
    async execute(interaction) {
        await interaction.deferReply();

        const gameType = interaction.options.getString('jeu');
        const limit = interaction.options.getInteger('limite') || 10;

        const leaderboard = await getLeaderboard(gameType, limit);

        if (leaderboard.length === 0) {
            return interaction.editReply({ content: getMessage('leaderboard.noScores', { gameType: getGameName(gameType) }) });
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`🏆 Classement - ${getGameName(gameType)}`)
            .setDescription(`Top ${leaderboard.length} joueurs :`)
            .setTimestamp();

        let description = '';
        for (let i = 0; i < leaderboard.length; i++) {
            const entry = leaderboard[i];
            const user = await interaction.client.users.fetch(entry.userId).catch(() => null);
            const username = user ? user.username : `Utilisateur Inconnu (${entry.userId})`;
            description += `**${i + 1}.** ${username} - Score: **${entry.score}**\n`;
        }
        embed.setDescription(description);

        await interaction.editReply({ embeds: [embed] });
    },
};

function getGameName(gameType) {
    switch (gameType) {
        case 'quiz':
            return 'Quiz Kinky';
        // Ajoutez d'autres cas pour les noms de jeux
        default:
            return gameType;
    }
}