const configManager = require('../utils/configManager');
const { EmbedBuilder } = require('discord.js');

/**
 * Gestionnaire moderne pour les modals de configuration
 * Prépare l'architecture pour l'intégration backend future
 */

module.exports = {
    async handleConfigModal(interaction) {
        if (!interaction.isModalSubmit()) return false;
        
        const { customId } = interaction;
        
        if (customId.startsWith('config_modal_')) {
            await handleFieldModal(interaction);
            return true;
        } else if (customId === 'config_import_modal') {
            await handleImportModal(interaction);
            return true;
        }
        
        return false;
    }
};

async function handleFieldModal(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });
        
        const [, , sectionKey, ...fieldKeyParts] = interaction.customId.split('_');
        const fieldKey = fieldKeyParts.join('_');
        const newValue = interaction.fields.getTextInputValue('field_value');
        
        // Validation des données
        const validationResult = validateFieldValue(newValue, fieldKey, sectionKey);
        
        if (!validationResult.isValid) {
            await interaction.editReply({
                content: `❌ **Erreur de validation**\n\n${validationResult.error}`,
                ephemeral: true
            });
            return;
        }
        
        // Mise à jour de la configuration
        const result = await updateConfigField(sectionKey, fieldKey, validationResult.processedValue);
        
        if (result.success) {
            const embed = new EmbedBuilder()
                .setTitle('✅ Configuration Mise à Jour')
                .setDescription(`**${result.fieldLabel}** a été mis à jour avec succès.`)
                .setColor('#57F287')
                .addFields([
                    {
                        name: 'Nouvelle valeur',
                        value: formatDisplayValue(validationResult.processedValue, result.fieldType),
                        inline: true
                    },
                    {
                        name: 'Section',
                        value: result.sectionLabel,
                        inline: true
                    }
                ])
                .setFooter({ text: '💡 Les modifications sont sauvegardées automatiquement' })
                .setTimestamp();
            
            await interaction.editReply({
                embeds: [embed]
            });
            
            // Log pour le futur système backend
            logConfigChange(interaction.user.id, sectionKey, fieldKey, validationResult.processedValue);
            
        } else {
            await interaction.editReply({
                content: `❌ **Erreur**\n\n${result.error}`,
                ephemeral: true
            });
        }
        
    } catch (error) {
        console.error('[CONFIG MODAL] Erreur:', error);
        
        try {
            await interaction.editReply({
                content: '❌ Une erreur inattendue s\'est produite lors de la mise à jour.',
                ephemeral: true
            });
        } catch (replyError) {
            console.error('[CONFIG MODAL] Erreur de réponse:', replyError);
        }
    }
}

async function handleImportModal(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });
        
        const jsonString = interaction.fields.getTextInputValue('config_json');
        
        // Validation du JSON
        let importedConfig;
        try {
            importedConfig = JSON.parse(jsonString);
        } catch (parseError) {
            await interaction.editReply({
                content: '❌ **Erreur de format**\n\nLe JSON fourni n\'est pas valide. Vérifiez la syntaxe.',
                ephemeral: true
            });
            return;
        }
        
        // Validation de la structure de configuration
        const validationResult = validateConfigStructure(importedConfig);
        
        if (!validationResult.isValid) {
            await interaction.editReply({
                content: `❌ **Configuration invalide**\n\n${validationResult.errors.join('\n')}`,
                ephemeral: true
            });
            return;
        }
        
        // Sauvegarde de backup avant import
        await createConfigBackup(interaction.user.id);
        
        // Import de la configuration
        const importResult = await importConfiguration(importedConfig);
        
        if (importResult.success) {
            const embed = new EmbedBuilder()
                .setTitle('✅ Configuration Importée')
                .setDescription('La configuration a été importée avec succès.')
                .setColor('#57F287')
                .addFields([
                    {
                        name: 'Sections importées',
                        value: importResult.importedSections.join(', ') || 'Aucune',
                        inline: false
                    },
                    {
                        name: 'Champs mis à jour',
                        value: importResult.updatedFields.toString(),
                        inline: true
                    },
                    {
                        name: 'Backup créé',
                        value: '✅ Sauvegarde automatique',
                        inline: true
                    }
                ])
                .setFooter({ text: '💡 Utilisez /config pour voir les modifications' })
                .setTimestamp();
            
            await interaction.editReply({
                embeds: [embed]
            });
            
            // Log pour le futur système backend
            logConfigImport(interaction.user.id, importResult);
            
        } else {
            await interaction.editReply({
                content: `❌ **Erreur d'import**\n\n${importResult.error}`,
                ephemeral: true
            });
        }
        
    } catch (error) {
        console.error('[CONFIG IMPORT] Erreur:', error);
        
        try {
            await interaction.editReply({
                content: '❌ Une erreur inattendue s\'est produite lors de l\'import.',
                ephemeral: true
            });
        } catch (replyError) {
            console.error('[CONFIG IMPORT] Erreur de réponse:', replyError);
        }
    }
}

