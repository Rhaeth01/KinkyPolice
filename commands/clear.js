const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logChannelId } = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprime un nombre spécifié de messages.')
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Le nombre de messages à supprimer (entre 1 et 100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages) // Seuls les membres avec la permission de gérer les messages peuvent utiliser cette commande
        .setDMPermission(false), // Commande non utilisable en DM
    async execute(interaction) {
        const amount = interaction.options.getInteger('nombre');
        const channel = interaction.channel;

        if (!channel.isTextBased() || channel.isDMBased()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un salon textuel du serveur.', ephemeral: true });
        }

        try {
            const fetchedMessages = await channel.messages.fetch({ limit: amount });
            const deletedMessages = await channel.bulkDelete(fetchedMessages, true);

            if (deletedMessages.size === 0) {
                return interaction.reply({ content: 'Aucun message n\'a pu être supprimé (ils sont peut-être trop anciens).', ephemeral: true });
            }

            const replyEmbed = new EmbedBuilder()
                .setColor(0x00FF00) // Vert
                .setTitle('Messages supprimés')
                .setDescription(`\`${deletedMessages.size}\` messages ont été supprimés avec succès dans ce salon.`)
                .setTimestamp();

            await interaction.reply({ embeds: [replyEmbed], ephemeral: true });

            // Log l'action dans le salon de logs
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0xFFA500) // Orange
                    .setTitle('Commande /clear exécutée')
                    .setDescription(`La commande /clear a été utilisée par ${interaction.user.tag} (\`${interaction.user.id}\`) dans le salon ${channel.name} (\`${channel.id}\`).`)
                    .addFields({ name: 'Messages supprimés', value: `${deletedMessages.size}` })
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('Erreur lors de la suppression des messages:', error);
            let errorMessage = 'Une erreur est survenue lors de la tentative de suppression des messages.';
            if (error.code === 50013) { // Missing Permissions
                errorMessage = 'Je n\'ai pas les permissions nécessaires pour supprimer des messages dans ce salon.';
            } else if (error.code === 50034) { // Messages too old
                errorMessage = 'Impossible de supprimer des messages datant de plus de 14 jours.';
            }
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    },
};
