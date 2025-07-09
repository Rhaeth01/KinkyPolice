const { ChannelType } = require('discord.js');

/**
 * @file commands/config/utils/configRefreshManager.js
 * @description Gestionnaire pour le rafraîchissement automatique des menus de configuration
 * et la validation des champs configurés
 */

class ConfigRefreshManager {
    
    /**
     * Valide et nettoie les champs configurés d'une catégorie
     * @param {Object} config - Configuration actuelle
     * @param {string} category - Catégorie à valider
     * @param {import('discord.js').Guild} guild - Serveur Discord
     * @returns {Object} Configuration validée et nettoyée
     */
    static async validateAndCleanCategory(config, category, guild) {
        const cleanedConfig = JSON.parse(JSON.stringify(config));
        
        switch (category) {
            case 'general':
                return await this.validateGeneralConfig(cleanedConfig, guild);
            case 'entry':
                return await this.validateEntryConfig(cleanedConfig, guild);
            case 'logging':
                return await this.validateLoggingConfig(cleanedConfig, guild);
            case 'economy':
                return await this.validateEconomyConfig(cleanedConfig, guild);
            case 'games':
                return await this.validateGamesConfig(cleanedConfig, guild);
            case 'tickets':
                return await this.validateTicketsConfig(cleanedConfig, guild);
            case 'confession':
                return await this.validateConfessionConfig(cleanedConfig, guild);
            default:
                return cleanedConfig;
        }
    }
    
    /**
     * Valide la configuration générale
     * @param {Object} config - Configuration
     * @param {import('discord.js').Guild} guild - Serveur Discord
     * @returns {Object} Configuration validée
     */
    static async validateGeneralConfig(config, guild) {
        if (!config.general) return config;
        
        // Valider les rôles admin et mod
        if (config.general.adminRole) {
            const adminRole = await guild.roles.fetch(config.general.adminRole).catch(() => null);
            if (!adminRole) {
                console.log(`[CONFIG] Rôle admin ${config.general.adminRole} introuvable, suppression`);
                delete config.general.adminRole;
            }
        }
        
        if (config.general.modRole) {
            const modRole = await guild.roles.fetch(config.general.modRole).catch(() => null);
            if (!modRole) {
                console.log(`[CONFIG] Rôle mod ${config.general.modRole} introuvable, suppression`);
                delete config.general.modRole;
            }
        }
        
        return config;
    }
    
    /**
     * Valide la configuration d'entrée
     * @param {Object} config - Configuration
     * @param {import('discord.js').Guild} guild - Serveur Discord
     * @returns {Object} Configuration validée
     */
    static async validateEntryConfig(config, guild) {
        if (!config.entry) return config;
        
        // Valider les canaux
        const channelFields = ['welcomeChannel', 'rulesChannel', 'entryRequestChannelId'];
        for (const field of channelFields) {
            if (config.entry[field]) {
                const channel = await guild.channels.fetch(config.entry[field]).catch(() => null);
                if (!channel || channel.type !== ChannelType.GuildText) {
                    console.log(`[CONFIG] Canal ${field} ${config.entry[field]} introuvable, suppression`);
                    delete config.entry[field];
                }
            }
        }
        
        // Valider le rôle de vérification
        if (config.entry.verificationRole) {
            const verificationRole = await guild.roles.fetch(config.entry.verificationRole).catch(() => null);
            if (!verificationRole) {
                console.log(`[CONFIG] Rôle de vérification ${config.entry.verificationRole} introuvable, suppression`);
                delete config.entry.verificationRole;
            }
        }
        
        return config;
    }
    
    /**
     * Valide la configuration de logging
     * @param {Object} config - Configuration
     * @param {import('discord.js').Guild} guild - Serveur Discord
     * @returns {Object} Configuration validée
     */
    static async validateLoggingConfig(config, guild) {
        if (!config.logging) return config;
        
        const logTypes = ['modLogs', 'messageLogs', 'voiceLogs', 'memberLogs', 'roleLogs', 'ticketLogs'];
        for (const logType of logTypes) {
            if (config.logging[logType]?.channelId) {
                const channel = await guild.channels.fetch(config.logging[logType].channelId).catch(() => null);
                if (!channel || channel.type !== ChannelType.GuildText) {
                    console.log(`[CONFIG] Canal de logs ${logType} ${config.logging[logType].channelId} introuvable, désactivation`);
                    config.logging[logType].enabled = false;
                    delete config.logging[logType].channelId;
                    delete config.logging[logType].webhookUrl;
                }
            }
        }
        
        return config;
    }
    
