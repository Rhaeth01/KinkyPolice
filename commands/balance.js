const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserBalance } = require('../utils/currencyManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Affiche votre solde de KinkyCoins.'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const balance = await getUserBalance(userId);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💰 Votre Solde de KinkyCoins')
            .setDescription(`Vous avez **${balance}** KinkyCoins.`)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};