require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { guildId } = require('./config.json'); // clientId est retiré d'ici
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID; // clientId est chargé depuis .env
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
// Récupère tous les fichiers de commandes du répertoire commands que vous avez créé précédemment
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Récupère l'exportation SlashCommandBuilder#toJSON de chaque commande pour le déploiement
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.log(`[AVERTISSEMENT] La commande à ${filePath} manque une propriété "data" ou "execute" requise.`);
    }
}

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
