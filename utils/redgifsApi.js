const fetch = require('node-fetch');

// ATTENTION: Ceci est une approche très simplifiée et peut ne pas fonctionner
// de manière fiable ou être conforme aux conditions d'utilisation de RedGifs.
// Une véritable intégration nécessiterait une étude approfondie de leur API (si disponible publiquement)
// ou l'utilisation d'une bibliothèque tierce maintenue.
// L'API Redgifs peut être instable ou changer sans préavis.

async function searchRedGifs(query, count = 1) {
    // L'URL de l'API et les paramètres peuvent changer.
    // Il est possible qu'une clé API soit nécessaire.
    const apiUrl = `https://api.redgifs.com/v2/gifs/search?search_text=${encodeURIComponent(query)}&order=trending&count=${Math.max(1, Math.min(count, 80))}`; // Limite le count pour éviter des requêtes trop lourdes

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/json',
                // Des headers comme 'Authorization: Bearer VOTRE_TOKEN_SI_NECESSAIRE' pourraient être requis.
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Erreur API RedGifs (${response.status} ${response.statusText}): ${errorText}`);
            return null;
        }

        const data = await response.json();

        if (data && data.gifs && data.gifs.length > 0) {
            const randomIndex = Math.floor(Math.random() * data.gifs.length);
            const gif = data.gifs[randomIndex];
            // Tente de récupérer l'URL HD, sinon SD.
            return gif.urls && (gif.urls.hd || gif.urls.sd) ? (gif.urls.hd || gif.urls.sd) : null;
        }
        console.log(`Aucun GIF trouvé pour la recherche "${query}" sur RedGifs.`);
        return null;
    } catch (error) {
        console.error(`Erreur lors de la requête à RedGifs pour "${query}":`, error);
        return null;
    }
}

module.exports = { searchRedGifs };
