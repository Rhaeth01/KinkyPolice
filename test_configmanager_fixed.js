#!/usr/bin/env node

/**
 * Test simple du configManager corrigé
 */

const configManager = require('./utils/configManager');

async function runTests() {
    console.log('🧪 TEST DU CONFIGMANAGER CORRIGÉ');
    console.log('=================================\n');

    // Test 1: Chargement de base
    console.log('1️⃣ Test de chargement...');
    try {
        const config = configManager.getConfig();
        console.log('✅ Configuration chargée');
        console.log('📋 Sections:', Object.keys(config).join(', '));
    } catch (error) {
        console.log('❌ Erreur de chargement:', error.message);
        return;
    }

    // Test 2: Accesseurs de lecture
    console.log('\n2️⃣ Test des accesseurs de lecture...');
    const accessors = [
        'confessionChannelId',
        'logChannelId', 
        'voiceLogChannelId',
        'dailyQuizChannelId',
        'newMemberRoleIds'
    ];

    accessors.forEach(accessor => {
        try {
            const value = configManager[accessor];
            console.log(`✅ ${accessor}: ${value || 'undefined'}`);
        } catch (error) {
            console.log(`❌ ${accessor}: ${error.message}`);
        }
    });

    // Test 3: Test d'écriture/lecture
    console.log('\n3️⃣ Test d\'écriture/lecture...');
    try {
        const testValue = 'test_' + Date.now();
        console.log(`📝 Test avec la valeur: ${testValue}`);
        
        // Écriture
        await configManager.updateConfig({
            confession: {
                confessionChannel: testValue
            }
        });
        console.log('✅ Écriture réussie');
        
        // Lecture
        configManager.forceReload();
        const readValue = configManager.confessionChannelId;
        console.log(`📖 Valeur lue: ${readValue}`);
        
        if (readValue === testValue) {
            console.log('✅ Test d\'écriture/lecture réussi');
        } else {
            console.log('❌ Test d\'écriture/lecture échoué');
            console.log(`   Attendu: ${testValue}`);
            console.log(`   Obtenu: ${readValue}`);
        }
        
    } catch (error) {
        console.log('❌ Erreur lors du test d\'écriture/lecture:', error.message);
    }

    console.log('\n🎯 Tests terminés');
}

runTests().catch(console.error);