class ContentFilter {
    constructor() {
        // Mots interdits par niveau
        this.blacklists = {
            global: [
                // Mots toujours interdits sur Discord
                'child', 'minor', 'underage', 'kid', 'teen',
                'rape', 'non-consent', 'force', 'abuse',
                'illegal', 'drug', 'violence', 'harm'
            ],
            doux: [
                // Mots interdits pour le niveau doux
                'sex', 'fuck', 'dick', 'pussy', 'cock', 'cum',
                'orgasm', 'masturbat', 'porn', 'nude', 'naked'
            ],
            modéré: [
                // Mots interdits même pour le niveau modéré
                'extreme', 'blood', 'pain', 'torture', 'degradat'
            ]
            // Le niveau intense a moins de restrictions mais garde les blacklists globales
        };

        // Mots de remplacement pour adoucir le contenu
        this.replacements = {
            'sex': 'intimité',
            'fuck': 'faire l\'amour',
            'orgasm': 'plaisir intense',
            'masturbat': 'plaisir personnel',
            'nude': 'sans vêtements',
            'naked': 'nu(e)'
        };

        // Patterns regex pour détecter du contenu inapproprié
        this.patterns = {
            age: /\b(1[0-7]|[0-9])\s*(ans?|years?|old)\b/gi,
            explicit: /\b(hardcore|extreme|brutal|violent)\b/gi,
            illegal: /\b(drugs?|illegal|underage|minor)\b/gi
        };
    }

    /**
     * Vérifie si le contenu est approprié pour le niveau donné
     * @param {string} content - Le contenu à vérifier
     * @param {string} level - Le niveau (doux, modéré, intense)
     * @param {boolean} isNSFW - Si le canal est NSFW
     * @returns {Object} Résultat de la vérification
     */
    checkContent(content, level = 'doux', isNSFW = false) {
        if (!content || typeof content !== 'string') {
            return {
                isValid: false,
                reason: 'Contenu invalide',
                filteredContent: null
            };
        }

        const contentLower = content.toLowerCase();
        const issues = [];

        // Vérifications globales (toujours appliquées)
        for (const word of this.blacklists.global) {
            if (contentLower.includes(word.toLowerCase())) {
                issues.push(`Contenu inapproprié détecté: ${word}`);
            }
        }

        // Vérifications par patterns
        for (const [patternName, pattern] of Object.entries(this.patterns)) {
            if (pattern.test(content)) {
                issues.push(`Pattern inapproprié détecté: ${patternName}`);
            }
        }

        // Vérifications spécifiques au niveau
        if (level === 'doux') {
            for (const word of this.blacklists.doux) {
                if (contentLower.includes(word.toLowerCase())) {
                    issues.push(`Contenu trop explicite pour le niveau doux: ${word}`);
                }
            }
        }

        if (level === 'doux' || level === 'modéré') {
            for (const word of this.blacklists.modéré) {
                if (contentLower.includes(word.toLowerCase())) {
                    issues.push(`Contenu trop intense pour le niveau ${level}: ${word}`);
                }
            }
        }

        // Vérification NSFW pour niveau intense
        if (level === 'intense' && !isNSFW) {
            return {
                isValid: false,
                reason: 'Le niveau intense nécessite un canal NSFW',
                filteredContent: null,
                requiresNSFW: true
            };
        }

        // Si des problèmes sont détectés
        if (issues.length > 0) {
            return {
                isValid: false,
                reason: issues.join(', '),
                filteredContent: null,
                issues: issues
            };
        }

        // Contenu valide
        return {
            isValid: true,
            reason: 'Contenu approprié',
            filteredContent: content,
            level: level
        };
    }

    /**
     * Filtre et adoucit le contenu si possible
     * @param {string} content - Le contenu à filtrer
     * @param {string} targetLevel - Le niveau cible
     * @returns {Object} Contenu filtré
     */
    filterContent(content, targetLevel = 'doux') {
        if (!content || typeof content !== 'string') {
            return {
                success: false,
                filteredContent: null,
                reason: 'Contenu invalide'
            };
        }

        let filteredContent = content;

        // Appliquer les remplacements selon le niveau
        if (targetLevel === 'doux') {
            for (const [original, replacement] of Object.entries(this.replacements)) {
                const regex = new RegExp(`\\b${original}\\b`, 'gi');
                filteredContent = filteredContent.replace(regex, replacement);
            }
        }

        // Vérifier si le contenu filtré est maintenant acceptable
        const validation = this.checkContent(filteredContent, targetLevel);

        return {
            success: validation.isValid,
            filteredContent: validation.isValid ? filteredContent : null,
            originalContent: content,
            reason: validation.reason,
            level: targetLevel
        };
    }

