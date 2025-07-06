const fs = require('node:fs');
const path = require('node:path');
const { pid } = require('node:process');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const lockfile = require('proper-lockfile');

/**
 * @file utils/configManager.js
 * @description Manages the bot's configuration, including loading, saving, validation, and backups.
 * Provides a singleton instance for accessing and updating configuration data.
 */

/**
 * @class ConfigManager
 * @classdesc Handles all operations related to configuration management.
 * This includes loading from `config.json`, validating against `config.schema.json`,
 * updating the configuration atomically with backups, and providing easy access
 * to configuration properties via getters.
 */
class ConfigManager {
    /**
     * Initializes paths for config, schema, and lock files.
     * Sets up Ajv for schema validation.
     */
    constructor() {
        this.configPath = path.join(__dirname, '../config.json');
        this.schemaPath = path.join(__dirname, '../config.schema.json');
        this.lockPath = path.join(__dirname, '../.config.lock'); // Lock file for atomic operations
        this.cache = null; // In-memory cache of the configuration
        this.lastModified = null; // Timestamp of the last modification to the config file
        this.ajv = new Ajv({ allErrors: true, useDefaults: true }); // Configure Ajv
        addFormats(this.ajv); // Add formats like date-time, email, etc.
    }

    /**
     * Loads and compiles the JSON schema for configuration validation.
     * @async
     * @returns {Promise<import('ajv').ValidateFunction>} The compiled validation function.
     * @throws {Error} If schema loading or compilation fails.
     */
    async loadSchema() {
        try {
            const schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
            const schema = JSON.parse(schemaContent);
            return this.ajv.compile(schema);
        } catch (error) {
            console.error('[CONFIG MANAGER] Erreur de chargement ou de compilation du schéma:', error);
            throw new Error('Échec du chargement ou de la compilation du schéma de validation.');
        }
    }

    /**
     * Validates the provided data against the loaded JSON schema.
     * This validation is currently non-blocking; errors are logged, but the process continues.
     * @async
     * @param {object} data - The configuration data to validate.
     * @returns {Promise<boolean>} True if validation passes or if validation itself fails (non-blocking).
     */
    async validateConfig(data) {
        try {
            const validate = await this.loadSchema();
            if (!validate(data)) {
                const errors = validate.errors.map(e => 
                    `${e.instancePath || 'root'} ${e.message}`).join('\n');
                console.warn('[CONFIG MANAGER] Erreurs de validation de la configuration (non bloquantes):\n', errors);
                // Even with validation errors, we might proceed, depending on policy.
                // For now, it's a soft validation.
                return true;
            }
            console.log('[CONFIG MANAGER] Validation de la configuration réussie.');
            return true;
        } catch (error) {
            // Error loading schema or other issues with the validation process itself.
            console.warn('[CONFIG MANAGER] La validation de la configuration a échoué (processus de validation lui-même, non bloquant):', error.message);
            return true; // Non-blocking
        }
    }

    /**
     * Acquires a robust file-based lock using proper-lockfile library.
     * @throws {Error} If the lock is already held by another process.
     * @private
     */
    async acquireLockRobust() {
        try {
            this.releaseLockFunction = await lockfile.lock(this.configPath, {
                retries: {
                    retries: 3,
                    factor: 2,
                    minTimeout: 100,
                    maxTimeout: 1000
                },
                stale: 30000, // 30 seconds stale threshold
                realpath: false
            });
        } catch (error) {
            throw new Error(`Impossible de verrouiller le fichier de configuration: ${error.message}`);
        }
    }

    // Fallback pour compatibilité avec l'ancien code
    acquireLock() {
        if (fs.existsSync(this.lockPath)) {
            const lockPid = parseInt(fs.readFileSync(this.lockPath, 'utf8'));
            // Check if the process holding the lock is still running
            try {
                if (lockPid && process.kill(lockPid, 0)) { // Signal 0 just checks if process exists
                    throw new Error(`Le fichier de configuration est verrouillé par un autre processus (PID: ${lockPid}).`);
                }
            } catch (e) {
                // If process.kill throws an error, the process likely doesn't exist anymore
                console.warn(`[CONFIG MANAGER] Ancien fichier de verrouillage trouvé pour un PID non existant (${lockPid}). Suppression du verrou.`);
                fs.unlinkSync(this.lockPath);
            }
        }
        fs.writeFileSync(this.lockPath, pid.toString());
    }

