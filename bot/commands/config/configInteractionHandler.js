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
    }

    /**
     * Démarre une nouvelle session de configuration
     * @param {import('discord.js').User} user - L'utilisateur qui démarre la session
     * @param {import('discord.js').Interaction} interaction - L'interaction initiale
     */
    startSession(user, interaction) {
        if (this.activeSessions.has(user.id)) {
            return false; // Session déjà active
        }

        const sessionData = {
            userId: user.id,
            guildId: interaction.guild.id,
            currentCategory: 'main',
            breadcrumb: ['Configuration'],
            pendingChanges: {},
            originalConfig: JSON.parse(JSON.stringify(configManager.getConfig())),
            startTime: Date.now(),
            lastActivity: Date.now()
        };

        this.activeSessions.set(user.id, sessionData);
        
        // Auto-nettoyage de la session après timeout
        setTimeout(() => {
            if (this.activeSessions.has(user.id)) {
                this.endSession(user.id);
            }
        }, this.sessionTimeout);

        return true;
    }

    /**
     * Termine une session de configuration
     * @param {string} userId - L'ID de l'utilisateur
     */
    endSession(userId) {
        this.activeSessions.delete(userId);
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
     * Ajoute des changements en attente à la session
     * @param {string} userId - L'ID de l'utilisateur
     * @param {Object} changes - Les changements à ajouter
     */
    addPendingChanges(userId, changes) {
        const session = this.getSession(userId);
        if (!session) return false;

        // Filtrer les valeurs null/undefined pour éviter les clés nulles
        const cleanedChanges = this.removeNullValues(changes);
        if (Object.keys(cleanedChanges).length === 0) {
            console.warn('[ConfigInteractionHandler] Aucun changement valide à ajouter (toutes les valeurs étaient null/undefined)');
            return false;
        }

        session.pendingChanges = this.deepMerge(session.pendingChanges, cleanedChanges);
        return true;
    }

    /**
     * Sauvegarde les changements en attente
     * @param {string} userId - L'ID de l'utilisateur
     * @returns {Promise<boolean>} Succès de la sauvegarde
     */
    async savePendingChanges(userId) {
        const session = this.getSession(userId);
        if (!session) return false;

        try {
            if (Object.keys(session.pendingChanges).length > 0) {
                await configManager.updateConfig(session.pendingChanges);
                session.pendingChanges = {};
                session.originalConfig = JSON.parse(JSON.stringify(configManager.getConfig()));
                return true;
            }
            return true;
        } catch (error) {
            console.error('[CONFIG HANDLER] Erreur lors de la sauvegarde:', error);
            return false;
        }
    }

    /**
     * Annule les changements en attente
     * @param {string} userId - L'ID de l'utilisateur
     */
    cancelPendingChanges(userId) {
        const session = this.getSession(userId);
        if (!session) return false;

        session.pendingChanges = {};
        return true;
    }

    /**
     * Vérifie s'il y a des changements en attente
     * @param {string} userId - L'ID de l'utilisateur
     * @returns {boolean} True s'il y a des changements
     */
    hasPendingChanges(userId) {
        const session = this.getSession(userId);
        return session && Object.keys(session.pendingChanges).length > 0;
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
     * Crée l'embed principal de configuration
     * @param {string} userId - L'ID de l'utilisateur
     * @param {import('discord.js').Guild} guild - Le serveur Discord
     * @returns {import('discord.js').EmbedBuilder} L'embed de configuration
     */
    createMainConfigEmbed(userId, guild) {
        const session = this.getSession(userId);
        const config = this.getCurrentConfigWithPending(userId);
        
        const embed = new EmbedBuilder()
            .setTitle('🛠️ Configuration du Bot')
            .setDescription('Sélectionnez une catégorie à configurer')
            .setColor(0x5865F2)
            .addFields([
                {
                    name: '⚙️ Général',
                    value: `Préfixe: \`${config.general?.prefix || '!'}\`\nRôle Admin: ${config.general?.adminRole ? `<@&${config.general.adminRole}>` : 'Non défini'}`,
                    inline: true
                },
                {
                    name: '🚪 Entrée',
                    value: `Canal d'accueil: ${config.entry?.welcomeChannel ? `<#${config.entry.welcomeChannel}>` : 'Non défini'}\nRôle de vérification: ${config.entry?.verificationRole ? `<@&${config.entry.verificationRole}>` : 'Non défini'}`,
                    inline: true
                },
                {
                    name: '📝 Logs',
                    value: `Logs de modération: ${config.logging?.modLogs ? `<#${config.logging.modLogs}>` : 'Non défini'}\nLogs de messages: ${config.logging?.messageLogs ? `<#${config.logging.messageLogs}>` : 'Non défini'}`,
                    inline: true
                },
                {
                    name: '💰 Économie',
                    value: `Système: ${config.economy?.enabled ? '✅ Activé' : '❌ Désactivé'}\nActivité vocale: ${config.economy?.voiceActivity?.enabled ? '✅' : '❌'}\nQuiz quotidien: ${config.economy?.dailyQuiz?.enabled ? '✅' : '❌'}`,
                    inline: true
                },
                {
                    name: '🎮 Jeux',
                    value: `Rôles interdits: ${config.games?.forbiddenRoleIds?.length || 0}\nCommandes: /vote, /kinky, /quiz-kinky`,
                    inline: true
                },
                {
                    name: '🎫 Support',
                    value: `Tickets: ${config.tickets?.ticketCategory ? 'Configuré' : 'Non configuré'}\nModmail: ${config.modmail?.modmailCategory ? 'Configuré' : 'Non configuré'}`,
                    inline: true
                }
            ]);

        if (session) {
            embed.setFooter({ 
                text: `${session.breadcrumb.join(' > ')} | Changements en attente: ${this.hasPendingChanges(userId) ? 'Oui' : 'Non'}` 
            });
        }

        return embed;
    }

    /**
     * Crée le menu de sélection des catégories
     * @returns {import('discord.js').ActionRowBuilder} Le menu de sélection
     */
    createCategorySelectMenu() {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('config_category_select')
            .setPlaceholder('Sélectionnez une catégorie à configurer')
            .addOptions([
                {
                    label: 'Général',
                    description: 'Paramètres généraux du bot',
                    value: 'general',
                    emoji: '⚙️'
                },
                {
                    label: 'Entrée & Accueil',
                    description: 'Configuration de l\'accueil des nouveaux membres',
                    value: 'entry',
                    emoji: '🚪'
                },
                {
                    label: 'Logs & Modération',
                    description: 'Configuration des logs et de la modération',
                    value: 'logging',
                    emoji: '📝'
                },
                {
                    label: 'Économie',
                    description: 'Système de points et récompenses',
                    value: 'economy',
                    emoji: '💰'
                },
                {
                    label: 'Niveaux',
                    description: 'Système de niveaux et XP',
                    value: 'levels',
                    emoji: '📊'
                },
                {
                    label: 'Jeux',
                    description: 'Configuration des jeux et mini-jeux',
                    value: 'games',
                    emoji: '🎮'
                },
                {
                    label: 'Tickets',
                    description: 'Système de tickets de support',
                    value: 'tickets',
                    emoji: '🎫'
                },
                {
                    label: 'Modmail',
                    description: 'Système de modmail privé',
                    value: 'modmail',
                    emoji: '📬'
                },
                {
                    label: 'Confession',
                    description: 'Système de confessions anonymes',
                    value: 'confession',
                    emoji: '💬'
                }
            ]);

        return new ActionRowBuilder().addComponents(selectMenu);
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
     * Crée les boutons de contrôle
     * @param {string} userId - L'ID de l'utilisateur
     * @param {boolean} showBackButton - Afficher le bouton retour
     * @returns {import('discord.js').ActionRowBuilder} Les boutons de contrôle
     */
    createControlButtons(userId, showBackButton = false) {
        const buttons = [];

        if (showBackButton) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('config_back')
                    .setLabel('◀️ Retour')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        if (this.hasPendingChanges(userId)) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('config_save')
                    .setLabel('💾 Sauvegarder')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('config_cancel')
                    .setLabel('❌ Annuler')
                    .setStyle(ButtonStyle.Danger)
            );
        }

        buttons.push(
            new ButtonBuilder()
                .setCustomId('config_close')
                .setLabel('🚪 Fermer')
                .setStyle(ButtonStyle.Secondary)
        );

        return new ActionRowBuilder().addComponents(buttons);
    }

    /**
     * Obtient la configuration actuelle avec les changements en attente appliqués
     * @param {string} userId - L'ID de l'utilisateur
     * @returns {Object} La configuration avec les changements appliqués
     */
    getCurrentConfigWithPending(userId) {
        const session = this.getSession(userId);
        const baseConfig = configManager.getConfig();
        
        if (!session || Object.keys(session.pendingChanges).length === 0) {
            return baseConfig;
        }

        return this.deepMerge(baseConfig, session.pendingChanges);
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
}

module.exports = new ConfigInteractionHandler();