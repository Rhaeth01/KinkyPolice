#!/usr/bin/env node

/**
 * Script de validation finale du configManager
 * Vérifie que tous les accesseurs fonctionnent et que la migration est complète
 */

const configManager = require('./utils/configManager');

async function validateConfigManager() {
    console.log('🔍 VALIDATION FINALE DU CONFIGMANAGER');
    console.log('=====================================\n');

    let allTestsPassed = true;

    // Test 1: Chargement de base
    console.log('1️⃣ Test de chargement de base...');
    try {
        const config = configManager.getConfig();
        console.log('✅ Configuration chargée');
        console.log(`📊 ${Object.keys(config).length} sections trouvées`);
    } catch (error) {
        console.log('❌ Erreur de chargement:', error.message);
        allTestsPassed = false;
    }

    // Test 2: Accesseurs critiques
    console.log('\n2️⃣ Test des accesseurs critiques...');
    const criticalAccessors = [
        'confessionChannelId',
        'logChannelId',
        'voiceLogChannelId',
        'newMemberRoleIds'
    ];

    let criticalCount = 0;
    criticalAccessors.forEach(accessor => {
        try {
            const value = configManager[accessor];
            console.log(`✅ ${accessor}: ${typeof value} ${Array.isArray(value) ? `[${value.length}]` : ''}`);
            criticalCount++;
        } catch (error) {
            console.log(`❌ ${accessor}: ${error.message}`);
            allTestsPassed = false;
        }
    });

    // Test 3: Test d'écriture rapide
    console.log('\n3️⃣ Test d\'écriture rapide...');
    try {
        const testValue = 'validation_' + Date.now();
        await configManager.updateConfig({
            confession: { confessionChannel: testValue }
        });
        
        configManager.forceReload();
        const readValue = configManager.confessionChannelId;
        
        if (readValue === testValue) {
            console.log('✅ Écriture/lecture fonctionnelle');
        } else {
            console.log('❌ Problème d\'écriture/lecture');
            allTestsPassed = false;
        }
    } catch (error) {
        console.log('❌ Erreur d\'écriture:', error.message);
        allTestsPassed = false;
    }

    // Test 4: Vérification des sections
    console.log('\n4️⃣ Test des sections...');
    const requiredSections = ['general', 'entry', 'logging', 'confession'];
    const config = configManager.getConfig();
    
    requiredSections.forEach(section => {
        if (config[section]) {
            console.log(`✅ Section ${section}: présente`);
        } else {
            console.log(`⚠️  Section ${section}: manquante`);
        }
    });

    // Résultat final
    console.log('\n🎯 RÉSULTAT FINAL');
    console.log('=================');
    
    if (allTestsPassed) {
        console.log('✅ TOUS LES TESTS SONT PASSÉS !');
        console.log('🚀 Le configManager est prêt à être utilisé');
        console.log('\n💡 Prochaines étapes:');
        console.log('   1. Tester avec le bot en mode développement');
        console.log('   2. Configurer les valeurs manquantes avec /config');
        console.log('   3. Vérifier les logs du bot');
    } else {
        console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ');
        console.log('🔧 Vérifiez les erreurs ci-dessus');
        process.exit(1);
    }
}

validateConfigManager().catch(error => {
    console.error('❌ Erreur de validation:', error);
    process.exit(1);
});