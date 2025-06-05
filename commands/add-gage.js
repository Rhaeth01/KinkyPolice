const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addGage } = require('../utils/jsonManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-gage')
        .setDescription('Ajoute un nouveau "Gage" à la liste.')
        .addStringOption(option =>
            option.setName('texte')
                .setDescription('Le texte du gage à ajouter.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        const texteGage = interaction.options.getString('texte');

        const success = addGage(texteGage);

        if (success) {
            await interaction.reply({ content: `Le gage "${texteGage}" a été ajouté avec succès !`, ephemeral: true });
        } else {
            await interaction.reply({ content: `Impossible d'ajouter le gage. Il existe peut-être déjà ou une erreur s'est produite.`, ephemeral: true });
        }
    },
};
