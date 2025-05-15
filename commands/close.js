const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logChannelId } = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Ferme le ticket actuel et envoie les logs')
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de la fermeture du ticket')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),
    async execute(interaction) {
        const ticketChannel = interaction.channel;
        const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

        // On stocke le nom et l'ID AVANT suppression
        const ticketChannelName = ticketChannel.name;
        const ticketChannelId = ticketChannel.id;

        try {
            // Création de l'embed pour les logs
            const logEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🔒 Ticket Fermé')
                .setDescription(`Ticket **${ticketChannelName}** (\`${ticketChannelId}\`) fermé par ${interaction.user}`)
                .addFields(
                    { name: '📅 Date', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true },
                    { name: '🛠️ Action par', value: `${interaction.user}`, inline: true },
                    { name: 'Raison', value: reason, inline: false }
                )
                .setTimestamp();

            // Récupération du canal de logs
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                await logChannel.send({ embeds: [logEmbed] });
            }

            // Confirmation à l'utilisateur AVANT suppression
            await interaction.reply({ content: `Le ticket **${ticketChannelName}** va être fermé et supprimé !\n**Raison :** ${reason}`, ephemeral: true });

            // Suppression du salon ticket
            await ticketChannel.delete(`Ticket fermé par ${interaction.user.tag} | Raison : ${reason}`);
        } catch (error) {
            // Gestion des erreurs
            console.error('Erreur fermeture ticket:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Erreur lors de la fermeture du ticket', ephemeral: true });
            }
        }
    }
};