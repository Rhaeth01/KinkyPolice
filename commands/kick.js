const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logChannelId } = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulse un membre du serveur.')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Le membre à expulser.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('La raison de l\'expulsion.')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .setDMPermission(false),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée.';
        const member = interaction.guild.members.resolve(targetUser);

        if (!member) {
            return interaction.reply({ content: 'Impossible de trouver ce membre sur le serveur.', ephemeral: true });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({ content: 'Vous ne pouvez pas vous expulser vous-même.', ephemeral: true });
        }

        if (member.id === interaction.client.user.id) {
            return interaction.reply({ content: 'Je ne peux pas m\'expulser moi-même.', ephemeral: true });
        }

        if (!member.kickable) {
            return interaction.reply({ content: 'Je n\'ai pas les permissions nécessaires pour expulser ce membre. Vérifiez ma hiérarchie de rôles.', ephemeral: true });
        }

        // DM à l'utilisateur expulsé
        const dmEmbed = new EmbedBuilder()
            .setColor(0xFF0000) // Rouge
            .setTitle('⚠️ Expulsion du serveur')
            .setDescription(`Vous avez été expulsé du serveur **${interaction.guild.name}** par ${interaction.user.tag}.`)
            .addFields(
                { name: 'Raison', value: reason },
                { name: 'Que faire ?', value: 'Si vous pensez que c\'est une erreur, vous pouvez essayer de contacter un administrateur ou ouvrir un ticket si possible.' }
            )
            .setTimestamp();

        try {
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (dmError) {
            console.warn(`Impossible d'envoyer un DM à ${targetUser.tag} pour son expulsion.`);
            // On continue même si le DM échoue, l'expulsion est prioritaire.
        }

        // Expulsion
        try {
            await member.kick(reason);

            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00) // Vert
                .setTitle('Membre expulsé')
                .setDescription(`${targetUser.tag} (\`${targetUser.id}\`) a été expulsé avec succès.`)
                .addFields({ name: 'Raison', value: reason })
                .setTimestamp();
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            // Log de l'action
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0xFFA500) // Orange
                    .setTitle('Commande /kick exécutée')
                    .setDescription(`Membre expulsé : ${targetUser.tag} (\`${targetUser.id}\`)`)
                    .addFields(
                        { name: 'Modérateur', value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
                        { name: 'Raison', value: reason }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (kickError) {
            console.error('Erreur lors de l\'expulsion du membre:', kickError);
            await interaction.reply({ content: 'Une erreur est survenue lors de la tentative d\'expulsion du membre.', ephemeral: true });
        }
    },
};
