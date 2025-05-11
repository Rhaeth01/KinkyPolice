const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { reglesValidesId } = require('../config.json'); // ID du rôle à attribuer pour la validation du règlement

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed-reglement')
        .setDescription('Envoie l\'embed du règlement avec un bouton d\'acceptation.')
        .addStringOption(option =>
            option.setName('titre')
                .setDescription('Le titre de l\'embed du règlement (ex: "Règlement du serveur").')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('texte_reglement')
                .setDescription('Le texte complet du règlement. Utilisez \\n pour les sauts de ligne.')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('salon')
                .setDescription('Le salon où envoyer l\'embed du règlement.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('texte_bouton')
                .setDescription('Le texte du bouton d\'acceptation (ex: "J\'ai lu et j\'accepte le règlement").')
                .setRequired(false)) // Optionnel, avec une valeur par défaut
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    async execute(interaction) {
        const titre = interaction.options.getString('titre');
        const texteReglement = interaction.options.getString('texte_reglement').replace(/\\n/g, '\n'); // Remplace \n par de vrais sauts de ligne
        const targetChannel = interaction.options.getChannel('salon');
        const texteBouton = interaction.options.getString('texte_bouton') || 'J\'ai lu et j\'accepte le règlement';

        if (!reglesValidesId) {
            return interaction.reply({ content: 'Erreur : L\'ID du rôle pour la validation du règlement (`reglesValidesId`) n\'est pas configuré dans `config.json`.', ephemeral: true });
        }
        const role = interaction.guild.roles.cache.get(reglesValidesId);
        if (!role) {
             return interaction.reply({ content: `Erreur : Le rôle de validation du règlement avec l'ID \`${reglesValidesId}\` est introuvable. Vérifiez la configuration.`, ephemeral: true });
        }


        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: 'Veuillez sélectionner un salon textuel valide pour envoyer l\'embed.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2) // Couleur Discord par défaut
            .setTitle(titre)
            .setDescription(texteReglement)
            .setFooter({ text: `Cliquez sur "${texteBouton}" si vous acceptez.` });

        const acceptButton = new ButtonBuilder()
            .setCustomId('accept_rules_button') // ID unique
            .setLabel(texteBouton)
            .setStyle(ButtonStyle.Success); // Vert pour acceptation

        const row = new ActionRowBuilder().addComponents(acceptButton);

        try {
            await targetChannel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: `L'embed du règlement a été envoyé avec succès dans ${targetChannel}.`, ephemeral: true });
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'embed du règlement:', error);
            await interaction.reply({ content: 'Une erreur est survenue lors de l\'envoi de l\'embed.', ephemeral: true });
        }
    },
};
