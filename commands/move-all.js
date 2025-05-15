const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { logChannelId } = require('../config.json');

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
        console.log('Début de la commande move-all');

        // Vérifie si l'utilisateur a la permission Move Members
        if (!interaction.member.permissions.has(PermissionFlagsBits.MoveMembers)) {
            return interaction.reply({ content: 'Vous n\'avez pas la permission de déplacer les membres.', ephemeral: true });
        }

        // Récupère le membre bot sur le serveur pour vérifier ses permissions
        const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
        if (!botMember.permissions.has(PermissionFlagsBits.MoveMembers)) {
            return interaction.reply({ content: 'Je n\'ai pas la permission de déplacer les membres.', ephemeral: true });
        }

        const sourceChannel = interaction.options.getChannel('salon_source');
        const destinationChannel = interaction.options.getChannel('salon_destination');
        console.log('Salon source récupéré:', {
            id: sourceChannel.id,
            name: sourceChannel.name,
            members: sourceChannel.members.size
        });
        console.log('Salon destination récupéré:', {
            id: destinationChannel.id,
            name: destinationChannel.name,
            permissions: destinationChannel.permissionsFor(botMember).toArray()
        });

        if (sourceChannel.id === destinationChannel.id) {
            return interaction.reply({ content: 'Le salon source et le salon de destination ne peuvent pas être identiques.', ephemeral: true });
        }

        if (sourceChannel.members.size === 0) {
            return interaction.reply({ content: `Il n'y a personne dans le salon ${sourceChannel.name}.`, ephemeral: true });
        }

        let movedCount = 0;
        let failedCount = 0;
        const failedMembers = [];

        // Boucle sur les membres du salon source
        for (const [memberId, member] of sourceChannel.members) {
            console.log('Membre détecté:', member.user.tag);
            try {
                await member.voice.setChannel(destinationChannel);
                movedCount++;
            } catch (error) {
                failedCount++;
                failedMembers.push(member.user.tag);
                console.error(`ÉCHEC du déplacement de ${member.user.tag}:`, {
                    errorCode: error.code,
                    message: error.message,
                    stack: error.stack
                });
            }
        }

        const resultEmbed = new EmbedBuilder()
            .setColor(movedCount > 0 ? 0x00FF00 : 0xFF0000)
            .setTitle('Déplacement de masse terminé')
            .setTimestamp();

        if (movedCount > 0) {
            resultEmbed.addFields({ name: 'Membres déplacés avec succès', value: `${movedCount} de ${sourceChannel.name} vers ${destinationChannel.name}.` });
        }
        if (failedCount > 0) {
            resultEmbed.addFields({ name: 'Échecs de déplacement', value: `${failedCount} membre(s) n'ont pas pu être déplacés : ${failedMembers.join(', ')}.` });
            resultEmbed.setColor(0xFFA500);
        }
        if (movedCount === 0 && failedCount === 0) {
            resultEmbed.setDescription(`Aucun membre n'était présent dans ${sourceChannel.name} ou une erreur inattendue s'est produite.`);
        }

        await interaction.reply({ embeds: [resultEmbed], ephemeral: true });

        // Log de l'action
        if (movedCount > 0 || failedCount > 0) {
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('🚚 Déplacement de masse')
                    .setDescription(`🔄 Déplacement de tous les membres de ${sourceChannel.name} vers ${destinationChannel.name}.`)
                    .addFields(
                        { name: '👮 Modérateur', value: `<@${interaction.user.id}>` },
                        { name: '📢 Salon source', value: `<#${sourceChannel.id}>` },
                        { name: '🎯 Salon destination', value: `<#${destinationChannel.id}>` },
                        { name: '✅ Membres déplacés', value: `${movedCount}` },
                        { name: '❌ Échecs', value: `${failedCount}` }
                    )
                    .setTimestamp();
                if (failedCount > 0) {
                    logEmbed.addFields({ name: 'Membres non déplacés', value: failedMembers.join(', ') || 'Aucun' });
                }
                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        console.log('Fin de la commande move-all');
    },
};