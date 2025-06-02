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
            
            await interaction.editReply({
                embeds: [errorEmbed],
                ephemeral: true
            });
            
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
            await interaction.reply({
                content: '❌ Une erreur est survenue lors du traitement de votre demande.',
                ephemeral: true
            });
            return true;
        }
    }

    async refreshConfigDisplay(interaction) {
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
    }

    async createBackup(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
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
            await interaction.editReply({
                content: '❌ Erreur lors de la création de la sauvegarde.',
                ephemeral: true
            });
        }
    }

    async showRestoreOptions(interaction) {
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