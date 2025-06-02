#!/usr/bin/env node

/**
 * Script de test pour vérifier le bon fonctionnement du système de configuration
 */

const configManager = require('./utils/configManager');

async function testConfiguration() {
    console.log('🧪 Test du système de configuration...\n');
    
    try {
        // Test 1: Chargement de la configuration
        console.log('1️⃣ Test de chargement...');
        const config = configManager.getConfig();
        console.log('✅ Configuration chargée avec succès');
        console.log(`📊 Sections trouvées: ${Object.keys(config).length}`);
        
        // Test 2: Sauvegarde d'un test
        console.log('\n2️⃣ Test de sauvegarde...');
        const originalConfig = { ...config };
        const testConfig = { ...config };
        testConfig.test_section = {
            test_param: 'test_value_' + Date.now()
        };
        
        await configManager.updateConfig(testConfig);
        console.log('✅ Sauvegarde effectuée');
        
        // Test 3: Vérification de la persistance
        console.log('\n3️⃣ Test de persistance...');
        const reloadedConfig = configManager.forceReload();
        
        if (reloadedConfig.test_section && reloadedConfig.test_section.test_param) {
            console.log('✅ Données persistées correctement');
        } else {
            console.log('❌ Données non persistées');
            return false;
        }
        
        // Test 4: Nettoyage
        console.log('\n4️⃣ Nettoyage...');
        delete reloadedConfig.test_section;
        await configManager.updateConfig(reloadedConfig);
        
        const finalConfig = configManager.forceReload();
        if (!finalConfig.test_section) {
            console.log('✅ Nettoyage réussi');
        } else {
            console.log('⚠️ Nettoyage partiel');
        }
        
        // Test 5: Vérification des sections existantes
        console.log('\n5️⃣ Vérification des sections...');
        const expectedSections = ['general', 'entry', 'modmail', 'tickets', 'logging', 'welcome', 'confession', 'games', 'kink'];
        const missingSections = expectedSections.filter(section => !finalConfig[section]);
        
        if (missingSections.length === 0) {
            console.log('✅ Toutes les sections sont présentes');
        } else {
            console.log(`⚠️ Sections manquantes: ${missingSections.join(', ')}`);
        }
        
        console.log('\n🎉 Tests terminés avec succès !');
        return true;
        
    } catch (error) {
        console.error('\n❌ Erreur lors des tests:', error.message);
        console.error(error.stack);
        return false;
    }
}

// Exécuter les tests si le script est appelé directement
if (require.main === module) {
    testConfiguration().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { testConfiguration };