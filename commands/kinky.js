const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { redditAPI } = require('../utils/redditApi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kinky')
        .setDescription('Affiche un GIF coquin basé sur une catégorie.')
        .addStringOption(option =>
            option.setName('categorie')
                .setDescription('Choisis une catégorie de GIF.')
                .setRequired(true)
                .addChoices(
                    { name: 'BDSM (Général)', value: 'BDSM' },
                    { name: 'Femdom', value: 'Femdom' },
                    { name: 'Uro', value: 'Uro' },
                    { name: 'Squirt', value: 'Squirt' },
                    { name: 'Shibari', value: 'Shibari' },
                    { name: 'Impact (Fessée, etc.)', value: 'Impact Play' },
                    { name: 'Humiliation', value: 'Humiliation' },
                    { name: 'Feet', value: 'Feet' },
                    { name: 'Bondage', value: 'Bondage' },
                    { name: 'Anal', value: 'Anal' },
                    { name: 'Wax Play', value: 'Wax Play' },
                    { name: 'Free Use', value: 'Free Use' },
                    { name: 'Face Fuck', value: 'Face Fuck' }
                ))
        .setDMPermission(false),

    async execute(interaction) {
        if (!interaction.channel.isTextBased() || !interaction.channel.nsfw) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un salon NSFW.', ephemeral: true });
        }

        const category = interaction.options.getString('categorie');
        await interaction.deferReply();

        try {
            console.log(`🚀 Kinky: Recherche catégorie "${category}"`);
            
            const content = await redditAPI.searchContentByCategory(category, {
                sortBy: 'hot',
                minScore: 20,
                maxAge: 30,
                limit: 25
            });

            if (!content) {
                return interaction.editReply({ 
                    content: `Aucun GIF coquin trouvé pour la catégorie "${category}".`, 
                    ephemeral: true 
                });
            }

            // Utiliser toujours un embed pour un affichage uniforme et propre
            const embed = new EmbedBuilder()
                .setColor(0xFF007F)
                .setTitle(`GIF Kinky: ${category}`)
                .setURL(content.permalink)
                .setFooter({ 
                    text: `Source: Reddit • r/${content.subreddit} • ${content.score} upvotes • Catégorie: ${category}` 
                });

            // Pour les vidéos ET les images, utiliser l'embed
            // Discord gère automatiquement l'affichage des vidéos dans les embeds
            if (content.isVideo) {
                embed.setImage(content.url); // Discord affichera la vidéo directement
            } else {
                embed.setImage(content.url); // Discord affichera l'image directement
            }

            await interaction.editReply({ embeds: [embed] });

            console.log(`✅ Kinky: Contenu envoyé - r/${content.subreddit} (${content.score} upvotes)`);

        } catch (error) {
            console.error(`❌ Kinky: Erreur pour catégorie "${category}":`, error);
            await interaction.editReply({ 
                content: 'Oups, une erreur interne est survenue en essayant de chercher un GIF coquin.', 
                ephemeral: true 
            });
        }
    },
};
