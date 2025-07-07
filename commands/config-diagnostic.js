const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { generateDiagnosticReport, formatDiagnosticMessage, generateInviteUrl } = require('./config/utils/permissionDiagnostic');

/**
 * @file commands/config-diagnostic.js
 * @description Diagnostic command to troubleshoot configuration system issues
 */

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config-diagnostic')
        .setDescription('Diagnostique les problèmes de permissions du système de configuration')
        .setDMPermission(false),

    async execute(interaction) {
        try {
            console.log(`[CONFIG DIAGNOSTIC] Diagnostic command invoked by ${interaction.user.tag} in ${interaction.guild.name}`);
            
            // Generate comprehensive diagnostic report
            const report = generateDiagnosticReport(interaction);
            const message = formatDiagnosticMessage(report);
            
            // Create diagnostic embed
            const embed = new EmbedBuilder()
                .setTitle('🔍 Diagnostic du Système de Configuration')
                .setDescription('Analyse complète des permissions et de la configuration')
                .setColor(report.issues.length === 0 ? 0x00FF00 : report.issues.some(i => i.severity === 'CRITICAL') ? 0xFF0000 : 0xFFA500)
                .addFields([
                    {
                        name: '👤 Utilisateur',
                        value: `${report.user.tag}\n${report.permissions.user.administrator ? '✅' : '❌'} Administrateur\n${report.permissions.user.isOwner ? '✅' : '❌'} Propriétaire`,
                        inline: true
                    },
                    {
                        name: '🤖 Bot',
                        value: `${report.botInfo.tag}\n${report.permissions.bot.administrator ? '✅' : '❌'} Administrateur\n${report.permissions.bot.useApplicationCommands ? '✅' : '❌'} Commandes`,
                        inline: true
                    },
                    {
                        name: '📊 Statut Global',
                        value: report.issues.length === 0 ? '✅ Tout fonctionne' : `⚠️ ${report.issues.length} problème(s)`,
                        inline: true
                    }
                ])
                .setFooter({ 
                    text: `Diagnostic • ${new Date().toLocaleString('fr-FR')}`,
                    iconURL: interaction.guild.iconURL() || null
                })
                .setTimestamp();

            // Add issues field if any
            if (report.issues.length > 0) {
                const issuesText = report.issues.map(issue => {
                    const severity = issue.severity === 'CRITICAL' ? '🔴' : issue.severity === 'HIGH' ? '🟠' : '🟡';
                    return `${severity} ${issue.message}`;
                }).join('\n');
                
                embed.addFields([{
                    name: '⚠️ Problèmes Détectés',
                    value: issuesText,
                    inline: false
                }]);
            }

            // Add recommendations if any
            if (report.recommendations.length > 0) {
                const recText = report.recommendations.map((rec, index) => 
                    `${index + 1}. ${rec.action}`
                ).join('\n');
                
                embed.addFields([{
                    name: '💡 Recommandations',
                    value: recText,
                    inline: false
                }]);
            }

            // Generate invite URL if bot has permission issues
            let inviteUrl = '';
            if (!report.permissions.bot.administrator) {
                try {
                    const clientId = interaction.client.user.id;
                    inviteUrl = generateInviteUrl(clientId);
                    
                    embed.addFields([{
                        name: '🔗 Lien de Ré-invitation',
                        value: `[Cliquez ici pour ré-inviter le bot avec les bonnes permissions](${inviteUrl})`,
                        inline: false
                    }]);
                } catch (error) {
                    console.error('[CONFIG DIAGNOSTIC] Error generating invite URL:', error);
                }
            }

            // Send the diagnostic report
            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            // Log full diagnostic report to console for debugging
            console.log('[CONFIG DIAGNOSTIC] Full report:', JSON.stringify(report, null, 2));

        } catch (error) {
            console.error('[CONFIG DIAGNOSTIC] Error during diagnostic:', error);
            
            await interaction.reply({
                content: `❌ **Erreur lors du diagnostic**\n\n\`\`\`\n${error.message}\n\`\`\`\n\n🔍 Vérifiez les logs du bot pour plus de détails.`,
                ephemeral: true
            });
        }
    }
};