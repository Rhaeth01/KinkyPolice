/**
 * Script de diagnostic pour tous les accesseurs du configManager
 */

console.log('🔍 DIAGNOSTIC COMPLET DES ACCESSEURS\n');

const configManager = require('./utils/configManager');

// Forcer le rechargement
configManager.forceReload();

console.log('1️⃣ ACCESSEURS DE LOGGING');
console.log('========================');

const loggingAccessors = [
    'logChannelId',
    'messageLogChannelId', 
    'voiceLogChannelId',
    'memberLogChannelId',
    'modLogChannelId'
];

loggingAccessors.forEach(accessor => {
    const value = configManager[accessor];
    console.log(`${value ? '✅' : '❌'} ${accessor}: ${value || 'undefined'}`);
});

console.log('\n2️⃣ ACCESSEURS DE CONFESSION');
console.log('============================');

const confessionAccessors = [
    'confessionChannelId'
];

confessionAccessors.forEach(accessor => {
    const value = configManager[accessor];
    console.log(`${value ? '✅' : '❌'} ${accessor}: ${value || 'undefined'}`);
});

console.log('\n3️⃣ ACCESSEURS DE JEUX');
console.log('======================');

const gameAccessors = [
    'dailyQuizChannelId',
    'gameChannel',
    'quizChannelId'
];

gameAccessors.forEach(accessor => {
    const value = configManager[accessor];
    console.log(`${value ? '✅' : '❌'} ${accessor}: ${value || 'undefined'}`);
});

console.log('\n4️⃣ ACCESSEURS DE TICKETS');
console.log('=========================');

const ticketAccessors = [
    'ticketCategoryId',
    'supportRole',
    'ticketLogs'
];

ticketAccessors.forEach(accessor => {
    const value = configManager[accessor];
    console.log(`${value ? '✅' : '❌'} ${accessor}: ${value || 'undefined'}`);
});

console.log('\n5️⃣ ACCESSEURS DE MODMAIL');
console.log('=========================');

const modmailAccessors = [
    'modmailCategory',
    'modmailLogs'
];

modmailAccessors.forEach(accessor => {
    const value = configManager[accessor];
    console.log(`${value ? '✅' : '❌'} ${accessor}: ${value || 'undefined'}`);
});

console.log('\n6️⃣ ACCESSEURS GÉNÉRAUX');
console.log('=======================');

const generalAccessors = [
    'guildId',
    'prefix',
    'adminRole',
    'modRole',
    'staffRoleId',
    'memberRoleId',
    'welcomeChannel',
    'rulesChannel',
    'verificationRole'
];

generalAccessors.forEach(accessor => {
    const value = configManager[accessor];
    console.log(`${value ? '✅' : '❌'} ${accessor}: ${value || 'undefined'}`);
});

console.log('\n7️⃣ ACCESSEURS NSFW/KINK');
console.log('========================');

const kinkAccessors = [
    'nsfwChannel',
    'kinkLevels',
    'kinkLogs'
];

kinkAccessors.forEach(accessor => {
    const value = configManager[accessor];
    console.log(`${value ? '✅' : '❌'} ${accessor}: ${value || 'undefined'}`);
});

console.log('\n8️⃣ STRUCTURE BRUTE DU FICHIER');
console.log('==============================');

const config = configManager.getConfig();
console.log('📄 Sections disponibles:', Object.keys(config));

Object.entries(config).forEach(([section, data]) => {
    if (typeof data === 'object' && data !== null) {
        console.log(`\n📋 Section ${section}:`);
        Object.entries(data).forEach(([key, value]) => {
            console.log(`   ${key}: ${value || 'vide'}`);
        });
    }
});

console.log('\n9️⃣ PROBLÈMES IDENTIFIÉS');
console.log('========================');

const allAccessors = [
    ...loggingAccessors,
    ...confessionAccessors,
    ...gameAccessors,
    ...ticketAccessors,
    ...modmailAccessors,
    ...generalAccessors,
    ...kinkAccessors
];

const missingAccessors = allAccessors.filter(accessor => !configManager[accessor]);

if (missingAccessors.length > 0) {
    console.log('❌ Accesseurs manquants ou undefined:');
    missingAccessors.forEach(accessor => {
        console.log(`   - ${accessor}`);
    });
    
    console.log('\n💡 Solutions suggérées:');
    console.log('1. Utiliser /config pour configurer les valeurs manquantes');
    console.log('2. Vérifier la structure du fichier config.json');
    console.log('3. Exécuter npm run migrate:config si nécessaire');
} else {
    console.log('✅ Tous les accesseurs sont fonctionnels !');
}

console.log('\n🎯 DIAGNOSTIC TERMINÉ');