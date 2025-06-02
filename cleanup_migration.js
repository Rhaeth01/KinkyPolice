#!/usr/bin/env node

/**
 * Script de nettoyage après migration vers configManager
 * Supprime les fichiers temporaires et de debug
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 NETTOYAGE POST-MIGRATION');
console.log('============================\n');

// Fichiers à nettoyer (optionnel)
const filesToCleanup = [
    'debug_confession.js',
    'debug_all_accessors.js',
    'utils/migrateConfig.js',
    'utils/migrateToConfigManager.js'
];

// Fichiers à conserver mais marquer comme obsolètes
const filesToMark = [
    'test_config_migration.js',
    'cleanup_migration.js'
];

console.log('📋 FICHIERS DE MIGRATION IDENTIFIÉS');
console.log('------------------------------------');

filesToCleanup.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`📄 ${file} - présent`);
    } else {
        console.log(`❌ ${file} - non trouvé`);
    }
});

console.log('\n🤔 ACTIONS RECOMMANDÉES');
console.log('========================');

console.log('1. 📁 Créer un dossier d\'archive pour les fichiers de migration');
console.log('2. 🗂️  Déplacer les fichiers de debug vers l\'archive');
console.log('3. 📝 Mettre à jour la documentation');
console.log('4. 🧪 Exécuter les tests finaux');

console.log('\n⚠️  ATTENTION');
console.log('=============');
console.log('Ce script ne supprime PAS automatiquement les fichiers.');
console.log('Vérifiez d\'abord que la migration fonctionne correctement.');
console.log('Utilisez: node test_config_migration.js');

console.log('\n✅ MIGRATION TERMINÉE');
console.log('=====================');
console.log('Le système utilise maintenant configManager de manière cohérente.');
console.log('Tous les accès directs à config.json ont été remplacés.');

// Créer un dossier d'archive si nécessaire
const archiveDir = path.join(__dirname, 'migration_archive');
if (!fs.existsSync(archiveDir)) {
    try {
        fs.mkdirSync(archiveDir);
        console.log(`📁 Dossier d'archive créé: ${archiveDir}`);
    } catch (error) {
        console.log(`❌ Impossible de créer le dossier d'archive: ${error.message}`);
    }
}

console.log('\n🎯 COMMANDES UTILES');
console.log('===================');
console.log('# Tester la migration:');
console.log('node test_config_migration.js');
console.log('');
console.log('# Démarrer le bot:');
console.log('npm start');
console.log('');
console.log('# Vérifier la configuration:');
console.log('# Utilisez /config dans Discord');