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
            // Exclure le dossier 'config' qui se trouve directement dans 'commands'
            if (item === 'config' && dir === path.join(__dirname, 'commands')) {
                continue;
            }
            // Si c'est un dossier, explorer récursivement
            loadCommands(itemPath);
        } else if (item.endsWith('.js')) {
            // Si c'est un fichier .js, charger la commande
            console.log(`[INFO] Tentative de chargement de la commande: ${itemPath}`);
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
        // Étape 1: Nettoyage forcé de toutes les commandes
        console.log('--- Début du nettoyage forcé des commandes ---');
        
        // Nettoyer les commandes globales
        console.log('[CLEAN] Nettoyage des commandes globales...');
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log('[CLEAN] ✅ Commandes globales nettoyées.');

        // Nettoyer les commandes de guilde si un ID est fourni
        if (guildId && guildId.trim() !== '') {
            console.log(`[CLEAN] Nettoyage des commandes pour le serveur: ${guildId}`);
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
            console.log(`[CLEAN] ✅ Commandes du serveur ${guildId} nettoyées.`);
        } else {
            console.log('[CLEAN] Pas de GUILD_ID trouvé, nettoyage des commandes de serveur ignoré.');
        }
        console.log('--- Nettoyage forcé terminé ---');

        // Étape 2: Déploiement des nouvelles commandes
        console.log(`\n--- Début du rafraîchissement de ${commands.length} commandes ---`);
        
        // Nous allons redéployer uniquement en global pour assurer la cohérence
        console.log('[DEPLOY] Déploiement global (tous les serveurs)...');
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );
        console.log('[DEPLOY] ✅ Déploiement global terminé.');

        console.log(`\n--- Rafraîchissement terminé ---`);
        console.log(`✅ ${data.length} commandes d'application (/) ont été rechargées avec succès.`);
        process.exit(0); // Termine le processus avec succès

    } catch (error) {
        // Et assure-toi de bien attraper et logger toutes les erreurs !
        console.error('\n[ERREUR FATALE] Le déploiement des commandes a échoué:', error);
        process.exit(1); // Termine le processus avec une erreur
    }
})();
