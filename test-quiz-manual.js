require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { sendQuiz } = require('./utils/dailyQuizScheduler');

/**
 * Script de test pour déclencher manuellement un quiz quotidien
 * Utile pour tester le système sans attendre l'heure programmée
 */

const token = process.env.TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

async function testQuizSystem() {
    try {
        console.log('🔍 Test du système de quiz quotidien...\n');
        
        // Se connecter au bot
        console.log('📡 Connexion au bot Discord...');
        await client.login(token);
        
        console.log('✅ Bot connecté avec succès!');
        console.log(`📊 Bot connecté en tant que: ${client.user.tag}`);
        
        // Attendre un peu pour que tout soit initialisé
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Déclencher le quiz manuellement
        console.log('\n🎯 Déclenchement manuel du quiz quotidien...');
        await sendQuiz(client);
        
        console.log('\n✅ Test terminé! Vérifiez le canal configuré pour voir le quiz.');
        console.log('💡 Si aucun quiz n\'apparaît, vérifiez:');
        console.log('   - Que le canal est correctement configuré');
        console.log('   - Que le bot a les permissions d\'écrire dans le canal');
        console.log('   - Que les fichiers de questions existent');
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error);
        
        if (error.code === 50001) {
            console.log('💡 Erreur de permissions - Le bot n\'a pas accès au canal configuré');
        } else if (error.code === 10003) {
            console.log('💡 Canal introuvable - Vérifiez l\'ID du canal dans la configuration');
        } else if (error.message.includes('quiz')) {
            console.log('💡 Problème avec les données de quiz - Vérifiez le fichier data/quiz.json');
        }
    } finally {
        // Déconnecter le bot
        console.log('\n🔌 Déconnexion du bot...');
        client.destroy();
        process.exit(0);
    }
}

// Gérer les événements du client
client.once('ready', () => {
    console.log(`✅ Bot prêt: ${client.user.tag}`);
});

client.on('error', (error) => {
    console.error('❌ Erreur du client Discord:', error);
});

// Lancer le test
if (require.main === module) {
    testQuizSystem().catch(console.error);
}

module.exports = { testQuizSystem };
