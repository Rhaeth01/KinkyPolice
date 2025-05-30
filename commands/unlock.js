const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Déverrouille le salon pour permettre à tout le monde de parler.')
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
            // Rétablir uniquement les permissions de parole pour @everyone
            // sans affecter la visibilité du salon
            const currentOverwrite = channel.permissionOverwrites.cache.get(channel.guild.roles.everyone.id);
            
            if (currentOverwrite) {
                // Mettre à jour les permissions en gardant ViewChannel intact
                await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                    SendMessages: null, // Rétablir la permission de parler (null = permission par défaut)
                    AddReactions: null, // Rétablir la permission de réagir
                    CreatePublicThreads: null, // Rétablir la permission de créer des threads publics
                    CreatePrivateThreads: null, // Rétablir la permission de créer des threads privés
                    // Ne pas toucher à ViewChannel pour préserver la visibilité
                });
            }
            
            // Envoyer l'embed de confirmation
            const unlockEmbed = new EmbedBuilder()
                .setColor(0x00FF00) // Vert pour déverrouillage
                .setTitle('🔓 Salon Déverrouillé')
                .setDescription('Ce salon a été déverrouillé. Vous pouvez maintenant parler librement.')
                .setTimestamp();

            await interaction.reply({ embeds: [unlockEmbed] });

            // Log de l'action dans le salon des logs
            const logChannelId = configManager.logChannelId;
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🔓 Commande /unlock exécutée')
                    .setDescription('Un salon a été déverrouillé avec succès')
                    .addFields(
                        { name: 'Modérateur', value: `${interaction.user}`, inline: true },
                        { name: 'Salon', value: `${channel}`, inline: true },
                        { name: 'Date', value: new Date().toLocaleString('fr-FR'), inline: true }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error('Erreur lors du déverrouillage du salon:', error);
            await interaction.reply({ 
                content: 'Une erreur est survenue lors du déverrouillage du salon.', 
                ephemeral: true 
            });
        }
    },
};
