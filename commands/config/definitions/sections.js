const CONFIG_SECTIONS = {
    general: {
        label: 'Paramètres généraux',
        icon: '⚙️',
        fields: {
            prefix: { label: 'Préfixe', type: 'text', description: 'Préfixe pour les commandes' },
            adminRole: { label: 'Rôle Admin', type: 'role', description: 'Rôle administrateur principal' },
            modRole: { label: 'Rôle Mod', type: 'role', description: 'Rôle modérateur' }
        }
    },
    moderation_logs: {
        label: 'Logs Modération',
        icon: '🛡️',
        dataSection: 'logging', // Utilise la section logging dans la config
        fields: {
            modLogs: { 
                label: '📍 Canal de destination', 
                type: 'channel', 
                description: 'Canal où seront envoyés les logs de modération avec webhooks automatiques pour de meilleures performances'
            },
            modLogsExcludedRoles: {
                label: '🚫 Rôles à ignorer',
                type: 'multi-role',
                description: 'Rôles dont les actions de modération ne seront pas loggées (ex: bots, staff)'
            }
        }
    },
    message_logs: {
        label: 'Logs Messages',
        icon: '💬',
        dataSection: 'logging',
        fields: {
            messageLogs: { 
                label: '📍 Canal de destination', 
                type: 'channel', 
                description: 'Canal où seront envoyés les logs des messages avec webhooks automatiques pour de meilleures performances'
            },
            messageLogsExcludedChannels: {
                label: '🚫 Canaux à ignorer',
                type: 'multi-channel',
                description: 'Canaux dont les messages ne seront pas surveillés (ex: spam, test)'
            },
            messageLogsExcludedRoles: {
                label: '🚫 Rôles à ignorer',
                type: 'multi-role',
                description: 'Rôles dont les messages ne seront pas loggés (ex: bots, modérateurs)'
            }
        }
    },
    voice_logs: {
        label: 'Logs Vocal',
        icon: '🔊',
        dataSection: 'logging',
        fields: {
            voiceLogs: { 
                label: '📍 Canal de destination', 
                type: 'channel', 
                description: 'Canal où seront envoyés les logs des activités vocales avec webhooks automatiques'
            },
            voiceLogsExcludedChannels: {
                label: '🚫 Canaux vocal à ignorer',
                type: 'multi-channel',
                description: 'Canaux vocaux dont l\'activité ne sera pas surveillée (ex: AFK, privés)'
            },
            voiceLogsExcludedRoles: {
                label: '🚫 Rôles à ignorer',
                type: 'multi-role',
                description: 'Rôles dont l\'activité vocale ne sera pas loggée (ex: bots, staff)'
            }
        }
    },
    member_logs: {
        label: 'Logs Membres',
        icon: '👥',
        dataSection: 'logging',
        fields: {
            memberLogs: { 
                label: '📍 Canal de destination', 
                type: 'channel', 
                description: 'Canal où seront envoyés les logs des membres avec webhooks automatiques'
            },
            memberLogsExcludedRoles: {
                label: '🚫 Rôles à ignorer',
                type: 'multi-role',
                description: 'Rôles dont les changements ne seront pas loggés lors des arrivées/départs'
            }
        }
    },
    role_logs: {
        label: 'Logs Rôles',
        icon: '🎭',
        dataSection: 'logging',
        fields: {
            roleLogChannelId: { 
                label: '📍 Canal de destination', 
                type: 'channel', 
                description: 'Canal où seront envoyés les logs des modifications de rôles avec webhooks automatiques'
            },
            roleLogsExcludedRoles: {
                label: '🚫 Rôles à ne pas afficher',
                type: 'multi-role',
                description: 'Rôles dont les ajouts/suppressions ne seront pas loggés (ex: rôles automatiques)'
            },
            roleLogsExcludedMembers: {
                label: '🚫 Membres à ignorer',
                type: 'multi-role',
                description: 'Rôles de membres dont les changements de rôles ne seront pas loggés (ex: bots)'
            }
        }
    },
    entry: {
        label: 'Système d\'entrée',
        icon: '🚪',
        fields: {
            welcomeChannel: { label: 'Canal Bienvenue', type: 'channel', description: 'Canal d\'accueil des nouveaux' },
            rulesChannel: { label: 'Canal Règles', type: 'channel', description: 'Canal contenant les règles' },
            verificationRole: { label: 'Rôle Vérification', type: 'role', description: 'Rôle donné après vérification' }
        }
    },
    welcome: {
        label: 'Messages de bienvenue',
        icon: '👋',
        fields: {
            welcomeMessage: { label: 'Message Public', type: 'text', description: 'Message affiché publiquement' },
            welcomeDM: { label: 'Message Privé', type: 'text', description: 'Message envoyé en privé' },
            rulesMessage: { label: 'Message Règles', type: 'text', description: 'Message explicatif des règles' }
        }
    },
    entryModal: {
        label: 'Modal d\'entrée',
        icon: '📝',
        fields: {
            title: { label: 'Titre du Modal', type: 'text', description: 'Titre affiché en haut du formulaire' },
            'fields.manage': { label: 'Gérer les Champs', type: 'special', description: 'Interface pour configurer les champs du formulaire' }
        }
    },
    modmail: {
        label: 'Système ModMail',
        icon: '📧',
        fields: {
            modmailCategory: { label: 'Catégorie ModMail', type: 'category', description: 'Catégorie pour les tickets modmail' },
            modmailLogs: { label: 'Logs ModMail', type: 'channel', description: 'Canal pour logger les modmails' }
        }
    },
    tickets: {
        label: 'Système de Tickets',
        icon: '🎫',
        fields: {
            ticketCategory: { label: 'Catégorie Tickets', type: 'category', description: 'Catégorie pour les tickets support' },
            supportRole: { label: 'Rôle Support', type: 'role', description: 'Rôle pour gérer les tickets' },
            ticketLogs: { label: 'Logs Tickets', type: 'channel', description: 'Canal pour logger les tickets' }
        }
    },
    games: {
        label: 'Jeux & Quiz',
        icon: '🎮',
        fields: {
            gameChannel: { label: 'Canal Jeux', type: 'channel', description: 'Canal principal pour les jeux' },
            gameLeaderboard: { label: 'Classements', type: 'channel', description: 'Canal pour les classements' }
        }
    },
    confession: {
        label: 'Confessions Anonymes',
        icon: '😈',
        fields: {
            confessionChannel: { label: 'Canal Confessions', type: 'channel', description: 'Canal pour les confessions anonymes' }
        }
    },
    kink: {
        label: 'Contenu Adulte',
        icon: '🔞',
        fields: {
            nsfwChannel: { label: 'Canal NSFW', type: 'channel', description: 'Canal principal NSFW' },
            kinkLevels: { label: 'Niveaux Activés', type: 'toggle', description: 'Activer le système de niveaux' },
            kinkLogs: { label: 'Logs NSFW', type: 'channel', description: 'Canal pour logger les actions NSFW' }
        }
    },
    economy: {
        label: 'Système Économique',
        icon: '💰',
        fields: {
            enabled: { label: 'Économie Activée', type: 'toggle', description: 'Activer le système de points' },
            'voiceActivity.enabled': { label: 'Points Vocal', type: 'toggle', description: 'Points pour activité vocale' },
            'voiceActivity.pointsPerMinute': { label: 'Points/Minute Vocal', type: 'number', description: 'Points gagnés par minute en vocal' },
            'messageActivity.enabled': { label: 'Points Messages', type: 'toggle', description: 'Points pour les messages' },
            'messageActivity.pointsPerReward': { label: 'Points/Récompense', type: 'number', description: 'Points par récompense message' },
            'dailyQuiz.enabled': { label: 'Quiz Quotidien', type: 'toggle', description: 'Activer le quiz quotidien' },
            'dailyQuiz.pointsPerCorrectAnswer': { label: 'Points Quiz', type: 'number', description: 'Points par bonne réponse' },
            'dailyQuiz.hour': { label: 'Heure Quiz', type: 'number', description: 'Heure du quiz quotidien (0-23)' },
            'dailyQuiz.minute': { label: 'Minute Quiz', type: 'number', description: 'Minute du quiz quotidien (0-59)' },
            'limits.maxPointsPerDay': { label: 'Limite Journalière', type: 'number', description: 'Maximum de points par jour' },
            'limits.maxPointsPerHour': { label: 'Limite Horaire', type: 'number', description: 'Maximum de points par heure' }
        }
    },
    levels: {
        label: 'Système de Niveaux',
        icon: '📈',
        fields: {
            enabled: { label: 'Niveaux Activés', type: 'toggle', description: 'Activer le système de niveaux et d\'XP' },
            levelUpChannel: { label: 'Canal Level Up', type: 'channel', description: 'Canal pour les annonces de montée de niveau' },
            'xpGain.message.min': { label: 'XP Min Message', type: 'number', description: 'XP minimum par message (15-25 recommandé)' },
            'xpGain.message.max': { label: 'XP Max Message', type: 'number', description: 'XP maximum par message' },
            'xpGain.voice.perMinute': { label: 'XP/Min Vocal', type: 'number', description: 'XP par minute en vocal (10 recommandé)' },
            'multipliers.globalMultiplier': { label: 'Multiplicateur Global', type: 'number', description: 'Multiplicateur d\'XP pour tous (1.0 = normal)' },
            'multipliers.premiumMultiplier': { label: 'Bonus Premium', type: 'number', description: 'Multiplicateur pour les membres premium' },
            'messages.enabled': { label: 'Annonces Level Up', type: 'toggle', description: 'Afficher les messages de montée de niveau' }
        }
    }
};

module.exports = CONFIG_SECTIONS;