const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const errorHandler = require('../utils/errorHandler');

const afkFilePath = path.join(__dirname, '..', 'data', 'afk.json');

async function getAfkUsers() {
    try {
        if (!fs.existsSync(afkFilePath)) {
            return {};
        }
        const data = await fs.promises.readFile(afkFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur lors de la lecture de afk.json:', error);
        return {};
    }
}

async function saveAfkUsers(data) {
    try {
        await fs.promises.writeFile(afkFilePath, JSON.stringify(data, null, 4));
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
        return await errorHandler.safeExecute(async () => {
            const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
            
            // Validation de l'entrée utilisateur
            const isValidReason = await errorHandler.validateUserInput(
                reason,
                (input) => input.length <= 200,
                interaction
            );
            if (!isValidReason) return;

            const afkUsers = await getAfkUsers();
            const userId = interaction.user.id;

            // Vérifier si l'utilisateur est déjà AFK
            if (afkUsers[userId]) {
                const afkEmbed = new EmbedBuilder()
                    .setColor(0xFF6B6B)
                    .setTitle('Déjà AFK')
                    .setDescription(`Vous êtes déjà AFK depuis <t:${Math.floor(new Date(afkUsers[userId].timestamp).getTime() / 1000)}:R>`)
                    .addFields(
                        { name: 'Raison actuelle', value: afkUsers[userId].reason }
                    )
                    .setTimestamp()
                    .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

                return await interaction.reply({ embeds: [afkEmbed], ephemeral: true });
            }

            // Définir le statut AFK
            afkUsers[userId] = {
                reason: reason,
                timestamp: new Date().toISOString()
            };

            await saveAfkUsers(afkUsers);

            // Modifier le surnom en évitant les préfixes imbriqués
            try {
                const currentNickname = interaction.member.displayName;
                if (!currentNickname.startsWith('[AFK]')) {
                    await interaction.member.setNickname(`[AFK] ${currentNickname}`);
                }
            } catch (nicknameError) {
                // Erreur de permissions probablement, mais pas critique
                errorHandler.logError('AFK-Nickname', nicknameError, { 
                    userId: interaction.user.id, 
                    guild: interaction.guild.id 
                });
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
        }, interaction, errorHandler.errorTypes.INTERNAL_ERROR);
    },
};