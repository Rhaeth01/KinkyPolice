const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addMot } = require('../utils/jsonManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-mot')
        .setDescription('Ajoute un mot à la liste des mots humoristiques pour la modération.')
        .addStringOption(option =>
            option.setName('texte')
                .setDescription('Le mot/phrase à ajouter.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        const texteMot = interaction.options.getString('texte');

        const success = addMot(texteMot);

        if (success) {
            await interaction.reply({ content: `Le mot/phrase "${texteMot}" a été ajouté avec succès !`, ephemeral: true });
        } else {
            await interaction.reply({ content: `Impossible d'ajouter le mot/phrase. Il existe peut-être déjà ou une erreur s'est produite.`, ephemeral: true });
        }
    },
};
