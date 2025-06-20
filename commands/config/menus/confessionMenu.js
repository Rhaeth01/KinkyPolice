const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, StringSelectMenuBuilder } = require('discord.js');
const configManager = require('../../../utils/configManager');

class ConfessionMenu {
    static async show(interaction) {
        const config = configManager.getConfig();
        const confessionConfig = config.confession || {};
        
        // Récupérer le salon de confession
        const confessionChannel = confessionConfig.confessionChannel ? 
            await interaction.guild.channels.fetch(confessionConfig.confessionChannel).catch(() => null) : null;
        
        // Récupérer le salon de logs
        const logsChannel = confessionConfig.logsChannel ? 
            await interaction.guild.channels.fetch(confessionConfig.logsChannel).catch(() => null) : null;
        
        // Statut des logs (activé/désactivé)
        const logsEnabled = confessionConfig.logsEnabled || false;
        
        const embed = new EmbedBuilder()
            .setTitle('💬 Configuration des Confessions')
            .setDescription('Gérez le système de confessions anonymes du serveur.\n\n**Comment ça marche ?**\nLes membres peuvent envoyer des confessions anonymes via la commande `/confession`. Les confessions apparaissent dans le salon configuré avec un compteur unique.')
            .setColor('#9B59B6')
            .addFields(
                {
                    name: '📍 Salon des Confessions',
                    value: confessionChannel ? `<#${confessionChannel.id}>` : '❌ Aucun salon configuré',
                    inline: true
                },
                {
                    name: '📊 Statistiques',
                    value: '• Utilisez `/confession stats` pour voir les statistiques\n• Les confessions sont numérotées automatiquement',
                    inline: true
                },
                {
                    name: '📝 Logs des Confessions',
                    value: `**État :** ${logsEnabled ? '✅ Activé' : '❌ Désactivé'}\n**Salon :** ${logsChannel ? `<#${logsChannel.id}>` : 'Non configuré'}`,
                    inline: false
                }
            )
            .setFooter({ text: 'Les confessions sont 100% anonymes - aucune donnée utilisateur n\'est stockée' })
            .setTimestamp();

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confession_select_channel')
                    .setLabel('Configurer le Salon')
                    .setEmoji('📍')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('confession_toggle_logs')
                    .setLabel(logsEnabled ? 'Désactiver les Logs' : 'Activer les Logs')
                    .setEmoji('📝')
                    .setStyle(logsEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('confession_select_logs_channel')
                    .setLabel('Salon de Logs')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!logsEnabled)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('config_back')
                    .setLabel('Retour')
                    .setEmoji('◀️')
                    .setStyle(ButtonStyle.Secondary)
            );

        return { embeds: [embed], components: [row1, row2] };
    }

    static async handleChannelSelect(interaction, saveChanges) {
        const selectedChannel = interaction.channels.first();
        
        if (!selectedChannel) {
            return interaction.followUp({
                content: '❌ Aucun salon sélectionné.',
                ephemeral: true
            });
        }

        console.log(`[CONFIG] Configuration du salon de confession: ${selectedChannel.name} (${selectedChannel.id})`);

        // Sauvegarder immédiatement
        const success = await saveChanges(interaction.user.id, {
            confession: {
                confessionChannel: selectedChannel.id
            }
        });

        if (success) {
            await interaction.followUp({
                content: `✅ Le salon des confessions a été configuré : <#${selectedChannel.id}>`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: '❌ Erreur lors de la sauvegarde du salon de confession.',
                ephemeral: true
            });
        }
    }

    static async handleLogsChannelSelect(interaction, saveChanges) {
        const selectedChannel = interaction.channels.first();
        
        if (!selectedChannel) {
            return interaction.followUp({
                content: '❌ Aucun salon sélectionné.',
                ephemeral: true
            });
        }

        console.log(`[CONFIG] Configuration du salon de logs de confession: ${selectedChannel.name} (${selectedChannel.id})`);

        // Sauvegarder immédiatement
        const success = await saveChanges(interaction.user.id, {
            confession: {
                logsChannel: selectedChannel.id
            }
        });

        if (success) {
            await interaction.followUp({
                content: `✅ Le salon de logs des confessions a été configuré : <#${selectedChannel.id}>`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: '❌ Erreur lors de la sauvegarde du salon de logs.',
                ephemeral: true
            });
        }
    }

    static async handleToggleLogs(interaction, saveChanges) {
        const config = configManager.getConfig();
        const confessionConfig = config.confession || {};
        const currentState = confessionConfig.logsEnabled || false;
        const newState = !currentState;

        console.log(`[CONFIG] Toggle des logs de confession: ${currentState} → ${newState}`);

        // Sauvegarder immédiatement
        const success = await saveChanges(interaction.user.id, {
            confession: {
                logsEnabled: newState
            }
        });

        if (success) {
            // Rafraîchir le menu avec les nouvelles valeurs
            const menuContent = await this.show(interaction);
            await interaction.update(menuContent);
        } else {
            await interaction.reply({
                content: '❌ Erreur lors de la sauvegarde des paramètres de logs.',
                ephemeral: true
            });
        }
    }
}

module.exports = ConfessionMenu;