// Structure de configuration basée sur l'utilisation réelle dans le code
const CONFIG_STRUCTURE = {
    // Canaux de logs
    logging: {
        name: '📊 Logs',
        icon: '📝',
        color: '#FEE75C',
        description: 'Configuration des différents canaux de logs',
        fields: {
            logChannelId: {
                label: 'Canal de logs général',
                type: 'channel',
                description: 'Logs généraux (arrivées membres, lock/unlock)',
                required: false
            },
            logActionMod: {
                label: 'Canal de logs modération',
                type: 'channel',
                description: 'Actions de modération (ban, kick, warn, mute)',
                required: false
            },
            messageLogChannelId: {
                label: 'Canal de logs messages',
                type: 'channel',
                description: 'Messages supprimés et édités',
                required: false
            },
            roleLogChannelId: {
                label: 'Canal de logs rôles',
                type: 'channel',
                description: 'Changements de rôles des membres',
                required: false
            },
            voiceLogChannelId: {
                label: 'Canal de logs vocaux',
                type: 'channel',
                description: 'Activité dans les canaux vocaux',
                required: false
            }
        }
    },

    // Système d'entrée et tickets
    entry: {
        name: '🚪 Entrée & Tickets',
        icon: '🎫',
        color: '#5865F2',
        description: 'Configuration du système d\'entrée et des tickets',
        fields: {
            entryRequestChannelId: {
                label: 'Canal des demandes d\'entrée',
                type: 'channel',
                description: 'Canal où les demandes d\'accès sont postées',
                required: false
            },
            acceptedEntryCategoryId: {
                label: 'Catégorie des entrées acceptées',
                type: 'category',
                description: 'Catégorie pour les tickets d\'entrée acceptés',
                required: false
            },
            ticketCategoryId: {
                label: 'Catégorie des tickets',
                type: 'category',
                description: 'Catégorie pour les tickets de support',
                required: false
            },
            logsTicketsChannelId: {
                label: 'Canal des logs tickets',
                type: 'channel',
                description: 'Archives des tickets fermés',
                required: false
            },
            forbiddenRoleIds: {
                label: 'Rôles interdits',
                type: 'role-multi',
                description: 'Rôles interdits (ex: pour la commande tourette)',
                required: false
            }
        }
    },

    // Configuration des rôles
    roles: {
        name: '👥 Rôles',
        icon: '🛡️',
        color: '#ED4245',
        description: 'Configuration des rôles automatiques',
        fields: {
            newMemberRoleIds: {
                label: 'Rôles nouveaux membres',
                type: 'role-multi',
                description: 'Rôles attribués automatiquement aux nouveaux membres',
                required: false
            },
            reglesValidesId: {
                label: 'Rôle règles validées',
                type: 'role',
                description: 'Rôle attribué après validation des règles',
                required: false
            },
            rolesToCheckBeforeAdd: {
                label: 'Rôles à vérifier avant ajout',
                type: 'role-multi',
                description: 'Rôles à vérifier avant d\'ajouter certains rôles',
                required: false
            },
            rolesToRemoveOnAccept: {
                label: 'Rôles à retirer à l\'acceptation',
                type: 'role-multi',
                description: 'Rôles retirés lors de l\'acceptation d\'une entrée',
                required: false
            }
        }
    },

    // Confessions
    confession: {
        name: '😈 Confessions',
        icon: '🤫',
        color: '#E91E63',
        description: 'Système de confessions anonymes',
        fields: {
            confessionChannelId: {
                label: 'Canal des confessions',
                type: 'channel',
                description: 'Canal où sont postées les confessions',
                required: false
            }
        }
    },

    // Quiz quotidien
    games: {
        name: '🎮 Jeux',
        icon: '🎯',
        color: '#1ABC9C',
        description: 'Configuration des jeux et quiz',
        fields: {
            dailyQuizChannelId: {
                label: 'Canal du quiz quotidien',
                type: 'channel',
                description: 'Canal pour le quiz quotidien automatique',
                required: false
            }
        }
    },

    // Configuration des modales
    modals: {
        name: '📝 Formulaires',
        icon: '📋',
        color: '#9B59B6',
        description: 'Configuration des formulaires d\'entrée',
        fields: {
            entryModal: {
                label: 'Configuration modale d\'entrée',
                type: 'json',
                description: 'Structure JSON de la modale d\'entrée',
                required: false,
                placeholder: '{"fields": [{"id": "field1", "label": "Question", "required": true}]}'
            }
        }
    }
};

