const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { safeErrorReply } = require('../utils/interactionUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ia')
        .setDescription('💭 Posez une question à l\'IA experte en BDSM et sexualité')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Votre question pour l\'IA')
                .setRequired(true)),

    async execute(interaction) {
        try {
            // Récupérer la question de l'utilisateur
            const question = interaction.options.getString('question');
            
            // Différer la réponse pour avoir plus de temps
            await interaction.deferReply({ ephemeral: false });
            
            // Appeler l'API OpenRouter
            const response = await callOpenRouterAPI(question);
            
            // Créer l'embed avec la réponse
            const responseEmbed = new EmbedBuilder()
                .setColor('#8B5CF6') // Violet
                .setTitle('💋 Conseils d\'une Experte')
                .setDescription(response)
                .setFooter({ text: 'KinkyBot • Experte en BDSM et sexualité' })
                .setTimestamp();
            
            // Envoyer la réponse finale
            await interaction.editReply({ content: null, embeds: [responseEmbed] });
            
        } catch (error) {
            console.error('[IA] Erreur lors de l\'exécution de la commande:', error);
            
            // Gérer l'erreur en utilisant la fonction utilitaire
            await safeErrorReply(interaction, error, {
                errorMessage: '❌ Une erreur est survenue lors de la communication avec l\'IA.',
                log: true
            });
        }
    }
};

/**
 * Appelle l'API OpenRouter pour obtenir une réponse de l'IA
 * @param {string} question - La question posée par l'utilisateur
 * @returns {Promise<string>} - La réponse de l'IA
 */
async function callOpenRouterAPI(question) {
    // Vérifier si la clé API est configurée
    if (!process.env.OPENROUTER_API_KEY) {
        console.error('[IA] Erreur: La clé API OpenRouter n\'est pas configurée dans les variables d\'environnement');
        throw new Error('La clé API OpenRouter n\'est pas configurée. Veuillez contacter l\'administrateur du bot.');
    }
    
    // Définir le prompt système pour l'IA
    const systemPrompt = `Tu es une experte en BDSM, sexualité et pratiques kinky. Tu possèdes une connaissance approfondie dans ces domaines et tu réponds avec assurance et précision.

Ta personnalité :
- Tu adoptes un ton légèrement hautain et nonchalant, comme si tu étais habituée à ce que les gens te consultent pour ton expertise
- Tu utilises un humour subtil avec une pointe de sarcasme
- Malgré ton ton parfois condescendant, tu donnes toujours des informations précises, utiles et sérieuses
- Tu utilises un langage sophistiqué et des termes techniques appropriés
- Tu n'hésites pas à corriger poliment les idées fausses ou les malentendus
- Tu prônes toujours le consentement, la sécurité et la communication dans tes conseils

Tu réponds de manière concise mais complète, en 1-3 paragraphes maximum.`;
    
    try {
        // Appel à l'API OpenRouter
        const apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://discord.com', // Domaine d'où provient la requête
                'X-Title': 'Discord Bot' // Nom de l'application
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-chat-v3-0324:free', // Modèle de haute qualité
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: question }
                ],
                temperature: 0.7, // Équilibre entre créativité et cohérence
                max_tokens: 1000 // Limite de la longueur de la réponse
            })
        });
        
        // Vérifier si la réponse est OK
        if (!apiResponse.ok) {
            const errorData = await apiResponse.json().catch(() => ({}));
            throw new Error(`Erreur API: ${apiResponse.status} ${JSON.stringify(errorData)}`);
        }
        
        // Traiter la réponse
        const data = await apiResponse.json();
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error('[IA] Erreur lors de l\'appel à l\'API:', error);
        throw new Error('Impossible de communiquer avec l\'IA. Veuillez réessayer plus tard.');
    }
}
