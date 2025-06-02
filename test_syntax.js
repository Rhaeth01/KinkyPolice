/**
 * Test de syntaxe pour vérifier que tous les fichiers se chargent correctement
 */

console.log('🔍 Vérification de la syntaxe des fichiers...\n');

const tests = [
    { name: 'ConfigManager', path: './utils/configManager' },
    { name: 'Config Command', path: './commands/config' },
    { name: 'Config Handler', path: './handlers/configInteractionHandler' },
    { name: 'Interaction Events', path: './events/interactionCreate' }
];

let allPassed = true;

tests.forEach(test => {
    try {
        require(test.path);
        console.log(`✅ ${test.name} - Syntaxe correcte`);
    } catch (error) {
        console.log(`❌ ${test.name} - Erreur: ${error.message}`);
        allPassed = false;
    }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
    console.log('🎉 Tous les fichiers ont une syntaxe correcte !');
    console.log('✅ L\'interface moderne de configuration est prête !');
    console.log('\n🚀 Pour utiliser la nouvelle interface :');
    console.log('   1. Redémarrez votre bot Discord');
    console.log('   2. Tapez /config dans un canal');
    console.log('   3. Profitez de l\'interface moderne !');
} else {
    console.log('❌ Des erreurs de syntaxe ont été détectées.');
    console.log('   Veuillez corriger les erreurs avant de continuer.');
    process.exit(1);
}

module.exports = { tests };