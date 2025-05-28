const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs').promises;
const path = require('node:path');

const currencyFilePath = path.join(__dirname, '..', 'data', 'currency.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top-points')
        .setDescription('Affiche le classement des 20 membres avec le plus de Kinky Points.'),
    async execute(interaction) {
        await interaction.deferReply();

        let currencyData = {};
        try {
            const data = await fs.readFile(currencyFilePath, 'utf8');
            currencyData = JSON.parse(data);
        } catch (error) {
            console.error("Erreur lors de la lecture du fichier de monnaie:", error);
            return interaction.editReply({ content: 'Impossible de charger les données de Kinky Points pour le moment.' });
        }

        const guild = interaction.guild;
        if (!guild) {
            return interaction.editReply({ content: 'Cette commande ne peut être utilisée que sur un serveur.' });
        }

        const leaderboard = [];

        for (const userId in currencyData) {
            const balance = currencyData[userId];
            try {
                const member = await guild.members.fetch(userId);
                leaderboard.push({
                    user: member.user,
                    balance: balance
                });
            } catch (error) {
                // Ignorer les utilisateurs qui ne sont plus sur le serveur ou qui ne peuvent pas être récupérés
                console.warn(`Impossible de récupérer le membre ${userId}:`, error.message);
            }
        }

        leaderboard.sort((a, b) => b.balance - a.balance);

        const top20 = leaderboard.slice(0, 20);

        const embed = new EmbedBuilder()
            .setTitle('👑 Top 20 des Kinky Points')
            .setDescription('Voici les membres les plus riches en Kinky Points ! 💰')
            .setColor('#FF69B4') // Rose vif
            .setTimestamp();

        if (top20.length === 0) {
            embed.setDescription('Personne n\'a encore de Kinky Points. Soyez le premier à jouer !');
        } else {
            let description = '';
            for (let i = 0; i < top20.length; i++) {
                const entry = top20[i];
                const rank = i + 1;
                const emoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '✨';
                description += `${emoji} **${rank}.** ${entry.user.username} : **${entry.balance}** Kinky Points\n`;
            }
            embed.addFields({ name: 'Classement', value: description });
        }

        await interaction.editReply({ embeds: [embed] });
    }
};