const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logChannelId } = require('../config.json');
const { addWarning } = require('../utils/warningsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Avertit un membre du serveur.')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Le membre à avertir.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('La raison de l\'avertissement.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) // Ou une permission plus appropriée comme KickMembers si vous voulez que les mêmes personnes puissent warn et kick
        .setDMPermission(false),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur');
        const reason = interaction.options.getString('raison');
        const member = interaction.guild.members.resolve(targetUser);

        if (!member) {
            return interaction.reply({ content: 'Impossible de trouver ce membre sur le serveur.', ephemeral: true });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({ content: 'Vous ne pouvez pas vous avertir vous-même.', ephemeral: true });
        }

        if (member.id === interaction.client.user.id) {
    return interaction.reply({ content: 'Je ne peux pas m\'avertir moi-même.', ephemeral: true });
}

if (interaction.member.roles.highest.position <= member.roles.highest.position) {
    return interaction.reply({
        content: 'Vous ne pouvez pas avertir un membre ayant un rôle égal ou supérieur au vôtre.',
        ephemeral: true
    });
}

// Enregistre l'avertissement
        const warningAdded = addWarning(interaction.guild.id, targetUser.id, interaction.user.id, reason);

        if (!warningAdded) {
            // Gérer l'échec de l'enregistrement si nécessaire, peut-être logger une erreur plus spécifique
            console.error(`Échec de l'enregistrement de l'avertissement pour ${targetUser.tag} par ${interaction.user.tag}`);
            // On pourrait choisir de répondre à l'utilisateur ici ou de continuer quand même
        }

        // DM à l'utilisateur averti
        const dmEmbed = new EmbedBuilder()
            .setColor(0xFFFF00) // Jaune pour avertissement
            .setTitle('🔔 Avertissement sur le serveur')
            .setDescription(`Vous avez reçu un avertissement sur le serveur **${interaction.guild.name}** de la part de ${interaction.user.tag}.`)
            .addFields(
                { name: 'Raison', value: reason }
            )
            .setTimestamp();

        let dmSent = true;
        try {
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (dmError) {
            dmSent = false;
            console.warn(`Impossible d'envoyer un DM à ${targetUser.tag} pour son avertissement.`);
            // On continue même si le DM échoue.
        }

        // Réponse à l'interaction
        const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00) // Vert
            .setTitle('Membre averti')
            .setDescription(`${targetUser.tag} (\`${targetUser.id}\`) a été averti avec succès.`)
            .addFields({ name: 'Raison', value: reason })
            .setTimestamp();
        if (!dmSent) {
            successEmbed.setFooter({ text: 'Note : L\'utilisateur n\'a pas pu être notifié par message privé (DM désactivés ou bot bloqué).' });
        }
        await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        // Log de l'action
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(0xFFFF00)
                .setTitle('⚠️ Avertissement enregistré')
                .setDescription(`⚠️ Membre averti : <@${targetUser.id}>`)
                .addFields(
                    { name: '👮 Modérateur', value: `<@${interaction.user.id}>` },
                    { name: '📝 Raison', value: reason }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
    },
};