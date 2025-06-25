const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType } = require('discord.js');
const configManager = require('../../utils/configManager');

/**
 * @file commands/config/configInteractionHandler.js
 * @description Gestionnaire central pour toutes les interactions liées à la configuration
 * Utilise des menus déroulants pour les sélections (salons/rôles) et des modals pour l'édition de texte
 */

class ConfigInteractionHandler {
    constructor() {
        this.activeSessions = new Map(); // userId -> session data
        this.sessionTimeout = 5 * 60 * 1000; // 5 minutes
        this.sessionLocks = new Map(); // userId -> lock timestamp for preventing race conditions
        
        // Nettoyage automatique des sessions orphelines toutes les 2 minutes
        setInterval(() => {
            this.cleanupOrphanedSessions();
        }, 2 * 60 * 1000);
        
        // Gestionnaire de sessions initialisé avec nettoyage automatique
    }

    /**
     * Démarre une nouvelle session de configuration
     * @param {import('discord.js').User} user - L'utilisateur qui démarre la session
     * @param {import('discord.js').Interaction} interaction - L'interaction initiale
     */
    startSession(user, interaction) {
        // Check for existing session
        if (this.activeSessions.has(user.id)) {
            return false; // Session déjà active
        }

        const now = Date.now();
        
        // Réduire drastiquement le verrou de session (200ms au lieu de 1000ms)
        const existingLock = this.sessionLocks.get(user.id);
        if (existingLock && (now - existingLock) < 200) {
            return false;
        }

        // Set session lock with shorter duration
        this.sessionLocks.set(user.id, now);

        const sessionData = {
            userId: user.id,
            guildId: interaction.guild.id,
            currentCategory: 'main',
            breadcrumb: ['Configuration'],
            startTime: Date.now(),
            lastActivity: Date.now(),
            lockTimestamp: now
        };

        this.activeSessions.set(user.id, sessionData);

        // Auto-nettoyage de la session après timeout
        setTimeout(() => {
            if (this.activeSessions.has(user.id)) {
                this.endSession(user.id);
            }
        }, this.sessionTimeout);

        // Clean up session lock after 1 second (au lieu de 5)
        setTimeout(() => {
            this.sessionLocks.delete(user.id);
        }, 1000);

        return true;
    }

    /**
     * Termine une session de configuration
     * @param {string} userId - L'ID de l'utilisateur
     */
    endSession(userId) {
        this.activeSessions.delete(userId);
        this.sessionLocks.delete(userId); // Clean up any remaining locks
    }

