const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Rend muet un membre du serveur.')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Le membre à rendre muet.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('La raison du mute.')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('duree')
                .setDescription('Durée du mute en minutes (0 pour indéfini).')
                .setMinValue(0)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
        .setDMPermission(false),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée.';
        const duration = interaction.options.getInteger('duree') || 0;
        const member = interaction.guild.members.resolve(targetUser);

        if (!member) {
            return interaction.reply({ content: 'Impossible de trouver ce membre sur le serveur.', ephemeral: true });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({ content: 'Vous ne pouvez pas vous rendre muet vous-même.', ephemeral: true });
        }

        if (member.id === interaction.client.user.id) {
            return interaction.reply({ content: 'Je ne peux pas me rendre muet moi-même.', ephemeral: true });
        }

        if (interaction.member.roles.highest.position <= member.roles.highest.position) {
            return interaction.reply({
                content: 'Vous ne pouvez pas rendre muet un membre ayant un rôle égal ou supérieur au vôtre.',
                ephemeral: true
            });
        }

        if (!member.moderatable) {
            return interaction.reply({ content: 'Je n\'ai pas les permissions nécessaires pour rendre muet ce membre. Vérifiez ma hiérarchie de rôles.', ephemeral: true });
        }

        // DM à l'utilisateur rendu muet - Version améliorée
        const dmEmbed = new EmbedBuilder()
            .setColor('#9370DB') // Violet moyen pour mute
            .setTitle('🔇 Mise en Sourdine')
            .setDescription(`**Vous avez été temporairement réduit au silence**`)
            .addFields(
                { name: '🏛️ Serveur', value: `**${interaction.guild.name}**`, inline: true },
                { name: '👮 Modérateur', value: `**${interaction.user.tag}**`, inline: true },
                { name: '⏱️ Durée', value: duration > 0 ? `**${duration} minutes**` : '**Indéfinie**', inline: true },
                { name: '📝 Motif de la sanction', value: `\`\`\`${reason}\`\`\``, inline: false },
                { name: '🚫 Restrictions appliquées', value: '• Impossible d\'envoyer des messages\n• Impossible de parler en vocal\n• Impossible de réagir aux messages\n• Impossible de créer des fils de discussion', inline: false },
                { name: '⏰ Fin de la sanction', value: duration > 0 ? `<t:${Math.floor((Date.now() + duration * 60 * 1000) / 1000)}:F>` : 'Aucune fin programmée - contactez un modérateur', inline: false },
                { name: '📞 Recours', value: 'Si vous pensez que cette sanction est injustifiée, contactez un administrateur du serveur.', inline: false }
            )
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setFooter({
                text: `Modération ${interaction.guild.name} • ${duration > 0 ? 'Sanction temporaire' : 'Durée indéfinie'}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        try {
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (dmError) {
            console.warn(`Impossible d'envoyer un DM à ${targetUser.tag} pour sa mise en sourdine.`);
            // On continue même si le DM échoue
        }

        try {
            // Appliquer le mute
            await member.timeout(duration > 0 ? duration * 60 * 1000 : null, reason);
            
            const successEmbed = new EmbedBuilder()
                .setColor(0x9370DB) // Violet moyen
                .setTitle('🔇 Mise en sourdine appliquée')
                .setDescription(`**${targetUser.displayName}** a été rendu muet`)
                .addFields(
                    { name: '📝 Raison', value: `\`\`\`${reason}\`\`\``, inline: false },
                    { name: '⏱️ Durée', value: duration > 0 ? `**${duration}** minutes` : '**Indéfinie**', inline: true },
                    { name: '👤 Utilisateur', value: `<@${targetUser.id}>`, inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({
                    text: duration > 0 ? `Fin prévue dans ${duration} minutes` : 'Durée indéfinie',
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            // Log de l'action dans le salon de modération
            const logActionModId = configManager.modLogChannelId;
            const logChannel = interaction.guild.channels.cache.get(logActionModId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#9932CC') // Violet pour mute
                    .setTitle('🔇 Mise en Sourdine Appliquée')
                    .setDescription(`Un membre a été mis en sourdine`)
                    .addFields(
                        { name: '👤 Membre Muet', value: `<@${targetUser.id}>`, inline: true },
                        { name: '👮 Modérateur', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '⏱️ Durée', value: duration > 0 ? `**${duration}** minute${duration > 1 ? 's' : ''}` : '**Indéfinie**', inline: true },
                        { name: '📝 Raison', value: `\`\`\`${reason}\`\`\``, inline: false },
                        { name: '📍 Salon', value: `<#${interaction.channelId}>`, inline: true },
                        { name: '🕐 Heure', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                    .setFooter({
                        text: `Modération • ${targetUser.tag}`,
                        iconURL: interaction.guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (muteError) {
            console.error('Erreur lors de la mise en sourdine du membre:', muteError);
            await interaction.reply({ content: 'Une erreur est survenue lors de la tentative de mise en sourdine du membre.', ephemeral: true });
        }
    },
};
