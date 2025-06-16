require('dotenv').config();

// Importer le gestionnaire de persistance
const persistenceManager = require('./utils/persistenceManager');

// Gestion globale des erreurs non gérées pour éviter les crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('[UNHANDLED REJECTION] Erreur non gérée détectée:', reason);
    console.error('[UNHANDLED REJECTION] Promise:', promise);
    
    // Si c'est une erreur d'interaction Discord, on la log mais on ne crash pas
    if (reason && reason.code && (reason.code === 10062 || reason.code === 40060)) {
        console.log('[UNHANDLED REJECTION] Erreur d\'interaction Discord ignorée pour éviter le crash');
        return;
    }
});

process.on('uncaughtException', (error) => {
    console.error('[UNCAUGHT EXCEPTION] Erreur critique:', error);
    
    // Si c'est une erreur d'interaction Discord, on la log mais on ne crash pas
    if (error && error.code && (error.code === 10062 || error.code === 40060)) {
        console.log('[UNCAUGHT EXCEPTION] Erreur d\'interaction Discord ignorée pour éviter le crash');
        return;
    }
    
    // Pour les autres erreurs critiques, on peut décider de redémarrer proprement
    console.error('[UNCAUGHT EXCEPTION] Le bot va se fermer à cause d\'une erreur critique');
    process.exit(1);
});

const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const token = process.env.TOKEN;
const { startDailyQuiz } = require('./utils/dailyQuizScheduler'); // Importation du planificateur de quiz quotidien
const configManager = require('./utils/configManager'); // Importation du gestionnaire de configuration
const { startVoiceActivityScheduler } = require('./utils/voiceActivityScheduler'); // Importation du planificateur d'activité vocale
const { cleanupOldData } = require('./utils/persistentState'); // Importation du nettoyeur de données

// Crée une nouvelle instance du client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates, // Ajouté pour la détection des changements d'état vocal
    GatewayIntentBits.GuildMembers, // Ajouté pour détecter les modifications de rôles
  ],
  // Assurez-vous d'avoir les partiels nécessaires si vous utilisez des DM ou autres
  partials: ['CHANNEL', 'MESSAGE'] // Ajouté pour potentiellement gérer les DMs/Modmail
});

client.commands = new Collection();

// Fonction récursive pour charger les commandes
function loadCommands(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            // Si c'est un dossier, explorer récursivement
            loadCommands(itemPath);
        } else if (item.endsWith('.js')) {
            // Si c'est un fichier .js, charger la commande
            try {
                const command = require(itemPath);
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    console.log(`✅ Commande chargée: ${command.data.name}`);
                } else {
                    console.log(`[AVERTISSEMENT] La commande à ${itemPath} manque une propriété "data" ou "execute" requise.`);
                }
            } catch (error) {
                console.error(`[ERREUR] Impossible de charger la commande ${itemPath}:`, error.message);
            }
        }
    }
}

const commandsPath = path.join(__dirname, 'commands');
loadCommands(commandsPath);


