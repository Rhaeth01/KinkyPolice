const fetch = require('node-fetch');

class RedGifsAPI {
    constructor() {
        this.token = null;
        this.tokenExpiry = null;
        this.cache = new Map(); // Cache simple pour éviter les requêtes répétées
        this.cacheExpiry = 5 * 60 * 1000; // Cache valide 5 minutes
    }

    // Obtenir un token temporaire auprès de RedGifs
    async getTemporaryToken() {
        try {
            const response = await fetch('https://api.redgifs.com/v2/auth/temporary', {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`Erreur lors de l'obtention du token: ${response.status}`);
                return null;
            }

            const data = await response.json();
            this.token = data.token;
            
            // Le token expire généralement après quelques heures
            this.tokenExpiry = Date.now() + (2 * 60 * 60 * 1000); // 2 heures
            
            console.log('Token RedGifs obtenu avec succès');
            return this.token;

        } catch (error) {
            console.error('Erreur lors de la récupération du token RedGifs:', error);
            return null;
        }
    }

    // Vérifier si le token est encore valide
    isTokenValid() {
        return this.token && this.tokenExpiry && Date.now() < this.tokenExpiry;
    }

    // S'assurer qu'on a un token valide
    async ensureValidToken() {
        if (!this.isTokenValid()) {
            console.log('Token expiré ou inexistant, récupération d\'un nouveau token...');
            return await this.getTemporaryToken();
        }
        return this.token;
    }

