const fs = require('node:fs');
const path = require('node:path');

class KinkLevelManager {
    constructor() {
        this.configFile = path.join(__dirname, '..', 'data', 'kink-levels.json');
        this.cache = this.loadConfig();
        
        // Configuration par défaut
        this.defaultConfig = {
            defaultLevel: 'doux',
            levels: ['doux', 'modéré', 'intense'],
            levelDescriptions: {
                doux: 'Contenu léger et amusant, accessible à tous',
                modéré: 'Contenu suggestif, nécessite un canal NSFW',
                intense: 'Contenu explicite BDSM/Kink, nécessite un canal NSFW et des rôles adultes'
            },
            requiredRoles: {
                intense: ['adulte', 'verified', '18+', 'adult', 'majeur']
            },
            nsfwRequired: {
                modéré: true,
                intense: true
            }
        };
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configFile)) {
                const data = fs.readFileSync(this.configFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement de la configuration des niveaux kink:', error);
        }
        
        // Retourner une configuration vide si le fichier n'existe pas
        return {
            guilds: {},
            users: {},
            lastUpdate: Date.now()
        };
    }

    saveConfig() {
        try {
            // Créer le dossier data s'il n'existe pas
            const dataDir = path.dirname(this.configFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            this.cache.lastUpdate = Date.now();
            fs.writeFileSync(this.configFile, JSON.stringify(this.cache, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la configuration des niveaux kink:', error);
            return false;
        }
    }

    /**
     * Obtient le niveau configuré pour un serveur
     * @param {string} guildId - ID du serveur
     * @returns {string} Niveau configuré ou niveau par défaut
     */
    getGuildLevel(guildId) {
        if (!guildId) return this.defaultConfig.defaultLevel;
        
        const guildConfig = this.cache.guilds[guildId];
        return guildConfig?.defaultLevel || this.defaultConfig.defaultLevel;
    }

    /**
     * Définit le niveau par défaut pour un serveur
     * @param {string} guildId - ID du serveur
     * @param {string} level - Niveau à définir
     * @returns {boolean} Succès de l'opération
     */
    setGuildLevel(guildId, level) {
        if (!guildId || !this.isValidLevel(level)) {
            return false;
        }

        if (!this.cache.guilds[guildId]) {
            this.cache.guilds[guildId] = {};
        }

        this.cache.guilds[guildId].defaultLevel = level;
        this.cache.guilds[guildId].lastUpdate = Date.now();
        
        return this.saveConfig();
    }

    /**
     * Obtient le niveau préféré d'un utilisateur dans un serveur
     * @param {string} userId - ID de l'utilisateur
     * @param {string} guildId - ID du serveur
     * @returns {string} Niveau préféré ou niveau du serveur
     */
    getUserLevel(userId, guildId) {
        if (!userId || !guildId) {
            return this.getGuildLevel(guildId);
        }

        const userKey = `${guildId}_${userId}`;
        const userConfig = this.cache.users[userKey];
        
        return userConfig?.preferredLevel || this.getGuildLevel(guildId);
    }

    /**
     * Définit le niveau préféré d'un utilisateur dans un serveur
     * @param {string} userId - ID de l'utilisateur
     * @param {string} guildId - ID du serveur
     * @param {string} level - Niveau à définir
     * @returns {boolean} Succès de l'opération
     */
    setUserLevel(userId, guildId, level) {
        if (!userId || !guildId || !this.isValidLevel(level)) {
            return false;
        }

        const userKey = `${guildId}_${userId}`;
        
        if (!this.cache.users[userKey]) {
            this.cache.users[userKey] = {};
        }

        this.cache.users[userKey].preferredLevel = level;
        this.cache.users[userKey].lastUpdate = Date.now();
        
        return this.saveConfig();
    }

    /**
     * Vérifie si un niveau est valide
     * @param {string} level - Niveau à vérifier
     * @returns {boolean} Validité du niveau
     */
    isValidLevel(level) {
        return this.defaultConfig.levels.includes(level);
    }

    /**
     * Obtient tous les niveaux disponibles
     * @returns {Array} Liste des niveaux
     */
    getAvailableLevels() {
        return [...this.defaultConfig.levels];
    }

    /**
     * Obtient la description d'un niveau
     * @param {string} level - Niveau
     * @returns {string} Description du niveau
     */
    getLevelDescription(level) {
        return this.defaultConfig.levelDescriptions[level] || 'Niveau inconnu';
    }

    /**
     * Vérifie si un utilisateur peut accéder à un niveau donné
     * @param {Object} interaction - Interaction Discord
     * @param {string} level - Niveau demandé
     * @returns {Object} Résultat de la vérification
     */
    checkUserAccess(interaction, level) {
        const result = {
            hasAccess: false,
            reason: '',
            level: level,
            requiresNSFW: false,
            requiresRoles: []
        };

        // Vérifier si le niveau est valide
        if (!this.isValidLevel(level)) {
            result.reason = `Niveau invalide: ${level}`;
            return result;
        }

        // Niveau doux : accessible à tous
        if (level === 'doux') {
            result.hasAccess = true;
            result.reason = 'Niveau accessible à tous';
            return result;
        }

        // Vérifier si NSFW est requis
        if (this.defaultConfig.nsfwRequired[level] && !interaction.channel.nsfw) {
            result.reason = `Le niveau ${level} nécessite un canal NSFW`;
            result.requiresNSFW = true;
            return result;
        }

        // Vérifier les rôles requis pour le niveau intense
        if (level === 'intense') {
            const member = interaction.member;
            const requiredRoles = this.defaultConfig.requiredRoles.intense;
            
            const hasRequiredRole = member.roles.cache.some(role => 
                requiredRoles.some(reqRole => 
                    role.name.toLowerCase().includes(reqRole.toLowerCase())
                )
            );

            if (!hasRequiredRole) {
                result.reason = `Le niveau ${level} nécessite un rôle adulte vérifié`;
                result.requiresRoles = requiredRoles;
                return result;
            }
        }

        result.hasAccess = true;
        result.reason = `Accès autorisé au niveau ${level}`;
        return result;
    }

    /**
     * Obtient le niveau effectif à utiliser pour une interaction
     * @param {Object} interaction - Interaction Discord
     * @param {string} requestedLevel - Niveau demandé (optionnel)
     * @returns {Object} Niveau effectif et informations
     */
    getEffectiveLevel(interaction, requestedLevel = null) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        
        // Déterminer le niveau à utiliser
        let targetLevel;
        if (requestedLevel) {
            targetLevel = requestedLevel;
        } else {
            targetLevel = this.getUserLevel(userId, guildId);
        }

        // Vérifier l'accès
        const accessCheck = this.checkUserAccess(interaction, targetLevel);
        
        if (!accessCheck.hasAccess) {
            // Fallback vers un niveau inférieur si possible
            const fallbackLevel = this.getFallbackLevel(targetLevel, interaction);
            if (fallbackLevel !== targetLevel) {
                const fallbackCheck = this.checkUserAccess(interaction, fallbackLevel);
                if (fallbackCheck.hasAccess) {
                    return {
                        level: fallbackLevel,
                        requested: targetLevel,
                        fallback: true,
                        reason: `Fallback vers ${fallbackLevel}: ${accessCheck.reason}`,
                        accessCheck: fallbackCheck
                    };
                }
            }
            
            return {
                level: null,
                requested: targetLevel,
                fallback: false,
                reason: accessCheck.reason,
                accessCheck: accessCheck
            };
        }

        return {
            level: targetLevel,
            requested: targetLevel,
            fallback: false,
            reason: accessCheck.reason,
            accessCheck: accessCheck
        };
    }

    /**
     * Obtient un niveau de fallback approprié
     * @param {string} originalLevel - Niveau original
     * @param {Object} interaction - Interaction Discord
     * @returns {string} Niveau de fallback
     */
    getFallbackLevel(originalLevel, interaction) {
        const levels = this.defaultConfig.levels;
        const currentIndex = levels.indexOf(originalLevel);
        
        // Essayer les niveaux inférieurs
        for (let i = currentIndex - 1; i >= 0; i--) {
            const testLevel = levels[i];
            const accessCheck = this.checkUserAccess(interaction, testLevel);
            if (accessCheck.hasAccess) {
                return testLevel;
            }
        }
        
        return 'doux'; // Fallback ultime
    }

    /**
     * Obtient les statistiques de configuration
     * @returns {Object} Statistiques
     */
    getStats() {
        return {
            totalGuilds: Object.keys(this.cache.guilds).length,
            totalUsers: Object.keys(this.cache.users).length,
            availableLevels: this.defaultConfig.levels.length,
            lastUpdate: this.cache.lastUpdate
        };
    }

    /**
     * Obtient la configuration complète d'un serveur
     * @param {string} guildId - ID du serveur
     * @returns {Object} Configuration du serveur
     */
    getGuildConfig(guildId) {
        const guildConfig = this.cache.guilds[guildId] || {};
        
        return {
            guildId: guildId,
            defaultLevel: guildConfig.defaultLevel || this.defaultConfig.defaultLevel,
            lastUpdate: guildConfig.lastUpdate || null,
            userCount: Object.keys(this.cache.users).filter(key => key.startsWith(`${guildId}_`)).length
        };
    }

    /**
     * Supprime la configuration d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @param {string} guildId - ID du serveur
     * @returns {boolean} Succès de l'opération
     */
    removeUserConfig(userId, guildId) {
        const userKey = `${guildId}_${userId}`;
        
        if (this.cache.users[userKey]) {
            delete this.cache.users[userKey];
            return this.saveConfig();
        }
        
        return false;
    }

    /**
     * Supprime la configuration d'un serveur
     * @param {string} guildId - ID du serveur
     * @returns {boolean} Succès de l'opération
     */
    removeGuildConfig(guildId) {
        let modified = false;
        
        // Supprimer la config du serveur
        if (this.cache.guilds[guildId]) {
            delete this.cache.guilds[guildId];
            modified = true;
        }
        
        // Supprimer toutes les configs utilisateur de ce serveur
        const userKeys = Object.keys(this.cache.users).filter(key => key.startsWith(`${guildId}_`));
        for (const userKey of userKeys) {
            delete this.cache.users[userKey];
            modified = true;
        }
        
        return modified ? this.saveConfig() : true;
    }
}

// Export singleton
module.exports = new KinkLevelManager();