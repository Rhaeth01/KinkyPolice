const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
// Il faudra potentiellement récupérer l'ID du salon public depuis config.json ou le rendre configurable via option de commande.
// Pour l'instant, on va supposer que la commande est exécutée dans le salon où l'embed doit être posté.

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed-entree')
        .setDescription('Envoie l\'embed d\'accueil pour les demandes d\'accès.')
        .addStringOption(option =>
            option.setName('titre')
                .setDescription('Le titre de l\'embed d\'accueil.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('texte')
                .setDescription('Le texte principal de l\'embed d\'accueil.')
                .setRequired(true))
        .addChannelOption(option => // Option pour spécifier le salon où envoyer l'embed
            option.setName('salon')
                .setDescription('Le salon où envoyer l\'embed d\'accueil.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Seuls les admins peuvent configurer cet embed
        .setDMPermission(false),
    async execute(interaction) {
        const titre = interaction.options.getString('titre');
        const texte = interaction.options.getString('texte');
        const targetChannel = interaction.options.getChannel('salon');

        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: 'Veuillez sélectionner un salon textuel valide pour envoyer l\'embed.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(0x0099FF) // Bleu par défaut, peut être personnalisable plus tard
            .setTitle(titre)
            .setDescription(texte)
            .setFooter({ text: 'Cliquez sur le bouton ci-dessous pour faire votre demande.' });

        const accessButton = new ButtonBuilder()
            .setCustomId('request_access_button') // ID unique pour identifier ce bouton
            .setLabel('Demande d\'accès')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(accessButton);

        try {
            await targetChannel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: `L'embed d'entrée a été envoyé avec succès dans ${targetChannel}.`, ephemeral: true });
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'embed d\'entrée:', error);
            await interaction.reply({ content: 'Une erreur est survenue lors de l\'envoi de l\'embed.', ephemeral: true });
        }
    },
};
