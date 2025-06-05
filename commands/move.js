const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('Déplace un membre vers un autre salon vocal.')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Le membre à déplacer.')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('salon_destination')
                .setDescription('Le salon vocal de destination.')
                .addChannelTypes(ChannelType.GuildVoice) // S'assure que seul un salon vocal peut être sélectionné
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .setDMPermission(false),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur');
        const destinationChannel = interaction.options.getChannel('salon_destination');
const member = interaction.guild.members.resolve(targetUser);

        if (!member) {
            return interaction.reply({ content: 'Impossible de trouver ce membre sur le serveur.', ephemeral: true });
        }

const originalChannel = member.voice.channel;
console.log('🔍 [Move] Salon vocal d\'origine:', originalChannel ? `#${originalChannel.name}` : 'AUCUN');

if (!originalChannel) {
console.log('❌ [Move] Le membre n\'est pas connecté à un salon vocal.');
            return interaction.reply({ content: `${targetUser.tag} n'est pas connecté à un salon vocal.`, ephemeral: true });
        }

        if (originalChannel.id === destinationChannel.id) {
            console.log('⚠️ [Move] Tentative de déplacement vers le même salon');
            return interaction.reply({ content: `${targetUser.tag} est déjà dans le salon ${destinationChannel.name}.`, ephemeral: true });
        }

        try {
console.log(`🚚 [Move] Déplacement de ${targetUser.tag} : #${originalChannel.name} → #${destinationChannel.name}`);
await member.voice.setChannel(destinationChannel);
console.log(`✅ [Move] Déplacement réussi pour ${targetUser.tag}`);

            const successEmbed = new EmbedBuilder()
                .setColor(0x3498DB) // Bleu moderne
                .setTitle('🚚 Déplacement effectué')
                .setDescription(`**${targetUser.displayName}** a été déplacé avec succès`)
                .addFields(
                    { name: '📤 Salon d\'origine', value: `<#${originalChannel.id}>`, inline: true },
                    { name: '📥 Salon de destination', value: `<#${destinationChannel.id}>`, inline: true },
                    { name: '👤 Utilisateur', value: `<@${targetUser.id}>`, inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({
                    text: 'Déplacement vocal réussi',
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            // Log de l'action
            const logChannel = interaction.guild.channels.cache.get(configManager.modLogChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0x3498DB) // Bleu moderne
                    .setTitle('🚚 Déplacement de Membre')
                    .setDescription(`**${targetUser.tag}** a été déplacé avec succès`)
                    .addFields(
                        { name: '👮‍♂️ Modérateur', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '👤 Membre déplacé', value: `<@${targetUser.id}>`, inline: true },
                        { name: '🆔 ID Membre', value: `\`${targetUser.id}\``, inline: true },
                        { name: '📤 Salon d\'origine', value: `<#${originalChannel.id}>`, inline: true },
                        { name: '📥 Salon de destination', value: `<#${destinationChannel.id}>`, inline: true },
                        { name: '⏰ Heure', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setFooter({
                        text: `Action effectuée par ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error(`❌ [Move] Erreur lors du déplacement de ${targetUser.tag}:`, {
                code: error.code,
                message: error.message,
                from: originalChannel?.name,
                to: destinationChannel.name
            });
            
            let errorMessage = 'Une erreur est survenue lors de la tentative de déplacement du membre.';
            if (error.code === 50013) { // Missing Permissions
                errorMessage = 'Je n\'ai pas les permissions nécessaires pour déplacer des membres ou pour accéder à l\'un des salons vocaux.';
            } else if (error.code === 40032 ) { // Target user is not connected to voice
                 errorMessage = `${targetUser.tag} n'est plus connecté à un salon vocal ou la connexion a été perdue.`;
            }
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    },
};