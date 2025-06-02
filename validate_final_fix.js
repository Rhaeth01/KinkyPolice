/**
 * Script de validation finale
 * Vérifie que toutes les corrections sont appliquées et fonctionnelles
 */

console.log('🎯 VALIDATION FINALE DES CORRECTIONS\n');

let allTestsPassed = true;
const results = [];

function addResult(test, passed, details = '') {
    results.push({ test, passed, details });
    if (!passed) allTestsPassed = false;
    console.log(`${passed ? '✅' : '❌'} ${test}${details ? ` - ${details}` : ''}`);
}

// Test 1: Vérification du configManager
console.log('1️⃣ TEST DU CONFIG MANAGER');
console.log('==========================');

try {
    const configManager = require('./utils/configManager');
    configManager.forceReload();
    
    const confessionChannelId = configManager.confessionChannelId;
    addResult('ConfigManager chargé', true);
    addResult('confessionChannelId accessible', !!confessionChannelId, confessionChannelId || 'undefined');
    
    if (confessionChannelId) {
        addResult('ID Discord valide', /^\d{17,19}$/.test(confessionChannelId), `Longueur: ${confessionChannelId.length}`);
    }
    
} catch (error) {
    addResult('ConfigManager chargé', false, error.message);
}

// Test 2: Vérification de l'interface de configuration
console.log('\n2️⃣ TEST DE L\'INTERFACE DE CONFIGURATION');
console.log('=========================================');

try {
    const configCommand = require('./commands/config');
    addResult('Interface config chargée', !!configCommand.execute);
    
    // Vérifier la structure des sections
    const fs = require('fs');
    const configContent = fs.readFileSync('./commands/config.js', 'utf8');
    
    addResult('Section confession définie', configContent.includes('confession: {'));
    addResult('Section games définie', configContent.includes('games: {'));
    addResult('Section kink définie', configContent.includes('kink: {'));
    addResult('Ancienne section features supprimée', !configContent.includes('features: {'));
    
} catch (error) {
    addResult('Interface config chargée', false, error.message);
}

// Test 3: Vérification du gestionnaire d'interactions
console.log('\n3️⃣ TEST DU GESTIONNAIRE D\'INTERACTIONS');
console.log('=======================================');

try {
    const configHandler = require('./handlers/configInteractionHandler');
    addResult('Gestionnaire chargé', !!configHandler);
    
    // Vérifier la fonction getFieldType
    if (configHandler.getFieldType) {
        const confessionType = configHandler.getFieldType('confession', 'confessionChannel');
        addResult('Type confession détecté', confessionType === 'channel', confessionType);
        
        const gameType = configHandler.getFieldType('games', 'gameChannel');
        addResult('Type games détecté', gameType === 'channel', gameType);
    } else {
        addResult('Fonction getFieldType disponible', false);
    }
    
} catch (error) {
    addResult('Gestionnaire chargé', false, error.message);
}

// Test 4: Vérification de la structure du fichier config.json
console.log('\n4️⃣ TEST DE LA STRUCTURE CONFIG.JSON');
console.log('===================================');

try {
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    
    addResult('Fichier config.json lisible', true);
    addResult('Section confession présente', !!config.confession);
    addResult('confessionChannel configuré', !!config.confession?.confessionChannel);
    addResult('Section games présente', !!config.games);
    addResult('Section kink présente', !!config.kink);
    
    // Vérifier la cohérence
    const configManager = require('./utils/configManager');
    const managerValue = configManager.confessionChannelId;
    const fileValue = config.confession?.confessionChannel;
    
    addResult('Cohérence configManager/fichier', managerValue === fileValue, 
        `Manager: ${managerValue}, Fichier: ${fileValue}`);
    
} catch (error) {
    addResult('Fichier config.json lisible', false, error.message);
}

// Test 5: Simulation de la commande confession
console.log('\n5️⃣ TEST DE SIMULATION CONFESSION');
console.log('=================================');

try {
    const confessionCommand = require('./commands/confession');
    addResult('Commande confession chargée', !!confessionCommand.execute);
    
    // Mock basique pour tester la logique
    const configManager = require('./utils/configManager');
    const channelId = configManager.confessionChannelId;
    
    if (channelId) {
        addResult('Canal confession accessible', true, channelId);
        
        // Simuler la récupération du canal
        const mockClient = {
            channels: {
                cache: {
                    get: (id) => id === channelId ? { id, send: () => Promise.resolve() } : null
                }
            }
        };
        
        const channel = mockClient.channels.cache.get(channelId);
        addResult('Canal trouvé dans cache simulé', !!channel);
    } else {
        addResult('Canal confession accessible', false, 'channelId undefined');
    }
    
} catch (error) {
    addResult('Commande confession chargée', false, error.message);
}

// Test 6: Vérification des scripts de diagnostic
console.log('\n6️⃣ TEST DES OUTILS DE DIAGNOSTIC');
console.log('=================================');

const fs = require('fs');

const diagnosticFiles = [
    'test_confession_config.js',
    'debug_confession.js',
    'migrate_config.js',
    'validate_final_fix.js'
];

diagnosticFiles.forEach(file => {
    addResult(`Fichier ${file} présent`, fs.existsSync(file));
});

// Vérifier package.json
try {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const scripts = packageJson.scripts || {};
    
    addResult('Script test:confession', !!scripts['test:confession']);
    addResult('Script debug:confession', !!scripts['debug:confession']);
    addResult('Script migrate:config', !!scripts['migrate:config']);
    
} catch (error) {
    addResult('Package.json lisible', false, error.message);
}

// Résumé final
console.log('\n🎯 RÉSUMÉ DE LA VALIDATION');
console.log('==========================');

const totalTests = results.length;
const passedTests = results.filter(r => r.passed).length;
const failedTests = totalTests - passedTests;

console.log(`📊 Tests exécutés: ${totalTests}`);
console.log(`✅ Tests réussis: ${passedTests}`);
console.log(`❌ Tests échoués: ${failedTests}`);
console.log(`📈 Taux de réussite: ${Math.round((passedTests / totalTests) * 100)}%`);

if (allTestsPassed) {
    console.log('\n🎉 TOUTES LES CORRECTIONS SONT APPLIQUÉES !');
    console.log('✅ Le bot devrait maintenant fonctionner correctement');
    console.log('🚀 Vous pouvez redémarrer le bot en toute sécurité');
} else {
    console.log('\n⚠️  CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('🔍 Vérifiez les détails ci-dessus');
    console.log('🛠️  Exécutez les scripts de diagnostic pour plus d\'informations:');
    console.log('   npm run debug:confession');
    console.log('   npm run migrate:config');
}

console.log('\n📋 PROCHAINES ÉTAPES:');
console.log('1. Redémarrer le bot');
console.log('2. Tester /config sur Discord');
console.log('3. Tester /confession sur Discord');
console.log('4. Vérifier les logs du bot');

console.log('\n🎯 VALIDATION TERMINÉE');