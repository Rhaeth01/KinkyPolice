const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { logChannelId } = require('../config.json');

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

        // Rôles autorisés à parler (à ajuster selon vos besoins)
        const allowedRoles = [
            // Ajoutez ici les IDs des rôles autorisés à parler même quand le salon est verrouillé
            // Par exemple: '1234567890123456789'
        ];

        // Permissions pour les rôles autorisés
        const allowedPermissions = {
            ViewChannel: true,
            SendMessages: true,
            AddReactions: true,
            // Ajoutez d'autres permissions si nécessaire
        };

        // Permissions pour tout le monde (bloqué)
        const everyonePermissions = {
            ViewChannel: true,
            SendMessages: false,
            AddReactions: false,
            CreatePublicThreads: false,
            CreatePrivateThreads: false,
            // Bloquer d'autres permissions si nécessaire
        };

        try {
            // Mettre à jour les permissions du rôle @everyone
            await channel.permissionOverwrites.create(channel.guild.roles.everyone, everyonePermissions);
            
            // Mettre à jour les permissions pour les rôles autorisés
            for (const roleId of allowedRoles) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (role) {
                    await channel.permissionOverwrites.create(role, allowedPermissions);
                }
            }

            // Envoyer l'embed de confirmation
            const lockEmbed = new EmbedBuilder()
                .setColor(0xFF0000) // Rouge pour verrouillage
                .setTitle('🔒 Salon Verrouillé')
                .setDescription('Ce salon a été verrouillé. Veuillez vous comporter de manière appropriée et respecter les règles du serveur.')
                .setTimestamp();

            await interaction.reply({ embeds: [lockEmbed] });

            // Log de l'action dans le salon des logs
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