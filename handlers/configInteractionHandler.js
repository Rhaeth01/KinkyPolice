const { EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');

class ConfigInteractionHandler {
    constructor() {
        this.activeInteractions = new Map();
    }

    async handleModalSubmit(interaction) {
        if (!interaction.customId.startsWith('config_modal_')) return false;

        const [, , sectionKey, fieldKey] = interaction.customId.split('_');
        
        try {
            // Vérifier si l'interaction a déjà été traitée
            if (interaction.replied || interaction.deferred) {
                console.log('[CONFIG HANDLER] Interaction déjà traitée, ignorée');
                return true;
            }

            await interaction.deferReply({ ephemeral: true });
            
            const newValue = interaction.fields.getTextInputValue('field_value').trim();
            const config = configManager.getConfig();
            
            // Initialiser la section si elle n'existe pas
            if (!config[sectionKey]) {
                config[sectionKey] = {};
            }
            
            // Mettre à jour ou supprimer la valeur
            if (newValue === '') {
                delete config[sectionKey][fieldKey];
            } else {
                // Validation selon le type
                const fieldType = this.getFieldType(sectionKey, fieldKey);
                if (fieldType && !this.validateFieldValue(newValue, fieldType)) {
                    await interaction.editReply({
                        content: `❌ Valeur invalide pour ${fieldKey}. ${this.getValidationMessage(fieldType)}`,
                        ephemeral: true
                    });
                    return true;
                }
                
                config[sectionKey][fieldKey] = newValue;
            }
            
            // Sauvegarder
            await configManager.updateConfig(config);
            
            // Créer un embed de confirmation moderne
            const embed = new EmbedBuilder()
                .setTitle('✅ Configuration mise à jour')
                .setDescription(`**${fieldKey}** a été modifié avec succès`)
                .addFields([
                    {
                        name: '📝 Nouvelle valeur',
                        value: newValue || '*Supprimé*',
                        inline: true
                    },
                    {
                        name: '📂 Section',
                        value: sectionKey,
                        inline: true
                    }
                ])
                .setColor('#00ff00')
                .setTimestamp();
            
            await interaction.editReply({
                embeds: [embed],
                ephemeral: true
            });
            
            return true;
            
        } catch (error) {
            console.error('[CONFIG HANDLER] Erreur:', error);
            
            try {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Erreur de configuration')
                    .setDescription(`Impossible de sauvegarder la modification`)
                    .addFields([
                        {
                            name: '🔍 Détails',
                            value: error.message,
                            inline: false
                        }
                    ])
                    .setColor('#ff0000')
                    .setTimestamp();
                
                if (interaction.deferred && !interaction.replied) {
                    await interaction.editReply({
                        embeds: [errorEmbed],
                        ephemeral: true
                    });
                } else if (!interaction.replied) {
                    await interaction.reply({
                        embeds: [errorEmbed],
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('[CONFIG HANDLER] Erreur lors de la réponse:', replyError);
            }
            
            return true;
        }
    }

    async handleButtonInteraction(interaction) {
        if (!interaction.customId.startsWith('config_')) return false;

        try {
            // Gérer les différents types de boutons
            if (interaction.customId === 'config_refresh') {
                await this.refreshConfigDisplay(interaction);
            } else if (interaction.customId === 'config_backup') {
                await this.createBackup(interaction);
            } else if (interaction.customId === 'config_restore') {
                await this.showRestoreOptions(interaction);
            }
            
            return true;
            
        } catch (error) {
            console.error('[CONFIG HANDLER] Erreur bouton:', error);
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Une erreur est survenue lors du traitement de votre demande.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('[CONFIG HANDLER] Erreur lors de la réponse:', replyError);
            }
            
            return true;
        }
    }

    async refreshConfigDisplay(interaction) {
        try {
            if (interaction.replied || interaction.deferred) {
                return;
            }

            await interaction.deferUpdate();
            
            const config = configManager.getConfig();
            
            const embed = new EmbedBuilder()
                .setTitle('🔄 Configuration actualisée')
                .setDescription('La configuration a été rechargée depuis le fichier')
                .setColor('#3498db')
                .setTimestamp();
            
            // Ajouter un résumé des sections
            const sections = Object.keys(config);
            embed.addFields([
                {
                    name: '📊 Statistiques',
                    value: `**Sections:** ${sections.length}\n**Dernière mise à jour:** ${new Date().toLocaleString('fr-FR')}`,
                    inline: false
                }
            ]);
            
            await interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            console.error('[CONFIG HANDLER] Erreur refresh:', error);
        }
    }

    async createBackup(interaction) {
        try {
            if (interaction.replied || interaction.deferred) {
                return;
            }

            await interaction.deferReply({ ephemeral: true });
            
            const config = configManager.getConfig();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupData = {
                timestamp: new Date().toISOString(),
                guild: interaction.guild.id,
                config: config
            };
            
            const backupString = JSON.stringify(backupData, null, 2);
            const buffer = Buffer.from(backupString, 'utf8');
            
            const embed = new EmbedBuilder()
                .setTitle('💾 Sauvegarde créée')
                .setDescription('Votre configuration a été exportée avec succès')
                .addFields([
                    {
                        name: '📅 Date',
                        value: new Date().toLocaleString('fr-FR'),
                        inline: true
                    },
                    {
                        name: '🏷️ Serveur',
                        value: interaction.guild.name,
                        inline: true
                    }
                ])
                .setColor('#f39c12')
                .setTimestamp();
            
            await interaction.editReply({
                embeds: [embed],
                files: [{
                    attachment: buffer,
                    name: `backup-${interaction.guild.id}-${timestamp}.json`
                }]
            });
            
        } catch (error) {
            console.error('[CONFIG HANDLER] Erreur backup:', error);
            
            try {
                if (!interaction.replied) {
                    await interaction.editReply({
                        content: '❌ Erreur lors de la création de la sauvegarde.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('[CONFIG HANDLER] Erreur lors de la réponse backup:', replyError);
            }
        }
    }

    async showRestoreOptions(interaction) {
        try {
            if (interaction.replied || interaction.deferred) {
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🔄 Restauration de configuration')
                .setDescription('Pour restaurer une configuration, envoyez un fichier de sauvegarde dans ce canal.')
                .addFields([
                    {
                        name: '📋 Instructions',
                        value: '1. Téléchargez votre fichier de sauvegarde\n2. Glissez-déposez le dans ce canal\n3. Confirmez la restauration',
                        inline: false
                    },
                    {
                        name: '⚠️ Attention',
                        value: 'La restauration remplacera toute la configuration actuelle',
                        inline: false
                    }
                ])
                .setColor('#e74c3c')
                .setTimestamp();
            
            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            console.error('[CONFIG HANDLER] Erreur restore options:', error);
        }
    }

    // Méthodes utilitaires
    getFieldType(sectionKey, fieldKey) {
        const CONFIG_SECTIONS = {
            general: {
                fields: [
                    { key: 'prefix', type: 'text' },
                    { key: 'adminRole', type: 'role' },
                    { key: 'modRole', type: 'role' }
                ]
            },
            entry: {
                fields: [
                    { key: 'welcomeChannel', type: 'channel' },
                    { key: 'rulesChannel', type: 'channel' },
                    { key: 'verificationRole', type: 'role' }
                ]
            },
            modmail: {
                fields: [
                    { key: 'modmailCategory', type: 'category' },
                    { key: 'modmailLogs', type: 'channel' }
                ]
            },
            tickets: {
                fields: [
                    { key: 'ticketCategory', type: 'category' },
                    { key: 'supportRole', type: 'role' },
                    { key: 'ticketLogs', type: 'channel' }
                ]
            },
            logging: {
                fields: [
                    { key: 'modLogs', type: 'channel' },
                    { key: 'messageLogs', type: 'channel' },
                    { key: 'voiceLogs', type: 'channel' },
                    { key: 'memberLogs', type: 'channel' },
                    { key: 'roleLogChannelId', type: 'channel' }
                ]
            },
            welcome: {
                fields: [
                    { key: 'welcomeMessage', type: 'text' },
                    { key: 'rulesMessage', type: 'text' },
                    { key: 'welcomeDM', type: 'text' }
                ]
            },
            confession: {
                fields: [
                    { key: 'confessionChannel', type: 'channel' }
                ]
            },
            games: {
                fields: [
                    { key: 'gameChannel', type: 'channel' },
                    { key: 'gameLeaderboard', type: 'channel' }
                ]
            },
            kink: {
                fields: [
                    { key: 'nsfwChannel', type: 'channel' },
                    { key: 'kinkLevels', type: 'text' },
                    { key: 'kinkLogs', type: 'channel' }
                ]
            }
        };

        const section = CONFIG_SECTIONS[sectionKey];
        if (!section) return null;
        
        const field = section.fields.find(f => f.key === fieldKey);
        return field ? field.type : null;
    }

    validateFieldValue(value, type) {
        if (type === 'channel' || type === 'role' || type === 'category' || type === 'user') {
            return /^\d{17,19}$/.test(value);
        }
        return true;
    }

    getValidationMessage(type) {
        if (type === 'channel' || type === 'role' || type === 'category' || type === 'user') {
            return 'Veuillez entrer un ID Discord valide (17-19 chiffres).';
        }
        return '';
    }

    // Méthode pour nettoyer les interactions expirées
    cleanupExpiredInteractions() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, data] of this.activeInteractions) {
            if (now - data.timestamp > 300000) { // 5 minutes
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => this.activeInteractions.delete(key));
    }
}

module.exports = new ConfigInteractionHandler();