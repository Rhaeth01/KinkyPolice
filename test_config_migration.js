#!/usr/bin/env node

/**
 * Script de test pour vérifier la migration vers configManager
 * Ce script teste tous les accesseurs et vérifie la cohérence
 */

const configManager = require('./utils/configManager');

async function runTests() {
    console.log('🧪 TEST DE MIGRATION VERS CONFIGMANAGER');
    console.log('========================================\n');

    // Test 1: Vérification du chargement de base
    console.log('1️⃣ TEST DE CHARGEMENT DE BASE');
    console.log('------------------------------');

    try {
        const config = configManager.getConfig();
        console.log('✅ Configuration chargée avec succès');
        console.log('📋 Sections disponibles:', Object.keys(config));
    } catch (error) {
        console.error('❌ Erreur de chargement:', error.message);
        process.exit(1);
    }

    // Test 2: Vérification des accesseurs principaux
    console.log('\n2️⃣ TEST DES ACCESSEURS PRINCIPAUX');
    console.log('----------------------------------');

    const mainAccessors = [
        'confessionChannelId',
        'logChannelId',
        'messageLogChannelId',
        'voiceLogChannelId',
        'dailyQuizChannelId',
        'quizChannelId',
        'ticketCategoryId',
        'supportCategoryId',
        'logsTicketsChannelId'
    ];

    let successCount = 0;
    let totalCount = mainAccessors.length;

    mainAccessors.forEach(accessor => {
        try {
            const value = configManager[accessor];
            if (value !== undefined) {
                console.log(`✅ ${accessor}: ${value || 'vide'}`);
                successCount++;
            } else {
                console.log(`⚠️  ${accessor}: undefined`);
            }
        } catch (error) {
            console.log(`❌ ${accessor}: erreur - ${error.message}`);
        }
    });

    console.log(`\n📊 Résultat: ${successCount}/${totalCount} accesseurs fonctionnels`);

    // Test 3: Test d'écriture et lecture
    console.log('\n3️⃣ TEST D\'ÉCRITURE ET LECTURE');
    console.log('-------------------------------');

    try {
        // Sauvegarder la valeur actuelle
        const originalValue = configManager.confessionChannelId;
        console.log(`📖 Valeur originale confessionChannelId: ${originalValue}`);
        
        // Tester l'écriture
        const testValue = '123456789012345678';
        console.log(`✏️  Tentative d'écriture: ${testValue}`);
        
        await configManager.updateConfig({
            confession: {
                confessionChannel: testValue
            }
        });
        console.log('✅ Écriture réussie');
        
        // Vérifier la lecture
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
        
        // Restaurer la valeur originale si elle existait
        if (originalValue) {
            await configManager.updateConfig({
                confession: {
                    confessionChannel: originalValue
                }
            });
            console.log(`🔄 Valeur originale restaurée: ${originalValue}`);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du test d\'écriture/lecture:', error.message);
    }

    // Test 4: Vérification de la structure
    console.log('\n4️⃣ TEST DE LA STRUCTURE');
    console.log('------------------------');

    const expectedSections = ['general', 'entry', 'modmail', 'tickets', 'logging', 'welcome', 'confession', 'games', 'kink'];
    const config = configManager.getConfig();
    const actualSections = Object.keys(config);

    expectedSections.forEach(section => {
        if (actualSections.includes(section)) {
            console.log(`✅ Section ${section}: présente`);
            if (config[section] && typeof config[section] === 'object') {
                const keys = Object.keys(config[section]);
                console.log(`   📋 Clés: ${keys.join(', ') || 'aucune'}`);
            }
        } else {
            console.log(`❌ Section ${section}: manquante`);
        }
    });

    // Test 5: Test des nouveaux accesseurs
    console.log('\n5️⃣ TEST DES NOUVEAUX ACCESSEURS');
    console.log('--------------------------------');

    const newAccessors = [
        'confessionChannel',
        'confessionLogs', 
        'confessionRole',
        'gameChannel',
        'gameLeaderboard',
        'nsfwChannel',
        'kinkLevels',
        'kinkLogs'
    ];

    newAccessors.forEach(accessor => {
        try {
            const value = configManager[accessor];
            console.log(`${value !== undefined ? '✅' : '⚠️'} ${accessor}: ${value || 'undefined'}`);
        } catch (error) {
            console.log(`❌ ${accessor}: erreur - ${error.message}`);
        }
    });

    // Test 6: Compatibilité avec l'ancienne structure
    console.log('\n6️⃣ TEST DE COMPATIBILITÉ');
    console.log('-------------------------');

    const legacyAccessors = [
        'newMemberRoleIds',
        'memberRoleId',
        'reglesValidesId',
        'forbiddenRoleIds'
    ];

    legacyAccessors.forEach(accessor => {
        try {
            const value = configManager[accessor];
            console.log(`${value !== undefined ? '✅' : '⚠️'} ${accessor}: ${Array.isArray(value) ? `[${value.length} éléments]` : value || 'undefined'}`);
        } catch (error) {
            console.log(`❌ ${accessor}: erreur - ${error.message}`);
        }
    });

    console.log('\n🎯 RÉSUMÉ DU TEST');
    console.log('=================');

    if (successCount === totalCount) {
        console.log('✅ Tous les tests principaux sont passés avec succès !');
        console.log('🚀 La migration vers configManager est fonctionnelle');
    } else {
        console.log(`⚠️  ${totalCount - successCount} tests ont échoué`);
        console.log('🔧 Certains accesseurs nécessitent une configuration');
    }

    console.log('\n💡 PROCHAINES ÉTAPES');
    console.log('====================');
    console.log('1. Utiliser /config pour configurer les valeurs manquantes');
    console.log('2. Tester les fonctionnalités du bot');
    console.log('3. Vérifier les logs pour d\'éventuelles erreurs');
}

// Exécuter les tests
runTests().catch(error => {
    console.error('❌ Erreur lors des tests:', error);
    process.exit(1);
});