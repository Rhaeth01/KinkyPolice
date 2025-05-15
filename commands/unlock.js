const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { logChannelId } = require('../config.json');

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
            // Rétablir les permissions par défaut pour @everyone
            await channel.permissionOverwrites.delete(channel.guild.roles.everyone);
            
            // Envoyer l'embed de confirmation
            const unlockEmbed = new EmbedBuilder()
                .setColor(0x00FF00) // Vert pour déverrouillage
                .setTitle('🔓 Salon Déverrouillé')
                .setDescription('Ce salon a été déverrouillé. Vous pouvez maintenant parler librement.')
                .setTimestamp();

            await interaction.reply({ embeds: [unlockEmbed] });

            // Log de l'action dans le salon des logs
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