const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Lorsque le client est prêt, exécute ce code (une seule fois)
client.once('ready', async () => {
    console.log('Prêt !');

    // Vérifier l'intégrité des données au démarrage
    try {
        console.log('🔍 [MAIN] Vérification de l\'intégrité des données...');
        await persistenceManager.checkDataIntegrity();
        console.log('✅ [MAIN] Gestionnaire de persistance initialisé');
    } catch (error) {
        console.error('❌ [MAIN] Erreur lors de la vérification des données:', error);
    }

    // Initialiser le système de webhooks moderne
    try {
        const webhookLogger = require('./utils/webhookLogger');
        await webhookLogger.initialize(client);
        webhookLogger.setClient(client); // Configurer le client pour le fallback
        console.log('🚀 [MAIN] Système de webhooks initialisé avec succès');
    } catch (error) {
        console.error('❌ [MAIN] Erreur lors de l\'initialisation des webhooks:', error);
    }

    // Fonction pour mettre à jour le statut avec le nombre de membres
    const updateMemberCount = async () => { // Rendre la fonction asynchrone
        // Attendre que le cache des guildes soit prêt
        await client.guilds.fetch();
        const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        client.user.setPresence({
            activities: [{
                name: `${totalMembers} kinksters 😈 !`,
                type: ActivityType.Watching
            }],
            status: 'online'
        });
    };

    // Mise à jour initiale du statut
    await updateMemberCount(); // Appeler la fonction asynchrone avec await

    // Mise à jour du statut toutes les 5 minutes
    setInterval(updateMemberCount, 5 * 60 * 1000);

    // Démarrer le quiz quotidien à 13h00
    const currentConfig = configManager.getConfig();
    if (configManager.dailyQuizChannelId) {
        // Fonction pour calculer le délai jusqu'à l'heure configurée avec validation
        function getTimeUntilQuiz() {
            const config = configManager.getConfig();
            const quizConfig = config.economy?.dailyQuiz || { hour: 13, minute: 0 };
            
            // Validation des heures
            let quizHour = quizConfig.hour || 13;
            let quizMinute = quizConfig.minute || 0;
            
            // Valider l'heure (0-23)
            if (typeof quizHour !== 'number' || quizHour < 0 || quizHour > 23) {
                console.warn(`⚠️ [QUIZ] Heure invalide (${quizHour}), utilisation de 13h par défaut`);
                quizHour = 13;
            }
            
            // Valider les minutes (0-59)
            if (typeof quizMinute !== 'number' || quizMinute < 0 || quizMinute > 59) {
                console.warn(`⚠️ [QUIZ] Minute invalide (${quizMinute}), utilisation de 0min par défaut`);
                quizMinute = 0;
            }
            
            const now = new Date();
            const target = new Date(now);
            target.setHours(quizHour, quizMinute, 0, 0);
            
            // Si c'est déjà passé aujourd'hui, programmer pour demain
            if (now > target) {
                target.setDate(target.getDate() + 1);
            }
            
            const delay = target.getTime() - now.getTime();
            
            // Vérifier que le délai est raisonnable (pas plus de 25h)
            if (delay > 25 * 60 * 60 * 1000) {
                console.warn(`⚠️ [QUIZ] Délai anormalement long: ${Math.round(delay / (1000 * 60 * 60))}h`);
            }
            
            return delay;
        }
        
        // Programmer le premier quiz
        const initialDelay = getTimeUntilQuiz();
        const config = configManager.getConfig();
        const quizConfig = config.economy?.dailyQuiz || { hour: 13, minute: 0 };
        const quizTime = `${String(quizConfig.hour || 13).padStart(2, '0')}:${String(quizConfig.minute || 0).padStart(2, '0')}`;
        console.log(`[QUIZ] Prochain quiz quotidien dans ${Math.round(initialDelay / (1000 * 60))} minutes (${quizTime})`);
        
        setTimeout(() => {
            startDailyQuiz(client);
            
            // Puis répéter toutes les 24 heures à l'heure configurée
            setInterval(() => {
                startDailyQuiz(client);
            }, 24 * 60 * 60 * 1000);
        }, initialDelay);
        
    } else {
        console.warn("Le salon pour le quiz quotidien n'est pas configuré. Utilisez la commande /config pour le définir.");
    }

    // Démarrer le scheduler d'activité vocale
    startVoiceActivityScheduler();
    console.log('Scheduler d\'activité vocale démarré.');
    
    // Démarrer le nettoyage automatique des données anciennes (toutes les 6 heures)
    setInterval(async () => {
        try {
            await cleanupOldData();
            console.log('[MAINTENANCE] Nettoyage automatique des données anciennes terminé');
        } catch (error) {
            console.error('[MAINTENANCE] Erreur lors du nettoyage automatique:', error);
        }
    }, 6 * 60 * 60 * 1000); // 6 heures
    
    // Nettoyage initial au démarrage
    try {
        await cleanupOldData();
        console.log('[MAINTENANCE] Nettoyage initial des données anciennes terminé');
    } catch (error) {
        console.error('[MAINTENANCE] Erreur lors du nettoyage initial:', error);
    }
});

// Gestion d'arrêt propre pour sauvegarder avant fermeture
async function gracefulShutdown(signal) {
    console.log(`\n🔄 [MAIN] Signal ${signal} reçu... Arrêt en cours...`);
    
    try {
        // Arrêter les sauvegardes automatiques
        persistenceManager.stopAutoBackup();
        
        // Faire une sauvegarde finale avec timeout
        const backupPromise = persistenceManager.manualBackup();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 10000)
        );
        
        await Promise.race([backupPromise, timeoutPromise]);
        console.log('💾 [MAIN] Sauvegarde finale terminée');
        
        // Fermer le client Discord proprement
        if (client) {
            await client.destroy();
            console.log('🔌 [MAIN] Client Discord fermé');
        }
        
    } catch (error) {
        console.error('❌ [MAIN] Erreur lors de l\'arrêt:', error.message);
    } finally {
        console.log('👋 [MAIN] Arrêt terminé');
        process.exit(0);
    }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Connecte-toi à Discord avec le token de ton client
if (!token || token === 'YOUR_DISCORD_BOT_TOKEN_HERE') {
    console.log('🚫 [BOT] Token Discord manquant ou invalide!');
    console.log('📝 [BOT] Veuillez configurer votre token dans le fichier .env');
    console.log('💡 [BOT] TOKEN=votre_token_discord_ici');
    process.exit(1);
} else {
    client.login(token).catch(error => {
        console.error('🚫 [BOT] Erreur de connexion Discord:', error.message);
        console.log('💡 [BOT] Vérifiez que votre token Discord est valide');
        process.exit(1);
    });
}
