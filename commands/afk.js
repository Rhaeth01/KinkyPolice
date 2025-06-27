const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Définit votre statut AFK.')
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('La raison de votre absence.')
                .setRequired(false)),
    async execute(interaction) {
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
        const afkUsers = require('../data/afk.json');
        const userId = interaction.user.id;

        afkUsers[userId] = {
            reason: reason,
            timestamp: new Date().toISOString()
        };

        const fs = require('fs');
        fs.writeFileSync('./data/afk.json', JSON.stringify(afkUsers, null, 4));

        try {
            await interaction.member.setNickname(`[AFK] ${interaction.member.displayName}`);
        } catch (error) {
            console.error(`Impossible de définir le pseudo pour ${interaction.user.tag}: ${error}`);
        }

        await interaction.reply({ content: `Vous êtes maintenant AFK. Raison: ${reason}`, ephemeral: true });
    },
};