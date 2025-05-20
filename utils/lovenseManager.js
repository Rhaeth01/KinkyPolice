const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Chemin vers le fichier de configuration Lovense
const configPath = path.join(__dirname, '../lovense_config.json');

// Fonction pour charger la configuration
function loadConfig() {
    try {
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
        return { toys: {}, users: {} };
    } catch (error) {
        console.error('Erreur lors du chargement de la configuration Lovense:', error);
        return { toys: {}, users: {} };
    }
}

// Fonction pour sauvegarder la configuration
function saveConfig(config) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de la configuration Lovense:', error);
        return false;
    }
}

// Fonction pour enregistrer un jouet Lovense
function registerToy(userId, toyId, toyName) {
    const config = loadConfig();
    
    if (!config.users[userId]) {
        config.users[userId] = [];
    }
    
    // Vérifier si le jouet existe déjà
    const existingToyIndex = config.users[userId].findIndex(toy => toy.id === toyId);
    
    if (existingToyIndex !== -1) {
        // Mettre à jour le jouet existant
        config.users[userId][existingToyIndex] = { id: toyId, name: toyName };
    } else {
        // Ajouter un nouveau jouet
        config.users[userId].push({ id: toyId, name: toyName });
    }
    
    return saveConfig(config);
}

// Fonction pour supprimer un jouet
function removeToy(userId, toyId) {
    const config = loadConfig();
    
    if (!config.users[userId]) {
        return false;
    }
    
    const initialLength = config.users[userId].length;
    config.users[userId] = config.users[userId].filter(toy => toy.id !== toyId);
    
    if (config.users[userId].length === initialLength) {
        return false; // Aucun jouet n'a été supprimé
    }
    
    return saveConfig(config);
}

// Fonction pour obtenir les jouets d'un utilisateur
function getUserToys(userId) {
    const config = loadConfig();
    return config.users[userId] || [];
}

// Fonction pour contrôler un jouet
async function controlToy(toyId, command, value, seconds = 5) {
    try {
        // Récupérer l'URL de l'API et la clé depuis les variables d'environnement
        const apiUrl = process.env.LOVENSE_API_URL || 'https://api.lovense.com/api/lan/v2/command';
        const apiKey = process.env.LOVENSE_API_KEY;
        
        if (!apiKey) {
            throw new Error('Clé API Lovense non configurée');
        }
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: apiKey,
                uid: toyId,
                command: command,
                strength: value,
                timeSec: seconds
            })
        });
        
        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erreur lors du contrôle du jouet Lovense:', error);
        throw error;
    }
}

module.exports = {
    registerToy,
    removeToy,
    getUserToys,
    controlToy
};