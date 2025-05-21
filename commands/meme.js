const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

const newSubRedditMap = {
    'Reponsedeouf': 'reponsesdeouf',
    'Discussionsbancales': 'discussionsbancales', // Correction de la casse
    'Dinosaure': 'dinosaure',
    'MemeFrançais': 'memeFrancais',
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Affiche un truc relativement drôle.')
        .addStringOption(option =>
            option.setName('categorie')
                .setDescription('Choisis une catégorie de trucs cons')
                .setRequired(true)
                .addChoices(
                    { name: 'Dinosaure (boomers)', value: 'Dinosaure' },
                    { name: 'Discussions bancales', value: 'Discussionsbancales' },
                    { name: 'Réponses de ouf', value: 'Reponsesdeouf' },
                    { name: 'Meme français', value: 'MemeFrançais' },
                    { name: 'Autre (subreddit)', value: 'Autre' },
                ))
        .setDMPermission(false),
    async execute(interaction) {
        if (!interaction.channel?.isTextBased()) { // Correction logique NSFW
            console.log(`Channel validation failed - isText: ${interaction.channel?.isTextBased()}, isNSFW: ${interaction.channel?.nsfw}`);
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un salon textuel.', ephemeral: true });
        }

        const category = interaction.options.getString('categorie');
        const subreddit = newSubRedditMap[category] || category;

        await interaction.deferReply();

        try {
            const response = await fetch(`https://meme-api.com/gimme/${subreddit}`, {
                headers: {
                    'User-Agent': 'KinkyPoliceBot/1.0',
                    'Accept': 'application/json'
                }
            });
            console.log(`Response status: ${response.status}`); // Log the response status

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.message || `Statut: ${response.status}`;
                console.error(`Erreur API meme-api pour r/${subreddit}: ${errorMessage}`);
                return interaction.editReply({ content: `Impossible de récupérer une image depuis r/${subreddit} pour le moment (${errorMessage}). Réessayez ou vérifiez le nom du subreddit.`, ephemeral: true });
            }

            const data = await response.json();
            console.log('API Response Data:', data); // Log the response data

            if (!data || !data.url) {
                return interaction.editReply({ content: `Aucune image trouvée sur r/${subreddit} ou format de réponse inattendu.`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor(0xFF007F)
                .setTitle(data.title || `Contenu de r/${subreddit}`)
                .setURL(data.postLink || `https://www.reddit.com/r/${subreddit}/`)
                .setImage(data.url)
                .setFooter({ text: `Depuis r/${data.subreddit || subreddit} • 👍 ${data.ups || 0}` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`Erreur lors de la commande /meme pour la catégorie ${category} (subreddit r/${subreddit}):`, error);
            await interaction.editReply({ content: 'Oups, une erreur interne est survenue en essayant de chercher à rire.', ephemeral: true });
        }
    },
};
