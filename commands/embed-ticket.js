const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
// ticketCategoryId sera utilisé dans interactionCreate.js

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed-ticket')
        .setDescription('Envoie l\'embed pour la création de tickets.')
        .addStringOption(option =>
            option.setName('titre')
                .setDescription('Le titre de l\'embed (ex: "Support & Assistance").')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('texte')
                .setDescription('Le texte principal de l\'embed (ex: "Cliquez ci-dessous pour ouvrir un ticket.").')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('salon')
                .setDescription('Le salon où envoyer l\'embed de création de ticket.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('texte_bouton')
                .setDescription('Le texte du bouton (ex: "Ouvrir un ticket").')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    async execute(interaction) {
        const titre = interaction.options.getString('titre');
        const texte = interaction.options.getString('texte');
        const targetChannel = interaction.options.getChannel('salon');
        const texteBouton = interaction.options.getString('texte_bouton') || 'Créer un ticket';

        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: 'Veuillez sélectionner un salon textuel valide pour envoyer l\'embed.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(0x3498DB) // Bleu clair
            .setTitle(titre)
            .setDescription(texte);

        const createTicketButton = new ButtonBuilder()
            .setCustomId('create_ticket_button') // ID unique
            .setLabel(texteBouton)
            .setStyle(ButtonStyle.Primary); // Style primaire

        const row = new ActionRowBuilder().addComponents(createTicketButton);

        try {
            await targetChannel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: `L'embed de création de ticket a été envoyé avec succès dans ${targetChannel}.`, ephemeral: true });
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'embed de ticket:', error);
            await interaction.reply({ content: 'Une erreur est survenue lors de l\'envoi de l\'embed.', ephemeral: true });
        }
    },
};
