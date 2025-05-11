const fs = require('node:fs');
const path = require('node:path');
const dataFolderPath = path.join(__dirname, '..', 'data');

// Fonction générique pour lire un fichier JSON
function readJsonFile(fileName) {
    const filePath = path.join(dataFolderPath, fileName);
    try {
        if (!fs.existsSync(filePath)) {
            // Crée le fichier avec un tableau vide s'il n'existe pas
            fs.writeFileSync(filePath, JSON.stringify([]), 'utf8');
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Erreur lors de la lecture du fichier ${fileName}:`, error);
        return []; // Retourne un tableau vide en cas d'erreur
    }
}

// Fonction générique pour écrire dans un fichier JSON
function writeJsonFile(fileName, data) {
    const filePath = path.join(dataFolderPath, fileName);
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Erreur lors de l'écriture dans le fichier ${fileName}:`, error);
        return false;
    }
}

// Fonctions spécifiques pour chaque type de données
// VERITES
function getVerites() {
    return readJsonFile('verites.json');
}

function addVerite(veriteText) {
    const verites = getVerites();
    if (verites.includes(veriteText)) {
        return false; // La vérité existe déjà
    }
    verites.push(veriteText);
    return writeJsonFile('verites.json', verites);
}

function getRandomVerite() {
    const verites = getVerites();
    if (verites.length === 0) return null;
    return verites[Math.floor(Math.random() * verites.length)];
}

// ACTIONS
function getActions() {
    return readJsonFile('actions.json');
}

function addAction(actionText) {
    const actions = getActions();
    if (actions.includes(actionText)) {
        return false;
    }
    actions.push(actionText);
    return writeJsonFile('actions.json', actions);
}

function getRandomAction() {
    const actions = getActions();
    if (actions.length === 0) return null;
    return actions[Math.floor(Math.random() * actions.length)];
}

// GAGES
function getGages() {
    return readJsonFile('gages.json');
}

function addGage(gageText) {
    const gages = getGages();
    if (gages.includes(gageText)) {
        return false;
    }
    gages.push(gageText);
    return writeJsonFile('gages.json', gages);
}

function getRandomGage() {
    const gages = getGages();
    if (gages.length === 0) return null;
    return gages[Math.floor(Math.random() * gages.length)];
}

// MOTS (pour la modération auto)
function getMots() {
    return readJsonFile('mots.json');
}

function addMot(motText) {
    const mots = getMots();
    if (mots.includes(motText)) {
        return false;
    }
    mots.push(motText);
    return writeJsonFile('mots.json', mots);
}

function getRandomMot() {
    const mots = getMots();
    if (mots.length === 0) return null;
    return mots[Math.floor(Math.random() * mots.length)];
}

module.exports = {
    getVerites,
    addVerite,
    getRandomVerite,
    getActions,
    addAction,
    getRandomAction,
    getGages,
    addGage,
    getRandomGage,
    getMots,
    addMot,
    getRandomMot
};
