const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRandomGage } = require('../utils/jsonManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gage')
        .setDescription('Donne un "Gage".'),
    async execute(interaction) {
        const gage = getRandomGage();

        if (!gage) {
            return interaction.reply({ content: 'Désolé, il n\'y a aucun gage enregistré pour le moment. Ajoutez-en avec `/add-gage` !', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C) // Rouge
            .setTitle('😈 Gage !')
            .setDescription(gage)
            .setFooter({ text: `Proposé par ${interaction.client.user.username}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
