const fetch = require('node-fetch');
const fs = require('node:fs');
const path = require('node:path');

class KinkApiManager {
    constructor() {
        this.cacheFile = path.join(__dirname, '..', 'data', 'api-cache.json');
        this.backupFile = path.join(__dirname, '..', 'data', 'content-backup.json');
        this.cache = this.loadCache();
        this.cacheExpiry = 3600000; // 1 heure en millisecondes
        
        // Configuration des APIs externes
        this.apis = {
            truthOrDare: {
                url: 'https://api.truthordarebot.xyz/api',
                enabled: true,
                rateLimit: 100 // requêtes par heure
            },
            backup: {
                enabled: true
            }
        };
        
        // Contenu de secours local organisé par niveau
        this.backupContent = this.loadBackupContent();
    }

    loadCache() {
        try {
            if (fs.existsSync(this.cacheFile)) {
                const data = fs.readFileSync(this.cacheFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement du cache:', error);
        }
        return { truths: {}, dares: {}, gages: {}, lastUpdate: 0 };
    }

    saveCache() {
        try {
            // Créer le dossier data s'il n'existe pas
            const dataDir = path.dirname(this.cacheFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2), 'utf8');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du cache:', error);
        }
    }

    loadBackupContent() {
        const backup = {
            doux: {
                truths: [
                    "Quelle est ta couleur préférée ?",
                    "Quel est ton film romantique favori ?",
                    "Quelle est ta saison préférée et pourquoi ?",
                    "Quel est ton type de rendez-vous idéal ?",
                    "Quelle est la chose la plus romantique qu'on t'ait jamais faite ?"
                ],
                dares: [
                    "Fais un compliment sincère à quelqu'un dans le chat",
                    "Raconte une blague",
                    "Partage une photo de ton animal de compagnie",
                    "Écris un petit poème de 4 vers",
                    "Chante une chanson pendant 30 secondes"
                ],
                gages: [
                    "Écris un message avec seulement des émojis pendant 5 minutes",
                    "Change ton pseudo pour quelque chose d'amusant pendant 1 heure",
                    "Raconte une histoire drôle de ton enfance",
                    "Fais deviner un film en mimant",
                    "Écris un haiku sur ton humeur actuelle"
                ]
            },
            modéré: {
                truths: [
                    "Quelle est ta plus grande attirance physique chez une personne ?",
                    "Quel est ton fantasme de rendez-vous le plus fou ?",
                    "Quelle est la chose la plus sensuelle que tu aies jamais faite ?",
                    "Quel est ton plus grand turn-on ?",
                    "Quelle partie du corps trouves-tu la plus attirante ?"
                ],
                dares: [
                    "Décris ton partenaire idéal en 3 mots",
                    "Raconte ton premier baiser (sans noms)",
                    "Partage ton conseil de séduction préféré",
                    "Décris ta tenue la plus sexy",
                    "Raconte une situation embarrassante en amour"
                ],
                gages: [
                    "Écris un message de drague créatif",
                    "Décris ton fantasme de vacances romantiques",
                    "Raconte ton rêve le plus étrange",
                    "Partage ton secret de beauté",
                    "Décris ta soirée parfaite en couple"
                ]
            },
            intense: {
                truths: [
                    "Quelle est ta pratique BDSM préférée ?",
                    "Quel est ton kink le plus secret ?",
                    "Quelle est ta position préférée ?",
                    "Quel jouet utilises-tu le plus souvent ?",
                    "Quelle est ta limite absolue ?"
                ],
                dares: [
                    "Décris ton scénario BDSM idéal",
                    "Partage ton expérience kink la plus mémorable",
                    "Raconte ta première expérience BDSM",
                    "Décris ton dungeon de rêve",
                    "Partage ton conseil BDSM pour débutants"
                ],
                gages: [
                    "Porte un accessoire kinky pendant 1 heure",
                    "Écris une histoire érotique courte",
                    "Décris ta séance BDSM parfaite",
                    "Partage ta collection de jouets (description)",
                    "Raconte ton expérience la plus intense"
                ]
            }
        };

        try {
            if (fs.existsSync(this.backupFile)) {
                const data = fs.readFileSync(this.backupFile, 'utf8');
                return { ...backup, ...JSON.parse(data) };
            }
        } catch (error) {
            console.error('Erreur lors du chargement du contenu de secours:', error);
        }

        return backup;
    }

    isCacheValid(type, level) {
        const cacheKey = `${type}_${level}`;
        const cached = this.cache[cacheKey];
        
        if (!cached || !cached.timestamp) return false;
        
        const now = Date.now();
        return (now - cached.timestamp) < this.cacheExpiry;
    }

    async fetchFromApi(type, level) {
        try {
            // Simulation d'appel API - à remplacer par de vraies APIs
            console.log(`Tentative d'appel API pour ${type} niveau ${level}`);
            
            // Pour l'instant, on utilise le contenu de secours
            // TODO: Implémenter les vraies APIs quand disponibles
            return null;
            
        } catch (error) {
            console.error('Erreur lors de l\'appel API:', error);
            return null;
        }
    }

    getFromBackup(type, level) {
        const levelContent = this.backupContent[level];
        if (!levelContent) return null;

        const contentArray = levelContent[type];
        if (!contentArray || contentArray.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * contentArray.length);
        return contentArray[randomIndex];
    }

    async getContent(type, level = 'doux') {
        // Valider les paramètres
        const validTypes = ['truths', 'dares', 'gages'];
        const validLevels = ['doux', 'modéré', 'intense'];
        
        if (!validTypes.includes(type)) {
            throw new Error(`Type invalide: ${type}. Types valides: ${validTypes.join(', ')}`);
        }
        
        if (!validLevels.includes(level)) {
            throw new Error(`Niveau invalide: ${level}. Niveaux valides: ${validLevels.join(', ')}`);
        }

        const cacheKey = `${type}_${level}`;

        // Vérifier le cache d'abord
        if (this.isCacheValid(type, level)) {
            const cached = this.cache[cacheKey];
            if (cached && cached.content && cached.content.length > 0) {
                const randomIndex = Math.floor(Math.random() * cached.content.length);
                return {
                    content: cached.content[randomIndex],
                    source: 'cache',
                    level: level
                };
            }
        }

        // Essayer l'API externe
        const apiContent = await this.fetchFromApi(type, level);
        if (apiContent) {
            // Mettre en cache
            this.cache[cacheKey] = {
                content: Array.isArray(apiContent) ? apiContent : [apiContent],
                timestamp: Date.now()
            };
            this.saveCache();
            
            return {
                content: Array.isArray(apiContent) ? apiContent[0] : apiContent,
                source: 'api',
                level: level
            };
        }

        // Fallback vers le contenu local
        const backupContent = this.getFromBackup(type, level);
        if (backupContent) {
            return {
                content: backupContent,
                source: 'backup',
                level: level
            };
        }

        throw new Error(`Aucun contenu disponible pour ${type} niveau ${level}`);
    }

    // Méthodes spécifiques pour chaque type
    async getRandomTruth(level = 'doux') {
        return await this.getContent('truths', level);
    }

    async getRandomDare(level = 'doux') {
        return await this.getContent('dares', level);
    }

    async getRandomGage(level = 'doux') {
        return await this.getContent('gages', level);
    }

    // Méthode pour ajouter du contenu personnalisé
    addCustomContent(type, level, content) {
        if (!this.backupContent[level]) {
            this.backupContent[level] = {};
        }
        
        if (!this.backupContent[level][type]) {
            this.backupContent[level][type] = [];
        }
        
        if (!this.backupContent[level][type].includes(content)) {
            this.backupContent[level][type].push(content);
            
            // Sauvegarder le contenu de secours
            try {
                const dataDir = path.dirname(this.backupFile);
                if (!fs.existsSync(dataDir)) {
                    fs.mkdirSync(dataDir, { recursive: true });
                }
                
                fs.writeFileSync(this.backupFile, JSON.stringify(this.backupContent, null, 2), 'utf8');
                return true;
            } catch (error) {
                console.error('Erreur lors de la sauvegarde du contenu personnalisé:', error);
                return false;
            }
        }
        
        return false; // Contenu déjà existant
    }

    // Méthode pour nettoyer le cache
    clearCache() {
        this.cache = { truths: {}, dares: {}, gages: {}, lastUpdate: 0 };
        this.saveCache();
    }

    // Méthode pour obtenir les statistiques
    getStats() {
        const stats = {
            cacheSize: Object.keys(this.cache).length - 1, // -1 pour lastUpdate
            backupContent: {}
        };

        for (const level in this.backupContent) {
            stats.backupContent[level] = {};
            for (const type in this.backupContent[level]) {
                stats.backupContent[level][type] = this.backupContent[level][type].length;
            }
        }

        return stats;
    }
}

// Export singleton
module.exports = new KinkApiManager();