    // Rechercher des GIFs avec authentification
    async searchGifs(query, count = 1) {
        // Vérifier le cache d'abord
        const cacheKey = `${query.toLowerCase()}_${count}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            console.log(`💾 RedGifs: Utilisation du cache pour "${query}"`);
            return this.processSearchResults(cached.data, query);
        }
        
        // S'assurer qu'on a un token valide
        const token = await this.ensureValidToken();
        if (!token) {
            console.error('Impossible d\'obtenir un token d\'authentification');
            return null;
        }

        // Utiliser un ordre aléatoire parmi les ordres valides pour plus de variété
        const validOrders = ['trending', 'latest', 'top', 'top7', 'top28'];
        const randomOrder = validOrders[Math.floor(Math.random() * validOrders.length)];
        
        // Augmenter le count pour avoir plus de choix dans la randomisation
        const searchCount = Math.max(20, Math.min(count * 20, 80));
        
        const apiUrl = `https://api.redgifs.com/v2/gifs/search?search_text=${encodeURIComponent(query)}&order=${randomOrder}&count=${searchCount}`;
        
        console.log(`🎯 RedGifs: Recherche "${query}" avec ordre "${randomOrder}" (${searchCount} résultats max)`);

        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                // Si 429 (Rate Limited), attendre et réessayer
                if (response.status === 429) {
                    const errorData = await response.json();
                    const delay = errorData.error?.delay || 60; // Délai en secondes
                    
                    console.log(`⏳ RedGifs: Rate limit atteint, attente de ${Math.min(delay, 300)} secondes...`);
                    
                    // Attendre maximum 5 minutes (300 secondes) pour éviter de bloquer trop longtemps
                    const waitTime = Math.min(delay, 300) * 1000;
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    
                    // Réessayer une fois après l'attente
                    console.log('🔄 RedGifs: Nouvelle tentative après rate limit...');
                    const retryResponse = await fetch(apiUrl, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (retryResponse.ok) {
                        const retryData = await retryResponse.json();
                        return this.processSearchResults(retryData, query);
                    } else {
                        const retryErrorText = await retryResponse.text();
                        console.error(`❌ RedGifs: Échec après retry (${retryResponse.status}): ${retryErrorText}`);
                        return null;
                    }
                }
                
                // Si 401, on essaie de renouveler le token
                if (response.status === 401) {
                    console.log('Token invalide, tentative de renouvellement...');
                    this.token = null; // Forcer le renouvellement
                    const newToken = await this.ensureValidToken();
                    
                    if (newToken) {
                        // Retry avec le nouveau token
                        const retryResponse = await fetch(apiUrl, {
                            headers: {
                                'Authorization': `Bearer ${newToken}`,
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Accept': 'application/json'
                            }
                        });
                        
                        if (retryResponse.ok) {
                            const retryData = await retryResponse.json();
                            return this.processSearchResults(retryData, query);
                        }
                    }
                }

                const errorText = await response.text();
                console.error(`Erreur API RedGifs (${response.status}): ${errorText}`);
                return null;
            }

            const data = await response.json();
            
            // Mettre en cache le résultat
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            return this.processSearchResults(data, query);

        } catch (error) {
            console.error(`Erreur lors de la requête RedGifs pour "${query}":`, error);
            return null;
        }
    }

    // Traiter les résultats de recherche
    processSearchResults(data, query) {
        if (data && data.gifs && data.gifs.length > 0) {
            // Définir les tags génériques non pertinents à éviter
            const genericTags = [
                'amateur', 'blonde', 'brunette', 'redhead', 'petite', 'big tits', 'small tits',
                'cute', 'teen', 'milf', 'latina', 'asian', 'ebony', 'white', 'solo',
                'masturbating', 'orgasm', 'pussy', 'naked', 'hot', 'sexy', 'babe', 'girl',
                'woman', 'young', 'old', 'mature', 'skinny', 'thick', 'curvy', 'slim'
            ];
            
            // Définir les tags pertinents pour chaque catégorie
            const categoryRelevantTags = {
                'bdsm': ['bdsm', 'bondage', 'domination', 'submission', 'slave', 'master', 'restraints', 'chains'],
                'femdom': ['femdom', 'domination', 'mistress', 'dominatrix', 'pegging', 'strap on', 'humiliation'],
                'urolagnia': ['urolagnia', 'piss', 'pee', 'watersports', 'golden shower', 'urine'],
                'squirt': ['squirt', 'squirting', 'female ejaculation', 'gushing'],
                'shibari': ['shibari', 'rope', 'bondage', 'tied', 'bound', 'japanese bondage'],
                'impact play': ['spanking', 'whipping', 'flogging', 'paddle', 'cane', 'impact', 'slapping'],
                'humiliation': ['humiliation', 'degradation', 'verbal abuse', 'shame', 'embarrassment'],
                'feet': ['feet', 'foot', 'toes', 'soles', 'foot fetish', 'foot worship', 'footjob'],
                'anal': ['anal', 'ass', 'butt', 'asshole', 'anal sex', 'anal play'],
                'bondage': ['bondage', 'tied', 'bound', 'restraints', 'rope', 'chains', 'cuffs'],
                'free use': ['free use', 'used', 'public use', 'available'],
                'wax play': ['wax', 'candle', 'hot wax', 'wax play', 'temperature play'],
                'face fuck': ['face fuck', 'face fucking', 'throat', 'deepthroat', 'oral', 'mouth fuck']
            };
            
            // Obtenir les tags pertinents pour la catégorie recherchée
            const relevantTagsForCategory = categoryRelevantTags[query.toLowerCase()] || [query.toLowerCase()];
            
            // Filtrer les gifs de manière stricte
            const filteredGifs = data.gifs.filter(gif => {
                if (!gif.tags || gif.tags.length === 0) return false;
                
                // Vérifier si le gif contient au moins un tag pertinent pour la catégorie
                const hasRelevantTag = gif.tags.some(tag =>
                    relevantTagsForCategory.some(relevantTag =>
                        tag.toLowerCase().includes(relevantTag.toLowerCase())
                    )
                );
                
                if (!hasRelevantTag) return false;
                
                // Compter les tags pertinents pour la catégorie
                const relevantTags = gif.tags.filter(tag =>
                    relevantTagsForCategory.some(relevantTag =>
                        tag.toLowerCase().includes(relevantTag.toLowerCase())
                    )
                );
                
                // Compter les tags génériques non pertinents
                const genericTagCount = gif.tags.filter(tag =>
                    genericTags.includes(tag.toLowerCase())
                ).length;
                
                // Calculer le ratio de pertinence
                const relevanceRatio = relevantTags.length / gif.tags.length;
                const genericRatio = genericTagCount / gif.tags.length;
                
                // Privilégier les gifs avec plus de tags pertinents et moins de tags génériques
                const score = relevanceRatio - (genericRatio * 0.5);
                
                console.log(`🏷️ DEBUG: GIF "${gif.id}" - Tags pertinents: ${relevantTags.length}/${gif.tags.length} (${Math.round(relevanceRatio * 100)}%) - Score: ${Math.round(score * 100)}% - Tags: ${gif.tags.join(', ')}`);
                
                return score >= 0.2; // Score minimum de 20%
            });
            
            // Trier par score de pertinence (meilleur score en premier)
            filteredGifs.sort((a, b) => {
                const calculateScore = (gif) => {
                    const relevantTags = gif.tags.filter(tag =>
                        relevantTagsForCategory.some(relevantTag =>
                            tag.toLowerCase().includes(relevantTag.toLowerCase())
                        )
                    );
                    const genericTagCount = gif.tags.filter(tag =>
                        genericTags.includes(tag.toLowerCase())
                    ).length;
                    
                    const relevanceRatio = relevantTags.length / gif.tags.length;
                    const genericRatio = genericTagCount / gif.tags.length;
                    
                    return relevanceRatio - (genericRatio * 0.5);
                };
                
                return calculateScore(b) - calculateScore(a); // Tri décroissant par score
            });
            
            console.log(`🔍 RedGifs: ${data.gifs.length} résultats bruts, ${filteredGifs.length} après filtrage strict pour "${query}"`);
            
            if (filteredGifs.length > 0) {
                const randomIndex = Math.floor(Math.random() * filteredGifs.length);
                const gif = filteredGifs[randomIndex];
                
                // Priorité pour avoir des gifs animés dans Discord
                // 1. Vidéos HD/SD (gifs animés réels)
                // 2. Formats vidéo alternatifs
                // 3. Images statiques en dernier recours
                const gifUrl = gif.urls?.hd || gif.urls?.sd || gif.urls?.vmp4 || gif.urls?.vwebm || gif.urls?.gif || gif.urls?.poster || gif.urls?.thumbnail;
                
                console.log(`✅ RedGifs: GIF filtré sélectionné "${gif.id}" (${randomIndex + 1}/${filteredGifs.length}) - Tags: ${gif.tags?.join(', ')}`);
                
                if (gifUrl) {
                    return {
                        url: gifUrl,
                        id: gif.id,
                        title: gif.id,
                        thumbnail: gif.urls?.thumbnail,
                        duration: gif.duration,
                        tags: gif.tags || []
                    };
                }
            } else {
                // Fallback : si aucun gif ne correspond exactement, prendre un résultat aléatoire
                console.log(`⚠️ RedGifs: Aucun gif avec tag exact "${query}", fallback sur résultats généraux`);
                const randomIndex = Math.floor(Math.random() * data.gifs.length);
                const gif = data.gifs[randomIndex];
                
                const gifUrl = gif.urls?.hd || gif.urls?.sd || gif.urls?.vmp4 || gif.urls?.vwebm || gif.urls?.gif || gif.urls?.poster || gif.urls?.thumbnail;
                
                if (gifUrl) {
                    return {
                        url: gifUrl,
                        id: gif.id,
                        title: gif.id,
                        thumbnail: gif.urls?.thumbnail,
                        duration: gif.duration,
                        tags: gif.tags || []
                    };
                }
            }
        }
        
        console.log(`❌ RedGifs: Aucun GIF trouvé pour "${query}"`);
        return null;
    }
}

// Instance globale pour réutiliser les tokens
const redgifsAPI = new RedGifsAPI();

// Fonction principale exportée (compatible avec ton code existant)
async function searchRedGifs(query, count = 1) {
    return await redgifsAPI.searchGifs(query, count);
}

module.exports = { searchRedGifs, RedGifsAPI };
