require('dotenv').config();
const { REST, Routes } = require('discord.js');
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log('🧹 Début de la suppression des commandes...');
        
        // Supprimer les commandes globales
        console.log('Suppression des commandes globales...');
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log('✅ Commandes globales supprimées');
        
        // Supprimer les commandes du serveur spécifique si GUILD_ID est défini
        if (guildId) {
            console.log(`Suppression des commandes du serveur ${guildId}...`);
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
            console.log('✅ Commandes du serveur supprimées');
        }
        
        console.log('🎉 Toutes les commandes ont été supprimées avec succès!');
        console.log('⚠️  N\'oubliez pas de redéployer les commandes avec: npm run deploy');
    } catch (error) {
        console.error('❌ Erreur lors de la suppression des commandes:', error);
    }
})();