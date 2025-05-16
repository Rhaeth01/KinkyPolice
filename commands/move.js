const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { logChannelId } = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('Déplace un membre vers un autre salon vocal.')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Le membre à déplacer.')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('salon_destination')
                .setDescription('Le salon vocal de destination.')
                .addChannelTypes(ChannelType.GuildVoice) // S'assure que seul un salon vocal peut être sélectionné
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .setDMPermission(false),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur');
        const destinationChannel = interaction.options.getChannel('salon_destination');
const member = interaction.guild.members.resolve(targetUser);

        if (!member) {
            return interaction.reply({ content: 'Impossible de trouver ce membre sur le serveur.', ephemeral: true });
        }

const originalChannel = member.voice.channel;
console.log('Salon vocal d\'origine:', originalChannel);

if (!originalChannel) {
console.log('Le membre n\'est pas connecté à un salon vocal.');
            return interaction.reply({ content: `${targetUser.tag} n'est pas connecté à un salon vocal.`, ephemeral: true });
        }

        if (originalChannel.id === destinationChannel.id) {
            return interaction.reply({ content: `${targetUser.tag} est déjà dans le salon ${destinationChannel.name}.`, ephemeral: true });
        }

        try {
console.log('Déplacement du membre vers le salon:', destinationChannel.name);
await member.voice.setChannel(destinationChannel);
console.log('Membre déplacé vers le salon:', destinationChannel.name);
console.log('État du membre après déplacement:', member.voice);

            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00) // Vert
                .setTitle('Membre déplacé')
                .setDescription(`${targetUser.tag} a été déplacé avec succès de ${originalChannel.name} vers ${destinationChannel.name}.`)
                .setTimestamp();
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            // Log de l'action
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0x0099FF) // Bleu
                    .setTitle('🚚 Déplacement de membre')
                    .setDescription(`Membre déplacé : ${targetUser.tag} (\`${targetUser.id}\`)`)
                    .addFields(
                        { name: '👤 Modérateur', value: `<@${interaction.user.id}>` },
                        { name: '🔊 Salon d\'origine', value: `<#${originalChannel.id}>` },
                        { name: '🔊 Salon de destination', value: `<#${destinationChannel.id}>` }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('Erreur lors du déplacement du membre:', error);
            let errorMessage = 'Une erreur est survenue lors de la tentative de déplacement du membre.';
            if (error.code === 50013) { // Missing Permissions
                errorMessage = 'Je n\'ai pas les permissions nécessaires pour déplacer des membres ou pour accéder à l\'un des salons vocaux.';
            } else if (error.code === 40032 ) { // Target user is not connected to voice
                 errorMessage = `${targetUser.tag} n'est plus connecté à un salon vocal ou la connexion a été perdue.`;
            }
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    },
};