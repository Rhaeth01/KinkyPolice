const fs = require('node:fs');
const path = require('node:path');
const configManager = require('./configManager');

function migrateConfig() {
    try {
        const configPath = path.join(__dirname, '../config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Vérifier si la migration a déjà été effectuée
        if (config.general) {
            console.log('[MIGRATION] La configuration est déjà au nouveau format');
            return;
        }

        console.log('[MIGRATION] Début de la migration de la configuration...');
        
        const newConfig = {
            general: {
                guildId: config.guildId,
                prefix: "!",
                language: "fr"
            },
            entry: {
                memberRoleId: config.memberRoleId,
                reglesValidesId: config.reglesValidesId,
                newMemberRoleIds: config.newMemberRoleIds,
                forbiddenRoleIds: config.forbiddenRoleIds,
                entryRequestCategoryId: config.entryRequestCategoryId,
                acceptedEntryCategoryId: config.acceptedEntryCategoryId,
                entryModal: config.entryModal
            },
            modmail: config.modmail,
            tickets: {
                ticketCategoryId: config.ticketCategoryId,
                supportCategoryId: config.supportCategoryId,
                logsTicketsChannelId: config.logsTicketsChannelId
            },
            logging: {
                logChannelId: config.logChannelId,
                messageLogChannelId: config.messageLogChannelId,
                logActionMod: config.logActionMod,
                confessionChannelId: config.confessionChannelId
            },
            welcome: config.welcomeChannels
        };

        // Créer une sauvegarde
        const backupDir = path.join(__dirname, '../config_backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `config_pre_migration_${timestamp}.json`);
        fs.copyFileSync(configPath, backupPath);
        
        // Écrire la nouvelle configuration
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
        configManager.forceReload();
        
        console.log('[MIGRATION] Migration terminée avec succès !');
        console.log(`[MIGRATION] Backup sauvegardé à: ${backupPath}`);
    } catch (error) {
        console.error('[MIGRATION] Erreur lors de la migration:', error);
    }
}

module.exports = migrateConfig;
