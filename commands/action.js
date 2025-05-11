const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRandomAction } = require('../utils/jsonManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('action')
        .setDescription('Donne un défi "Action".'),
    async execute(interaction) {
        const action = getRandomAction();

        if (!action) {
            return interaction.reply({ content: 'Désolé, il n\'y a aucune action enregistrée pour le moment. Ajoutez-en avec `/add-action` !', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(0xE67E22) // Orange
            .setTitle('💥 Action !')
            .setDescription(action)
            .setFooter({ text: `Proposé par ${interaction.client.user.username}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
