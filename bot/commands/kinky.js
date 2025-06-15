const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { searchRedGifs } = require('../utils/redgifsApi');

const redgifsCategoryMap = {
    'BDSM': 'BDSM',
    'Femdom': 'Femdom',
    'Uro': 'Urolagnia',
    'Squirt': 'Squirt',
    'Shibari': 'Shibari',
    'Impact Play': 'Impact Play',
    'Humiliation': 'Humiliation',
    'Feet': 'Feet',
    'Anal': 'Anal',
    'Bondage': 'Bondage',
    'Free Use': 'Free Use',
    'Wax Play': 'Wax Play',
    'Face Fuck': 'Face Fuck'
};

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
        const searchTerm = redgifsCategoryMap[category] || category; // Utilise le terme mappé ou la catégorie directement
        await interaction.deferReply();

        try {
            console.log(`🚀 DEBUG: Commande /kinky exécutée - Catégorie: "${category}" - Terme de recherche: "${searchTerm}"`);
            const gifResult = await searchRedGifs(searchTerm);

            console.log(`📦 DEBUG: Résultat reçu de searchRedGifs:`, gifResult);

            if (!gifResult) {
                console.log(`❌ DEBUG: Aucun résultat trouvé pour "${searchTerm}"`);
                return interaction.editReply({ content: `Aucun GIF coquin trouvé pour la catégorie "${category}".`, ephemeral: true });
            }

            // CORRECTION: Extraction sécurisée de l'URL
            let gifUrl;
            if (typeof gifResult === 'string') {
                // Si c'est une string, c'est déjà l'URL
                gifUrl = gifResult;
                console.log(`🔗 DEBUG: URL extraite (string): ${gifUrl}`);
            } else if (gifResult && gifResult.url) {
                // Si c'est un objet avec une propriété url
                gifUrl = gifResult.url;
                console.log(`🔗 DEBUG: URL extraite (objet): ${gifUrl}`);
            } else {
                // Fallback en cas de structure inattendue
                console.error('❌ Structure de résultat inattendue:', gifResult);
                return interaction.editReply({ content: 'Erreur de format dans la réponse du serveur.', ephemeral: true });
            }


            // Essayer d'abord d'envoyer la vidéo directement pour que Discord crée un player
            if (typeof gifResult === 'object' && gifUrl.includes('.mp4')) {
                // Envoyer la vidéo directement avec des infos
                const videoMessage = `🔥 **GIF Kinky: ${category}**\n` +
                    `📊 **ID:** ${gifResult.id}\n` +
                    `⏱️ **Durée:** ${gifResult.duration}s\n` +
                    `🏷️ **Tags:** ${gifResult.tags?.slice(0, 5).join(', ') || 'Aucun'}\n\n` +
                    `${gifUrl}`;
                
                console.log(`🎬 DEBUG: Envoi de la vidéo directement pour player Discord: ${gifUrl}`);
                await interaction.editReply({ content: videoMessage });
            } else {
                // Fallback avec embed pour les autres formats
                const embed = new EmbedBuilder()
                    .setColor(0xFF007F)
                    .setTitle(`GIF Kinky: ${category}`)
                    .setURL(gifUrl)
                    .setImage(gifUrl);

                // Ajouter des infos supplémentaires si c'est un objet
                if (typeof gifResult === 'object' && gifResult.id && gifResult.duration) {
                    embed.setFooter({ text: `Source: RedGifs • ID: ${gifResult.id} • Durée: ${gifResult.duration}s • Catégorie: ${category}` });
                } else {
                    embed.setFooter({ text: `Source: RedGifs • Catégorie: ${category}` });
                }

                console.log(`🖼️ DEBUG: Fallback embed pour format non-vidéo: ${gifUrl}`);
                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error(`Erreur lors de la commande /kinky pour la catégorie ${category}:`, error);
            await interaction.editReply({ content: 'Oups, une erreur interne est survenue en essayant de chercher un GIF coquin.', ephemeral: true });
        }
    },
};
