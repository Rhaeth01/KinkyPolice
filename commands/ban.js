const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logChannelId } = require('../config.json');

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

        // DM à l'utilisateur banni
        const dmEmbed = new EmbedBuilder()
            .setColor(0xFF0000) // Rouge
            .setTitle('🚫 Bannissement du serveur')
            .setDescription(`Vous avez été banni du serveur **${interaction.guild.name}** par ${interaction.user.tag}.`)
            .addFields(
                { name: 'Raison', value: reason },
                { name: 'Que faire ?', value: 'Si vous pensez que c\'est une erreur, vous pouvez essayer de contacter un administrateur.' }
            )
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
                .setColor(0x00FF00) // Vert
                .setTitle('Membre banni')
                .setDescription(`${targetUser.tag} (\`${targetUser.id}\`) a été banni avec succès.`)
                .addFields(
                    { name: 'Raison', value: reason },
                    { name: 'Messages supprimés', value: `${deleteMessageDays} jour(s)`}
                )
                .setTimestamp();
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            // Log de l'action
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('🔨 Commande /ban exécutée')
                    .setDescription(`🚫 Membre banni : <@${targetUser.id}>`)
                    .addFields(
                        { name: '👮 Modérateur', value: `<@${interaction.user.id}>` },
                        { name: '📝 Raison', value: reason },
                        { name: '🗑️ Messages supprimés', value: `${deleteMessageDays} jour(s)`}
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (banError) {
            console.error('Erreur lors du bannissement du membre:', banError);
            await interaction.reply({ content: 'Une erreur est survenue lors de la tentative de bannissement du membre.', ephemeral: true });
        }
    },
};