const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const configManager = require('../utils/configManager');

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
        .addStringOption(option =>
            option.setName('roles_a_attribuer')
                .setDescription('IDs des rôles à attribuer lors de l\'acceptation (séparés par des virgules).')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    async execute(interaction) {
        const titre = interaction.options.getString('titre');
        const texteReglement = interaction.options.getString('texte_reglement').replace(/\\n/g, '\n'); // Remplace \n par de vrais sauts de ligne
        const targetChannel = interaction.options.getChannel('salon');
        const texteBouton = interaction.options.getString('texte_bouton') || 'J\'ai lu et j\'accepte le règlement';
        const rolesAAttribuer = interaction.options.getString('roles_a_attribuer');

        const reglesValidesId = configManager.reglesValidesId;
        if (!reglesValidesId) {
            return interaction.reply({ content: 'Erreur : L\'ID du rôle pour la validation du règlement (`reglesValidesId`) n\'est pas configuré.', ephemeral: true });
        }
        const role = interaction.guild.roles.cache.get(reglesValidesId);
        if (!role) {
             return interaction.reply({ content: `Erreur : Le rôle de validation du règlement avec l'ID \`${reglesValidesId}\` est introuvable. Vérifiez la configuration.`, ephemeral: true });
        }


        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: 'Veuillez sélectionner un salon textuel valide pour envoyer l\'embed.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(0x9370DB) // Violet moyen élégant
            .setTitle(titre)
            .setDescription(texteReglement)
            .setFooter({ text: `Cliquez sur "${texteBouton}" si vous acceptez.` });

        // Encoder les rôles à attribuer dans l'ID du bouton si spécifiés
        const buttonCustomId = rolesAAttribuer ?
            `accept_rules_button_${Buffer.from(rolesAAttribuer).toString('base64')}` :
            'accept_rules_button';

        const acceptButton = new ButtonBuilder()
            .setCustomId(buttonCustomId)
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
