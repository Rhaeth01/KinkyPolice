const fs = require('node:fs');
const path = require('node:path');

// Liste des fichiers à migrer avec leurs patterns de remplacement
const filesToMigrate = [
    // Events
    'events/guildMemberAdd.js',
    'events/messageCreate.js',
    
    // Handlers
    'handlers/modmailHandler.js',
    'handlers/refusalHandler.js',
    'handlers/ticketHandler.js',
    
    // Commands
    'commands/ban.js',
    'commands/clear.js',
    'commands/close.js',
    'commands/delete.js',
    'commands/embed-reglement.js',
    'commands/kick.js',
    'commands/lock.js',
    'commands/modmail-close.js',
    'commands/move-all.js',
    'commands/move.js',
    'commands/mute.js',
    'commands/transcript.js',
    'commands/unlock.js',
    'commands/warn.js',
    
    // Autres
    'messageLogs.js',
    'deploy-commands.js'
];

function migrateFile(filePath) {
    const fullPath = path.join(__dirname, '..', filePath);
    
    if (!fs.existsSync(fullPath)) {
        console.log(`❌ Fichier non trouvé: ${filePath}`);
        return false;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    
    // Remplacer les imports de config.json
    const configImportRegex = /const\s+\{\s*([^}]+)\s*\}\s*=\s*require\(['"]\.\.?\/config\.json['"]\);?/g;
    const configRequireRegex = /const\s+(\w+)\s*=\s*require\(['"]\.\.?\/config\.json['"]\);?/g;
    
    // Vérifier s'il y a des imports de config
    if (configImportRegex.test(content) || configRequireRegex.test(content)) {
        console.log(`🔄 Migration de ${filePath}...`);
        
        // Reset regex
        configImportRegex.lastIndex = 0;
        configRequireRegex.lastIndex = 0;
        
        // Ajouter l'import du configManager si pas déjà présent
        if (!content.includes('configManager')) {
            const relativePath = filePath.startsWith('commands/') || filePath.startsWith('events/') || filePath.startsWith('handlers/') ? '../utils/configManager' : './utils/configManager';
            content = content.replace(
                /(const\s+\{[^}]+\}\s*=\s*require\(['"][^'"]+['"]\);?\s*\n)/,
                `$1const configManager = require('${relativePath}');\n`
            );
            modified = true;
        }
        
        // Supprimer les imports de config.json
        content = content.replace(configImportRegex, '// Configuration importée via configManager');
        content = content.replace(configRequireRegex, '// Configuration importée via configManager');
        modified = true;
        
        // Créer une sauvegarde
        fs.writeFileSync(fullPath + '.backup', fs.readFileSync(fullPath));
        
        // Écrire le fichier modifié
        fs.writeFileSync(fullPath, content);
        
        console.log(`✅ ${filePath} migré avec succès`);
        return true;
    }
    
    return false;
}

function migrateAllFiles() {
    console.log('🚀 Début de la migration vers configManager...\n');
    
    let migratedCount = 0;
    
    for (const filePath of filesToMigrate) {
        if (migrateFile(filePath)) {
            migratedCount++;
        }
    }
    
    console.log(`\n📊 Migration terminée: ${migratedCount} fichiers migrés sur ${filesToMigrate.length}`);
    console.log('\n⚠️  IMPORTANT: Vous devez maintenant modifier manuellement les fichiers pour utiliser configManager.propriété au lieu des variables destructurées.');
    console.log('Exemple: remplacer "logChannelId" par "configManager.logChannelId"');
    console.log('\n💾 Des sauvegardes (.backup) ont été créées pour tous les fichiers modifiés.');
}

// Exporter pour utilisation en tant que module
module.exports = { migrateFile, migrateAllFiles };

// Permettre l'exécution directe
if (require.main === module) {
    migrateAllFiles();
}