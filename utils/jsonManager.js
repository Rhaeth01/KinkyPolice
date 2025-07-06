const fs = require('node:fs');
const path = require('node:path');
const dataFolderPath = path.join(__dirname, '..', 'data');

// Fonction générique pour lire un fichier JSON (async)
async function readJsonFile(fileName) {
    const filePath = path.join(dataFolderPath, fileName);
    try {
        if (!fs.existsSync(filePath)) {
            // Crée le fichier avec un tableau vide s'il n'existe pas
            await fs.promises.writeFile(filePath, JSON.stringify([]), 'utf8');
            return [];
        }
        const data = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Erreur lors de la lecture du fichier ${fileName}:`, error);
        return []; // Retourne un tableau vide en cas d'erreur
    }
}

// Fonction générique pour écrire dans un fichier JSON (async)
async function writeJsonFile(fileName, data) {
    const filePath = path.join(dataFolderPath, fileName);
    try {
        await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Erreur lors de l'écriture dans le fichier ${fileName}:`, error);
        return false;
    }
}

// Fonctions spécifiques pour chaque type de données
// VERITES
async function getVerites() {
    return await readJsonFile('verites.json');
}

async function addVerite(veriteText) {
    const verites = await getVerites();
    if (verites.includes(veriteText)) {
        return false; // La vérité existe déjà
    }
    verites.push(veriteText);
    return await writeJsonFile('verites.json', verites);
}

async function getRandomVerite() {
    const verites = await getVerites();
    if (verites.length === 0) return null;
    return verites[Math.floor(Math.random() * verites.length)];
}

// ACTIONS
async function getActions() {
    return await readJsonFile('actions.json');
}

async function addAction(actionText) {
    const actions = await getActions();
    if (actions.includes(actionText)) {
        return false;
    }
    actions.push(actionText);
    return await writeJsonFile('actions.json', actions);
}

async function getRandomAction() {
    const actions = await getActions();
    if (actions.length === 0) return null;
    return actions[Math.floor(Math.random() * actions.length)];
}

// GAGES
async function getGages() {
    return await readJsonFile('gages.json');
}

async function addGage(gageText) {
    const gages = await getGages();
    if (gages.includes(gageText)) {
        return false;
    }
    gages.push(gageText);
    return await writeJsonFile('gages.json', gages);
}

async function getRandomGage() {
    const gages = await getGages();
    if (gages.length === 0) return null;
    return gages[Math.floor(Math.random() * gages.length)];
}

// MOTS (pour la modération auto)
async function getMots() {
    return await readJsonFile('mots.json');
}

async function addMot(motText) {
    const mots = await getMots();
    if (mots.includes(motText)) {
        return false;
    }
    mots.push(motText);
    return await writeJsonFile('mots.json', mots);
}

async function getRandomMot() {
    const mots = await getMots();
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
