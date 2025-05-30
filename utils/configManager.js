const fs = require('node:fs');
const path = require('node:path');

class ConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, '../config.json');
        this.cache = null;
        this.lastModified = null;
    }

    // Charge la configuration en vérifiant si le fichier a été modifié
    getConfig() {
        try {
            const stats = fs.statSync(this.configPath);
            const currentModified = stats.mtime.getTime();

            // Si le fichier a été modifié ou si c'est la première lecture
            if (!this.cache || this.lastModified !== currentModified) {
                console.log('[CONFIG MANAGER] Rechargement de la configuration...');
                
                // Supprimer le cache de Node.js pour forcer le rechargement
                // Recharger la configuration en lisant le fichier
                const fileContent = fs.readFileSync(this.configPath, 'utf8');
                this.cache = JSON.parse(fileContent);
                this.lastModified = currentModified;
                
                console.log('[CONFIG MANAGER] Configuration rechargée avec succès');
            }

            return this.cache;
        } catch (error) {
            console.error('[CONFIG MANAGER] Erreur lors du chargement de la configuration:', error);
            return this.cache || {}; // Retourner le cache existant en cas d'erreur
        }
    }

    // Méthodes d'accès rapide aux propriétés de configuration
    get guildId() { return this.getConfig().guildId; }
    get logChannelId() { return this.getConfig().logChannelId; }
    get logActionMod() { return this.getConfig().logActionMod; }
    get messageLogChannelId() { return this.getConfig().messageLogChannelId; }
    get staffRoleId() { return this.getConfig().staffRoleId; }
    get memberRoleId() { return this.getConfig().memberRoleId; }
    get reglesValidesId() { return this.getConfig().reglesValidesId; }
    get newMemberRoleIds() { return this.getConfig().newMemberRoleIds; }
    get forbiddenRoleIds() { return this.getConfig().forbiddenRoleIds; }
    get ticketCategoryId() { return this.getConfig().ticketCategoryId; }
    get entryRequestCategoryId() { return this.getConfig().entryRequestCategoryId; }
    get entryRequestChannelId() { return this.getConfig().entryRequestChannelId; }
    get acceptedEntryCategoryId() { return this.getConfig().acceptedEntryCategoryId; }
    get entryModal() { return this.getConfig().entryModal; }
    get supportCategoryId() { return this.getConfig().supportCategoryId; }
    get logsTicketsChannelId() { return this.getConfig().logsTicketsChannelId; }
    get confessionChannelId() { return this.getConfig().confessionChannelId; }
    get welcomeChannels() { return this.getConfig().welcomeChannels; }
    get modmail() { return this.getConfig().modmail; }

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
