const configManager = require('./utils/configManager');
const fs = require('fs');

console.log('🔍 Validation de la correction Daily Quiz');
console.log('========================================\n');

function validateConfigStructure() {
    console.log('1. Validation de la structure ConfigManager...');
    
    // Vérifier que les nouveaux accesseurs existent
    const requiredMethods = [
        'dailyQuizChannel',
        'dailyQuizChannelId',
        'gameChannel',
        'gameLeaderboard'
    ];
    
    let allMethodsExist = true;
    requiredMethods.forEach(method => {
        if (typeof configManager[method] !== 'undefined') {
            console.log(`   ✅ ${method}: Disponible`);
        } else {
            console.log(`   ❌ ${method}: Manquant`);
            allMethodsExist = false;
        }
    });
    
    return allMethodsExist;
}

function validateConfigCommand() {
    console.log('\n2. Validation de la commande config...');
    
    try {
        const configCommand = require('./commands/config.js');
        const CONFIG_SECTIONS = configCommand.data ? 
            eval(fs.readFileSync('./commands/config.js', 'utf8').match(/const CONFIG_SECTIONS = ({[\s\S]*?});/)[1]) :
            null;
        
        if (CONFIG_SECTIONS && CONFIG_SECTIONS.games) {
            const gamesFields = CONFIG_SECTIONS.games.fields;
            const hasGameChannel = gamesFields.some(f => f.key === 'gameChannel');
            const hasDailyQuizChannel = gamesFields.some(f => f.key === 'dailyQuizChannel');
            const hasGameLeaderboard = gamesFields.some(f => f.key === 'gameLeaderboard');
            
            console.log(`   ✅ gameChannel: ${hasGameChannel ? 'Présent' : 'Manquant'}`);
            console.log(`   ✅ dailyQuizChannel: ${hasDailyQuizChannel ? 'Présent' : 'Manquant'}`);
            console.log(`   ✅ gameLeaderboard: ${hasGameLeaderboard ? 'Présent' : 'Manquant'}`);
            
            return hasGameChannel && hasDailyQuizChannel && hasGameLeaderboard;
        }
        
        return false;
    } catch (error) {
        console.log(`   ❌ Erreur lors de la validation: ${error.message}`);
        return false;
    }
}

function validateSchema() {
    console.log('\n3. Validation du schéma...');
    
    try {
        const schema = JSON.parse(fs.readFileSync('./config.schema.json', 'utf8'));
        const gamesProperties = schema.properties?.games?.properties;
        
        if (gamesProperties) {
            const hasGameChannel = 'gameChannel' in gamesProperties;
            const hasDailyQuizChannel = 'dailyQuizChannel' in gamesProperties;
            const hasGameLeaderboard = 'gameLeaderboard' in gamesProperties;
            
            console.log(`   ✅ gameChannel: ${hasGameChannel ? 'Défini' : 'Manquant'}`);
            console.log(`   ✅ dailyQuizChannel: ${hasDailyQuizChannel ? 'Défini' : 'Manquant'}`);
            console.log(`   ✅ gameLeaderboard: ${hasGameLeaderboard ? 'Défini' : 'Manquant'}`);
            
            return hasGameChannel && hasDailyQuizChannel && hasGameLeaderboard;
        }
        
        return false;
    } catch (error) {
        console.log(`   ❌ Erreur lors de la validation: ${error.message}`);
        return false;
    }
}

function testFunctionality() {
    console.log('\n4. Test de fonctionnalité...');
    
    try {
        // Test des getters
        const gameChannel = configManager.gameChannel;
        const dailyQuizChannel = configManager.dailyQuizChannel;
        const dailyQuizChannelId = configManager.dailyQuizChannelId;
        
        console.log('   📊 État actuel:');
        console.log(`      - gameChannel: ${gameChannel || 'Non configuré'}`);
        console.log(`      - dailyQuizChannel: ${dailyQuizChannel || 'Non configuré'}`);
        console.log(`      - dailyQuizChannelId: ${dailyQuizChannelId || 'Non configuré'}`);
        
        // Test de setter (simulation)
        console.log('\n   🧪 Test de configuration:');
        const testId = '999888777666555444';
        
        // Sauvegarder l'état actuel
        const originalConfig = JSON.parse(JSON.stringify(configManager.getConfig()));
        
        // Tester le setter
        configManager.dailyQuizChannel = testId;
        const newValue = configManager.dailyQuizChannel;
        
        if (newValue === testId) {
            console.log('   ✅ Setter dailyQuizChannel: Fonctionne');
        } else {
            console.log('   ❌ Setter dailyQuizChannel: Échec');
        }
        
        // Restaurer la configuration originale
        configManager.updateConfig(originalConfig);
        
        return newValue === testId;
    } catch (error) {
        console.log(`   ❌ Erreur lors du test: ${error.message}`);
        return false;
    }
}

// Exécuter toutes les validations
async function runAllValidations() {
    const results = {
        structure: validateConfigStructure(),
        command: validateConfigCommand(),
        schema: validateSchema(),
        functionality: testFunctionality()
    };
    
    console.log('\n📋 Résumé de la validation:');
    console.log('============================');
    
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'RÉUSSI' : 'ÉCHEC'}`);
    });
    
    const allPassed = Object.values(results).every(result => result);
    
    console.log('\n🎯 Résultat global:');
    if (allPassed) {
        console.log('✅ TOUTES LES VALIDATIONS RÉUSSIES');
        console.log('\n🎉 La correction du Daily Quiz est complète et fonctionnelle!');
        console.log('\n📝 Prochaines étapes:');
        console.log('   1. Utilisez /config pour configurer le canal Daily Quiz');
        console.log('   2. Testez le fonctionnement du Daily Quiz');
        console.log('   3. Vérifiez que les jeux généraux fonctionnent toujours');
    } else {
        console.log('❌ CERTAINES VALIDATIONS ONT ÉCHOUÉ');
        console.log('\n🔧 Actions requises:');
        console.log('   - Vérifiez les erreurs ci-dessus');
        console.log('   - Corrigez les problèmes identifiés');
        console.log('   - Relancez la validation');
    }
    
    return allPassed;
}

// Exécuter la validation
runAllValidations().catch(console.error);