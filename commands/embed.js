const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Crée et envoie un embed personnalisé.')
        .addChannelOption(option =>
            option.setName('salon')
                .setDescription('Le salon où envoyer l\'embed.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('titre')
                .setDescription('Le titre de l\'embed.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('La description de l\'embed. Utilisez \\n pour les sauts de ligne.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('couleur')
                .setDescription('La couleur de l\'embed (code hexadécimal, ex: #FF0000).')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('image_url')
                .setDescription('L\'URL de l\'image principale de l\'embed.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('thumbnail_url')
                .setDescription('L\'URL de la miniature de l\'embed.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('footer_texte')
                .setDescription('Le texte du pied de page de l\'embed.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('footer_icon_url')
                .setDescription('L\'URL de l\'icône du pied de page.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('auteur_texte')
                .setDescription('Le texte de l\'auteur de l\'embed.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('auteur_icon_url')
                .setDescription('L\'URL de l\'icône de l\'auteur.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('auteur_url')
                .setDescription('L\'URL cliquable pour l\'auteur.')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('timestamp')
                .setDescription('Afficher l\'horodatage actuel ?')
                .setRequired(false))
        // Pour les champs (fields), c'est plus complexe avec les slash commands.
        // On pourrait avoir des options field1_name, field1_value, field1_inline, etc.
        // Ou demander à l'utilisateur de fournir un JSON, mais c'est moins user-friendly.
        // Pour l'instant, on omet les fields pour simplifier.
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages) // Ou une permission plus élevée
        .setDMPermission(false),
    async execute(interaction) {
        const targetChannel = interaction.options.getChannel('salon');
        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: 'Veuillez sélectionner un salon textuel valide.', ephemeral: true });
        }

        const embed = new EmbedBuilder();

        const title = interaction.options.getString('titre');
        if (title) embed.setTitle(title);

        const description = interaction.options.getString('description');
        if (description) embed.setDescription(description.replace(/\\n/g, '\n'));

        const color = interaction.options.getString('couleur');
        if (color) {
            try {
                embed.setColor(color.startsWith('#') ? color : `#${color}`);
            } catch (e) {
                return interaction.reply({ content: `Couleur invalide : "${color}". Utilisez un format hexadécimal (ex: #FF0000).`, ephemeral: true });
            }
        } else {
            embed.setColor(0x0099FF); // Couleur par défaut
        }

        const imageUrl = interaction.options.getString('image_url');
        if (imageUrl) {
            try {
                new URL(imageUrl); // Valide l'URL
                embed.setImage(imageUrl);
            } catch (e) {
                 return interaction.reply({ content: `URL de l'image invalide : "${imageUrl}".`, ephemeral: true });
            }
        }


        const thumbnailUrl = interaction.options.getString('thumbnail_url');
        if (thumbnailUrl) {
             try {
                new URL(thumbnailUrl); // Valide l'URL
                embed.setThumbnail(thumbnailUrl);
            } catch (e) {
                 return interaction.reply({ content: `URL de la miniature invalide : "${thumbnailUrl}".`, ephemeral: true });
            }
        }

        const footerText = interaction.options.getString('footer_texte');
        const footerIconUrl = interaction.options.getString('footer_icon_url');
        if (footerText) {
            const footerOptions = { text: footerText };
            if (footerIconUrl) {
                 try {
                    new URL(footerIconUrl); // Valide l'URL
                    footerOptions.iconURL = footerIconUrl;
                } catch (e) {
                    // Pas bloquant, on met juste le texte
                }
            }
            embed.setFooter(footerOptions);
        }


        const authorText = interaction.options.getString('auteur_texte');
        const authorIconUrl = interaction.options.getString('auteur_icon_url');
        const authorUrl = interaction.options.getString('auteur_url');
        if (authorText) {
            const authorOptions = { name: authorText };
            if (authorIconUrl) {
                 try {
                    new URL(authorIconUrl);
                    authorOptions.iconURL = authorIconUrl;
                } catch (e) {}
            }
            if (authorUrl) {
                try {
                    new URL(authorUrl);
                    authorOptions.url = authorUrl;
                } catch (e) {}
            }
            embed.setAuthor(authorOptions);
        }

        if (interaction.options.getBoolean('timestamp')) {
            embed.setTimestamp();
        }

        // Vérifier si l'embed est vide (aucun titre, description, image, etc.)
        if (!embed.data.title && !embed.data.description && !embed.data.image && !embed.data.fields?.length && !embed.data.author && !embed.data.thumbnail) {
            return interaction.reply({ content: 'L\'embed ne peut pas être vide. Veuillez fournir au moins un titre, une description ou une image.', ephemeral: true });
        }


        try {
            await targetChannel.send({ embeds: [embed] });
            await interaction.reply({ content: `L'embed personnalisé a été envoyé avec succès dans ${targetChannel}.`, ephemeral: true });
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'embed personnalisé:', error);
            await interaction.reply({ content: 'Une erreur est survenue lors de l\'envoi de l\'embed. Vérifiez les URLs fournies.', ephemeral: true });
        }
    },
};
