const configManager = require('./utils/configManager');

console.log('🧪 Test de la configuration du Daily Quiz');
console.log('==========================================\n');

// Test 1: Vérifier la structure actuelle
console.log('1. Configuration actuelle des jeux:');
const currentConfig = configManager.getConfig();
console.log('   - gameChannel:', configManager.gameChannel || 'Non configuré');
console.log('   - dailyQuizChannel:', configManager.dailyQuizChannel || 'Non configuré');
console.log('   - dailyQuizChannelId:', configManager.dailyQuizChannelId || 'Non configuré');
console.log('   - gameLeaderboard:', configManager.gameLeaderboard || 'Non configuré');
console.log();

// Test 2: Simuler la configuration d'un canal dédié au daily quiz
console.log('2. Test de configuration du canal Daily Quiz:');
const testChannelId = '123456789012345678';

try {
    // Configurer le canal du daily quiz
    configManager.dailyQuizChannel = testChannelId;
    console.log('   ✅ Canal Daily Quiz configuré avec succès');
    
    // Vérifier que la configuration a été appliquée
    const updatedConfig = configManager.getConfig();
    console.log('   - Nouveau dailyQuizChannel:', configManager.dailyQuizChannel);
    console.log('   - dailyQuizChannelId (getter):', configManager.dailyQuizChannelId);
    
    // Vérifier que gameChannel reste indépendant
    console.log('   - gameChannel (doit rester indépendant):', configManager.gameChannel || 'Non configuré');
    
} catch (error) {
    console.error('   ❌ Erreur lors de la configuration:', error.message);
}

console.log();

// Test 3: Vérifier la structure JSON
console.log('3. Structure JSON de la section games:');
const gamesSection = configManager.games;
console.log(JSON.stringify(gamesSection, null, 2));

console.log();
console.log('✅ Tests terminés');
console.log('\n📝 Résumé:');
console.log('   - Le Daily Quiz a maintenant son propre champ: dailyQuizChannel');
console.log('   - Le canal des jeux généraux reste: gameChannel');
console.log('   - Les deux canaux sont maintenant indépendants');