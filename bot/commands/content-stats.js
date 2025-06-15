const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const kinkApiManager = require('../utils/kinkApiManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('content-stats')
        .setDescription('Affiche les statistiques du contenu Action/Vérité/Gage par niveau.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const stats = kinkApiManager.getStats();

            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle('📊 Statistiques du Contenu')
                .setDescription('Répartition du contenu Action/Vérité/Gage par niveau d\'intensité')
                .setTimestamp();

            // Calculer les totaux
            let totalContent = 0;
            const levelTotals = {};

            for (const level in stats.backupContent) {
                levelTotals[level] = 0;
                for (const type in stats.backupContent[level]) {
                    const count = stats.backupContent[level][type];
                    levelTotals[level] += count;
                    totalContent += count;
                }
            }

            // Ajouter les statistiques par niveau
            for (const level in stats.backupContent) {
                const levelData = stats.backupContent[level];
                const emoji = this.getLevelEmoji(level);
                const levelName = level.charAt(0).toUpperCase() + level.slice(1);
                
                let fieldValue = '';
                fieldValue += `**Vérités:** ${levelData.truths || 0}\n`;
                fieldValue += `**Actions:** ${levelData.dares || 0}\n`;
                fieldValue += `**Gages:** ${levelData.gages || 0}\n`;
                fieldValue += `**Total:** ${levelTotals[level]}`;

                embed.addFields({
                    name: `${emoji} ${levelName}`,
                    value: fieldValue,
                    inline: true
                });
            }

            // Ajouter le total général
            embed.addFields({
                name: '📈 Total Général',
                value: `**${totalContent}** éléments de contenu`,
                inline: false
            });

            // Ajouter des suggestions
            const suggestions = [];
            for (const level in stats.backupContent) {
                const levelData = stats.backupContent[level];
                for (const type of ['truths', 'dares', 'gages']) {
                    const count = levelData[type] || 0;
                    if (count < 10) {
                        const typeName = type === 'truths' ? 'vérités' : type === 'dares' ? 'actions' : 'gages';
                        suggestions.push(`${this.getLevelEmoji(level)} ${level} - ${typeName} (${count})`);
                    }
                }
            }

            if (suggestions.length > 0) {
                embed.addFields({
                    name: '💡 Suggestions d\'amélioration',
                    value: `Les catégories suivantes ont moins de 10 éléments :\n${suggestions.slice(0, 5).join('\n')}${suggestions.length > 5 ? `\n... et ${suggestions.length - 5} autres` : ''}`,
                    inline: false
                });
            }

            // Ajouter les commandes utiles
            embed.addFields({
                name: '🛠️ Commandes d\'ajout',
                value: '• `/add-verite` - Ajouter une vérité\n• `/add-action` - Ajouter une action\n• `/add-gage` - Ajouter un gage',
                inline: false
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Erreur')
                .setDescription('Une erreur est survenue lors de la récupération des statistiques.')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },

    getLevelEmoji(level) {
        const emojis = {
            'doux': '🌸',
            'modéré': '🔥',
            'intense': '💀'
        };
        return emojis[level] || '💥';
    }
};