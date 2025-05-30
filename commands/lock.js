const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Verrouille le salon pour empêcher tout le monde de parler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),
    async execute(interaction) {
        const channel = interaction.channel;
        
        // Vérifier si le canal est un salon de texte
        if (channel.type !== ChannelType.GuildText) {
            return interaction.reply({ 
                content: 'Cette commande ne peut être utilisée que dans un salon de texte.', 
                ephemeral: true 
            });
        }

        try {
            // Récupérer les permissions actuelles pour @everyone
            const everyoneRole = channel.guild.roles.everyone;
            const currentOverwrite = channel.permissionOverwrites.cache.get(everyoneRole.id);
            
            // Créer ou mettre à jour les permissions pour @everyone
            if (currentOverwrite) {
                // Si des permissions existent déjà, les mettre à jour
                await channel.permissionOverwrites.edit(everyoneRole, {
                    SendMessages: false,
                    AddReactions: false,
                    CreatePublicThreads: false,
                    CreatePrivateThreads: false,
                    SendMessagesInThreads: false,
                    // Ne pas toucher à ViewChannel pour préserver la visibilité
                });
            } else {
                // Si aucune permission n'existe, en créer
                await channel.permissionOverwrites.create(everyoneRole, {
                    SendMessages: false,
                    AddReactions: false,
                    CreatePublicThreads: false,
                    CreatePrivateThreads: false,
                    SendMessagesInThreads: false,
                });
            }

            // Envoyer l'embed de confirmation
            const lockEmbed = new EmbedBuilder()
                .setColor(0xFF0000) // Rouge pour verrouillage
                .setTitle('🔒 Salon Verrouillé')
                .setDescription('Ce salon a été verrouillé. Seuls les modérateurs peuvent maintenant envoyer des messages.')
                .setTimestamp();

            await interaction.reply({ embeds: [lockEmbed] });

            // Log de l'action dans le salon des logs
            const logChannelId = configManager.logChannelId;
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🔒 Commande /lock exécutée')
                    .setDescription('Un salon a été verrouillé avec succès')
                    .addFields(
                        { name: 'Modérateur', value: `${interaction.user}`, inline: true },
                        { name: 'Salon', value: `${channel}`, inline: true },
                        { name: 'Date', value: new Date().toLocaleString('fr-FR'), inline: true }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error('Erreur lors du verrouillage du salon:', error);
            await interaction.reply({ 
                content: 'Une erreur est survenue lors du verrouillage du salon.', 
                ephemeral: true 
            });
        }
    },
};