    /**
     * Nettoie les sessions orphelines (plus anciennes que le timeout)
     */
    cleanupOrphanedSessions() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [userId, session] of this.activeSessions.entries()) {
            if (now - session.lastActivity > this.sessionTimeout) {
                this.endSession(userId);
                cleanedCount++;
            }
        }

        // Nettoyer aussi les verrous anciens
        for (const [userId, lockTime] of this.sessionLocks.entries()) {
            if (now - lockTime > 30000) { // 30 secondes max pour un verrou
                this.sessionLocks.delete(userId);
                cleanedCount++;
            }
        }
        
        return cleanedCount;
    }

    /**
     * Obtient des statistiques sur les sessions actives
     */
    getSessionStats() {
        const now = Date.now();
        const stats = {
            totalSessions: this.activeSessions.size,
            totalLocks: this.sessionLocks.size,
            sessions: []
        };
        
        for (const [userId, session] of this.activeSessions.entries()) {
            stats.sessions.push({
                userId,
                category: session.currentCategory,
                duration: now - session.startTime,
                lastActivity: now - session.lastActivity
            });
        }
        
        return stats;
    }

    /**
     * Obtient les données de session d'un utilisateur
     * @param {string} userId - L'ID de l'utilisateur
     * @returns {Object|null} Les données de session ou null
     */
    getSession(userId) {
        const session = this.activeSessions.get(userId);
        if (session) {
            session.lastActivity = Date.now();
        }
        return session;
    }

    /**
     * Met à jour la navigation dans une session
     * @param {string} userId - L'ID de l'utilisateur
     * @param {string} category - La nouvelle catégorie
     * @param {string} breadcrumbItem - L'élément à ajouter au breadcrumb
     */
    updateNavigation(userId, category, breadcrumbItem) {
        const session = this.getSession(userId);
        if (!session) return false;

        session.currentCategory = category;
        if (breadcrumbItem && !session.breadcrumb.includes(breadcrumbItem)) {
            session.breadcrumb.push(breadcrumbItem);
        }
        return true;
    }

    /**
     * Retourne à la catégorie précédente
     * @param {string} userId - L'ID de l'utilisateur
     */
    navigateBack(userId) {
        const session = this.getSession(userId);
        if (!session) return false;

        if (session.breadcrumb.length > 1) {
            session.breadcrumb.pop();
            const previousCategory = this.getCategoryFromBreadcrumb(session.breadcrumb);
            session.currentCategory = previousCategory;
        } else {
            session.currentCategory = 'main';
        }
        return true;
    }

    /**
     * Détermine la catégorie basée sur le breadcrumb
     * @param {Array} breadcrumb - Le chemin de navigation
     * @returns {string} La catégorie correspondante
     */
    getCategoryFromBreadcrumb(breadcrumb) {
        const categoryMap = {
            'Général': 'general',
            'Entrée': 'entry',
            'Logs': 'logging',
            'Accueil': 'welcome',
            'Économie': 'economy',
            'Niveaux': 'levels',
            'Tickets': 'tickets',
            'Jeux': 'games',
            'Modmail': 'modmail',
            'Confession': 'confession'
        };

        const lastItem = breadcrumb[breadcrumb.length - 1];
        return categoryMap[lastItem] || 'main';
    }

    /**
     * Sauvegarde immédiatement les changements
     * @param {string} userId - L'ID de l'utilisateur
     * @param {Object} changes - Les changements à sauvegarder
     * @returns {Promise<boolean>} Succès de la sauvegarde
     */
    async saveChanges(userId, changes) {
        const session = this.getSession(userId);
        if (!session) return false;

        // Filtrer les valeurs null/undefined pour éviter les clés nulles
        const cleanedChanges = this.removeNullValues(changes);
        if (Object.keys(cleanedChanges).length === 0) {
            return false;
        }

        try {
            await configManager.updateConfig(cleanedChanges);
            return true;
        } catch (error) {
            console.error('[CONFIG HANDLER] Erreur lors de la sauvegarde:', error);
            return false;
        }
    }

    /**
     * Alias pour la compatibilité - Sauvegarde immédiatement
     * @param {string} userId - L'ID de l'utilisateur
     * @param {Object} changes - Les changements à sauvegarder
     * @returns {Promise<boolean>} Succès de la sauvegarde
     */
    async addPendingChanges(userId, changes) {
        return this.saveChanges(userId, changes);
    }

    /**
     * Sauvegarde et rafraîchit automatiquement la vue actuelle
     * @param {string} userId - L'ID de l'utilisateur
     * @param {Object} changes - Les changements à sauvegarder
     * @param {import('discord.js').Interaction} interaction - L'interaction pour rafraîchir la vue
     * @returns {Promise<boolean>} Succès de la sauvegarde
     */
    async saveAndRefresh(userId, changes, interaction) {
        const success = await this.saveChanges(userId, changes);
        if (success && interaction) {
            await this.refreshCurrentView(userId, interaction);
        }
        return success;
    }

    /**
     * Rafraîchit la vue actuelle de l'utilisateur
     * @param {string} userId - L'ID de l'utilisateur
     * @param {import('discord.js').Interaction} interaction - L'interaction pour la mise à jour
     */
    async refreshCurrentView(userId, interaction) {
        const session = this.getSession(userId);
        if (!session) return;

        const config = this.getCurrentConfigWithPending(userId);
        
        if (session.currentCategory === 'main') {
            // Vue principale
            const embed = this.createMainConfigEmbed(userId, interaction.guild);
            const categoryButtons = this.createCategoryButtons(userId, config);
            const controlButtons = this.createControlButtons(userId);

            await interaction.update({
                embeds: [embed],
                components: [...categoryButtons, controlButtons]
            });
        } else {
            // Vue de catégorie spécifique
            await this.refreshCategoryView(userId, session.currentCategory, interaction);
        }
    }

    /**
     * Rafraîchit la vue d'une catégorie spécifique
     * @param {string} userId - L'ID de l'utilisateur
     * @param {string} category - La catégorie à rafraîchir
     * @param {import('discord.js').Interaction} interaction - L'interaction
     */
    async refreshCategoryView(userId, category, interaction) {
        const config = this.getCurrentConfigWithPending(userId);
        let embed, components;

        try {
            switch (category) {
                case 'general':
                    const GeneralMenu = require('./menus/generalMenu');
                    embed = GeneralMenu.createEmbed(config, interaction.guild);
                    components = [
                        ...GeneralMenu.createComponents(),
                        this.createControlButtons(userId, true)
                    ];
                    break;

                case 'games':
                    const GamesMenu = require('./menus/gamesMenu');
                    const gamesContent = await GamesMenu.show(interaction);
                    await interaction.update(gamesContent);
                    return;

                // Ajouter d'autres catégories au besoin
                default:
                    return;
            }

            await interaction.update({
                embeds: [embed],
                components: components
            });
        } catch (error) {
            console.error(`[CONFIG] Erreur lors du rafraîchissement de la vue ${category}:`, error);
        }
    }

    /**
     * @deprecated Utilisez saveChanges à la place
     */
    async savePendingChanges(userId) {
        return true; // Plus de pending changes
    }

    /**
     * @deprecated Plus nécessaire avec la sauvegarde immédiate
     */
    cancelPendingChanges(userId) {
        return true;
    }

    /**
     * @deprecated Plus de changements en attente avec la sauvegarde immédiate
     */
    hasPendingChanges(userId) {
        return false;
    }

    /**
     * Fusion profonde d'objets
     * @param {Object} target - L'objet cible
     * @param {Object} source - L'objet source
     * @returns {Object} L'objet fusionné
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    /**
     * Crée l'embed principal de configuration moderne
     * @param {string} userId - L'ID de l'utilisateur
     * @param {import('discord.js').Guild} guild - Le serveur Discord
     * @returns {import('discord.js').EmbedBuilder} L'embed de configuration
     */
    createMainConfigEmbed(userId, guild) {
        const session = this.getSession(userId);
        const config = this.getCurrentConfigWithPending(userId);
        
        // Calculer la progression globale
        const categories = ['general', 'entry', 'logging', 'economy', 'games', 'tickets', 'levels', 'modmail', 'confession'];
        let totalConfigured = 0;
        let totalPossible = 0;
        
        categories.forEach(cat => {
            const status = this.evaluateCategoryStatus(config, cat);
            const [configured, total] = status.progress.split('/').map(Number);
            totalConfigured += configured;
            totalPossible += total;
        });
        
        const globalProgress = Math.round((totalConfigured / totalPossible) * 100);
        const progressBar = this.createProgressBar(globalProgress);
        
        const embed = new EmbedBuilder()
            .setTitle('🛠️ Configuration du Bot')
            .setDescription(
                `**Bienvenue dans le panneau de configuration !**\n` +
                `Gérez facilement tous les paramètres de votre serveur.\n\n` +
                `**Progression globale :** ${globalProgress}% ${progressBar}\n` +
                `**Serveur :** ${guild.name}\n\n` +
                `*Cliquez sur les boutons ci-dessous pour configurer chaque module.*`
            )
            .setColor(globalProgress === 100 ? 0x4ECDC4 : globalProgress > 50 ? 0xFFE66D : 0xFF6B6B)
            .setThumbnail(guild.iconURL() || null)
            .setTimestamp();

        // Plus de changements en attente avec la sauvegarde immédiate

        if (session) {
            embed.setFooter({ 
                text: `${session.breadcrumb.join(' › ')} | ${guild.memberCount} membres`,
                iconURL: guild.iconURL()
            });
        }

        return embed;
    }

    /**
     * Crée les boutons de catégories modernes
     * @param {string} userId - L'ID de l'utilisateur
     * @param {Object} config - Configuration actuelle
     * @returns {Array<import('discord.js').ActionRowBuilder>} Les lignes de boutons
     */
    createCategoryButtons(userId, config) {
        const categories = [
            { id: 'general', emoji: '⚙️', label: 'Général' },
            { id: 'entry', emoji: '🚪', label: 'Entrée' },
            { id: 'logging', emoji: '📝', label: 'Logs' },
            { id: 'economy', emoji: '💰', label: 'Économie' },
            { id: 'games', emoji: '🎮', label: 'Jeux' },
            { id: 'tickets', emoji: '🎫', label: 'Tickets' },
            { id: 'levels', emoji: '📊', label: 'Niveaux' },
            { id: 'modmail', emoji: '📧', label: 'Modmail' },
            { id: 'confession', emoji: '💭', label: 'Confession' }
        ];

        const rows = [];
        
        // Première ligne : 3 boutons
        const row1 = new ActionRowBuilder();
        categories.slice(0, 3).forEach(cat => {
            const status = this.evaluateCategoryStatus(config, cat.id);
            row1.addComponents(
                new ButtonBuilder()
                    .setCustomId(`config_category_${cat.id}`)
                    .setLabel(`${status.icon} ${cat.label}`)
                    .setEmoji(cat.emoji)
                    .setStyle(this.getButtonStyle(status.status))
            );
        });
        rows.push(row1);

        // Deuxième ligne : 3 boutons
        const row2 = new ActionRowBuilder();
        categories.slice(3, 6).forEach(cat => {
            const status = this.evaluateCategoryStatus(config, cat.id);
            row2.addComponents(
                new ButtonBuilder()
                    .setCustomId(`config_category_${cat.id}`)
                    .setLabel(`${status.icon} ${cat.label}`)
                    .setEmoji(cat.emoji)
                    .setStyle(this.getButtonStyle(status.status))
            );
        });
        rows.push(row2);

        // Troisième ligne : 3 boutons
        const row3 = new ActionRowBuilder();
        categories.slice(6, 9).forEach(cat => {
            const status = this.evaluateCategoryStatus(config, cat.id);
            row3.addComponents(
                new ButtonBuilder()
                    .setCustomId(`config_category_${cat.id}`)
                    .setLabel(`${status.icon} ${cat.label}`)
                    .setEmoji(cat.emoji)
                    .setStyle(this.getButtonStyle(status.status))
            );
        });
        rows.push(row3);

        return rows;
    }

    /**
     * Crée un menu de sélection de salons
     * @param {string} customId - L'ID personnalisé du menu
     * @param {string} placeholder - Le texte d'aide
     * @param {Array} channelTypes - Types de salons acceptés
     * @returns {import('discord.js').ActionRowBuilder} Le menu de sélection
     */
    createChannelSelectMenu(customId, placeholder, channelTypes = [ChannelType.GuildText]) {
        const selectMenu = new ChannelSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .setChannelTypes(channelTypes)
            .setMaxValues(1);

        return new ActionRowBuilder().addComponents(selectMenu);
    }

    /**
     * Crée un menu de sélection de rôles
     * @param {string} customId - L'ID personnalisé du menu
     * @param {string} placeholder - Le texte d'aide
     * @returns {import('discord.js').ActionRowBuilder} Le menu de sélection
     */
    createRoleSelectMenu(customId, placeholder) {
        const selectMenu = new RoleSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .setMaxValues(1);

        return new ActionRowBuilder().addComponents(selectMenu);
    }

    /**
     * Crée un bouton de toggle pour les booléens
     * @param {string} customId - L'ID personnalisé
     * @param {string} label - Le libellé du bouton
     * @param {boolean} isEnabled - L'état actuel
     * @returns {import('discord.js').ButtonBuilder} Le bouton de toggle
     */
    createToggleButton(customId, label, isEnabled) {
        return new ButtonBuilder()
            .setCustomId(customId)
            .setLabel(`${label}: ${isEnabled ? '✅ Activé' : '❌ Désactivé'}`)
            .setStyle(isEnabled ? ButtonStyle.Success : ButtonStyle.Danger);
    }

    /**
     * Crée les boutons de contrôle modernes
     * @param {string} userId - L'ID de l'utilisateur
     * @param {boolean} showBackButton - Afficher le bouton retour
     * @param {string} currentCategory - Catégorie actuelle pour les raccourcis
     * @returns {import('discord.js').ActionRowBuilder} Les boutons de contrôle
     */
    createControlButtons(userId, showBackButton = false, currentCategory = null) {
        const buttons = [];

        // Bouton retour avec navigation intelligente
        if (showBackButton) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('config_back')
                    .setLabel('Retour')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        // Bouton accueil rapide
        if (currentCategory) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('config_home')
                    .setLabel('Accueil')
                    .setEmoji('🏠')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        // Plus de boutons Sauvegarder/Annuler avec la sauvegarde immédiate

        // Bouton aide et fermeture
        if (!showBackButton) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('config_help')
                    .setLabel('Aide')
                    .setEmoji('❓')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        buttons.push(
            new ButtonBuilder()
                .setCustomId('config_close')
                .setLabel('Fermer')
                .setEmoji('✖️')
                .setStyle(ButtonStyle.Secondary)
        );

        return new ActionRowBuilder().addComponents(buttons);
    }

    /**
     * Obtient la configuration actuelle
     * @param {string} userId - L'ID de l'utilisateur (pour compatibilité)
     * @returns {Object} La configuration actuelle
     */
    getCurrentConfigWithPending(userId) {
        return configManager.getConfig();
    }

    /**
     * Crée un menu de gestion pour les listes (excludedChannels, excludedRoles, etc.)
     * @param {string} customId - L'ID personnalisé
     * @param {Array} currentItems - Les éléments actuels de la liste
     * @param {string} type - Type d'éléments ('channels' ou 'roles')
     * @returns {Object} Embed et composants pour la gestion de liste
     */
    createListManagementComponents(customId, currentItems, type) {
        const embed = new EmbedBuilder()
            .setTitle(`Gestion de la liste`)
            .setColor(0x5865F2);

        if (currentItems.length > 0) {
            const itemList = currentItems.map(item => 
                type === 'channels' ? `<#${item}>` : `<@&${item}>`
            ).join('\n');
            embed.addFields([{ name: 'Éléments actuels', value: itemList }]);
        } else {
            embed.setDescription('Aucun élément dans la liste');
        }

        const actionRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId(`${customId}_add`)
                .setLabel(`Ajouter ${type === 'channels' ? 'un salon' : 'un rôle'}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji(type === 'channels' ? '📝' : '👤'),
            new ButtonBuilder()
                .setCustomId(`${customId}_remove`)
                .setLabel('Supprimer')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️')
                .setDisabled(currentItems.length === 0)
        ]);

        return { embed, components: [actionRow] };
    }

    /**
     * Supprime récursivement les valeurs null et undefined d'un objet
     * @param {Object} obj - L'objet à nettoyer
     * @returns {Object} L'objet nettoyé
     */
    removeNullValues(obj) {
        if (obj === null || obj === undefined) {
            return {};
        }

        if (typeof obj !== 'object' || Array.isArray(obj)) {
            return obj;
        }

        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value === null || value === undefined) {
                continue; // Ignorer les valeurs null/undefined
            }
            
            if (typeof value === 'object' && !Array.isArray(value)) {
                const cleanedValue = this.removeNullValues(value);
                if (Object.keys(cleanedValue).length > 0) {
                    cleaned[key] = cleanedValue;
                }
            } else {
                cleaned[key] = value;
            }
        }
        
        return cleaned;
    }

    /**
     * Évalue le statut de configuration d'une catégorie
     * @param {Object} config - Configuration actuelle
     * @param {string} category - Catégorie à évaluer
     * @returns {Object} Statut avec icône, couleur et progression
     */
    evaluateCategoryStatus(config, category) {
        let configured = 0;
        let total = 0;
        let status = 'incomplete';
        let color = 0xFF6B6B; // Rouge par défaut

        switch (category) {
            case 'general':
                total = 3;
                if (config.general?.prefix) configured++;
                if (config.general?.adminRole) configured++;
                if (config.general?.modRole) configured++;
                break;
            
            case 'entry':
                total = 6; // Ajout de rulesChannel et entryModal
                if (config.entry?.welcomeChannel) configured++;
                if (config.entry?.rulesChannel) configured++;
                if (config.entry?.entryRequestChannelId) configured++;
                if (config.entry?.verificationRole) configured++;
                if (config.tickets?.acceptedEntryCategoryId) configured++; // Catégorie d'acceptation
                if (config.entryModal?.title && config.entryModal?.fields?.length > 0) configured++; // Formulaire d'entrée
                break;
            
            case 'logging':
                total = 9; // Tous les canaux de logs principaux + role logs
                if (config.logging?.modLogs) configured++;
                if (config.logging?.messageLogs) configured++;
                if (config.logging?.voiceLogs) configured++;
                if (config.logging?.memberLogs) configured++;
                if (config.logging?.roleLogChannelId) configured++;
                // Webhooks optionnels (comptent pour la complétude avancée)
                if (config.logging?.moderationWebhookUrl) configured++;
                if (config.logging?.messagesWebhookUrl) configured++;
                if (config.logging?.voiceWebhookUrl) configured++;
                if (config.logging?.memberWebhookUrl) configured++;
                break;
            
            case 'economy':
                total = 7; // Système économie complet
                if (config.economy?.enabled) configured++;
                if (config.economy?.voiceActivity?.enabled) configured++;
                if (config.economy?.messageActivity?.enabled) configured++;
                if (config.economy?.dailyQuiz?.enabled) configured++;
                if (config.economy?.games?.enabled) configured++;
                if (config.economy?.quests?.enabled) configured++;
                // Vérifier si les récompenses sont configurées
                if (config.economy?.games?.baseRewards && Object.keys(config.economy.games.baseRewards).length > 0) configured++;
                break;
            
            case 'games':
                total = 4; // Ajout du gameLeaderboard
                if (config.economy?.games?.forbiddenRoleIds?.length > 0) configured++;
                if (config.games?.quiz?.enabled) configured++;
                if (config.games?.gameChannel) configured++; // Salon pour le quiz
                if (config.games?.gameLeaderboard) configured++; // Salon pour le leaderboard
                break;
            
            case 'tickets':
                total = 4; // Ajout des logs de tickets et modmail
                if (config.tickets?.ticketCategory) configured++;
                if (config.tickets?.supportRole) configured++;
                if (config.tickets?.ticketLogs) configured++;
                if (config.logging?.ticketsWebhookUrl) configured++; // Webhook des tickets
                break;

            case 'levels':
                total = 3;
                if (config.levels?.enabled) configured++;
                if (config.levels?.levelUpChannel) configured++;
                // Vérifier si les récompenses sont configurées
                if (config.levels?.rewards?.coins && Object.keys(config.levels.rewards.coins).length > 0) configured++;
                break;

            case 'modmail':
                total = 3; // Ajout des logs modmail
                if (config.modmail?.modmailCategory) configured++;
                if (config.modmail?.modmailLogs) configured++;
                // Utilise le rôle support des tickets comme staff role
                if (config.tickets?.supportRole) configured++;
                break;

            case 'confession':
                total = 1;
                if (config.confession?.confessionChannel) configured++;
                break;
        }

        const percentage = total > 0 ? (configured / total) * 100 : 0;
        
        if (percentage === 100) {
            status = 'complete';
            color = 0x4ECDC4; // Vert
        } else if (percentage > 0) {
            status = 'partial';
            color = 0xFFE66D; // Jaune
        }

        const statusIcons = {
            complete: '🟢',
            partial: '🟡', 
            incomplete: '🔴'
        };

        return {
            icon: statusIcons[status],
            status,
            color,
            progress: `${configured}/${total}`,
            percentage: Math.round(percentage)
        };
    }

    /**
     * Crée une barre de progression visuelle
     * @param {number} percentage - Pourcentage de progression
     * @returns {string} Barre de progression
     */
    createProgressBar(percentage) {
        const filled = Math.round(percentage / 10);
        const empty = 10 - filled;
        return '▰'.repeat(filled) + '▱'.repeat(empty);
    }

    /**
     * Détermine le style de bouton selon le statut
     * @param {string} status - Statut de la catégorie
     * @returns {import('discord.js').ButtonStyle} Style du bouton
     */
    getButtonStyle(status) {
        switch (status) {
            case 'complete': return ButtonStyle.Success;
            case 'partial': return ButtonStyle.Primary;
            case 'incomplete': return ButtonStyle.Secondary;
            default: return ButtonStyle.Secondary;
        }
    }

}

module.exports = new ConfigInteractionHandler();