const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const configManager = require('../utils/configManager'); // Utiliser le configManager au lieu de config.json direct

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice-logs-config')
        .setDescription('Configure le salon de logs vocaux')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Définir le salon de logs vocaux')
                .addChannelOption(option =>
                    option
                        .setName('salon')
                        .setDescription('Le salon où envoyer les logs vocaux')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Voir la configuration actuelle des logs vocaux')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Envoyer un message de test dans le salon de logs vocaux')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'set': {
                const channel = interaction.options.getChannel('salon');
                
                // Vérifier les permissions du bot dans le salon
                const botMember = interaction.guild.members.me;
                const permissions = channel.permissionsFor(botMember);
                
                if (!permissions.has(PermissionFlagsBits.ViewChannel) || 
                    !permissions.has(PermissionFlagsBits.SendMessages) || 
                    !permissions.has(PermissionFlagsBits.EmbedLinks)) {
                    return interaction.reply({
                        content: '❌ Je n\'ai pas les permissions nécessaires dans ce salon (Voir le salon, Envoyer des messages, Intégrer des liens).',
                        ephemeral: true
                    });
                }

                // Mettre à jour la configuration
                configManager.voiceLogChannelId = channel.id;

                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Configuration mise à jour')
                    .setDescription(`Le salon de logs vocaux a été défini sur ${channel}`)
                    .addFields(
                        { name: '🔊 Salon', value: `${channel}`, inline: true },
                        { name: '🆔 ID', value: `\`${channel.id}\``, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                break;
            }

            case 'view': {
                const voiceLogChannelId = configManager.voiceLogChannelId;
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('📊 Configuration des logs vocaux')
                    .setTimestamp();

                if (voiceLogChannelId) {
                    const channel = interaction.guild.channels.cache.get(voiceLogChannelId);
                    if (channel) {
                        embed.setDescription('Voici la configuration actuelle des logs vocaux')
                            .addFields(
                                { name: '🔊 Salon', value: `${channel}`, inline: true },
                                { name: '🆔 ID', value: `\`${channel.id}\``, inline: true },
                                { name: '✅ Statut', value: 'Configuré et actif', inline: true }
                            );
                    } else {
                        embed.setDescription('⚠️ Le salon configuré n\'existe plus')
                            .addFields(
                                { name: '🆔 ID configuré', value: `\`${voiceLogChannelId}\``, inline: true },
                                { name: '❌ Statut', value: 'Salon introuvable', inline: true }
                            );
                    }
                } else {
                    embed.setDescription('❌ Aucun salon de logs vocaux n\'est configuré')
                        .addFields(
                            { name: '💡 Conseil', value: 'Utilisez `/voice-logs-config set` pour configurer un salon', inline: false }
                        );
                }

                await interaction.reply({ embeds: [embed] });
                break;
            }

            case 'test': {
                const voiceLogChannelId = configManager.voiceLogChannelId;
                
                if (!voiceLogChannelId) {
                    return interaction.reply({
                        content: '❌ Aucun salon de logs vocaux n\'est configuré. Utilisez `/voice-logs-config set` pour en définir un.',
                        ephemeral: true
                    });
                }

                const channel = interaction.guild.channels.cache.get(voiceLogChannelId);
                if (!channel) {
                    return interaction.reply({
                        content: '❌ Le salon de logs vocaux configuré n\'existe plus.',
                        ephemeral: true
                    });
                }

                // Créer un message de test
                const testEmbed = new EmbedBuilder()
                    .setColor('#9900ff')
                    .setAuthor({ 
                        name: 'Test des logs vocaux', 
                        iconURL: interaction.client.user.displayAvatarURL() 
                    })
                    .setDescription('🧪 Ceci est un message de test pour vérifier que les logs vocaux fonctionnent correctement.')
                    .addFields(
                        { name: '👤 Déclenché par', value: `${interaction.user}`, inline: true },
                        { name: '⏰ Heure', value: `<t:${Math.floor(Date.now() / 1000)}:T>`, inline: true },
                        { name: '✅ Statut', value: 'Système opérationnel', inline: true }
                    )
                    .setFooter({ text: 'Test du système de logs vocaux' })
                    .setTimestamp();

                try {
                    await channel.send({ embeds: [testEmbed] });
                    
                    const confirmEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('✅ Test réussi')
                        .setDescription(`Le message de test a été envoyé avec succès dans ${channel}`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
                } catch (error) {
                    console.error('[VoiceLogsConfig] Erreur lors de l\'envoi du message de test:', error);
                    await interaction.reply({
                        content: `❌ Impossible d'envoyer le message de test. Erreur: ${error.message}`,
                        ephemeral: true
                    });
                }
                break;
            }
        }
    },
};
