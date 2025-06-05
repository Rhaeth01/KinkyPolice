const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprime un nombre spécifié de messages.')
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Le nombre de messages à supprimer (entre 1 et 1000)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(1000))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages) // Seuls les membres avec la permission de gérer les messages peuvent utiliser cette commande
        .setDMPermission(false), // Commande non utilisable en DM
    async execute(interaction) {
        const amount = interaction.options.getInteger('nombre');
        const channel = interaction.channel;

        if (!channel.isTextBased() || channel.isDMBased()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un salon textuel du serveur.', ephemeral: true });
        }

        let totalDeleted = 0;
        try {
            // Suppression directe sans boucle
            const fetchedMessages = await channel.messages.fetch({ limit: amount });
            const deletedMessages = await channel.bulkDelete(fetchedMessages, true);
            totalDeleted = deletedMessages.size;

            // Log l'action dans le salon de logs
            const logChannel = interaction.guild.channels.cache.get(configManager.modLogChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0x5865F2) // Bleu Discord
                    .setTitle('🧹 Journal de modération - Clear')
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .addFields(
                        { name: 'Modérateur', value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
                        { name: 'Salon', value: `${channel.name} (\`${channel.id}\`)`, inline: true },
                        { name: 'Messages demandés', value: `${amount}`, inline: true },
                        { name: 'Messages supprimés', value: `${totalDeleted}`, inline: true }
                    )
                    .setFooter({ text: `Action effectuée`, iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

            // Réponse à l'utilisateur
            const replyEmbed = new EmbedBuilder()
                .setColor(0x00FF00) // Vert
                .setTitle('🧹 Messages supprimés')
                .setDescription(`\`${totalDeleted}\` messages ont été supprimés avec succès dans ${channel}.`)
                .setFooter({ text: `Demandé par ${interaction.user.username}` })
                .setTimestamp();

            await interaction.reply({ embeds: [replyEmbed], ephemeral: true });

        } catch (error) {
            console.error('Erreur lors de la suppression des messages:', error);
            let errorMessage = 'Une erreur est survenue lors de la tentative de suppression des messages.';
            if (totalDeleted > 0) {
                errorMessage += ` ${totalDeleted} messages ont tout de même été supprimés.`;
            }
            if (error.code === 50013) { // Missing Permissions
                errorMessage = 'Je n\'ai pas les permissions nécessaires pour supprimer des messages dans ce salon.';
            } else if (error.code === 50034) { // Messages too old
                errorMessage = 'Impossible de supprimer des messages datant de plus de 14 jours.';
            }
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    },
};
