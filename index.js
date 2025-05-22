require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const token = process.env.TOKEN;

// Imports pour discord-player
const { Player } = require('discord-player');
const { YouTubeExtractor } = require('@discord-player/extractor');


// Crée une nouvelle instance du client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates, // Essentiel pour discord-player
    // Assurez-vous d'avoir aussi DirectMessages si votre modmail l'utilise (vu dans interactionCreate.js)
    GatewayIntentBits.DirectMessages,
  ],
  // Assurez-vous d'avoir les partiels nécessaires si vous utilisez des DM ou autres
  partials: ['CHANNEL', 'MESSAGE'] // Ajouté pour potentiellement gérer les DMs/Modmail
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Définit une nouvelle commande dans la Collection
    // avec la clé comme nom de la commande et la valeur comme module exporté
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[AVERTISSEMENT] La commande à ${filePath} manque une propriété "data" ou "execute" requise.`);
    }
}

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
client.once('ready', async () => { // Rendre la fonction ready async pour await player.extractors.register
    console.log('Prêt !');

    // --- Initialisation du Player ici ---
    console.log('Initialisation du Player...');
    const player = new Player(client, {
        // Vos options globales du player ici si vous en avez
        // Exemple: ytdlOptions: { quality: "highestaudio", highWaterMark: 1 << 25 },
    });

    // Attacher le player au client
    client.player = player;

    // Enregistrer les extracteurs
    try {
        await player.extractors.register(YouTubeExtractor, {});
        console.log('YouTubeExtractor enregistré.');
    } catch (e) {
        console.error("Erreur lors de l'enregistrement de YouTubeExtractor:", e);
    }

    // Configurer les écouteurs d'événements globaux du player ici
    player.events.on('error', (queue, error) => {
        if (queue.deleted) return;
        console.error(`[Player Event - Error][${queue.guild.name}] Erreur de la file: ${error.message}`, error);
        // Logique pour envoyer un message dans un salon si besoin
        if (queue.metadata && queue.metadata.channel && queue.metadata.channel.isTextBased()) {
             queue.metadata.channel.send(`❌ Une erreur est survenue avec le lecteur: ${error.message.substring(0, 1900)}`).catch(console.error);
        }
    });
    player.events.on('playerError', (queue, error) => {
        if (queue.deleted) return;
        console.error(`[Player Event - PlayerError][${queue.guild.name}] Erreur du lecteur: ${error.message}`, error);
         // Logique pour envoyer un message dans un salon si besoin
         if (queue.metadata && queue.metadata.channel && queue.metadata.channel.isTextBased()) {
            queue.metadata.channel.send(`❌ Une erreur de lecture est survenue: ${error.message.substring(0, 1900)}`).catch(console.error);
         }
    });
     player.events.on('playerStart', (queue, track) => {
        console.log(`[Player Event - PlayerStart][${queue.guild.name}] Lecture de: ${track.title}`);
        // Logique pour envoyer un message dans un salon si besoin
        // Attention à ne pas dupliquer le message de la commande /lofi si elle envoie déjà un message
        // if (queue.metadata && queue.metadata.channel && queue.metadata.channel.isTextBased()) {
        //      queue.metadata.channel.send(`▶️ Lecture de : **${track.title}**`).catch(console.error);
        // }
    });
    // --- Fin de l'initialisation du Player ---


    // Fonction pour mettre à jour le statut avec le nombre de membres
    const updateMemberCount = () => {
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
    updateMemberCount();

    // Mise à jour du statut toutes les 5 minutes
    setInterval(updateMemberCount, 5 * 60 * 1000);
});

// Connecte-toi à Discord avec le token de ton client
client.login(token);