    /**
     * Valide la configuration d'économie
     * @param {Object} config - Configuration
     * @param {import('discord.js').Guild} guild - Serveur Discord
     * @returns {Object} Configuration validée
     */
    static async validateEconomyConfig(config, guild) {
        if (!config.economy) return config;
        
        // Valider les rôles interdits pour les jeux
        if (config.economy.games?.forbiddenRoleIds) {
            const validRoles = [];
            for (const roleId of config.economy.games.forbiddenRoleIds) {
                const role = await guild.roles.fetch(roleId).catch(() => null);
                if (role) {
                    validRoles.push(roleId);
                } else {
                    console.log(`[CONFIG] Rôle interdit ${roleId} introuvable, suppression`);
                }
            }
            config.economy.games.forbiddenRoleIds = validRoles;
        }
        
        return config;
    }
    
    /**
     * Valide la configuration des jeux
     * @param {Object} config - Configuration
     * @param {import('discord.js').Guild} guild - Serveur Discord
     * @returns {Object} Configuration validée
     */
    static async validateGamesConfig(config, guild) {
        if (!config.games) return config;
        
        // Valider le canal des jeux
        if (config.games.gameChannel) {
            const gameChannel = await guild.channels.fetch(config.games.gameChannel).catch(() => null);
            if (!gameChannel || gameChannel.type !== ChannelType.GuildText) {
                console.log(`[CONFIG] Canal des jeux ${config.games.gameChannel} introuvable, suppression`);
                delete config.games.gameChannel;
            }
        }
        
        // Valider le canal du leaderboard
        if (config.games.gameLeaderboard) {
            const leaderboardChannel = await guild.channels.fetch(config.games.gameLeaderboard).catch(() => null);
            if (!leaderboardChannel || leaderboardChannel.type !== ChannelType.GuildText) {
                console.log(`[CONFIG] Canal du leaderboard ${config.games.gameLeaderboard} introuvable, suppression`);
                delete config.games.gameLeaderboard;
            }
        }
        
        return config;
    }
    
    /**
     * Valide la configuration des tickets
     * @param {Object} config - Configuration
     * @param {import('discord.js').Guild} guild - Serveur Discord
     * @returns {Object} Configuration validée
     */
    static async validateTicketsConfig(config, guild) {
        if (!config.tickets) return config;
        
        // Valider la catégorie des tickets
        if (config.tickets.ticketCategory) {
            const category = await guild.channels.fetch(config.tickets.ticketCategory).catch(() => null);
            if (!category || category.type !== ChannelType.GuildCategory) {
                console.log(`[CONFIG] Catégorie des tickets ${config.tickets.ticketCategory} introuvable, suppression`);
                delete config.tickets.ticketCategory;
            }
        }
        
        // Valider le canal des logs
        if (config.tickets.ticketLogs) {
            const logsChannel = await guild.channels.fetch(config.tickets.ticketLogs).catch(() => null);
            if (!logsChannel || logsChannel.type !== ChannelType.GuildText) {
                console.log(`[CONFIG] Canal des logs de tickets ${config.tickets.ticketLogs} introuvable, suppression`);
                delete config.tickets.ticketLogs;
            }
        }
        
        // Valider le rôle de support
        if (config.tickets.supportRole) {
            const supportRole = await guild.roles.fetch(config.tickets.supportRole).catch(() => null);
            if (!supportRole) {
                console.log(`[CONFIG] Rôle de support ${config.tickets.supportRole} introuvable, suppression`);
                delete config.tickets.supportRole;
            }
        }
        
        return config;
    }
    
