const fs = require('node:fs');
const path = require('node:path');
const { pid } = require('node:process');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

class ConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, '../config.json');
        this.schemaPath = path.join(__dirname, '../config.schema.json');
        this.lockPath = path.join(__dirname, '../.config.lock');
        this.cache = null;
        this.lastModified = null;
        this.ajv = new Ajv();
        addFormats(this.ajv);
    }

    // Charger et compiler le schéma
    async loadSchema() {
        try {
            const schema = JSON.parse(fs.readFileSync(this.schemaPath, 'utf8'));
            return this.ajv.compile(schema);
        } catch (error) {
            console.error('[CONFIG MANAGER] Erreur de chargement du schéma:', error);
            throw new Error('Échec du chargement du schéma de validation');
        }
    }

    // Valider la configuration avec le schéma
    async validateConfig(data) {
        const validate = await this.loadSchema();
        if (!validate(data)) {
            const errors = validate.errors.map(e => 
                `${e.instancePath} ${e.message}`).join('\n');
            throw new Error(`Validation échouée:\n${errors}`);
        }
        return true;
    }

    // Acquérir un verrou fichier
    acquireLock() {
        if (fs.existsSync(this.lockPath)) {
            const lockPid = parseInt(fs.readFileSync(this.lockPath, 'utf8'));
            if (lockPid && process.kill(lockPid, 0)) {
                throw new Error('Le fichier de configuration est verrouillé par un autre processus');
            }
        }
        fs.writeFileSync(this.lockPath, pid.toString());
    }

    // Libérer le verrou
    releaseLock() {
        if (fs.existsSync(this.lockPath)) {
            fs.unlinkSync(this.lockPath);
        }
    }

    // Mettre à jour la configuration de manière atomique avec sauvegarde
    async updateConfig(updates) {
        try {
            this.acquireLock();
            
            const currentConfig = this.forceReload();
            const newConfig = { ...currentConfig, ...updates };
            
            await this.validateConfig(newConfig);
            
            // Créer un dossier de sauvegarde s'il n'existe pas
            const backupDir = path.join(__dirname, '../config_backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            // Créer une sauvegarde avec horodatage
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `config_${timestamp}.json`);
            fs.copyFileSync(this.configPath, backupPath);
            
            // Appliquer les modifications
            fs.writeFileSync(this.configPath, JSON.stringify(newConfig, null, 2));
            this.forceReload();
            
            console.log(`[CONFIG MANAGER] Configuration mise à jour avec sauvegarde: ${backupPath}`);
            return true;
        } catch (error) {
            console.error('[CONFIG MANAGER] Échec de la mise à jour:', error);
            throw error;
        } finally {
            this.releaseLock();
        }
    }

    // Charge la configuration en vérifiant si le fichier a été modifié
    getConfig() {
        try {
            const stats = fs.statSync(this.configPath);
            const currentModified = stats.mtime.getTime();

            if (!this.cache || this.lastModified !== currentModified) {
                console.log('[CONFIG MANAGER] Rechargement de la configuration...');
                const fileContent = fs.readFileSync(this.configPath, 'utf8');
                this.cache = JSON.parse(fileContent);
                this.lastModified = currentModified;
                console.log('[CONFIG MANAGER] Configuration rechargée avec succès');
            }

            return this.cache;
        } catch (error) {
            console.error('[CONFIG MANAGER] Erreur lors du chargement de la configuration:', error);
            return this.cache || {};
        }
    }

    // Méthodes d'accès rapide aux propriétés de configuration
    // (Mises à jour pour correspondre à la nouvelle structure hiérarchique)
    get general() { return this.getConfig().general || {}; }
    get entry() { return this.getConfig().entry || {}; }
    get modmail() { return this.getConfig().modmail || {}; }
    get tickets() { return this.getConfig().tickets || {}; }
    get logging() { return this.getConfig().logging || {}; }
    get welcome() { return this.getConfig().welcome || {}; }

    // Accesseurs spécifiques
    get guildId() { return this.general.guildId; }
    get staffRoleId() { return this.entry.staffRoleId; }
    get memberRoleId() { return this.entry.memberRoleId; }
    get logChannelId() { return this.logging.logChannelId; }
    get messageLogChannelId() { return this.logging.messageLogChannelId; }
    get confessionChannelId() { return this.logging.confessionChannelId; }
    get ticketCategoryId() { return this.tickets.ticketCategoryId; }
    // ... autres accesseurs selon besoin

    // Méthode pour forcer le rechargement
    forceReload() {
        this.cache = null;
        this.lastModified = null;
        return this.getConfig();
    }

    // Méthode pour obtenir les IDs de rôle staff valides
    getValidStaffRoleIds() {
        const staffRoleId = this.staffRoleId;
        const isValidId = (id) => typeof id === 'string' && /^\d+$/.test(id);
        
        return Array.isArray(staffRoleId)
            ? staffRoleId.filter(isValidId)
            : (isValidId(staffRoleId) ? [staffRoleId] : []);
    }
}

// Exporter une instance singleton
module.exports = new ConfigManager();
