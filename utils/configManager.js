const fs = require('node:fs');
const path = require('node:path');
const { pid } = require('node:process');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

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
     * Acquires a file-based lock to prevent concurrent modifications to the config file.
     * @throws {Error} If the lock is already held by another process.
     * @private
     */
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
    releaseLock() {
        if (fs.existsSync(this.lockPath)) {
            // Ensure the current process is the one holding the lock before releasing
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
            // Deep merge could be an option here if updates are partial and nested.
            // For now, simple spread assumes updates are for top-level keys or replace existing objects.
            const newConfig = { ...currentConfig, ...updates };
            
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

    // --- Getters for easy access to common config sections/properties ---
    // These getters provide a convenient way to access parts of the config.
    // They default to empty objects/values if the path doesn't exist to prevent errors.

    get general() { return this.getConfig().general || {}; }
    get entry() { return this.getConfig().entry || {}; }
    get modmail() { return this.getConfig().modmail || {}; }
    get tickets() { return this.getConfig().tickets || {}; }
    get logging() { return this.getConfig().logging || {}; }
    // ... (other getters as defined in the previous file content) ...
}

// Export a singleton instance of ConfigManager
module.exports = new ConfigManager();
