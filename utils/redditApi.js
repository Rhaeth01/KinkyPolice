const fetch = require('node-fetch');

class RedditAPI {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // Cache valide 5 minutes
        this.userAgent = 'KinkyBot/1.0 by u/KinkyPolice';
        this.requestDelay = 1000; // 1 seconde entre les requêtes pour éviter le rate limiting
        this.lastRequestTime = 0;
    }

    // Attendre si nécessaire pour respecter le rate limiting
    async rateLimitDelay() {
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < this.requestDelay) {
            await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLastRequest));
        }
        this.lastRequestTime = Date.now();
    }

    // Récupérer les posts d'un subreddit
    async getSubredditPosts(subreddit, sortBy = 'hot', limit = 25) {
        const cacheKey = `${subreddit}_${sortBy}_${limit}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            console.log(`💾 Reddit: Cache hit pour r/${subreddit}`);
            return cached.data;
        }

        await this.rateLimitDelay();

        const url = `https://reddit.com/r/${subreddit}/${sortBy}.json?limit=${limit}&include_over_18=on`;
        
        try {
            console.log(`🌐 Reddit: Récupération r/${subreddit} (${sortBy}, ${limit} posts)`);
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`❌ Reddit: Erreur ${response.status} pour r/${subreddit}`);
                return null;
            }

            const data = await response.json();
            
            if (!data.data || !data.data.children) {
                console.error(`❌ Reddit: Structure de données invalide pour r/${subreddit}`);
                return null;
            }

            const posts = data.data.children.map(child => child.data);
            
            // Mettre en cache
            this.cache.set(cacheKey, {
                data: posts,
                timestamp: Date.now()
            });

            console.log(`✅ Reddit: ${posts.length} posts récupérés de r/${subreddit}`);
            return posts;

        } catch (error) {
            console.error(`❌ Reddit: Erreur lors de la requête r/${subreddit}:`, error.message);
            return null;
        }
    }

    // Filtrer les posts pour garder seulement ceux avec du contenu média
    filterMediaPosts(posts) {
        return posts.filter(post => {
            // Vérifier que le post n'est pas supprimé ou archivé
            if (post.removed_by_category || post.archived) return false;
            
            // Vérifier qu'il a du contenu média
            return this.hasMediaContent(post);
        });
    }

    // Vérifier si un post contient du contenu média supporté
    hasMediaContent(post) {
        // Images directes
        if (post.url && this.isImageUrl(post.url)) return true;
        
        // Vidéos Reddit (v.redd.it)
        if (post.is_video && post.media && post.media.reddit_video) return true;
        
        // Gifs et vidéos externes (imgur, redgifs, gfycat, etc.)
        if (post.url && this.isVideoUrl(post.url)) return true;
        
        // Galeries Reddit
        if (post.is_gallery && post.media_metadata) return true;
        
        return false;
    }

    // Extraire l'URL du média principal d'un post
    getMediaUrl(post) {
        let url = null;
        
        // Images directes
        if (post.url && this.isImageUrl(post.url)) {
            url = post.url;
        }
        // Vidéos Reddit
        else if (post.is_video && post.media && post.media.reddit_video) {
            url = post.media.reddit_video.fallback_url;
        }
        // Gifs et vidéos externes
        else if (post.url && this.isVideoUrl(post.url)) {
            url = post.url;
        }
        // Galeries Reddit - prendre la première image
        else if (post.is_gallery && post.media_metadata) {
            const firstKey = Object.keys(post.media_metadata)[0];
            if (firstKey) {
                const media = post.media_metadata[firstKey];
                if (media.s && media.s.u) {
                    url = media.s.u.replace(/&amp;/g, '&');
                }
            }
        }
        else {
            url = post.url;
        }
        
        // Convertir l'URL pour améliorer la compatibilité Discord
        return this.convertToDiscordFriendlyUrl(url);
    }

    // Convertir les URLs pour une meilleure compatibilité avec Discord
    convertToDiscordFriendlyUrl(url) {
        if (!url) return url;
        
        // Convertir .gifv en .gif pour Imgur
        if (url.includes('imgur.com') && url.endsWith('.gifv')) {
            return url.replace('.gifv', '.gif');
        }
        
        // Convertir les URLs de galerie Imgur en lien direct (tentative)
        if (url.includes('imgur.com/a/')) {
            // Pour les galeries, on ne peut pas facilement extraire l'image directe
            // On garde l'URL originale, Discord tentera de l'afficher
            return url;
        }
        
        // Convertir v.redd.it en URL plus compatible via un service tiers
        if (url.includes('v.redd.it')) {
            // Utiliser vxreddit.com qui fournit des embeds compatibles Discord
            return url.replace('v.redd.it', 'v.vxreddit.com');
        }
        
        // Pour RedGifs, essayer de convertir les URLs de visualisation en URLs directes
        if (url.includes('redgifs.com/watch/')) {
            // Extraire l'ID et créer un lien direct vers le GIF
            const match = url.match(/redgifs\.com\/watch\/([^/?]+)/);
            if (match) {
                const gifId = match[1];
                // RedGifs utilise ce format pour les liens directs
                return `https://thumbs2.redgifs.com/${gifId}-mobile.mp4`;
            }
        }
        
        // Pour d'autres domaines problématiques, appliquer des conversions connues
        if (url.includes('gfycat.com') && !url.includes('.gif') && !url.includes('.mp4')) {
            // Gfycat: convertir les URLs de page en URLs directes
            const match = url.match(/gfycat\.com\/([^/?]+)/);
            if (match) {
                const gfyId = match[1];
                return `https://giant.gfycat.com/${gfyId}.gif`;
            }
        }
        
        return url;
    }

    // Vérifier si l'URL est une image
    isImageUrl(url) {
        if (!url) return false;
        
        // Extensions d'images courantes
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const urlLower = url.toLowerCase();
        
        if (imageExtensions.some(ext => urlLower.includes(ext))) return true;
        
        // Domaines d'images connus
        const imageDomains = ['i.imgur.com', 'i.redd.it'];
        return imageDomains.some(domain => url.includes(domain));
    }

    // Vérifier si l'URL est une vidéo
    isVideoUrl(url) {
        if (!url) return false;
        
        // Extensions vidéo
        const videoExtensions = ['.mp4', '.webm', '.mov', '.avi'];
        const urlLower = url.toLowerCase();
        
        if (videoExtensions.some(ext => urlLower.includes(ext))) return true;
        
        // Domaines vidéo connus
        const videoDomains = ['redgifs.com', 'gfycat.com', 'imgur.com/a/', 'v.redd.it'];
        return videoDomains.some(domain => url.includes(domain));
    }

    // Rechercher du contenu par catégorie
    async searchContentByCategory(category, options = {}) {
        const {
            sortBy = 'hot',
            minScore = 50,
            maxAge = 7, // jours
            limit = 25
        } = options;

        const subreddits = this.getCategorySubreddits(category);
        if (!subreddits || subreddits.length === 0) {
            console.error(`❌ Reddit: Aucun subreddit configuré pour la catégorie "${category}"`);
            return null;
        }

        console.log(`🔍 Reddit: Recherche catégorie "${category}" dans ${subreddits.length} subreddits`);

        let allPosts = [];
        
        // Récupérer les posts de tous les subreddits de la catégorie
        for (const subreddit of subreddits) {
            const posts = await this.getSubredditPosts(subreddit, sortBy, limit);
            if (posts) {
                allPosts.push(...posts);
            }
        }

        if (allPosts.length === 0) {
            console.log(`❌ Reddit: Aucun post trouvé pour "${category}"`);
            return null;
        }

        // Filtrer pour garder seulement les posts avec média
        let mediaPosts = this.filterMediaPosts(allPosts);
        
        // Filtrer par score minimum
        mediaPosts = mediaPosts.filter(post => post.score >= minScore);
        
        // Filtrer par âge (posts récents)
        const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;
        const now = Date.now();
        mediaPosts = mediaPosts.filter(post => {
            const postAge = now - (post.created_utc * 1000);
            return postAge <= maxAgeMs;
        });

        if (mediaPosts.length === 0) {
            console.log(`❌ Reddit: Aucun post média récent avec score suffisant pour "${category}"`);
            return null;
        }

        // Trier par score décroissant
        mediaPosts.sort((a, b) => b.score - a.score);

        // Prendre un post aléatoire parmi les 20 meilleurs
        const topPosts = mediaPosts.slice(0, Math.min(20, mediaPosts.length));
        const randomPost = topPosts[Math.floor(Math.random() * topPosts.length)];

        console.log(`✅ Reddit: Post sélectionné de r/${randomPost.subreddit} (score: ${randomPost.score})`);

        return {
            url: this.getMediaUrl(randomPost),
            title: randomPost.title,
            subreddit: randomPost.subreddit,
            score: randomPost.score,
            author: randomPost.author,
            permalink: `https://reddit.com${randomPost.permalink}`,
            nsfw: randomPost.over_18,
            created: new Date(randomPost.created_utc * 1000),
            isVideo: randomPost.is_video || this.isVideoUrl(randomPost.url),
            isImage: this.isImageUrl(this.getMediaUrl(randomPost))
        };
    }

    // Mapping simple des 13 catégories originales vers les subreddits
    getCategorySubreddits(category) {
        const categoryMap = {
            'BDSM': ['bdsm', 'BDSMcommunity'],
            'Femdom': ['femdom', 'gentlefemdom'],
            'Uro': ['Watersports', 'pee'],
            'Squirt': ['squirting', 'grool'],
            'Shibari': ['Shibari', 'ropebondage'],
            'Impact Play': ['SpankingGW', 'spanking'],
            'Humiliation': ['Humiliation', 'DegradingHoles'],
            'Feet': ['feet', 'FootFetish'],
            'Bondage': ['Bondage', 'BondageGIFS'],
            'Anal': ['anal', 'AnalGW'],
            'Wax Play': ['waxplay'],
            'Free Use': ['freeuse'],
            'Face Fuck': ['FaceFuck', 'deepthroat']
        };

        return categoryMap[category] || null;
    }
}

// Instance globale
const redditAPI = new RedditAPI();

module.exports = { RedditAPI, redditAPI };