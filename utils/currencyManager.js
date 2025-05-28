const fs = require('node:fs').promises;
const path = require('node:path');
const currencyFilePath = path.join(__dirname, '..', 'data', 'currency.json');

async function ensureCurrencyFile() {
    try {
        await fs.access(currencyFilePath);
    } catch (error) {
        await fs.writeFile(currencyFilePath, JSON.stringify({}), 'utf8');
    }
}

async function getCurrencyData() {
    await ensureCurrencyFile();
    try {
        const data = await fs.readFile(currencyFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Erreur lors de la lecture du fichier de monnaie:", error);
        return {};
    }
}

async function saveCurrencyData(data) {
    try {
        await fs.writeFile(currencyFilePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error("Erreur lors de l'écriture dans le fichier de monnaie:", error);
        return false;
    }
}

async function getUserBalance(userId) {
    const currencyData = await getCurrencyData();
    return currencyData[userId] || 0;
}

async function addCurrency(userId, amount) {
    const currencyData = await getCurrencyData();
    currencyData[userId] = (currencyData[userId] || 0) + amount;
    return saveCurrencyData(currencyData);
}

async function removeCurrency(userId, amount) {
    const currencyData = await getCurrencyData();
    if ((currencyData[userId] || 0) >= amount) {
        currencyData[userId] -= amount;
        return saveCurrencyData(currencyData);
    }
    return false; // Solde insuffisant
}

module.exports = {
    getUserBalance,
    addCurrency,
    removeCurrency
};