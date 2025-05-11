const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getUserWarnings } = require('../utils/warningsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warns')
        .setDescription('Affiche les avertissements d\'un membre.')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Le membre dont voir les avertissements.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) // Ou KickMembers
        .setDMPermission(false),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur');
        const member = interaction.guild.members.resolve(targetUser);

        if (!member) {
            return interaction.reply({ content: 'Impossible de trouver ce membre sur le serveur.', ephemeral: true });
        }

        const userWarnings = getUserWarnings(interaction.guild.id, targetUser.id);

        const embed = new EmbedBuilder()
            .setColor(0x0099FF) // Bleu
            .setTitle(`Avertissements pour ${targetUser.tag}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        if (userWarnings.length === 0) {
            embed.setDescription('Cet utilisateur n\'a aucun avertissement.');
        } else {
            embed.setDescription(`Total : ${userWarnings.length} avertissement(s).`);
            userWarnings.forEach((warn, index) => {
                const moderator = interaction.guild.members.cache.get(warn.moderatorId);
                const moderatorTag = moderator ? moderator.user.tag : `ID: ${warn.moderatorId} (Inconnu/Parti)`;
                embed.addFields({
                    name: `Avertissement #${index + 1} (ID: ${warn.id.slice(-6)})`, // Affiche les 6 derniers caractères de l'ID pour la concision
                    value: `**Raison:** ${warn.reason}\n**Modérateur:** ${moderatorTag}\n**Date:** <t:${Math.floor(warn.timestamp / 1000)}:F>`
                });
            });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
