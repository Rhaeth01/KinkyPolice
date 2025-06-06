const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');
const webhookLogger = require('../utils/webhookLogger');

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

if (interaction.member.roles.highest.position <= member.roles.highest.position) {
    return interaction.reply({
        content: 'Vous ne pouvez pas expulser un membre ayant un rôle égal ou supérieur au vôtre.',
        ephemeral: true
    });
}

if (!member.kickable) {
            return interaction.reply({ content: 'Je n\'ai pas les permissions nécessaires pour expulser ce membre. Vérifiez ma hiérarchie de rôles.', ephemeral: true });
        }

        // DM à l'utilisateur expulsé - Version améliorée
        const dmEmbed = new EmbedBuilder()
            .setColor('#FF8C00') // Orange foncé pour expulsion
            .setTitle('👢 Expulsion du Serveur')
            .setDescription(`**Vous avez été expulsé du serveur**`)
            .addFields(
                { name: '🏛️ Serveur', value: `**${interaction.guild.name}**`, inline: true },
                { name: '👮 Modérateur', value: `**${interaction.user.tag}**`, inline: true },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '📝 Motif de l\'expulsion', value: `\`\`\`${reason}\`\`\``, inline: false },
                { name: '🔄 Possibilité de retour', value: '• Vous pouvez rejoindre à nouveau le serveur\n• Respectez le règlement lors de votre retour\n• Les récidives peuvent entraîner un bannissement', inline: false },
                { name: '📞 Recours', value: 'Si vous pensez que cette sanction est injustifiée, contactez un administrateur du serveur.', inline: false }
            )
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setFooter({
                text: `Modération ${interaction.guild.name} • Expulsion temporaire`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
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
                .setColor(0xFF8C00) // Orange foncé
                .setTitle('👢 Expulsion !')
                .setDescription(`**${targetUser.displayName}** a été expulsé du serveur`)
                .addFields(
                    { name: '📝 Motif', value: `\`\`\`${reason}\`\`\``, inline: false },
                    { name: '👤 Utilisateur', value: `<@${targetUser.id}>`, inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({
                    text: 'Expulsion temporaire',
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            // Log de l'action via webhook
            await webhookLogger.logModeration('Expulsion', targetUser, interaction.user, reason, {
                color: '#FF8C00',
                thumbnail: targetUser.displayAvatarURL({ dynamic: true })
            });

        } catch (kickError) {
            console.error('Erreur lors de l\'expulsion du membre:', kickError);
            await interaction.reply({ content: 'Une erreur est survenue lors de la tentative d\'expulsion du membre.', ephemeral: true });
        }
    },
};