const axios = require('axios');

const JOKE_API_URL = 'https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist,sexist,explicit&lang=fr';

async function fetchJoke() {
    try {
        const response = await axios.get(JOKE_API_URL);
        if (response.data) {
            if (response.data.type === 'single' && response.data.joke) {
                return response.data.joke;
            } else if (response.data.type === 'twopart' && response.data.setup && response.data.delivery) {
                return `${response.data.setup}\n\n${response.data.delivery}`;
            } else {
                console.error('JokeAPI: Réponse inattendue ou format de blague non supporté:', response.data);
                return null;
            }
        } else {
            console.error('JokeAPI: Aucune donnée reçue dans la réponse.');
            return null;
        }
    } catch (error) {
        console.error('Erreur lors de la récupération de la blague depuis JokeAPI:', error);
        return null;
    }
}

module.exports = {
    fetchJoke
};