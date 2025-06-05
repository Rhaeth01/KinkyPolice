const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rename')
        .setDescription('Change le pseudo d\'un membre sur le serveur')
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Le membre à renommer')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('pseudo')
                .setDescription('Le nouveau pseudo')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
        .setDMPermission(false),
        
    async execute(interaction) {
        const member = interaction.options.getMember('membre');
        const newNickname = interaction.options.getString('pseudo');

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return interaction.reply({ 
                content: '❌ Vous n\'avez pas la permission de changer les pseudos',
                ephemeral: true 
            });
        }

        if (member.id === interaction.guild.ownerId) {
            return interaction.reply({
                content: '❌ Impossible de modifier le pseudo du propriétaire du serveur',
                ephemeral: true
            });
        }

        try {
            await member.setNickname(newNickname);
            await interaction.reply({ 
                content: `✅ Pseudo de ${member.user.tag} changé en "${newNickname}"`,
                ephemeral: true 
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: '❌ Une erreur est survenue lors du changement de pseudo',
                ephemeral: true 
            });
        }
    }
};
