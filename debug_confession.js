/**
 * Script de diagnostic pour le problème de confessionChannelId
 */

console.log('🔍 DIAGNOSTIC CONFESSION CHANNEL ID\n');

// Charger le configManager
const configManager = require('./utils/configManager');

console.log('1️⃣ ÉTAT ACTUEL DU CONFIG MANAGER');
console.log('================================');

// Forcer le rechargement
configManager.forceReload();
const config = configManager.getConfig();

console.log('📊 Configuration complète:');
console.log(JSON.stringify(config, null, 2));

console.log('\n2️⃣ TESTS DES ACCESSEURS');
console.log('========================');

// Tester tous les accesseurs
console.log('🔍 Accesseurs du configManager:');
console.log('- general:', configManager.general);
console.log('- confession:', configManager.confession);
console.log('- logging:', configManager.logging);

console.log('\n🎯 Test spécifique confessionChannelId:');
console.log('- configManager.confessionChannelId:', configManager.confessionChannelId);
console.log('- config.confession?.confessionChannel:', config.confession?.confessionChannel);
console.log('- config.confessionChannelId:', config.confessionChannelId);
console.log('- config.logging?.confessionChannelId:', config.logging?.confessionChannelId);

console.log('\n3️⃣ SIMULATION COMMANDE CONFESSION');
console.log('==================================');

// Simuler ce que fait la commande confession
const confessionChannelId = configManager.confessionChannelId;
console.log(`[CONFIG DEBUG] confessionChannelId utilisé dans /confession: ${confessionChannelId}`);

if (confessionChannelId) {
    console.log('✅ confessionChannelId trouvé:', confessionChannelId);
    console.log('   Type:', typeof confessionChannelId);
    console.log('   Longueur:', confessionChannelId.length);
    console.log('   Est un ID Discord valide:', /^\d{17,19}$/.test(confessionChannelId));
} else {
    console.log('❌ confessionChannelId est undefined/null/empty');
}

console.log('\n4️⃣ VÉRIFICATION FICHIER CONFIG.JSON');
console.log('====================================');

const configManager = require('./utils/configManager'); // Utiliser le configManager au lieu de config.json direct

try {
    const rawConfig = configManager.getConfig();
    console.log('📄 Configuration via configManager:');
    console.log(JSON.stringify(rawConfig, null, 2));
    
    console.log('\n📋 Configuration parsée:');
    console.log('- confession section:', rawConfig.confession);
    console.log('- confessionChannel:', rawConfig.confession?.confessionChannel);
    
} catch (error) {
    console.error('❌ Erreur lecture configuration:', error.message);
}

console.log('\n5️⃣ COMPARAISON AVEC CONFIG-BACKUP');
console.log('==================================');

try {
    const fs = require('fs');
    const path = require('path');
    const backupPath = path.join(__dirname, 'config-backup.json');
    if (fs.existsSync(backupPath)) {
        const backupConfig = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        console.log('📄 confessionChannelId dans backup:', backupConfig.confessionChannelId);
        console.log('📄 Structure backup:', Object.keys(backupConfig));
    } else {
        console.log('❌ Fichier config-backup.json non trouvé');
    }
} catch (error) {
    console.error('❌ Erreur lecture backup:', error.message);
}

console.log('\n6️⃣ RECOMMANDATIONS');
console.log('==================');

if (!confessionChannelId) {
    console.log('🔧 PROBLÈME IDENTIFIÉ: confessionChannelId non accessible');
    console.log('\n💡 Solutions possibles:');
    console.log('1. Vérifier la structure dans config.json');
    console.log('2. Utiliser l\'interface /config pour reconfigurer');
    console.log('3. Vérifier les accesseurs dans configManager.js');
    console.log('4. Migrer depuis config-backup.json si nécessaire');
} else {
    console.log('✅ confessionChannelId accessible, problème ailleurs');
    console.log('\n🔍 Vérifications supplémentaires:');
    console.log('1. Le canal existe-t-il sur Discord?');
    console.log('2. Le bot a-t-il accès au canal?');
    console.log('3. Y a-t-il un cache Discord à vider?');
}

console.log('\n🎯 DIAGNOSTIC TERMINÉ');