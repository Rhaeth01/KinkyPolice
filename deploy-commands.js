require('dotenv').config();
const { REST, Routes } = require('discord.js');
const configManager = require('./utils/configManager'); // Utiliser le configManager au lieu de config.json direct
const guildId = process.env.GUILD_ID; // Récupéré depuis .env
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID; // clientId est chargé depuis .env
const fs = require('node:fs');
const path = require('node:path');

const commands = [];

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
                    commands.push(command.data.toJSON());
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

// Récupère tous les fichiers de commandes du répertoire commands (récursivement)
const commandsPath = path.join(__dirname, 'commands');
loadCommands(commandsPath);

// Construit et prépare une instance du module REST
const rest = new REST().setToken(token);

// et déploie tes commandes !
(async () => {
    try {
        console.log(`Commencé à rafraîchir ${commands.length} commandes d'application (/).`);

        // La méthode put est utilisée pour rafraîchir complètement toutes les commandes dans la guilde avec l'ensemble actuel
const data = await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands },
);

        console.log(`Rafraîchi avec succès ${data.length} commandes d'application (/).`);
    } catch (error) {
        // Et assure-toi de bien attraper et logger toutes les erreurs !
        console.error(error);
    }
})();
