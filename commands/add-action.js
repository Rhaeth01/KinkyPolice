const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addAction } = require('../utils/jsonManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-action')
        .setDescription('Ajoute un nouveau défi "Action" à la liste.')
        .addStringOption(option =>
            option.setName('texte')
                .setDescription('Le texte de l\'action à ajouter.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        const texteAction = interaction.options.getString('texte');

        const success = addAction(texteAction);

        if (success) {
            await interaction.reply({ content: `L'action "${texteAction}" a été ajoutée avec succès !`, ephemeral: true });
        } else {
            await interaction.reply({ content: `Impossible d'ajouter l'action. Elle existe peut-être déjà ou une erreur s'est produite.`, ephemeral: true });
        }
    },
};
