// Configuration moderne avec icônes et catégories
const CONFIG_CATEGORIES = {
    core: {
        icon: '⚙️',
        label: 'Configuration principale',
        description: 'Paramètres essentiels du serveur',
        color: '#5865F2',
        sections: ['general']
    },
    logs: {
        icon: '📊',
        label: 'Logs & Surveillance',
        description: 'Configuration des systèmes de logging',
        color: '#3498DB',
        sections: ['moderation_logs', 'message_logs', 'voice_logs', 'member_logs', 'role_logs']
    },
    community: {
        icon: '👥',
        label: 'Communauté & Accueil',
        description: 'Gestion des nouveaux membres',
        color: '#57F287',
        sections: ['entry', 'welcome', 'entryModal']
    },
    moderation: {
        icon: '🛡️',
        label: 'Modération & Support',
        description: 'Outils de modération et tickets',
        color: '#ED4245',
        sections: ['modmail', 'tickets']
    },
    entertainment: {
        icon: '🎮',
        label: 'Divertissement',
        description: 'Jeux et contenu spécialisé',
        color: '#FEE75C',
        sections: ['games', 'confession', 'kink']
    },
    economy: {
        icon: '💰',
        label: 'Économie & Points',
        description: 'Système de points et récompenses',
        color: '#EB459E',
        sections: ['economy']
    },
    progression: {
        icon: '📈',
        label: 'Niveaux & Progression',
        description: 'Système de niveaux et d\'expérience',
        color: '#9B59B6',
        sections: ['levels']
    }
};

module.exports = CONFIG_CATEGORIES;