const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addVerite } = require('../utils/jsonManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-verite')
        .setDescription('Ajoute une nouvelle question "Vérité" à la liste.')
        .addStringOption(option =>
            option.setName('texte')
                .setDescription('Le texte de la vérité à ajouter.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // Seuls les modérateurs peuvent ajouter
    async execute(interaction) {
        const texteVerite = interaction.options.getString('texte');

        const success = addVerite(texteVerite);

        if (success) {
            await interaction.reply({ content: `La vérité "${texteVerite}" a été ajoutée avec succès !`, ephemeral: true });
        } else {
            // Peut être dû à une erreur d'écriture ou si la vérité existe déjà
            await interaction.reply({ content: `Impossible d'ajouter la vérité. Elle existe peut-être déjà ou une erreur s'est produite.`, ephemeral: true });
        }
    },
};
