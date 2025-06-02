/**
 * Script de migration de configuration
 * Migre de l'ancienne structure vers la nouvelle structure hiérarchique
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 MIGRATION DE CONFIGURATION\n');

const configPath = path.join(__dirname, 'config.json');
const backupPath = path.join(__dirname, 'config-backup.json');

// Fonction pour migrer la configuration
function migrateConfig() {
    try {
        // Lire la configuration actuelle
        let currentConfig = {};
        if (fs.existsSync(configPath)) {
            currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log('📄 Configuration actuelle chargée');
        }

        // Lire la sauvegarde si elle existe
        let backupConfig = {};
        if (fs.existsSync(backupPath)) {
            backupConfig = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            console.log('📄 Sauvegarde chargée');
        }

        // Créer la nouvelle structure
        const newConfig = {
            general: {
                prefix: currentConfig.general?.prefix || backupConfig.prefix || '!',
                adminRole: currentConfig.general?.adminRole || backupConfig.adminRole || '',
                modRole: currentConfig.general?.modRole || backupConfig.modRole || '',
                guildId: currentConfig.general?.guildId || backupConfig.guildId || ''
            },
            entry: {
                welcomeChannel: currentConfig.entry?.welcomeChannel || backupConfig.welcomeChannel || '',
                rulesChannel: currentConfig.entry?.rulesChannel || backupConfig.rulesChannel || '',
                verificationRole: currentConfig.entry?.verificationRole || backupConfig.verificationRole || '',
                staffRoleId: currentConfig.entry?.staffRoleId || backupConfig.staffRoleId || '',
                memberRoleId: currentConfig.entry?.memberRoleId || backupConfig.memberRoleId || ''
            },
            modmail: {
                modmailCategory: currentConfig.modmail?.modmailCategory || backupConfig.modmail?.categoryId || '',
                modmailLogs: currentConfig.modmail?.modmailLogs || backupConfig.modmail?.logChannelId || '',
                categoryId: currentConfig.modmail?.categoryId || backupConfig.modmail?.categoryId || '',
                staffRoleIds: currentConfig.modmail?.staffRoleIds || backupConfig.modmail?.staffRoleIds || []
            },
            tickets: {
                ticketCategory: currentConfig.tickets?.ticketCategory || backupConfig.ticketCategoryId || '',
                supportRole: currentConfig.tickets?.supportRole || backupConfig.supportRole || '',
                ticketLogs: currentConfig.tickets?.ticketLogs || backupConfig.logsTicketsChannelId || '',
                ticketCategoryId: currentConfig.tickets?.ticketCategoryId || backupConfig.ticketCategoryId || ''
            },
            logging: {
                modLogs: currentConfig.logging?.modLogs || backupConfig.logChannelId || '',
                messageLogs: currentConfig.logging?.messageLogs || backupConfig.messageLogChannelId || '',
                voiceLogs: currentConfig.logging?.voiceLogs || backupConfig.voiceLogChannelId || '',
                memberLogs: currentConfig.logging?.memberLogs || backupConfig.memberLogChannelId || '',
                logChannelId: currentConfig.logging?.logChannelId || backupConfig.logChannelId || '',
                messageLogChannelId: currentConfig.logging?.messageLogChannelId || backupConfig.messageLogChannelId || '',
                voiceLogChannelId: currentConfig.logging?.voiceLogChannelId || backupConfig.voiceLogChannelId || ''
            },
            welcome: {
                welcomeMessage: currentConfig.welcome?.welcomeMessage || backupConfig.welcomeMessage || '',
                rulesMessage: currentConfig.welcome?.rulesMessage || backupConfig.rulesMessage || '',
                welcomeDM: currentConfig.welcome?.welcomeDM || backupConfig.welcomeDM || '',
                welcomeChannels: currentConfig.welcome?.welcomeChannels || backupConfig.welcomeChannels || {}
            },
            confession: {
                confessionChannel: currentConfig.confession?.confessionChannel || backupConfig.confessionChannelId || '',
                confessionLogs: currentConfig.confession?.confessionLogs || backupConfig.confessionLogs || '',
                confessionRole: currentConfig.confession?.confessionRole || backupConfig.confessionRole || ''
            },
            games: {
                gameChannel: currentConfig.games?.gameChannel || backupConfig.dailyQuizChannelId || backupConfig.quizChannelId || '',
                gameLeaderboard: currentConfig.games?.gameLeaderboard || backupConfig.gameLeaderboard || '',
                dailyQuizChannelId: currentConfig.games?.dailyQuizChannelId || backupConfig.dailyQuizChannelId || '',
                quizChannelId: currentConfig.games?.quizChannelId || backupConfig.quizChannelId || ''
            },
            kink: {
                nsfwChannel: currentConfig.kink?.nsfwChannel || backupConfig.nsfwChannel || '',
                kinkLevels: currentConfig.kink?.kinkLevels || backupConfig.kinkLevels || 'false',
                kinkLogs: currentConfig.kink?.kinkLogs || backupConfig.kinkLogs || ''
            }
        };

        // Créer une sauvegarde de la configuration actuelle
        if (fs.existsSync(configPath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupCurrentPath = path.join(__dirname, `config-before-migration-${timestamp}.json`);
            fs.copyFileSync(configPath, backupCurrentPath);
            console.log(`💾 Sauvegarde créée: ${backupCurrentPath}`);
        }

        // Écrire la nouvelle configuration
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
        console.log('✅ Nouvelle configuration écrite');

        // Afficher les changements importants
        console.log('\n📋 CHANGEMENTS IMPORTANTS:');
        
        const confessionChannel = newConfig.confession.confessionChannel;
        if (confessionChannel) {
            console.log(`✅ confessionChannel migré: ${confessionChannel}`);
        } else {
            console.log('❌ confessionChannel non trouvé dans les sources');
        }

        const gameChannel = newConfig.games.gameChannel;
        if (gameChannel) {
            console.log(`✅ gameChannel migré: ${gameChannel}`);
        } else {
            console.log('❌ gameChannel non trouvé dans les sources');
        }

        console.log('\n🎯 MIGRATION TERMINÉE');
        console.log('Redémarrez le bot pour appliquer les changements.');

        return true;

    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error.message);
        return false;
    }
}

// Fonction pour vérifier la configuration
function verifyConfig() {
    try {
        const configManager = require('./utils/configManager');
        configManager.forceReload();
        
        const confessionChannelId = configManager.confessionChannelId;
        console.log('\n🔍 VÉRIFICATION POST-MIGRATION:');
        console.log(`confessionChannelId: ${confessionChannelId}`);
        
        if (confessionChannelId) {
            console.log('✅ confessionChannelId accessible après migration');
        } else {
            console.log('❌ confessionChannelId toujours inaccessible');
        }

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
    }
}

// Exécuter la migration
console.log('🚀 Démarrage de la migration...\n');

if (migrateConfig()) {
    verifyConfig();
} else {
    console.log('❌ Migration échouée');
}