const fs = require('fs');
const path = require('path');

// Supprimer le fichier temporaire
const tempFile = path.join(__dirname, 'utils', 'configManager_clean.js');
if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
    console.log('✅ Fichier temporaire supprimé:', tempFile);
} else {
    console.log('⚠️  Fichier temporaire non trouvé:', tempFile);
}

console.log('🧹 Nettoyage terminé');