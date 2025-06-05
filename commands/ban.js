const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bannit un membre du serveur.')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Le membre à bannir.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('La raison du bannissement.')
                .setRequired(false))
        .addIntegerOption(option => // Optionnel: pour supprimer les messages de l'utilisateur
            option.setName('jours_messages_a_supprimer')
                .setDescription('Nombre de jours de messages de l\'utilisateur à supprimer (0-7).')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée.';
        const deleteMessageDays = interaction.options.getInteger('jours_messages_a_supprimer') || 0; // Par défaut 0 jours
        const member = interaction.guild.members.resolve(targetUser);

        if (!member) {
            // Si le membre n'est pas sur le serveur, on peut quand même le bannir par ID (pré-bannissement)
            // Mais pour l'instant, on va se concentrer sur les membres présents.
            // On pourrait ajouter une logique pour bannir par ID si member est null mais targetUser existe.
            return interaction.reply({ content: 'Impossible de trouver ce membre sur le serveur pour le moment. Le bannissement par ID sera implémenté plus tard.', ephemeral: true });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({ content: 'Vous ne pouvez pas vous bannir vous-même.', ephemeral: true });
        }

        if (member.id === interaction.client.user.id) {
            return interaction.reply({ content: 'Je ne peux pas me bannir moi-même.', ephemeral: true });
        }

        if (!member.bannable) {
            return interaction.reply({ content: 'Je n\'ai pas les permissions nécessaires pour bannir ce membre. Vérifiez ma hiérarchie de rôles.', ephemeral: true });
        }

        if (interaction.member.roles.highest.position <= member.roles.highest.position) {
        return interaction.reply({
        content: 'Vous ne pouvez pas bannir un membre ayant un rôle égal ou supérieur au vôtre.',
        ephemeral: true
    });
}

        // DM à l'utilisateur banni - Version améliorée
        const dmEmbed = new EmbedBuilder()
            .setColor('#DC143C') // Rouge crimson pour bannissement
            .setTitle('🔨 Bannissement Permanent')
            .setDescription(`**Vous avez été banni définitivement du serveur**`)
            .addFields(
                { name: '🏛️ Serveur', value: `**${interaction.guild.name}**`, inline: true },
                { name: '👮 Modérateur', value: `**${interaction.user.tag}**`, inline: true },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '📝 Motif du bannissement', value: `\`\`\`${reason}\`\`\``, inline: false },
                { name: '🚫 Conséquences', value: '• **Interdiction permanente** d\'accès au serveur\n• Suppression de vos messages récents\n• Perte de tous vos rôles et permissions', inline: false },
                { name: '📞 Recours possible', value: 'Si vous contestez cette décision, vous pouvez tenter de contacter un administrateur du serveur par d\'autres moyens.', inline: false },
                { name: '⚠️ Important', value: 'Cette sanction est **définitive** et ne peut être levée que par un administrateur.', inline: false }
            )
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setFooter({
                text: `Modération ${interaction.guild.name} • Bannissement définitif`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        try {
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (dmError) {
            console.warn(`Impossible d'envoyer un DM à ${targetUser.tag} pour son bannissement.`);
            // On continue même si le DM échoue, le bannissement est prioritaire.
        }

        // Bannissement
        try {
            await member.ban({ reason: reason, deleteMessageSeconds: deleteMessageDays > 0 ? deleteMessageDays * 24 * 60 * 60 : 0 });

            const successEmbed = new EmbedBuilder()
                .setColor(0xDC143C) // Rouge crimson
                .setTitle('🔨 Bannissement appliqué')
                .setDescription(`**${targetUser.displayName}** a été banni du serveur`)
                .addFields(
                    { name: '📝 Motif', value: `\`\`\`${reason}\`\`\``, inline: false },
                    { name: '🗑️ Messages supprimés', value: `**${deleteMessageDays}** jour(s)`, inline: true },
                    { name: '👤 Utilisateur', value: `<@${targetUser.id}>`, inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({
                    text: 'Bannissement permanent',
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            // Log de l'action dans le salon de modération
            const logActionModId = configManager.modLogChannelId;
            const logChannel = interaction.guild.channels.cache.get(logActionModId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#DC143C') // Rouge crimson pour cohérence
                    .setTitle('🔨 Bannissement !')
                    .setDescription(`Un membre a été banni définitivement du serveur`)
                    .addFields(
                        { name: '👤 Membre Banni', value: `<@${targetUser.id}>`, inline: true },
                        { name: '👮 Modérateur', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '🗑️ Messages Supprimés', value: `**${deleteMessageDays}** jour${deleteMessageDays > 1 ? 's' : ''}`, inline: true },
                        { name: '� Raison', value: `\`\`\`${reason}\`\`\``, inline: false },
                        
                        { name: '🕐 Heure', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: '⚠️ Statut', value: `🚫 **Bannissement permanent**`, inline: true }
                    )
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                    .setFooter({
                        text: `Modération • ${targetUser.tag}`,
                        iconURL: interaction.guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (banError) {
            console.error('Erreur lors du bannissement du membre:', banError);
            await interaction.reply({ content: 'Une erreur est survenue lors de la tentative de bannissement du membre.', ephemeral: true });
        }
    },
};