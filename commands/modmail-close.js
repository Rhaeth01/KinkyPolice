const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logChannelId } = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modmail-close')
        .setDescription('Ferme un ticket modmail')
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de la fermeture du ticket')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),
    async execute(interaction) {
        // Vérifier si le canal est un ticket modmail
        if (!interaction.channel.name.startsWith('modmail-')) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un canal de ticket modmail.', ephemeral: true });
        }

        const ticketChannel = interaction.channel;
        const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

        try {
            // Extraire l'ID de l'utilisateur du nom du canal
            const userId = ticketChannel.name.split('-')[1];
            const user = await interaction.client.users.fetch(userId);

            // Informer l'utilisateur que son ticket a été fermé
            if (user) {
                const closeEmbed = new EmbedBuilder()
                    .setColor(0xE74C3C)
                    .setTitle('Ticket fermé')
                    .setDescription(`Votre ticket a été fermé par un membre du staff.\nRaison: ${reason}`)
                    .setTimestamp();
                
                await user.send({ embeds: [closeEmbed] }).catch(() => {
                    console.log(`Impossible d'envoyer un message à l'utilisateur ${userId}`);
                });
            }

            // Création de l'embed pour les logs
            const logEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🔒 Ticket ModMail Fermé')
                .setDescription(`Ticket **${ticketChannel.name}** fermé par ${interaction.user.tag}`)
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
            await interaction.reply({ content: `Le ticket **${ticketChannel.name}** va être fermé et supprimé !\n**Raison :** ${reason}`, ephemeral: true });

            // Suppression du salon ticket
            await ticketChannel.delete(`Ticket fermé par ${interaction.user.tag} | Raison : ${reason}`);
        } catch (error) {
            console.error('Erreur fermeture ticket modmail:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Erreur lors de la fermeture du ticket', ephemeral: true });
            }
        }
    }
};