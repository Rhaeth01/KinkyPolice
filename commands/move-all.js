const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('move-all')
        .setDescription('Déplace tous les membres d\'un salon vocal vers un autre.')
        .addChannelOption(option =>
            option.setName('salon_source')
                .setDescription('Le salon vocal d\'où déplacer les membres.')
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('salon_destination')
                .setDescription('Le salon vocal de destination.')
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers) // Seuls ceux ayant la permission peuvent utiliser la commande
        .setDMPermission(false),
    async execute(interaction) {
        console.log(`🚀 [MoveAll] Début de la commande par ${interaction.user.tag}`);

        // Vérifie si l'utilisateur a la permission Move Members
        if (!interaction.member.permissions.has(PermissionFlagsBits.MoveMembers)) {
            console.log(`❌ [MoveAll] Permission refusée pour ${interaction.user.tag}`);
            return interaction.reply({ content: 'Vous n\'avez pas la permission de déplacer les membres.', ephemeral: true });
        }

        // Récupère le membre bot sur le serveur pour vérifier ses permissions
        const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
        if (!botMember.permissions.has(PermissionFlagsBits.MoveMembers)) {
            console.log('❌ [MoveAll] Le bot n\'a pas les permissions nécessaires');
            return interaction.reply({ content: 'Je n\'ai pas la permission de déplacer les membres.', ephemeral: true });
        }

        const sourceChannel = interaction.options.getChannel('salon_source');
        const destinationChannel = interaction.options.getChannel('salon_destination');
        console.log(`🔍 [MoveAll] Configuration:
        📤 Source: #${sourceChannel.name} (${sourceChannel.members.size} membres)
        📥 Destination: #${destinationChannel.name}
        👮‍♂️ Modérateur: ${interaction.user.tag}`);

        if (sourceChannel.id === destinationChannel.id) {
            console.log('⚠️ [MoveAll] Tentative de déplacement vers le même salon');
            return interaction.reply({ content: 'Le salon source et le salon de destination ne peuvent pas être identiques.', ephemeral: true });
        }

        if (sourceChannel.members.size === 0) {
            console.log(`⚠️ [MoveAll] Aucun membre dans #${sourceChannel.name}`);
            return interaction.reply({ content: `Il n'y a personne dans le salon ${sourceChannel.name}.`, ephemeral: true });
        }

        let movedCount = 0;
        let failedCount = 0;
        const failedMembers = [];

        console.log(`🚚 [MoveAll] Début du déplacement de ${sourceChannel.members.size} membres...`);
        
        // Boucle sur les membres du salon source
        for (const [memberId, member] of sourceChannel.members) {
            console.log(`🔄 [MoveAll] Traitement: ${member.user.tag}`);
            try {
                await member.voice.setChannel(destinationChannel);
                movedCount++;
                console.log(`✅ [MoveAll] ${member.user.tag} déplacé avec succès`);
            } catch (error) {
                failedCount++;
                failedMembers.push(member.user.tag);
                console.error(`❌ [MoveAll] Échec pour ${member.user.tag}:`, {
                    errorCode: error.code,
                    message: error.message
                });
            }
        }
        
        console.log(`📊 [MoveAll] Résultats: ${movedCount} réussis, ${failedCount} échecs`);

        const totalMembers = movedCount + failedCount;
        let embedColor, statusIcon, statusText;
        
        if (movedCount === totalMembers && totalMembers > 0) {
            embedColor = 0x27AE60; // Vert succès
            statusIcon = '✅';
            statusText = 'Déplacement réussi';
        } else if (movedCount > 0 && failedCount > 0) {
            embedColor = 0xF39C12; // Orange mixte
            statusIcon = '⚠️';
            statusText = 'Déplacement partiel';
        } else if (failedCount === totalMembers && totalMembers > 0) {
            embedColor = 0xE74C3C; // Rouge échec
            statusIcon = '❌';
            statusText = 'Déplacement échoué';
        } else {
            embedColor = 0x95A5A6; // Gris neutre
            statusIcon = '❓';
            statusText = 'Aucun membre trouvé';
        }

        const resultEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`🚚 ${statusIcon} Déplacement de masse terminé`)
            .setDescription(`**${statusText}** - Opération de déplacement groupé`)
            .addFields(
                { name: '📤 Salon source', value: `<#${sourceChannel.id}>`, inline: true },
                { name: '📥 Salon destination', value: `<#${destinationChannel.id}>`, inline: true },
                { name: '📊 Résultats', value: `**${movedCount}**/${totalMembers} déplacés`, inline: true }
            )
            .setTimestamp()
            .setFooter({
                text: `${totalMembers} membre(s) traité(s)`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            });

        if (movedCount > 0) {
            resultEmbed.addFields({
                name: '✅ Succès',
                value: `**${movedCount}** membre(s) déplacé(s) avec succès`,
                inline: false
            });
        }
        
        if (failedCount > 0) {
            const failedList = failedMembers.length > 5
                ? `${failedMembers.slice(0, 5).join(', ')} et ${failedMembers.length - 5} autre(s)...`
                : failedMembers.join(', ');
            resultEmbed.addFields({
                name: '❌ Échecs',
                value: `**${failedCount}** membre(s) non déplacé(s)${failedMembers.length > 0 ? `\n\`\`\`${failedList}\`\`\`` : ''}`,
                inline: false
            });
        }

        if (totalMembers === 0) {
            resultEmbed.addFields({
                name: '❓ Information',
                value: `Aucun membre trouvé dans <#${sourceChannel.id}>`,
                inline: false
            });
        }

        await interaction.reply({ embeds: [resultEmbed], ephemeral: true });

        // Log de l'action
        if (movedCount > 0 || failedCount > 0) {
            const logChannel = interaction.guild.channels.cache.get(configManager.modLogChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(movedCount > 0 ? (failedCount > 0 ? 0xF39C12 : 0x27AE60) : 0xE74C3C) // Vert si tout réussi, orange si mixte, rouge si tout échoué
                    .setTitle('🚚 Déplacement de Masse')
                    .setDescription(`**Opération de déplacement groupé terminée**`)
                    .addFields(
                        { name: '👮‍♂️ Modérateur', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '📤 Salon source', value: `<#${sourceChannel.id}>`, inline: true },
                        { name: '📥 Salon destination', value: `<#${destinationChannel.id}>`, inline: true },
                        { name: '✅ Réussites', value: `**${movedCount}** membres`, inline: true },
                        { name: '❌ Échecs', value: `**${failedCount}** membres`, inline: true },
                        { name: '📊 Total traité', value: `**${movedCount + failedCount}** membres`, inline: true },
                        { name: '⏰ Heure', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                    )
                    .setFooter({
                        text: `Action effectuée par ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setTimestamp();
                    
                if (failedCount > 0) {
                    logEmbed.addFields({
                        name: '⚠️ Membres non déplacés',
                        value: failedMembers.length > 0 ? failedMembers.join(', ') : 'Aucun détail disponible',
                        inline: false
                    });
                }
                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        console.log(`🏁 [MoveAll] Commande terminée - Résultat: ${movedCount}/${movedCount + failedCount} membres déplacés`);
    },
};