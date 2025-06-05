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
        try {
            const validate = await this.loadSchema();
            if (!validate(data)) {
                const errors = validate.errors.map(e => 
                    `${e.instancePath || 'root'} ${e.message}`).join('\n');
                console.warn('[CONFIG MANAGER] Erreurs de validation (non bloquantes):\n', errors);
                return true;
            }
            return true;
        } catch (error) {
            console.warn('[CONFIG MANAGER] Validation échouée (non bloquante):', error.message);
            return true;
        }
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
            
            // Validation non bloquante
            await this.validateConfig(newConfig);
            
            // Créer un dossier de sauvegarde s'il n'existe pas
            const backupDir = path.join(__dirname, '../config_backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            // Créer une sauvegarde avec horodatage
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `config_${timestamp}.json`);
            
            try {
                fs.copyFileSync(this.configPath, backupPath);
            } catch (backupError) {
                console.warn('[CONFIG MANAGER] Impossible de créer la sauvegarde:', backupError.message);
            }
            
            // Appliquer les modifications
            try {
                const configString = JSON.stringify(newConfig, null, 2);
                fs.writeFileSync(this.configPath, configString, 'utf8');
                
                // Vérifier que le fichier a bien été écrit
                const verification = fs.readFileSync(this.configPath, 'utf8');
                const parsedVerification = JSON.parse(verification);
                
                if (JSON.stringify(parsedVerification) !== JSON.stringify(newConfig)) {
                    throw new Error('Les données sauvegardées ne correspondent pas aux données attendues');
                }
                
            } catch (writeError) {
                throw new Error(`Échec de l'écriture du fichier: ${writeError.message}`);
            }
            
            // Forcer le rechargement du cache
            this.forceReload();
            
            console.log(`[CONFIG MANAGER] Configuration mise à jour avec succès. Sauvegarde: ${backupPath}`);
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
    get general() { return this.getConfig().general || {}; }
    get entry() { return this.getConfig().entry || {}; }
    get modmail() { return this.getConfig().modmail || {}; }
    get tickets() { return this.getConfig().tickets || {}; }
    get logging() { return this.getConfig().logging || {}; }
    get welcome() { return this.getConfig().welcome || {}; }
    get confession() { return this.getConfig().confession || {}; }
    get games() { return this.getConfig().games || {}; }
    get kink() { return this.getConfig().kink || {}; }

    // Accesseurs spécifiques
    get guildId() { return this.general.guildId; }
    get staffRoleId() { return this.entry.staffRoleId; }
    
    // Accesseurs de logging
    get logChannelId() { return this.logging.logChannelId || this.logging.modLogs; }
    get messageLogChannelId() { return this.logging.messageLogChannelId || this.logging.messageLogs; }
    get voiceLogChannelId() { return this.logging.voiceLogChannelId || this.logging.voiceLogs; }
    get memberLogChannelId() { return this.logging.memberLogChannelId || this.logging.memberLogs; }
    get modLogChannelId() { return this.logging.modLogs; }
    get roleLogChannelId() { return this.logging.roleLogChannelId || this.logging.roleLogs; }
    
    // Accesseurs de confession
    get confessionChannelId() { 
        // Vérifier d'abord la nouvelle structure
        const newStructure = this.confession.confessionChannel;
        if (newStructure) return newStructure;
        
        // Fallback vers l'ancienne structure pour compatibilité
        const oldStructure = this.getConfig().confessionChannelId;
        if (oldStructure) return oldStructure;
        
        // Fallback vers logging
        return this.logging.confessionChannelId;
    }
    
    // Accesseurs de tickets
    get ticketCategoryId() { return this.tickets.ticketCategoryId || this.tickets.ticketCategory; }
    get supportRole() { return this.tickets.supportRole; }
    get ticketLogs() { return this.tickets.ticketLogs; }
    get supportCategoryId() { return this.tickets.supportCategoryId; }
    get logsTicketsChannelId() { return this.tickets.logsTicketsChannelId; }
    
    // Accesseurs de jeux
    get dailyQuizChannelId() { return this.games.dailyQuizChannel || this.games.dailyQuizChannelId || this.getConfig().dailyQuizChannelId; }
    get gameChannel() { return this.games.gameChannel; }
    get dailyQuizChannel() { return this.games.dailyQuizChannel; }
    get quizChannelId() { return this.games.dailyQuizChannel || this.games.quizChannelId; }
    get gameLeaderboard() { return this.games.gameLeaderboard; }
    
    // Accesseurs de modmail
    get modmailCategory() { return this.modmail.modmailCategory || this.modmail.categoryId; }
    get modmailLogs() { return this.modmail.modmailLogs || this.modmail.logChannelId; }
    
    // Accesseurs d'entrée/accueil
    get welcomeChannel() { return this.entry.welcomeChannel; }
    get rulesChannel() { return this.entry.rulesChannel; }
    get verificationRole() { return this.entry.verificationRole; }
    get newMemberRoleIds() { return this.entry.newMemberRoleIds; }
    get memberRoleId() { return this.entry.memberRoleId; }
    get reglesValidesId() { return this.entry.reglesValidesId; }
    get forbiddenRoleIds() { return this.entry.forbiddenRoleIds; }
    
    // Accesseurs généraux
    get prefix() { return this.general.prefix || '!'; }
    get adminRole() { return this.general.adminRole; }
    get modRole() { return this.general.modRole; }
    
    // Accesseurs NSFW/Kink
    get nsfwChannel() { return this.kink.nsfwChannel; }
    get kinkLevels() { return this.kink.kinkLevels; }
    get kinkLogs() { return this.kink.kinkLogs; }

    // Nouveaux accesseurs pour les sections modernes
    get confessionChannel() { return this.confession.confessionChannel; }
    get confessionLogs() { return this.confession.confessionLogs; }
    get confessionRole() { return this.confession.confessionRole; }

    // Setters pour les accesseurs principaux
    set confessionChannelId(value) { 
        const config = this.getConfig();
        if (!config.confession) config.confession = {};
        config.confession.confessionChannel = value;
        this.updateConfig(config);
    }
    
    set logChannelId(value) { 
        const config = this.getConfig();
        if (!config.logging) config.logging = {};
        config.logging.logChannelId = value;
        this.updateConfig(config);
    }
    
    set messageLogChannelId(value) { 
        const config = this.getConfig();
        if (!config.logging) config.logging = {};
        config.logging.messageLogChannelId = value;
        this.updateConfig(config);
    }
    
    set voiceLogChannelId(value) { 
        const config = this.getConfig();
        if (!config.logging) config.logging = {};
        config.logging.voiceLogChannelId = value;
        this.updateConfig(config);
    }
    
    set roleLogChannelId(value) { 
        const config = this.getConfig();
        if (!config.logging) config.logging = {};
        config.logging.roleLogChannelId = value;
        this.updateConfig(config);
    }
    
    set dailyQuizChannelId(value) { 
        const config = this.getConfig();
        config.games.dailyQuizChannel = value;
        this.updateConfig(config);
    }
    
    set dailyQuizChannel(value) { 
        const config = this.getConfig();
        if (!config.games) config.games = {};
        config.games.dailyQuizChannel = value; {};
        config.games.gameChannel = value;
        this.updateConfig(config);
    }
    
    set quizChannelId(value) { 
        const config = this.getConfig();
        if (!config.games) config.games = {};
        config.games.gameChannel = value;
        this.updateConfig(config);
    }
    
    set ticketCategoryId(value) { 
        const config = this.getConfig();
        if (!config.tickets) config.tickets = {};
        config.tickets.ticketCategoryId = value;
        this.updateConfig(config);
    }
    
    set supportCategoryId(value) { 
        const config = this.getConfig();
        if (!config.tickets) config.tickets = {};
        config.tickets.supportCategoryId = value;
        this.updateConfig(config);
    }
    
    set logsTicketsChannelId(value) { 
        const config = this.getConfig();
        if (!config.tickets) config.tickets = {};
        config.tickets.logsTicketsChannelId = value;
        this.updateConfig(config);
    }

    // Setters pour les nouveaux accesseurs
    set confessionChannel(value) { 
        const config = this.getConfig();
        if (!config.confession) config.confession = {};
        config.confession.confessionChannel = value;
        this.updateConfig(config);
    }
    
    set confessionLogs(value) { 
        const config = this.getConfig();
        if (!config.confession) config.confession = {};
        config.confession.confessionLogs = value;
        this.updateConfig(config);
    }
    
    set confessionRole(value) { 
        const config = this.getConfig();
        if (!config.confession) config.confession = {};
        config.confession.confessionRole = value;
        this.updateConfig(config);
    }
    
    set gameChannel(value) { 
        const config = this.getConfig();
        if (!config.games) config.games = {};
        config.games.gameChannel = value;
        this.updateConfig(config);
    }
    
    set gameLeaderboard(value) { 
        const config = this.getConfig();
        if (!config.games) config.games = {};
        config.games.gameLeaderboard = value;
        this.updateConfig(config);
    }
    
    set nsfwChannel(value) { 
        const config = this.getConfig();
        if (!config.kink) config.kink = {};
        config.kink.nsfwChannel = value;
        this.updateConfig(config);
    }
    
    set kinkLevels(value) { 
        const config = this.getConfig();
        if (!config.kink) config.kink = {};
        config.kink.kinkLevels = value;
        this.updateConfig(config);
    }
    
    set kinkLogs(value) { 
        const config = this.getConfig();
        if (!config.kink) config.kink = {};
        config.kink.kinkLogs = value;
        this.updateConfig(config);
    }

    // Setters pour les accesseurs de compatibilité
    set newMemberRoleIds(value) { 
        const config = this.getConfig();
        if (!config.entry) config.entry = {};
        config.entry.newMemberRoleIds = value;
        this.updateConfig(config);
    }
    
    set memberRoleId(value) { 
        const config = this.getConfig();
        if (!config.entry) config.entry = {};
        config.entry.memberRoleId = value;
        this.updateConfig(config);
    }
    
    set reglesValidesId(value) { 
        const config = this.getConfig();
        if (!config.entry) config.entry = {};
        config.entry.reglesValidesId = value;
        this.updateConfig(config);
    }
    
    set forbiddenRoleIds(value) { 
        const config = this.getConfig();
        if (!config.entry) config.entry = {};
        config.entry.forbiddenRoleIds = value;
        this.updateConfig(config);
    }

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
