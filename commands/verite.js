const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRandomVerite } = require('../utils/jsonManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verite')
        .setDescription('Pose une question "Vérité".'),
    async execute(interaction) {
        const verite = getRandomVerite();

        if (!verite) {
            return interaction.reply({ content: 'Désolé, il n\'y a aucune vérité enregistrée pour le moment. Ajoutez-en avec `/add-verite` !', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(0x3498DB) // Bleu
            .setTitle('💡 Vérité !')
            .setDescription(verite)
            .setFooter({ text: `Proposé par ${interaction.client.user.username}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
