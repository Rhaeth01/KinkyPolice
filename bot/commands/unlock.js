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
            // Récupérer les permissions actuelles pour @everyone
            const everyoneRole = channel.guild.roles.everyone;
            const currentOverwrite = channel.permissionOverwrites.cache.get(everyoneRole.id);
            
            if (currentOverwrite) {
                // Mettre à jour les permissions en rétablissant les permissions de parole
                await channel.permissionOverwrites.edit(everyoneRole, {
                    SendMessages: null, // null = permission par défaut
                    AddReactions: null,
                    CreatePublicThreads: null,
                    CreatePrivateThreads: null,
                    SendMessagesInThreads: null,
                    // Ne pas toucher à ViewChannel pour préserver la visibilité
                });
                
                // Si toutes les permissions sont null, on peut supprimer l'overwrite
                const updatedOverwrite = channel.permissionOverwrites.cache.get(everyoneRole.id);
                if (updatedOverwrite && !updatedOverwrite.allow.bitfield && !updatedOverwrite.deny.bitfield) {
                    await channel.permissionOverwrites.delete(everyoneRole);
                }
            }
            
            // Envoyer l'embed de confirmation
            const unlockEmbed = new EmbedBuilder()
                .setColor(0x00FF00) // Vert pour déverrouillage
                .setTitle('🔓 Salon Déverrouillé')
                .setDescription('Ce salon a été déverrouillé. Tout le monde peut maintenant envoyer des messages.')
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
