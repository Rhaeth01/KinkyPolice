const configManager = require('./utils/configManager');
const fs = require('fs');
const path = require('path');

console.log('🔄 Migration de la configuration Daily Quiz');
console.log('===========================================\n');

async function migrateDailyQuizConfig() {
    try {
        const config = configManager.getConfig();
        let needsMigration = false;
        let changes = [];

        console.log('1. Analyse de la configuration actuelle...');
        
        // Vérifier s'il y a une ancienne configuration à migrer
        if (config.dailyQuizChannelId && !config.games?.dailyQuizChannel) {
            console.log('   📋 Ancienne configuration trouvée: dailyQuizChannelId');
            needsMigration = true;
            changes.push(`Migration de dailyQuizChannelId vers games.dailyQuizChannel`);
        }

        if (config.games?.dailyQuizChannelId && !config.games?.dailyQuizChannel) {
            console.log('   📋 Configuration intermédiaire trouvée: games.dailyQuizChannelId');
            needsMigration = true;
            changes.push(`Migration de games.dailyQuizChannelId vers games.dailyQuizChannel`);
        }

        if (!needsMigration) {
            console.log('   ✅ Aucune migration nécessaire');
            console.log('   📊 Configuration actuelle:');
            console.log(`      - gameChannel: ${config.games?.gameChannel || 'Non configuré'}`);
            console.log(`      - dailyQuizChannel: ${config.games?.dailyQuizChannel || 'Non configuré'}`);
            return;
        }

        console.log('\n2. Création d\'une sauvegarde...');
        const backupPath = path.join(__dirname, `config_backup_daily_quiz_${Date.now()}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(config, null, 2));
        console.log(`   💾 Sauvegarde créée: ${backupPath}`);

        console.log('\n3. Application de la migration...');
        
        // Préparer la nouvelle configuration
        const newConfig = { ...config };
        if (!newConfig.games) newConfig.games = {};

        // Migrer depuis l'ancienne structure
        if (config.dailyQuizChannelId) {
            newConfig.games.dailyQuizChannel = config.dailyQuizChannelId;
            delete newConfig.dailyQuizChannelId;
            console.log(`   ✅ Migré dailyQuizChannelId: ${config.dailyQuizChannelId}`);
        }

        // Migrer depuis la structure intermédiaire
        if (config.games?.dailyQuizChannelId) {
            newConfig.games.dailyQuizChannel = config.games.dailyQuizChannelId;
            delete newConfig.games.dailyQuizChannelId;
            console.log(`   ✅ Migré games.dailyQuizChannelId: ${config.games.dailyQuizChannelId}`);
        }

        // Appliquer la nouvelle configuration
        await configManager.updateConfig(newConfig);
        
        console.log('\n4. Vérification de la migration...');
        const verificationConfig = configManager.getConfig();
        console.log('   📊 Nouvelle configuration:');
        console.log(`      - gameChannel: ${verificationConfig.games?.gameChannel || 'Non configuré'}`);
        console.log(`      - dailyQuizChannel: ${verificationConfig.games?.dailyQuizChannel || 'Non configuré'}`);
        
        console.log('\n✅ Migration terminée avec succès!');
        console.log('\n📝 Changements appliqués:');
        changes.forEach(change => console.log(`   - ${change}`));
        
        console.log('\n🎯 Résultat:');
        console.log('   - Le Daily Quiz a maintenant son propre canal dédié');
        console.log('   - Le canal des jeux généraux reste séparé');
        console.log('   - La compatibilité avec l\'ancienne configuration est maintenue');

    } catch (error) {
        console.error('\n❌ Erreur lors de la migration:', error);
        console.error('   La configuration n\'a pas été modifiée');
        throw error;
    }
}

// Exécuter la migration
migrateDailyQuizConfig().catch(console.error);