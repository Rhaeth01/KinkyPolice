const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logChannelId } = require('../config.json');

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

        // DM à l'utilisateur rendu muet
        const dmEmbed = new EmbedBuilder()
            .setColor(0xFF0000) // Rouge
            .setTitle('🔇 Mise en sourdine')
            .setDescription(`Vous avez été rendu muet sur le serveur **${interaction.guild.name}** par ${interaction.user.tag}.`)
            .addFields(
                { name: 'Raison', value: reason },
                { name: 'Durée', value: duration > 0 ? `${duration} minutes` : 'Indéfinie' },
                { name: 'Que faire ?', value: 'Si vous pensez que c\'est une erreur, vous pouvez essayer de contacter un administrateur.' }
            )
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
                .setColor(0x00FF00) // Vert
                .setTitle('Membre rendu muet')
                .setDescription(`${targetUser.tag} (\`${targetUser.id}\`) a été rendu muet avec succès.`)
                .addFields(
                    { name: 'Raison', value: reason },
                    { name: 'Durée', value: duration > 0 ? `${duration} minutes` : 'Indéfinie' }
                )
                .setTimestamp();
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            // Log de l'action
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('🔇 Mise en sourdine !')
                    .setDescription(`Membre rendu muet : <@${targetUser.id}>`)
                    .addFields(
                        { name: '👮 Modérateur', value: `<@${interaction.user.id}>` },
                        { name: '📝 Raison', value: reason },
                        { name: '⏱️ Durée', value: duration > 0 ? `${duration} minutes` : 'Indéfinie' }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (muteError) {
            console.error('Erreur lors de la mise en sourdine du membre:', muteError);
            await interaction.reply({ content: 'Une erreur est survenue lors de la tentative de mise en sourdine du membre.', ephemeral: true });
        }
    },
};