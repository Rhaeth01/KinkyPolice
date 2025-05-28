const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uno')
        .setDescription('Joue à une partie de Uno multijoueur.'),
    async execute(interaction) {
        await interaction.reply('Lancement d\'une partie de Uno...');
        // Logique de jeu Uno à implémenter ici
    },
};