    /**
     * Releases the file-based lock.
     * @private
     */
    async releaseLockSafely() {
        try {
            if (this.releaseLockFunction && typeof this.releaseLockFunction === 'function') {
                await this.releaseLockFunction();
                this.releaseLockFunction = null;
            }
        } catch (error) {
            console.error('[CONFIG MANAGER] Erreur lors de la libération du verrou:', error);
        }
    }

    // Fallback pour compatibilité avec l'ancien code
    releaseLock() {
        if (fs.existsSync(this.lockPath)) {
            const lockPid = parseInt(fs.readFileSync(this.lockPath, 'utf8'));
            if (lockPid === pid) {
                fs.unlinkSync(this.lockPath);
            } else {
                console.warn(`[CONFIG MANAGER] Tentative de libération d'un verrou détenu par un autre processus (Lock PID: ${lockPid}, Current PID: ${pid}). Verrou non libéré.`);
            }
        }
    }

    /**
     * Updates the configuration file atomically with the provided updates.
     * Creates a backup before writing changes. Validates the new config (non-blocking).
     * @async
     * @param {object} updates - An object containing the configuration keys and values to update.
     * @returns {Promise<boolean>} True if the update was successful.
     * @throws {Error} If the update process fails (e.g., lock acquisition, file write).
     */
    async updateConfig(updates) {
        try {
            this.acquireLock();
            
            const currentConfig = this.forceReload(); // Get the very latest from disk
            // Use deep merge to properly handle nested updates
            const newConfig = this.deepMerge(currentConfig, updates);
            
            await this.validateConfig(newConfig); // Non-blocking validation
            
            const backupDir = path.join(__dirname, '../config_backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `config_${timestamp}.json`);
            
            try {
                if (fs.existsSync(this.configPath)) { // Only backup if original exists
                    fs.copyFileSync(this.configPath, backupPath);
                    // Nettoyer les anciennes sauvegardes après création de la nouvelle
                    this.cleanupOldBackups(backupDir);
                }
            } catch (backupError) {
                console.warn('[CONFIG MANAGER] Impossible de créer la sauvegarde de configuration:', backupError.message);
            }
            
            try {
                const configString = JSON.stringify(newConfig, null, 2);
                fs.writeFileSync(this.configPath, configString, 'utf8');
                
                // Verify write (optional, but good for critical files)
                // const verification = fs.readFileSync(this.configPath, 'utf8');
                // if (JSON.stringify(JSON.parse(verification)) !== JSON.stringify(newConfig)) {
                //     throw new Error('Les données sauvegardées ne correspondent pas aux données attendues après écriture.');
                // }
                
            } catch (writeError) {
                console.error('[CONFIG MANAGER] Erreur lors de l\'écriture du fichier de configuration:', writeError);
                throw new Error(`Échec de l'écriture du fichier de configuration: ${writeError.message}`);
            }
            
            this.forceReload(); // Update cache with the new content
            
            console.log(`[CONFIG MANAGER] Configuration mise à jour avec succès. Sauvegarde créée: ${backupPath}`);
            return true;
            
        } catch (error) {
            console.error('[CONFIG MANAGER] Échec de la mise à jour de la configuration:', error);
            throw error; // Re-throw for upstream handling
        } finally {
            this.releaseLock();
        }
    }

    /**
     * Gets the current configuration.
     * Uses an in-memory cache but reloads from disk if the file has been modified.
     * @returns {object} The configuration object. Returns cached version or an empty object on error.
     */
    getConfig() {
        try {
            if (!fs.existsSync(this.configPath)) {
                console.warn("[CONFIG MANAGER] Fichier de configuration introuvable. Retour d'une configuration vide.");
                // Optionally, create a default config file here if one doesn't exist.
                // fs.writeFileSync(this.configPath, JSON.stringify({}, null, 2), 'utf8');
                return {};
            }
            const stats = fs.statSync(this.configPath);
            const currentModified = stats.mtime.getTime();

            if (!this.cache || this.lastModified !== currentModified) {
                console.log('[CONFIG MANAGER] Changement détecté ou cache vide. Rechargement de la configuration...');
                const fileContent = fs.readFileSync(this.configPath, 'utf8');
                this.cache = JSON.parse(fileContent);
                this.lastModified = currentModified;
                console.log('[CONFIG MANAGER] Configuration (re)chargée avec succès.');
            }
            return this.cache || {}; // Return cache, or empty object if cache is still null
        } catch (error) {
            console.error('[CONFIG MANAGER] Erreur critique lors du chargement de la configuration:', error);
            // Return last known cache or an empty object to prevent crashes.
            return this.cache || {};
        }
    }
    
    /**
     * Deep merge two objects
     * @param {object} target - The target object
     * @param {object} source - The source object to merge into target
     * @returns {object} The merged object
     */
    deepMerge(target, source) {
        const output = Object.assign({}, target);
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }

    /**
     * Check if a value is an object
     * @param {*} item - The item to check
     * @returns {boolean} True if the item is an object
     */
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * Resets the configuration to an empty object and saves it.
     * @async
     * @returns {Promise<boolean>} True if reset was successful.
     */
    async resetConfig() {
        console.log('[CONFIG MANAGER] Réinitialisation de la configuration...');
        return this.updateConfig({}); // Update with an empty object to clear it
    }

    /**
     * Forces a reload of the configuration from disk, bypassing the cache check.
     * @returns {object} The reloaded configuration object.
     */
    forceReload() {
        this.cache = null;
        this.lastModified = null;
        return this.getConfig();
    }

    /**
     * Nettoie les anciennes sauvegardes, ne garde que les 10 plus récentes
     * @param {string} backupDir - Le répertoire des sauvegardes
     * @private
     */
    cleanupOldBackups(backupDir) {
        try {
            const maxBackups = 10;
            
            // Lister tous les fichiers de sauvegarde
            const backupFiles = fs.readdirSync(backupDir)
                .filter(file => file.startsWith('config_') && file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: path.join(backupDir, file),
                    time: fs.statSync(path.join(backupDir, file)).mtime
                }))
                .sort((a, b) => b.time - a.time); // Trier par date de modification (plus récent en premier)
            
            // Supprimer les sauvegardes excédentaires
            if (backupFiles.length > maxBackups) {
                const filesToDelete = backupFiles.slice(maxBackups);
                let deletedCount = 0;
                
                for (const fileInfo of filesToDelete) {
                    try {
                        fs.unlinkSync(fileInfo.path);
                        deletedCount++;
                    } catch (deleteError) {
                        console.warn(`[CONFIG MANAGER] Impossible de supprimer la sauvegarde ${fileInfo.name}:`, deleteError.message);
                    }
                }
                
                if (deletedCount > 0) {
                    console.log(`[CONFIG MANAGER] ${deletedCount} ancienne(s) sauvegarde(s) supprimée(s). ${backupFiles.length - deletedCount} sauvegarde(s) conservée(s).`);
                }
            }
            
        } catch (error) {
            console.warn('[CONFIG MANAGER] Erreur lors du nettoyage des anciennes sauvegardes:', error.message);
        }
    }

    // --- Getters for easy access to common config sections/properties ---
    // These getters provide a convenient way to access parts of the config.
    // They default to empty objects/values if the path doesn't exist to prevent errors.

    get general() { return this.getConfig().general || {}; }
    get entry() { return this.getConfig().entry || {}; }
    get modmail() { return this.getConfig().modmail || {}; }
    get tickets() { return this.getConfig().tickets || {}; }
    get logging() { return this.getConfig().logging || {}; }
    get welcome() { return this.getConfig().welcome || {}; }
    get entryModal() { return this.getConfig().entryModal || {}; }
    get confession() { return this.getConfig().confession || {}; }
    get economy() { return this.getConfig().economy || {}; }

    // Channel ID getters for convenience
    get entryRequestChannelId() { 
        return this.getConfig().entry?.entryRequestChannelId || 
               this.getConfig().entry?.welcomeChannel || 
               this.getConfig().logging?.messageLogs || ''; 
    }
    
    get logChannelId() { 
        return this.getConfig().logging?.logChannelId || 
               this.getConfig().logging?.messageLogs || ''; 
    }
    
    get confessionChannelId() { 
        return this.getConfig().confession?.confessionChannelId || 
               this.getConfig().confession?.confessionChannel || ''; 
    }
    
    get acceptedEntryCategoryId() { 
        return this.getConfig().tickets?.acceptedEntryCategoryId || 
               this.getConfig().tickets?.ticketCategory || ''; 
    }
    
    get ticketCategoryId() {
        return this.getConfig().tickets?.ticketCategory || '';
    }

    get dailyQuizChannelId() {
        return this.getConfig().games?.gameChannel || '';
    }

    // Logging Channel ID getters for specific log types
    get messageLogChannelId() {
        return this.getConfig().logging?.messageLogs?.channelId || '';
    }

    get modLogChannelId() {
        return this.getConfig().logging?.modLogs?.channelId || '';
    }

    get voiceLogChannelId() {
        return this.getConfig().logging?.voiceLogs?.channelId || '';
    }

    get memberLogChannelId() {
        return this.getConfig().logging?.memberLogs?.channelId || '';
    }

    get roleLogChannelId() {
        return this.getConfig().logging?.roleLogs?.channelId || '';
    }

    get ticketLogChannelId() {
        return this.getConfig().logging?.ticketLogs?.channelId || '';
    }

    /**
     * Gets valid staff role IDs from various configuration sections
     * @returns {Array<string>} Array of valid staff role IDs
     */
    getValidStaffRoleIds() {
        const config = this.getConfig();
        const staffRoles = [];
        
        // Collect staff roles from different sections
        if (config.general?.adminRole && config.general.adminRole.trim() !== '') {
            staffRoles.push(config.general.adminRole);
        }
        if (config.general?.modRole && config.general.modRole.trim() !== '') {
            staffRoles.push(config.general.modRole);
        }
        if (config.tickets?.supportRole && config.tickets.supportRole.trim() !== '') {
            staffRoles.push(config.tickets.supportRole);
        }
        
        // Handle staff role IDs from entry section (can be string or array)
        if (config.entry?.staffRoleId) {
            if (Array.isArray(config.entry.staffRoleId)) {
                staffRoles.push(...config.entry.staffRoleId.filter(id => id && id.trim() !== ''));
            } else if (config.entry.staffRoleId.trim() !== '') {
                staffRoles.push(config.entry.staffRoleId);
            }
        }
        
        // Remove duplicates and filter empty values
        return [...new Set(staffRoles.filter(id => id && id.trim() !== ''))];
    }

    /**
     * Nettoie manuellement les anciennes sauvegardes
     * @returns {number} Nombre de sauvegardes supprimées
     */
    cleanupBackups() {
        const backupDir = path.join(__dirname, '../config_backups');
        if (!fs.existsSync(backupDir)) {
            return 0;
        }

        const maxBackups = 10;
        
        try {
            // Lister tous les fichiers de sauvegarde
            const backupFiles = fs.readdirSync(backupDir)
                .filter(file => file.startsWith('config_') && file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: path.join(backupDir, file),
                    time: fs.statSync(path.join(backupDir, file)).mtime
                }))
                .sort((a, b) => b.time - a.time); // Trier par date de modification (plus récent en premier)
            
            console.log(`[CONFIG MANAGER] Trouvé ${backupFiles.length} sauvegarde(s) de configuration`);
            
            // Supprimer les sauvegardes excédentaires
            if (backupFiles.length > maxBackups) {
                const filesToDelete = backupFiles.slice(maxBackups);
                let deletedCount = 0;
                
                for (const fileInfo of filesToDelete) {
                    try {
                        fs.unlinkSync(fileInfo.path);
                        deletedCount++;
                        console.log(`[CONFIG MANAGER] Supprimé: ${fileInfo.name}`);
                    } catch (deleteError) {
                        console.warn(`[CONFIG MANAGER] Impossible de supprimer la sauvegarde ${fileInfo.name}:`, deleteError.message);
                    }
                }
                
                console.log(`[CONFIG MANAGER] Nettoyage terminé: ${deletedCount} sauvegarde(s) supprimée(s), ${backupFiles.length - deletedCount} conservée(s)`);
                return deletedCount;
            } else {
                console.log(`[CONFIG MANAGER] Aucun nettoyage nécessaire (${backupFiles.length}/${maxBackups} sauvegardes)`);
                return 0;
            }
            
        } catch (error) {
            console.error('[CONFIG MANAGER] Erreur lors du nettoyage manuel des sauvegardes:', error);
            return 0;
        }
    }
}

// Export a singleton instance of ConfigManager
module.exports = new ConfigManager();
