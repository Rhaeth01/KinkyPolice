require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const token = process.env.TOKEN;

// Crée une nouvelle instance du client
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ] 
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
client.once('ready', () => {
    console.log('Prêt !');
    
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