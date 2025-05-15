

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
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .setDMPermission(false),
    async execute(interaction) {
        console.log('Début de la commande move-all');

        if (!interaction.guild.me.permissions.has(PermissionFlagsBits.MoveMembers)) {
            return interaction.reply({ content: 'Je n\'ai pas la permission de déplacer les membres.', ephemeral: true });
        }

        const sourceChannel = interaction.options.getChannel('salon_source');
        const destinationChannel = interaction.options.getChannel('salon_destination');

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
                console.log('Déplacement du membre vers le salon:', destinationChannel.name);
                await member.voice.setChannel(destinationChannel);
                console.log('Membre déplacé vers le salon:', destinationChannel.name);
                console.log('État du membre après déplacement:', member.voice);
                movedCount++;
            } catch (error) {
                failedCount++;
                failedMembers.push(member.user.tag);
                console.error(`Échec du déplacement de ${member.user.tag}:`, error);
            }
        }

        const resultEmbed = new EmbedBuilder()
            .setColor(movedCount > 0 ? 0x00FF00 : 0xFF0000) // Vert si au moins un succès, sinon rouge
            .setTitle('Déplacement de masse terminé')
            .setTimestamp();

        if (movedCount > 0) {
            resultEmbed.addFields({ name: 'Membres déplacés avec succès', value: `${movedCount} de ${sourceChannel.name} vers ${destinationChannel.name}.` });
        }
        if (failedCount > 0) {
            resultEmbed.addFields({ name: 'Échecs de déplacement', value: `${failedCount} membre(s) n'ont pas pu être déplacés : ${failedMembers.join(', ')}.` });
            resultEmbed.setColor(0xFFA500); // Orange s'il y a des échecs partiels
        }
        if (movedCount === 0 && failedCount === 0) { // Devrait pas arriver si sourceChannel.members.size > 0
            resultEmbed.setDescription(`Aucun membre n'était présent dans ${sourceChannel.name} ou une erreur inattendue s'est produite.`);
        }

        await interaction.reply({ embeds: [resultEmbed], ephemeral: true });

        // Log de l'action
        if (movedCount > 0 || failedCount > 0) { // Log seulement si une action a été tentée
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0x0099FF) // Bleu
                    .setTitle('Commande /move-all exécutée')
                    .setDescription(`Tentative de déplacement de tous les membres de ${sourceChannel.name} vers ${destinationChannel.name}.`)
                    .addFields(
                        { name: 'Modérateur', value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
                        { name: 'Salon source', value: sourceChannel.name + ` (\`${sourceChannel.id}\`)` },
                        { name: 'Salon destination', value: destinationChannel.name + ` (\`${destinationChannel.id}\`)` },
                        { name: 'Membres déplacés', value: `${movedCount}` },
                        { name: 'Échecs', value: `${failedCount}` }
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