    /**
     * Détermine le niveau minimum requis pour un contenu
     * @param {string} content - Le contenu à analyser
     * @returns {string} Niveau minimum requis
     */
    getMinimumLevel(content) {
        if (!content || typeof content !== 'string') {
            return 'doux';
        }

        const contentLower = content.toLowerCase();

        // Vérifier si le contenu nécessite le niveau intense
        const intenseKeywords = [
            'bdsm', 'kink', 'domination', 'submission', 'bondage',
            'fetish', 'kinky', 'dominant', 'submissive', 'master',
            'slave', 'toy', 'dungeon', 'scene', 'safe word'
        ];

        for (const keyword of intenseKeywords) {
            if (contentLower.includes(keyword)) {
                return 'intense';
            }
        }

        // Vérifier si le contenu nécessite le niveau modéré
        const moderateKeywords = [
            'sexy', 'sensuel', 'attirance', 'désir', 'fantasme',
            'séduction', 'charme', 'passion', 'romantique'
        ];

        for (const keyword of moderateKeywords) {
            if (contentLower.includes(keyword)) {
                return 'modéré';
            }
        }

        return 'doux';
    }

    /**
     * Vérifie si un utilisateur peut accéder à un niveau donné
     * @param {Object} interaction - L'interaction Discord
     * @param {string} level - Le niveau demandé
     * @returns {Object} Résultat de la vérification
     */
    checkUserPermissions(interaction, level) {
        const result = {
            hasPermission: false,
            reason: '',
            level: level
        };

        // Niveau doux : accessible à tous
        if (level === 'doux') {
            result.hasPermission = true;
            result.reason = 'Niveau accessible à tous';
            return result;
        }

        // Vérifier si le canal est NSFW pour les niveaux modéré et intense
        if ((level === 'modéré' || level === 'intense') && !interaction.channel.nsfw) {
            result.reason = `Le niveau ${level} nécessite un canal NSFW`;
            return result;
        }

        // Vérifier les rôles pour le niveau intense
        if (level === 'intense') {
            const member = interaction.member;
            const requiredRoles = ['adulte', 'verified', '18+', 'adult'];
            
            const hasRequiredRole = member.roles.cache.some(role => 
                requiredRoles.some(reqRole => 
                    role.name.toLowerCase().includes(reqRole.toLowerCase())
                )
            );

            if (!hasRequiredRole) {
                result.reason = 'Le niveau intense nécessite un rôle adulte vérifié';
                return result;
            }
        }

        result.hasPermission = true;
        result.reason = `Accès autorisé au niveau ${level}`;
        return result;
    }

    /**
     * Obtient les statistiques du filtre
     * @returns {Object} Statistiques
     */
    getStats() {
        return {
            blacklistSizes: {
                global: this.blacklists.global.length,
                doux: this.blacklists.doux.length,
                modéré: this.blacklists.modéré.length
            },
            replacements: Object.keys(this.replacements).length,
            patterns: Object.keys(this.patterns).length
        };
    }

    /**
     * Ajoute un mot à la blacklist
     * @param {string} word - Le mot à ajouter
     * @param {string} level - Le niveau de blacklist
     * @returns {boolean} Succès de l'ajout
     */
    addToBlacklist(word, level = 'global') {
        if (!word || typeof word !== 'string') {
            return false;
        }

        if (!this.blacklists[level]) {
            return false;
        }

        const wordLower = word.toLowerCase();
        if (!this.blacklists[level].includes(wordLower)) {
            this.blacklists[level].push(wordLower);
            return true;
        }

        return false; // Mot déjà présent
    }

    /**
     * Supprime un mot de la blacklist
     * @param {string} word - Le mot à supprimer
     * @param {string} level - Le niveau de blacklist
     * @returns {boolean} Succès de la suppression
     */
    removeFromBlacklist(word, level = 'global') {
        if (!word || typeof word !== 'string') {
            return false;
        }

        if (!this.blacklists[level]) {
            return false;
        }

        const wordLower = word.toLowerCase();
        const index = this.blacklists[level].indexOf(wordLower);
        
        if (index > -1) {
            this.blacklists[level].splice(index, 1);
            return true;
        }

        return false; // Mot non trouvé
    }
}

// Export singleton
module.exports = new ContentFilter();