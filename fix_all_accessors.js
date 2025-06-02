/**
 * Script de correction automatique pour tous les accesseurs
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION AUTOMATIQUE DES ACCESSEURS\n');

// Charger la configuration actuelle
const configPath = path.join(__dirname, 'config.json');
let config = {};

try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('✅ Configuration actuelle chargée');
} catch (error) {
    console.error('❌ Erreur lecture config:', error.message);
    process.exit(1);
}

// Fonction pour s'assurer qu'une section existe
function ensureSection(sectionName) {
    if (!config[sectionName]) {
        config[sectionName] = {};
        console.log(`➕ Section ${sectionName} créée`);
    }
}

// Fonction pour s'assurer qu'un champ existe avec une valeur par défaut
function ensureField(section, field, defaultValue = '') {
    if (!config[section][field]) {
        config[section][field] = defaultValue;
        console.log(`➕ Champ ${section}.${field} créé avec valeur par défaut`);
    }
}

console.log('1️⃣ VÉRIFICATION DES SECTIONS');
console.log('=============================');

// S'assurer que toutes les sections existent
const requiredSections = [
    'general', 'entry', 'modmail', 'tickets', 
    'logging', 'welcome', 'confession', 'games', 'kink'
];

requiredSections.forEach(section => {
    ensureSection(section);
});

console.log('\n2️⃣ VÉRIFICATION DES CHAMPS');
console.log('===========================');

// Champs requis par section
const requiredFields = {
    general: [
        'prefix', 'adminRole', 'modRole', 'guildId'
    ],
    entry: [
        'welcomeChannel', 'rulesChannel', 'verificationRole', 
        'staffRoleId', 'memberRoleId'
    ],
    modmail: [
        'modmailCategory', 'modmailLogs', 'categoryId', 'logChannelId'
    ],
    tickets: [
        'ticketCategory', 'supportRole', 'ticketLogs', 'ticketCategoryId'
    ],
    logging: [
        'modLogs', 'messageLogs', 'voiceLogs', 'memberLogs',
        'logChannelId', 'messageLogChannelId', 'voiceLogChannelId', 'memberLogChannelId'
    ],
    welcome: [
        'welcomeMessage', 'rulesMessage', 'welcomeDM'
    ],
    confession: [
        'confessionChannel', 'confessionLogs', 'confessionRole'
    ],
    games: [
        'gameChannel', 'gameLeaderboard', 'dailyQuizChannelId', 'quizChannelId'
    ],
    kink: [
        'nsfwChannel', 'kinkLevels', 'kinkLogs'
    ]
};

// Ajouter les champs manquants
Object.entries(requiredFields).forEach(([section, fields]) => {
    fields.forEach(field => {
        ensureField(section, field);
    });
});

console.log('\n3️⃣ MIGRATION DES VALEURS EXISTANTES');
console.log('====================================');

// Migrer les valeurs de l'ancienne structure vers la nouvelle
const migrations = [
    // Logging
    { from: 'logChannelId', to: 'logging.logChannelId' },
    { from: 'messageLogChannelId', to: 'logging.messageLogChannelId' },
    { from: 'voiceLogChannelId', to: 'logging.voiceLogChannelId' },
    { from: 'memberLogChannelId', to: 'logging.memberLogChannelId' },
    
    // Confession
    { from: 'confessionChannelId', to: 'confession.confessionChannel' },
    
    // Games
    { from: 'dailyQuizChannelId', to: 'games.dailyQuizChannelId' },
    { from: 'quizChannelId', to: 'games.quizChannelId' },
    
    // Tickets
    { from: 'ticketCategoryId', to: 'tickets.ticketCategoryId' },
    { from: 'supportRole', to: 'tickets.supportRole' },
    
    // Welcome
    { from: 'welcomeChannel', to: 'entry.welcomeChannel' },
    { from: 'rulesChannel', to: 'entry.rulesChannel' },
    { from: 'welcomeMessage', to: 'welcome.welcomeMessage' },
    { from: 'rulesMessage', to: 'welcome.rulesMessage' }
];

migrations.forEach(({ from, to }) => {
    const oldValue = config[from];
    if (oldValue) {
        const [section, field] = to.split('.');
        if (!config[section][field]) {
            config[section][field] = oldValue;
            console.log(`🔄 Migré ${from} → ${to}: ${oldValue}`);
        }
        // Supprimer l'ancienne valeur
        delete config[from];
    }
});

console.log('\n4️⃣ VALEURS PAR DÉFAUT SPÉCIALES');
console.log('================================');

// Valeurs par défaut spéciales
if (!config.general.prefix) {
    config.general.prefix = '!';
    console.log('🔧 Prefix par défaut défini: !');
}

if (!config.kink.kinkLevels) {
    config.kink.kinkLevels = 'false';
    console.log('🔧 kinkLevels par défaut défini: false');
}

console.log('\n5️⃣ SAUVEGARDE');
console.log('==============');

// Créer une sauvegarde
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(__dirname, `config-before-fix-${timestamp}.json`);

try {
    fs.copyFileSync(configPath, backupPath);
    console.log(`💾 Sauvegarde créée: ${backupPath}`);
} catch (error) {
    console.error('❌ Erreur sauvegarde:', error.message);
}

// Écrire la nouvelle configuration
try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('✅ Configuration corrigée et sauvegardée');
} catch (error) {
    console.error('❌ Erreur écriture:', error.message);
    process.exit(1);
}

console.log('\n6️⃣ VÉRIFICATION POST-CORRECTION');
console.log('================================');

// Vérifier que les accesseurs fonctionnent maintenant
try {
    const configManager = require('./utils/configManager');
    configManager.forceReload();
    
    const testAccessors = [
        'confessionChannelId',
        'messageLogChannelId',
        'voiceLogChannelId',
        'dailyQuizChannelId',
        'ticketCategoryId'
    ];
    
    testAccessors.forEach(accessor => {
        const value = configManager[accessor];
        console.log(`${value ? '✅' : '❌'} ${accessor}: ${value || 'undefined'}`);
    });
    
} catch (error) {
    console.error('❌ Erreur test accesseurs:', error.message);
}

console.log('\n🎉 CORRECTION TERMINÉE');
console.log('Redémarrez le bot pour appliquer les changements.');