    /**
     * Valide la configuration des confessions
     * @param {Object} config - Configuration
     * @param {import('discord.js').Guild} guild - Serveur Discord
     * @returns {Object} Configuration validée
     */
    static async validateConfessionConfig(config, guild) {
        if (!config.confession) return config;
        
        // Valider le canal des confessions
        if (config.confession.confessionChannel) {
            const confessionChannel = await guild.channels.fetch(config.confession.confessionChannel).catch(() => null);
            if (!confessionChannel || confessionChannel.type !== ChannelType.GuildText) {
                console.log(`[CONFIG] Canal des confessions ${config.confession.confessionChannel} introuvable, suppression`);
                delete config.confession.confessionChannel;
            }
        }
        
        // Valider le canal des logs
        if (config.confession.logsChannel) {
            const logsChannel = await guild.channels.fetch(config.confession.logsChannel).catch(() => null);
            if (!logsChannel || logsChannel.type !== ChannelType.GuildText) {
                console.log(`[CONFIG] Canal des logs de confessions ${config.confession.logsChannel} introuvable, suppression`);
                delete config.confession.logsChannel;
                config.confession.logsEnabled = false;
            }
        }
        
        return config;
    }
    
    /**
     * Détermine si une catégorie nécessite un rafraîchissement
     * @param {string} category - Catégorie à vérifier
     * @param {Object} changes - Changements effectués
     * @returns {boolean} True si un rafraîchissement est nécessaire
     */
    static shouldRefreshCategory(category, changes) {
        const categoryPaths = {
            'general': ['general'],
            'entry': ['entry', 'entryModal'],
            'logging': ['logging'],
            'economy': ['economy'],
            'games': ['games', 'economy.games'],
            'tickets': ['tickets'],
            'confession': ['confession']
        };
        
        const paths = categoryPaths[category] || [];
        return paths.some(path => this.hasChangesInPath(changes, path));
    }
    
    /**
     * Vérifie si des changements existent dans un chemin spécifique
     * @param {Object} changes - Changements
     * @param {string} path - Chemin à vérifier
     * @returns {boolean} True si des changements existent
     */
    static hasChangesInPath(changes, path) {
        const parts = path.split('.');
        let current = changes;
        
        for (const part of parts) {
            if (current && typeof current === 'object' && current[part] !== undefined) {
                current = current[part];
            } else {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Crée un résumé des changements pour l'utilisateur
     * @param {Object} changes - Changements effectués
     * @param {string} category - Catégorie concernée
     * @returns {string} Résumé des changements
     */
    static createChangesSummary(changes, category) {
        const summaries = [];
        
        if (changes.general) {
            if (changes.general.prefix) summaries.push(`Préfixe: ${changes.general.prefix}`);
            if (changes.general.adminRole) summaries.push('Rôle admin configuré');
            if (changes.general.modRole) summaries.push('Rôle mod configuré');
        }
        
        if (changes.entry) {
            if (changes.entry.welcomeChannel) summaries.push('Canal d\'accueil configuré');
            if (changes.entry.rulesChannel) summaries.push('Canal des règles configuré');
            if (changes.entry.entryRequestChannelId) summaries.push('Canal des demandes configuré');
            if (changes.entry.verificationRole) summaries.push('Rôle de vérification configuré');
        }
        
        if (changes.confession) {
            if (changes.confession.confessionChannel) summaries.push('Canal des confessions configuré');
            if (changes.confession.logsChannel) summaries.push('Canal des logs configuré');
            if (changes.confession.logsEnabled !== undefined) {
                summaries.push(`Logs des confessions ${changes.confession.logsEnabled ? 'activés' : 'désactivés'}`);
            }
        }
        
        if (changes.games) {
            if (changes.games.quiz?.enabled !== undefined) {
                summaries.push(`Quiz quotidien ${changes.games.quiz.enabled ? 'activé' : 'désactivé'}`);
            }
        }
        
        if (changes.economy?.games?.forbiddenRoleIds) {
            summaries.push(`${changes.economy.games.forbiddenRoleIds.length} rôles d'animation configurés`);
        }
        
        return summaries.length > 0 ? summaries.join(', ') : 'Configuration mise à jour';
    }
}

module.exports = ConfigRefreshManager;