// Types de champs réellement utilisés
const FIELD_TYPES = {
    channel: {
        name: 'Canal',
        icon: '📺',
        validation: (value) => !value || /^\d{17,19}$/.test(value)
    },
    category: {
        name: 'Catégorie',
        icon: '📁',
        validation: (value) => !value || /^\d{17,19}$/.test(value)
    },
    role: {
        name: 'Rôle',
        icon: '👤',
        validation: (value) => !value || /^\d{17,19}$/.test(value)
    },
    'role-multi': {
        name: 'Rôles multiples',
        icon: '👥',
        validation: (value) => {
            if (!value) return true;
            if (!Array.isArray(value)) return false;
            return value.every(v => /^\d{17,19}$/.test(v));
        }
    },
    json: {
        name: 'Configuration JSON',
        icon: '{}',
        validation: (value) => {
            if (!value) return true;
            try {
                JSON.parse(value);
                return true;
            } catch {
                return false;
            }
        }
    }
};

// Helper pour obtenir la valeur depuis la config actuelle
function getConfigValue(config, section, field) {
    // Gestion des cas spéciaux où les champs sont à la racine
    const rootFields = [
        'confessionChannelId',
        'logActionMod',
        'logChannelId',
        'messageLogChannelId',
        'roleLogChannelId',
        'voiceLogChannelId',
        'ticketCategoryId',
        'acceptedEntryCategoryId',
        'entryRequestChannelId',
        'logsTicketsChannelId',
        'newMemberRoleIds',
        'reglesValidesId',
        'rolesToCheckBeforeAdd',
        'rolesToRemoveOnAccept',
        'dailyQuizChannelId',
        'entryModal'
    ];

    if (rootFields.includes(field)) {
        return config[field];
    }

    // Pour forbiddenRoleIds qui est dans entry
    if (field === 'forbiddenRoleIds' && config.entry) {
        return config.entry.forbiddenRoleIds;
    }

    return config[section]?.[field];
}

// Helper pour mettre à jour la config
function setConfigValue(config, section, field, value) {
    // Gestion des cas spéciaux où les champs sont à la racine
    const rootFields = [
        'confessionChannelId',
        'logActionMod',
        'logChannelId',
        'messageLogChannelId',
        'roleLogChannelId',
        'voiceLogChannelId',
        'ticketCategoryId',
        'acceptedEntryCategoryId',
        'entryRequestChannelId',
        'logsTicketsChannelId',
        'newMemberRoleIds',
        'reglesValidesId',
        'rolesToCheckBeforeAdd',
        'rolesToRemoveOnAccept',
        'dailyQuizChannelId',
        'entryModal'
    ];

    if (rootFields.includes(field)) {
        if (!value || value === '') {
            delete config[field];
        } else {
            config[field] = value;
        }
        return;
    }

    // Pour forbiddenRoleIds qui doit être dans entry
    if (field === 'forbiddenRoleIds') {
        if (!config.entry) config.entry = {};
        if (!value || (Array.isArray(value) && value.length === 0)) {
            delete config.entry.forbiddenRoleIds;
        } else {
            config.entry.forbiddenRoleIds = value;
        }
        return;
    }

    // Pour les autres champs
    if (!config[section]) config[section] = {};
    if (!value || value === '') {
        delete config[section][field];
    } else {
        config[section][field] = value;
    }
}

module.exports = { CONFIG_STRUCTURE, FIELD_TYPES, getConfigValue, setConfigValue };