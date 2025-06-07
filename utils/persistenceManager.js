const fs = require('fs');
const path = require('path');

/**
 * Gestionnaire de persistance pour éviter la perte de données lors des redéploiements
 * Utilise des variables d'environnement et des sauvegardes automatiques
 */
class PersistenceManager {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.backupDir = path.join(__dirname, '../data_backups');
        this.configDir = path.join(__dirname, '../config_backups');
        
        // Prévenir les race conditions
        this.isBackingUp = false;
        this.backupQueue = [];
        
        // S'assurer que les dossiers existent
        this.ensureDirectories();
        
        // Variables critiques à sauvegarder
        this.criticalFiles = [
            'config.json',
            'data/confessionCounter.json',
            'data/currency.json',
            'data/game-scores.json',
            'data/warnings.json'
        ];
        
        // Intervalle de sauvegarde automatique (toutes les 5 minutes)
        this.backupInterval = 5 * 60 * 1000;
        this.autoBackupTimer = null;
        this.startAutoBackup();
    }

    ensureDirectories() {
        [this.dataDir, this.backupDir, this.configDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 [PersistenceManager] Dossier créé: ${dir}`);
            }
        });
    }

    /**
     * Sauvegarde automatique des fichiers critiques avec protection contre les race conditions
     */
    async backupCriticalFiles() {
        // Éviter les sauvegardes simultanées
        if (this.isBackingUp) {
            console.log('🔄 [PersistenceManager] Sauvegarde déjà en cours, ajout à la queue');
            return new Promise((resolve) => {
                this.backupQueue.push(resolve);
            });
        }

        this.isBackingUp = true;
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupData = {};

            for (const file of this.criticalFiles) {
                const filePath = path.join(__dirname, '..', file);
                
                if (fs.existsSync(filePath)) {
                    try {
                        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        backupData[file] = content;
                    } catch (error) {
                        console.error(`❌ [PersistenceManager] Erreur lecture ${file}:`, error.message);
                    }
                }
            }

            // Sauvegarder dans un fichier de backup
            const backupFile = path.join(this.backupDir, `backup_${timestamp}.json`);
            fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
            
            // Garder seulement les 10 dernières sauvegardes
            this.cleanupOldBackups();
            
            console.log(`✅ [PersistenceManager] Sauvegarde créée: ${backupFile}`);
            return backupFile;
        } catch (error) {
            console.error('❌ [PersistenceManager] Erreur lors de la sauvegarde:', error);
            throw error;
        } finally {
            this.isBackingUp = false;
            
            // Traiter la queue
            const queueCallbacks = [...this.backupQueue];
            this.backupQueue = [];
            queueCallbacks.forEach(callback => callback());
        }
    }

    /**
     * Restaurer les données depuis la dernière sauvegarde
     */
    async restoreFromBackup() {
        try {
            const backupFiles = fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
                .sort()
                .reverse();

            if (backupFiles.length === 0) {
                console.log('📦 [PersistenceManager] Aucune sauvegarde trouvée');
                return false;
            }

            const latestBackup = path.join(this.backupDir, backupFiles[0]);
            const backupData = JSON.parse(fs.readFileSync(latestBackup, 'utf8'));

            let restoredCount = 0;
            for (const [file, content] of Object.entries(backupData)) {
                const targetPath = path.join(__dirname, '..', file);
                
                // Créer le dossier parent si nécessaire
                const targetDir = path.dirname(targetPath);
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                fs.writeFileSync(targetPath, JSON.stringify(content, null, 2));
                restoredCount++;
                console.log(`📥 [PersistenceManager] Restauré: ${file}`);
            }

            console.log(`✅ [PersistenceManager] ${restoredCount} fichiers restaurés depuis ${backupFiles[0]}`);
            return true;
        } catch (error) {
            console.error('❌ [PersistenceManager] Erreur lors de la restauration:', error);
            return false;
        }
    }

    /**
     * Vérifier l'intégrité des données au démarrage
     */
    async checkDataIntegrity() {
        const issues = [];

        for (const file of this.criticalFiles) {
            const filePath = path.join(__dirname, '..', file);
            
            if (!fs.existsSync(filePath)) {
                issues.push(`Fichier manquant: ${file}`);
                continue;
            }

            try {
                JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (error) {
                issues.push(`Fichier corrompu: ${file} (${error.message})`);
            }
        }

        if (issues.length > 0) {
            console.warn('⚠️ [PersistenceManager] Problèmes détectés:');
            issues.forEach(issue => console.warn(`   - ${issue}`));
            
            // Tenter une restauration automatique
            console.log('🔧 [PersistenceManager] Tentative de restauration automatique...');
            return await this.restoreFromBackup();
        }

        console.log('✅ [PersistenceManager] Intégrité des données vérifiée');
        return true;
    }

    /**
     * Nettoyer les anciennes sauvegardes
     */
    cleanupOldBackups() {
        try {
            const backupFiles = fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
                .sort()
                .reverse();

            // Garder seulement les 10 plus récentes
            const filesToDelete = backupFiles.slice(10);
            
            filesToDelete.forEach(file => {
                const filePath = path.join(this.backupDir, file);
                fs.unlinkSync(filePath);
                console.log(`🗑️ [PersistenceManager] Ancienne sauvegarde supprimée: ${file}`);
            });
        } catch (error) {
            console.error('❌ [PersistenceManager] Erreur nettoyage sauvegardes:', error);
        }
    }

    /**
     * Démarrer la sauvegarde automatique avec gestion d'erreurs
     */
    startAutoBackup() {
        // Sauvegarde immédiate au démarrage
        setTimeout(async () => {
            try {
                await this.backupCriticalFiles();
            } catch (error) {
                console.error('❌ [PersistenceManager] Erreur sauvegarde initiale:', error);
            }
        }, 30000); // 30 secondes après le démarrage
        
        // Puis sauvegarde périodique avec gestion d'erreurs
        this.autoBackupTimer = setInterval(async () => {
            try {
                await this.backupCriticalFiles();
            } catch (error) {
                console.error('❌ [PersistenceManager] Erreur sauvegarde périodique:', error);
            }
        }, this.backupInterval);
        
        console.log(`🔄 [PersistenceManager] Sauvegarde automatique activée (${this.backupInterval / 60000} min)`);
    }

    /**
     * Arrêter la sauvegarde automatique
     */
    stopAutoBackup() {
        if (this.autoBackupTimer) {
            clearInterval(this.autoBackupTimer);
            this.autoBackupTimer = null;
            console.log('⏹️ [PersistenceManager] Sauvegarde automatique arrêtée');
        }
    }

    /**
     * Sauvegarde manuelle
     */
    async manualBackup() {
        console.log('💾 [PersistenceManager] Sauvegarde manuelle déclenchée...');
        return await this.backupCriticalFiles();
    }

    /**
     * Obtenir les statistiques de sauvegarde
     */
    getBackupStats() {
        try {
            const backupFiles = fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('backup_') && file.endsWith('.json'));

            const stats = {
                totalBackups: backupFiles.length,
                latestBackup: backupFiles.sort().reverse()[0] || null,
                backupSize: 0
            };

            backupFiles.forEach(file => {
                const filePath = path.join(this.backupDir, file);
                stats.backupSize += fs.statSync(filePath).size;
            });

            stats.backupSizeMB = (stats.backupSize / (1024 * 1024)).toFixed(2);
            
            return stats;
        } catch (error) {
            console.error('❌ [PersistenceManager] Erreur stats sauvegarde:', error);
            return null;
        }
    }
}

module.exports = new PersistenceManager();