const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const afkFilePath = path.join(__dirname, '..', 'data', 'afk.json');

function getAfkUsers() {
    try {
        if (!fs.existsSync(afkFilePath)) {
            return {};
        }
        const data = fs.readFileSync(afkFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur lors de la lecture de afk.json:', error);
        return {};
    }
}

function saveAfkUsers(data) {
    try {
        fs.writeFileSync(afkFilePath, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error(`Erreur lors de l'écriture de afk.json:`, error);
    }
}

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
        const afkUsers = getAfkUsers();
        const userId = interaction.user.id;

        afkUsers[userId] = {
            reason: reason,
            timestamp: new Date().toISOString()
        };

        saveAfkUsers(afkUsers);

        try {
            await interaction.member.setNickname(`[AFK] ${interaction.member.displayName}`);
        } catch (error) {
            console.error(`Impossible de définir le pseudo pour ${interaction.user.tag}: ${error}`);
        }

        const afkEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Statut AFK')
            .setDescription(`Vous êtes maintenant AFK.`)
            .addFields(
                { name: 'Raison', value: reason }
            )
            .setTimestamp()
            .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [afkEmbed], ephemeral: true });
    },
};