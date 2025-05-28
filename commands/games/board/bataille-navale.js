const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bataille-navale')
        .setDescription('Joue à une partie de Bataille Navale.'),
    async execute(interaction) {
        await interaction.reply('Lancement d\'une partie de Bataille Navale...');
        // Logique de jeu Bataille Navale à implémenter ici
    },
};