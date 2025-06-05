const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fetchJoke } = require('../utils/jokeApi');
const { getMessage } = require('../utils/messageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blague')
        .setDescription('Raconte une blague aléatoire.'),
    async execute(interaction) {
        await interaction.deferReply();

        const joke = await fetchJoke();

        if (joke) {
            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('😂 Une petite blague pour vous !')
                .setDescription(joke)
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.editReply({ content: getMessage('joke.fetchError') });
        }
    },
};