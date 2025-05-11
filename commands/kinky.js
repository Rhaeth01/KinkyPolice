const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

const subredditMap = {
    'BDSM': 'BDSM', // Placeholder, à remplacer par un subreddit plus spécifique si souhaité (ex: bdsm_gifs)
    'Femdom': 'Femdom',
    'Impact Play': 'ImpactPlayKinkBDSM',
    'Humiliation': 'Humiliation', // Placeholder
    'Feet': 'Feet' // Placeholder
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
                    { name: 'Impact (Fessée, etc.)', value: 'Impact Play' }, // "Impact Play" est un terme plus courant
                    { name: 'Humiliation', value: 'Humiliation' },
                    { name: 'Feet', value: 'Feet' }
                ))
        .setDMPermission(false),
    async execute(interaction) {
        if (!interaction.channel.isTextBased() || !interaction.channel.nsfw) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un salon NSFW.', ephemeral: true });
        }

        const category = interaction.options.getString('categorie');
        const subreddit = subredditMap[category] || category; // Utilise la catégorie comme subreddit si non mappé

        await interaction.deferReply();

        try {
            const response = await fetch(`https://meme-api.com/gimme/${subreddit}`);
            if (!response.ok) {
                // Si le subreddit spécifique échoue, on pourrait tenter un fallback plus générique ou juste afficher l'erreur.
                // Pour l'instant, on affiche l'erreur.
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.message || `Statut: ${response.status}`;
                console.error(`Erreur API meme-api pour r/${subreddit}: ${errorMessage}`);
                return interaction.editReply({ content: `Impossible de récupérer une image depuis r/${subreddit} pour le moment (${errorMessage}). Réessayez ou vérifiez le nom du subreddit.`, ephemeral: true });
            }
            const data = await response.json();

            if (!data || !data.url || data.nsfw === false) { // On s'attend à du contenu NSFW ici
                 // Si l'API dit que ce n'est pas NSFW, mais qu'on est dans un salon NSFW, on peut quand même l'afficher.
                 // Le filtre data.nsfw === false est peut-être trop strict si on cible des subreddits déjà NSFW.
                 // On va le retirer pour cet usage spécifique.
            }
            if (!data || !data.url) {
                 return interaction.editReply({ content: `Aucune image trouvée sur r/${subreddit} ou format de réponse inattendu.`, ephemeral: true });
            }


            const embed = new EmbedBuilder()
                .setColor(0xFF007F) // Rose vif
                .setTitle(data.title || `Contenu de r/${subreddit}`)
                .setURL(data.postLink || `https://www.reddit.com/r/${subreddit}/`)
                .setImage(data.url)
                .setFooter({ text: `Depuis r/${data.subreddit || subreddit} • 👍 ${data.ups || 0}` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`Erreur lors de la commande /kinky pour la catégorie ${category} (subreddit r/${subreddit}):`, error);
            await interaction.editReply({ content: 'Oups, une erreur interne est survenue en essayant de chercher une image coquine.', ephemeral: true });
        }
    },
};
