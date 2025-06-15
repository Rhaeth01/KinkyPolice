const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delete')
        .setDescription('Supprime définitivement le ticket actuel.')
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de la suppression du ticket')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) // Seuls ceux qui peuvent gérer les salons peuvent utiliser cette commande
        .setDMPermission(false),
    async execute(interaction) {
        const ticketChannel = interaction.channel;
        const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

        // Vérifier si le salon est bien un ticket
        if (ticketChannel.parentId !== configManager.ticketCategoryId && ticketChannel.parentId !== configManager.acceptedEntryCategoryId) {
            return interaction.reply({ content: "Cette commande ne peut être utilisée que dans un salon de ticket.", ephemeral: true });
        }

        const originalChannelName = ticketChannel.name;
        const originalChannelId = ticketChannel.id;

        try {
            // Confirmation à l'utilisateur AVANT suppression
            await interaction.reply({ content: `Le ticket **${originalChannelName}** va être supprimé définitivement !\n**Raison :** ${reason}`, ephemeral: false });

            // Suppression du salon ticket après un court délai pour que le message de confirmation soit visible
            setTimeout(async () => {
                await ticketChannel.delete(`Ticket supprimé par ${interaction.user.tag} | Raison : ${reason}`);

                // Log l'action
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(0xFF0000) // Rouge pour suppression
                        .setTitle('🗑️ Ticket Supprimé (Commande)')
                        .setDescription(`Ticket **${originalChannelName}** (ID: \`${originalChannelId}\`) supprimé par ${interaction.user.tag}`)
                        .addFields(
                            { name: '📅 Date', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true },
                            { name: '🛠️ Action par', value: `${interaction.user}`, inline: true },
                            { name: 'Raison', value: reason, inline: false }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }, 3000); // Délai de 3 secondes

        } catch (error) {
            console.error('Erreur lors de la suppression du ticket via commande:', error);
            // Si le reply initial a échoué, on tente un nouveau reply
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Erreur lors de la suppression du ticket.', ephemeral: true });
            } else if(interaction.replied && !interaction.deferred) {
                // Si le reply initial a réussi mais la suppression échoue, on followUp sur le message de confirmation
                 await interaction.editReply({ content: `Erreur lors de la suppression du ticket **${originalChannelName}**. Veuillez vérifier les logs.`});
            } else {
                 await interaction.followUp({ content: 'Erreur lors de la suppression du ticket.', ephemeral: true });
            }
        }
    }
};