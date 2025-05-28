const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Retire la mise en sourdine d\'un membre du serveur.')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Le membre à démuter.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('La raison du démute.')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
        .setDMPermission(false),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée.';
        const member = interaction.guild.members.resolve(targetUser);

        if (!member) {
            return interaction.reply({ content: 'Impossible de trouver ce membre sur le serveur.', ephemeral: true });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({ content: 'Vous ne pouvez pas vous démuter vous-même.', ephemeral: true });
        }

        if (member.id === interaction.client.user.id) {
            return interaction.reply({ content: 'Je ne peux pas me démuter moi-même.', ephemeral: true });
        }

        if (interaction.member.roles.highest.position <= member.roles.highest.position) {
            return interaction.reply({
                content: 'Vous ne pouvez pas démuter un membre ayant un rôle égal ou supérieur au vôtre.',
                ephemeral: true
            });
        }

        if (!member.moderatable) {
            return interaction.reply({ content: 'Je n\'ai pas les permissions nécessaires pour démuter ce membre. Vérifiez ma hiérarchie de rôles.', ephemeral: true });
        }

        // Vérifier si le membre est actuellement muet
        if (!member.isCommunicationDisabled()) {
            return interaction.reply({ 
                content: `${targetUser.tag} n'est pas actuellement en sourdine.`, 
                ephemeral: true 
            });
        }

        // DM à l'utilisateur démuté - Version améliorée
        const dmEmbed = new EmbedBuilder()
            .setColor('#00FF00') // Vert pour bonne nouvelle
            .setTitle('🔊 Fin de la Mise en Sourdine')
            .setDescription(`**Votre mise en sourdine a été levée**`)
            .addFields(
                { name: '🏛️ Serveur', value: `**${interaction.guild.name}**`, inline: true },
                { name: '👮 Modérateur', value: `**${interaction.user.tag}**`, inline: true },
                { name: '📅 Date de levée', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '📝 Motif de la levée', value: `\`\`\`${reason}\`\`\``, inline: false },
                { name: '✅ Permissions restaurées', value: '• Vous pouvez à nouveau envoyer des messages\n• Vous pouvez parler en vocal\n• Vous pouvez réagir aux messages\n• Vous pouvez créer des fils de discussion', inline: false },
                { name: '⚠️ Rappel Important', value: 'Respectez le règlement du serveur pour éviter de nouvelles sanctions.', inline: false }
            )
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setFooter({ 
                text: `Modération ${interaction.guild.name} • Fin de sanction`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        let dmSent = true;
        try {
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (dmError) {
            dmSent = false;
            console.warn(`Impossible d'envoyer un DM à ${targetUser.tag} pour son démute.`);
        }

        try {
            // Retirer le mute
            await member.timeout(null, reason);

            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00') // Vert pour succès
                .setTitle('🔊 Mise en sourdine levée')
                .setDescription(`**${targetUser.displayName}** peut à nouveau parler`)
                .addFields(
                    { name: '📝 Raison', value: `\`\`\`${reason}\`\`\``, inline: false },
                    { name: '👤 Utilisateur', value: `<@${targetUser.id}>`, inline: true },
                    { name: '⏰ Levée le', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({
                    text: dmSent ? 'Utilisateur notifié par MP' : 'Notification MP échouée (DM fermés)',
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            // Log de l'action dans le salon de modération
            const logActionModId = configManager.logActionMod;
            const logChannel = interaction.guild.channels.cache.get(logActionModId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#00FF00') // Vert pour démute
                    .setTitle('🔊 Fin de Mise en Sourdine')
                    .setDescription(`Un membre a été démuté`)
                    .addFields(
                        { name: '👤 Membre Démuté', value: `<@${targetUser.id}>`, inline: true },
                        { name: '👮 Modérateur', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '⏰ Heure de levée', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: '📝 Raison', value: `\`\`\`${reason}\`\`\``, inline: false },
                        { name: '📍 Salon', value: `<#${interaction.channelId}>`, inline: true },
                        { name: '✅ Statut', value: '**Permissions restaurées**', inline: true }
                    )
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                    .setFooter({
                        text: `Modération • ${targetUser.tag}`,
                        iconURL: interaction.guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (unmuteError) {
            console.error('Erreur lors du démute du membre:', unmuteError);
            await interaction.reply({ content: 'Une erreur est survenue lors de la tentative de démute du membre.', ephemeral: true });
        }
    },
};