require('dotenv').config();

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

    // Démarrer le quiz quotidien
    const currentConfig = configManager.getConfig();
    if (configManager.dailyQuizChannelId) {
        setInterval(() => {
            startDailyQuiz(client);
        }, 24 * 60 * 60 * 1000); // Toutes les 24 heures
        
        startDailyQuiz(client); // Déclencher le premier quiz au démarrage
    } else {
        console.warn("Le salon pour le quiz quotidien n'est pas configuré. Utilisez la commande /config pour le définir.");
    }

    // Démarrer le scheduler d'activité vocale
    startVoiceActivityScheduler();
    console.log('Scheduler d\'activité vocale démarré.');
});

// Connecte-toi à Discord avec le token de ton client
client.login(token);
