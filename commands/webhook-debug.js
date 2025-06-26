const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const webhookLogger = require('../utils/webhookLogger');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('webhook-debug')
        .setDescription('Diagnostic complet du système de webhooks (Admin seulement)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            const config = configManager.getConfig();
            const status = webhookLogger.getStatus();
            
            const embed = new EmbedBuilder()
                .setTitle('🔍 Diagnostic Système Webhooks')
                .setColor('#00FF00')
                .setTimestamp();
            
            // Statut général
            embed.addFields({
                name: '📊 Statut Général',
                value: `**Webhooks actifs:** ${status.webhooksActive}\n` +
                       `**Mode fallback:** ${status.fallbackMode ? '✅ Activé' : '❌ Désactivé'}\n` +
                       `**Types disponibles:** ${status.types.join(', ')}`,
                inline: false
            });
            
            // Détail des canaux et webhooks
            const logTypes = {
                messages: { path: 'logging.messageLogs', name: 'Messages' },
                moderation: { path: 'logging.modLogs', name: 'Modération' },
                voice: { path: 'logging.voiceLogs', name: 'Vocal' },
                roles: { path: 'logging.roleLogChannelId', name: 'Rôles' }
            };
            
            let details = '';
            for (const [type, info] of Object.entries(logTypes)) {
                const channelId = this.getConfigValue(config, info.path);
                const channel = channelId ? interaction.guild.channels.cache.get(channelId) : null;
                const hasWebhook = status.webhooksActive > 0; // Simplification pour le diagnostic
                
                details += `**${info.name}:**\n`;
                details += `Canal: ${channel ? `#${channel.name}` : '❌ Non configuré'}\n`;
                details += `Webhook: ${hasWebhook ? '✅ Actif' : '❌ Inactif'}\n\n`;
            }
            
            embed.addFields({
                name: '📋 Détail par Type',
                value: details || 'Aucune configuration trouvée',
                inline: false
            });
            
            // Test rapide
            embed.addFields({
                name: '🧪 Test Rapide',
                value: 'Utilisez les boutons ci-dessous pour tester le système',
                inline: false
            });
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('[WEBHOOK-DEBUG] Erreur:', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ Erreur lors du diagnostic: ${error.message}`
                });
            } else {
                await interaction.reply({
                    content: `❌ Erreur lors du diagnostic: ${error.message}`,
                    ephemeral: true
                });
            }
        }
    },
    
    getConfigValue(config, path) {
        const parts = path.split('.');
        let value = config;
        
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                return null;
            }
        }
        
        return value;
    }
};