// Fonctions de validation modernes
function validateFieldValue(value, fieldKey, sectionKey) {
    // Configuration des validateurs par type de champ
    const validators = {
        // Champs généraux
        prefix: {
            type: 'text',
            maxLength: 5,
            pattern: /^[!@#$%^&*()_+\-=\[\]{}|;':".,<>?]+$/,
            errorMessage: 'Le préfixe doit contenir uniquement des caractères spéciaux et faire maximum 5 caractères.'
        },
        
        // IDs Discord (channels, roles, categories)
        adminRole: { type: 'discord_id', name: 'rôle' },
        modRole: { type: 'discord_id', name: 'rôle' },
        welcomeChannel: { type: 'discord_id', name: 'canal' },
        rulesChannel: { type: 'discord_id', name: 'canal' },
        verificationRole: { type: 'discord_id', name: 'rôle' },
        modmailCategory: { type: 'discord_id', name: 'catégorie' },
        modmailLogs: { type: 'discord_id', name: 'canal' },
        ticketCategory: { type: 'discord_id', name: 'catégorie' },
        supportRole: { type: 'discord_id', name: 'rôle' },
        ticketLogs: { type: 'discord_id', name: 'canal' },
        modLogs: { type: 'discord_id', name: 'canal' },
        messageLogs: { type: 'discord_id', name: 'canal' },
        voiceLogs: { type: 'discord_id', name: 'canal' },
        memberLogs: { type: 'discord_id', name: 'canal' },
        roleLogChannelId: { type: 'discord_id', name: 'canal' },
        gameChannel: { type: 'discord_id', name: 'canal' },
        gameLeaderboard: { type: 'discord_id', name: 'canal' },
        confessionChannel: { type: 'discord_id', name: 'canal' },
        nsfwChannel: { type: 'discord_id', name: 'canal' },
        kinkLogs: { type: 'discord_id', name: 'canal' },
        
        // Messages
        welcomeMessage: { type: 'text', maxLength: 2000 },
        welcomeDM: { type: 'text', maxLength: 2000 },
        rulesMessage: { type: 'text', maxLength: 2000 },
        
        // Économie - nombres
        'voiceActivity.pointsPerMinute': { type: 'number', min: 0, max: 100 },
        'messageActivity.pointsPerReward': { type: 'number', min: 1, max: 1000 },
        'dailyQuiz.pointsPerCorrectAnswer': { type: 'number', min: 1, max: 1000 },
        'limits.maxPointsPerDay': { type: 'number', min: 1, max: 10000 },
        'limits.maxPointsPerHour': { type: 'number', min: 1, max: 1000 },
        
        // Toggles spéciaux
        kinkLevels: { type: 'boolean' }
    };
    
    const validator = validators[fieldKey];
    
    if (!validator) {
        // Validation par défaut pour les champs non spécifiés
        return {
            isValid: true,
            processedValue: value
        };
    }
    
    // Validation par type
    switch (validator.type) {
        case 'text':
            return validateText(value, validator);
        case 'discord_id':
            return validateDiscordId(value, validator);
        case 'number':
            return validateNumber(value, validator);
        case 'boolean':
            return validateBoolean(value);
        default:
            return { isValid: true, processedValue: value };
    }
}

function validateText(value, validator) {
    if (!value || value.trim() === '') {
        return { isValid: true, processedValue: '' }; // Permet les valeurs vides
    }
    
    if (validator.maxLength && value.length > validator.maxLength) {
        return {
            isValid: false,
            error: `Le texte ne doit pas dépasser ${validator.maxLength} caractères.`
        };
    }
    
    if (validator.pattern && !validator.pattern.test(value)) {
        return {
            isValid: false,
            error: validator.errorMessage || 'Format invalide.'
        };
    }
    
    return { isValid: true, processedValue: value.trim() };
}

function validateDiscordId(value, validator) {
    if (!value || value.trim() === '') {
        return { isValid: true, processedValue: '' }; // Permet les valeurs vides
    }
    
    const cleanValue = value.trim().replace(/[<>#&@!]/g, ''); // Nettoie les mentions Discord
    
    if (!/^\d{17,19}$/.test(cleanValue)) {
        return {
            isValid: false,
            error: `L'ID ${validator.name} doit être un nombre de 17-19 chiffres. Vous pouvez copier l'ID depuis Discord.`
        };
    }
    
    return { isValid: true, processedValue: cleanValue };
}

function validateNumber(value, validator) {
    if (!value || value.trim() === '') {
        return { isValid: true, processedValue: null };
    }
    
    const numValue = parseInt(value.trim());
    
    if (isNaN(numValue)) {
        return {
            isValid: false,
            error: 'Veuillez entrer un nombre valide.'
        };
    }
    
    if (validator.min !== undefined && numValue < validator.min) {
        return {
            isValid: false,
            error: `La valeur doit être supérieure ou égale à ${validator.min}.`
        };
    }
    
    if (validator.max !== undefined && numValue > validator.max) {
        return {
            isValid: false,
            error: `La valeur doit être inférieure ou égale à ${validator.max}.`
        };
    }
    
    return { isValid: true, processedValue: numValue };
}

function validateBoolean(value) {
    if (!value || value.trim() === '') {
        return { isValid: true, processedValue: false };
    }
    
    const cleanValue = value.trim().toLowerCase();
    
    if (['true', '1', 'yes', 'oui', 'on', 'activé', 'actif'].includes(cleanValue)) {
        return { isValid: true, processedValue: true };
    }
    
    if (['false', '0', 'no', 'non', 'off', 'désactivé', 'inactif'].includes(cleanValue)) {
        return { isValid: true, processedValue: false };
    }
    
    return {
        isValid: false,
        error: 'Veuillez entrer true/false, oui/non, ou 1/0.'
    };
}

function validateConfigStructure(config) {
    const errors = [];
    const validSections = ['general', 'entry', 'modmail', 'tickets', 'logging', 'welcome', 'confession', 'games', 'kink', 'economy'];
    
    if (typeof config !== 'object' || Array.isArray(config)) {
        errors.push('La configuration doit être un objet JSON.');
        return { isValid: false, errors };
    }
    
    // Vérifier que toutes les sections sont valides
    Object.keys(config).forEach(sectionKey => {
        if (!validSections.includes(sectionKey)) {
            errors.push(`Section inconnue: "${sectionKey}"`);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

async function updateConfigField(sectionKey, fieldKey, value) {
    try {
        const config = configManager.getConfig();
        
        if (!config[sectionKey]) {
            config[sectionKey] = {};
        }
        
        // Gestion des champs nested (ex: economy.voiceActivity.enabled)
        setNestedValue(config[sectionKey], fieldKey, value);
        
        await configManager.updateConfig(config);
        
        // Récupérer les métadonnées pour la réponse
        const { fieldLabel, sectionLabel, fieldType } = getFieldMetadata(sectionKey, fieldKey);
        
        return {
            success: true,
            fieldLabel,
            sectionLabel,
            fieldType
        };
        
    } catch (error) {
        console.error('[CONFIG UPDATE] Erreur:', error);
        return {
            success: false,
            error: 'Erreur lors de la sauvegarde de la configuration.'
        };
    }
}

async function importConfiguration(importedConfig) {
    try {
        const currentConfig = configManager.getConfig();
        const importedSections = [];
        let updatedFields = 0;
        
        // Merger la configuration importée avec la configuration actuelle
        Object.entries(importedConfig).forEach(([sectionKey, sectionData]) => {
            if (!currentConfig[sectionKey]) {
                currentConfig[sectionKey] = {};
            }
            
            Object.entries(sectionData).forEach(([fieldKey, fieldValue]) => {
                currentConfig[sectionKey][fieldKey] = fieldValue;
                updatedFields++;
            });
            
            importedSections.push(sectionKey);
        });
        
        await configManager.updateConfig(currentConfig);
        
        return {
            success: true,
            importedSections,
            updatedFields
        };
        
    } catch (error) {
        console.error('[CONFIG IMPORT] Erreur:', error);
        return {
            success: false,
            error: 'Erreur lors de l\'import de la configuration.'
        };
    }
}

async function createConfigBackup(userId) {
    try {
        const config = configManager.getConfig();
        const timestamp = new Date().toISOString();
        const backupPath = `./config_backups/manual-backup-${userId}-${Date.now()}.json`;
        
        const fs = require('node:fs').promises;
        const path = require('node:path');
        
        // Créer le dossier de backup s'il n'existe pas
        const backupDir = path.dirname(backupPath);
        await fs.mkdir(backupDir, { recursive: true });
        
        // Sauvegarder avec métadonnées
        const backupData = {
            timestamp,
            userId,
            config
        };
        
        await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
        console.log(`[CONFIG BACKUP] Backup créé: ${backupPath}`);
        
    } catch (error) {
        console.error('[CONFIG BACKUP] Erreur:', error);
    }
}

// Fonctions utilitaires
function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
        if (!current[key]) current[key] = {};
        return current[key];
    }, obj);
    target[lastKey] = value;
}

function getFieldMetadata(sectionKey, fieldKey) {
    // Mapping des métadonnées pour les réponses
    const sectionLabels = {
        general: 'Paramètres généraux',
        entry: 'Système d\'entrée',
        modmail: 'ModMail',
        tickets: 'Tickets',
        logging: 'Logs',
        welcome: 'Messages de bienvenue',
        confession: 'Confessions',
        games: 'Jeux',
        kink: 'Contenu adulte',
        economy: 'Économie'
    };
    
    const fieldLabels = {
        prefix: 'Préfixe',
        adminRole: 'Rôle Administrateur',
        modRole: 'Rôle Modérateur',
        welcomeChannel: 'Canal de bienvenue',
        rulesChannel: 'Canal des règles',
        verificationRole: 'Rôle de vérification',
        modmailCategory: 'Catégorie ModMail',
        modmailLogs: 'Logs ModMail',
        ticketCategory: 'Catégorie Tickets',
        supportRole: 'Rôle Support',
        ticketLogs: 'Logs Tickets',
        modLogs: 'Logs Modération',
        messageLogs: 'Logs Messages',
        voiceLogs: 'Logs Vocal',
        memberLogs: 'Logs Membres',
        roleLogChannelId: 'Logs Rôles',
        welcomeMessage: 'Message de bienvenue',
        welcomeDM: 'Message privé',
        rulesMessage: 'Message des règles',
        gameChannel: 'Canal des jeux',
        gameLeaderboard: 'Classements',
        confessionChannel: 'Canal des confessions',
        nsfwChannel: 'Canal NSFW',
        kinkLevels: 'Niveaux activés',
        kinkLogs: 'Logs NSFW',
        'voiceActivity.pointsPerMinute': 'Points par minute (vocal)',
        'messageActivity.pointsPerReward': 'Points par récompense (message)',
        'dailyQuiz.pointsPerCorrectAnswer': 'Points par bonne réponse (quiz)',
        'limits.maxPointsPerDay': 'Limite journalière',
        'limits.maxPointsPerHour': 'Limite horaire'
    };
    
    return {
        sectionLabel: sectionLabels[sectionKey] || sectionKey,
        fieldLabel: fieldLabels[fieldKey] || fieldKey,
        fieldType: determineFieldType(fieldKey)
    };
}

function determineFieldType(fieldKey) {
    if (fieldKey.includes('Channel') || fieldKey.includes('Logs') || fieldKey === 'nsfwChannel') return 'channel';
    if (fieldKey.includes('Role')) return 'role';
    if (fieldKey.includes('Category')) return 'category';
    if (fieldKey.includes('Message')) return 'text';
    if (fieldKey.includes('Points') || fieldKey.includes('max') || fieldKey.includes('min')) return 'number';
    if (fieldKey.includes('enabled') || fieldKey === 'kinkLevels') return 'toggle';
    return 'text';
}

function formatDisplayValue(value, type) {
    if (value === undefined || value === null || value === '') {
        return '*Non configuré*';
    }
    
    switch (type) {
        case 'channel':
        case 'category':
            return `<#${value}>`;
        case 'role':
            return `<@&${value}>`;
        case 'toggle':
            return value ? '✅ Activé' : '❌ Désactivé';
        case 'number':
            return `\`${value}\``;
        default:
            return value.length > 100 ? `\`${value.substring(0, 97)}...\`` : `\`${value}\``;
    }
}

// Logging pour le futur système backend
function logConfigChange(userId, sectionKey, fieldKey, newValue) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'config_change',
        userId,
        sectionKey,
        fieldKey,
        newValue,
        // Ces champs seront utilisés quand le backend sera en place
        sessionId: null, // À implémenter avec le backend
        ipAddress: null, // À implémenter avec le backend
        userAgent: null  // À implémenter avec le backend
    };
    
    console.log('[CONFIG LOG]', JSON.stringify(logEntry));
    
    // TODO: Envoyer au backend quand disponible
    // await sendToBackend('/api/config/log', logEntry);
}

function logConfigImport(userId, importResult) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'config_import',
        userId,
        importedSections: importResult.importedSections,
        updatedFields: importResult.updatedFields
    };
    
    console.log('[CONFIG IMPORT LOG]', JSON.stringify(logEntry));
    
    // TODO: Envoyer au backend quand disponible
}