const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');
const errorHandler = require('../utils/errorHandler');

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
        return await errorHandler.safeExecute(async () => {
            const ticketChannel = interaction.channel;
            const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

            // Validation stricte des permissions
            const hasPermission = await errorHandler.validatePermissions(
                interaction.member,
                PermissionFlagsBits.ManageChannels,
                interaction
            );
            if (!hasPermission) return;

            // Validation de la raison
            const isValidReason = await errorHandler.validateUserInput(
                reason,
                (input) => input.length <= 500 && input.length >= 1,
                interaction
            );
            if (!isValidReason) return;

            // Vérifier si le salon est bien un ticket
            const validParentIds = [configManager.ticketCategoryId, configManager.acceptedEntryCategoryId].filter(Boolean);
            if (!validParentIds.includes(ticketChannel.parentId)) {
                return await errorHandler.handleInteractionError(
                    interaction,
                    'Ce salon n\'est pas un ticket valide.',
                    errorHandler.errorTypes.VALIDATION_FAILED,
                    { customMessage: '🎟️ Cette commande ne peut être utilisée que dans un salon de ticket.' }
                );
            }

            const originalChannelName = ticketChannel.name;
            const originalChannelId = ticketChannel.id;

            // Confirmation à l'utilisateur AVANT suppression
            await interaction.reply({ 
                content: `⚠️ Le ticket **${originalChannelName}** va être supprimé définitivement dans 3 secondes !\n**Raison :** ${reason}`, 
                ephemeral: false 
            });

            // Suppression du salon ticket après un court délai
            setTimeout(async () => {
                try {
                    await ticketChannel.delete(`Ticket supprimé par ${interaction.user.tag} | Raison : ${reason}`);

                    // Log l'action
                    const logChannelId = configManager.ticketLogChannelId;
                    if (logChannelId) {
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
                    }
                } catch (deleteError) {
                    errorHandler.logError('Delete-Command-Timeout', deleteError, {
                        channelId: originalChannelId,
                        userId: interaction.user.id,
                        reason
                    });
                }
            }, 3000); // 3 secondes de délai
        }, interaction, errorHandler.errorTypes.INTERNAL_ERROR);
    }
};