const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getTopUsers, getUserStats } = require('../utils/levelManager');
const { getLevelTitle } = require('../utils/levelEventHandler');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('levels')
        .setDescription('🏆 Affiche le classement des niveaux du serveur')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type de classement à afficher')
                .setRequired(false)
                .addChoices(
                    { name: '🏆 Niveaux', value: 'levels' },
                    { name: '⭐ XP Total', value: 'xp' },
                    { name: '📅 Cette semaine', value: 'weekly' },
                    { name: '📊 Aujourd\'hui', value: 'daily' }
                ))
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page du classement (par défaut: 1)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10))
        .setDMPermission(false),

    async execute(interaction) {
        // Vérifier si le système de niveaux est activé
        const config = configManager.getConfig();
        if (!config.levels?.enabled) {
            return interaction.reply({
                content: '❌ Le système de niveaux n\'est pas activé sur ce serveur.',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const type = interaction.options.getString('type') || 'levels';
            const page = interaction.options.getInteger('page') || 1;

            await showLeaderboard(interaction, type, page);

        } catch (error) {
            console.error('Erreur lors de l\'affichage du leaderboard:', error);
            await interaction.editReply({
                content: '❌ Une erreur est survenue lors de l\'affichage du classement.'
            });
        }
    }
};

async function showLeaderboard(interaction, type, page) {
    const pageSize = 10;
    const offset = (page - 1) * pageSize;
    
    // Récupérer les données selon le type de classement
    let topUsers, totalUsers, title, icon, description;
    
    switch (type) {
        case 'xp':
            topUsers = await getTopUsers(pageSize, offset, 'totalXp');
            title = '⭐ Classement XP Total';
            description = 'Les membres avec le plus d\'expérience totale';
            break;
        case 'weekly':
            topUsers = await getTopUsers(pageSize, offset, 'weeklyXp');
            title = '📅 Classement Hebdomadaire';
            description = 'Les plus actifs cette semaine';
            break;
        case 'daily':
            topUsers = await getTopUsers(pageSize, offset, 'dailyXp');
            title = '📊 Classement Quotidien';
            description = 'Les plus actifs aujourd\'hui';
            break;
        default:
            topUsers = await getTopUsers(pageSize, offset, 'level');
            title = '🏆 Classement des Niveaux';
            description = 'Les membres avec les niveaux les plus élevés';
    }

    if (!topUsers || topUsers.length === 0) {
        return interaction.editReply({
            content: '📊 Aucune donnée de classement disponible pour le moment.'
        });
    }

    // Créer l'embed du leaderboard
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(`**${description}**\n\n${await createLeaderboardText(topUsers, offset, type, interaction.guild)}`)
        .setColor(getLeaderboardColor(type))
        .setThumbnail(interaction.guild.iconURL({ size: 128 }))
        .setFooter({ 
            text: `Page ${page} • Mis à jour`, 
            iconURL: interaction.client.user.displayAvatarURL() 
        })
        .setTimestamp();

    // Ajouter des statistiques globales
    const stats = await getGlobalStats();
    if (stats) {
        embed.addFields({
            name: '📈 Statistiques Globales',
            value: `**Membres actifs:** ${stats.totalUsers}\n**Niveau moyen:** ${stats.averageLevel}\n**XP total:** ${stats.totalXp.toLocaleString()}`,
            inline: true
        });
    }

    // Ajouter la position de l'utilisateur actuel
    const userStats = await getUserStats(interaction.user.id);
    if (userStats.rank) {
        embed.addFields({
            name: '🎯 Votre Position',
            value: `**Rang:** #${userStats.rank}\n**Niveau:** ${userStats.level}\n**XP:** ${userStats.totalXp.toLocaleString()}`,
            inline: true
        });
    }

    // Boutons de navigation
    const components = createNavigationButtons(type, page, topUsers.length === pageSize);

    await interaction.editReply({
        embeds: [embed],
        components: components
    });

    // Collecteur pour la navigation
    const reply = await interaction.fetchReply();
    const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id && i.message.id === reply.id,
        time: 300000 // 5 minutes
    });

    collector.on('collect', async i => {
        try {
            const [action, newType, newPage] = i.customId.split('_');
            
            if (action === 'levels') {
                await i.deferUpdate();
                await showLeaderboard(i, newType, parseInt(newPage));
            }
        } catch (error) {
            console.error('[LEVELS] Erreur navigation:', error);
            if (!i.replied && !i.deferred) {
                await i.reply({
                    content: '❌ Erreur de navigation.',
                    ephemeral: true
                });
            }
        }
    });

    collector.on('end', async () => {
        try {
            const disabledComponents = components.map(row => {
                const newRow = new ActionRowBuilder();
                row.components.forEach(component => {
                    newRow.addComponents(
                        ButtonBuilder.from(component).setDisabled(true)
                    );
                });
                return newRow;
            });

            await interaction.editReply({ components: disabledComponents });
        } catch (error) {
            console.log('[LEVELS] Session expirée, impossible de désactiver les boutons');
        }
    });
}

async function createLeaderboardText(topUsers, offset, type, guild) {
    const lines = [];
    
    for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
        const position = offset + i + 1;
        
        // Obtenir les informations du membre Discord
        let displayName = user.userId;
        let userTag = '';
        try {
            const member = await guild.members.fetch(user.userId).catch(() => null);
            if (member) {
                displayName = member.displayName;
                userTag = member.user.tag;
            }
        } catch (error) {
            // Utilisateur pas trouvé
            displayName = `Utilisateur ${user.userId.slice(-4)}`;
        }

        // Icônes de position
        let positionIcon = `\`${position.toString().padStart(2, ' ')}\``;
        if (position === 1) positionIcon = '🥇';
        else if (position === 2) positionIcon = '🥈';
        else if (position === 3) positionIcon = '🥉';
        else if (position <= 10) positionIcon = `🔟`;

        // Valeur selon le type de classement
        let value, valueLabel;
        switch (type) {
            case 'xp':
                value = user.totalXp?.toLocaleString() || '0';
                valueLabel = 'XP';
                break;
            case 'weekly':
                value = user.weeklyXp?.toLocaleString() || '0';
                valueLabel = 'XP/sem';
                break;
            case 'daily':
                value = user.dailyXp?.toLocaleString() || '0';
                valueLabel = 'XP/jour';
                break;
            default:
                value = user.level || 0;
                valueLabel = getLevelTitle(user.level);
        }

        // Barre de progression pour les niveaux
        let progressBar = '';
        if (type === 'levels' && user.level > 0) {
            const progress = user.progress || { percentage: 0 };
            const barLength = 8;
            const filled = Math.round((progress.percentage / 100) * barLength);
            progressBar = ` ${'▰'.repeat(filled)}${'▱'.repeat(barLength - filled)}`;
        }

        lines.push(`${positionIcon} **${displayName}** • Niv.${user.level || 0}${progressBar}\n    ${valueLabel}: **${value}**${type === 'levels' ? ` • ${user.totalXp?.toLocaleString() || 0} XP` : ''}`);
    }

    return lines.join('\n\n');
}

function createNavigationButtons(currentType, currentPage, hasNextPage) {
    const typeButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`levels_levels_1`)
                .setLabel('Niveaux')
                .setEmoji('🏆')
                .setStyle(currentType === 'levels' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`levels_xp_1`)
                .setLabel('XP Total')
                .setEmoji('⭐')
                .setStyle(currentType === 'xp' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`levels_weekly_1`)
                .setLabel('Semaine')
                .setEmoji('📅')
                .setStyle(currentType === 'weekly' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`levels_daily_1`)
                .setLabel('Aujourd\'hui')
                .setEmoji('📊')
                .setStyle(currentType === 'daily' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        );

    const navigationButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`levels_${currentType}_${Math.max(1, currentPage - 1)}`)
                .setLabel('Précédent')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage <= 1),
            new ButtonBuilder()
                .setCustomId(`levels_${currentType}_1`)
                .setLabel(`Page ${currentPage}`)
                .setEmoji('📄')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(`levels_${currentType}_${currentPage + 1}`)
                .setLabel('Suivant')
                .setEmoji('➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!hasNextPage)
        );

    return [typeButtons, navigationButtons];
}

function getLeaderboardColor(type) {
    const colors = {
        levels: '#FFD700',    // Or
        xp: '#9B59B6',        // Violet
        weekly: '#3498DB',    // Bleu
        daily: '#2ECC71'      // Vert
    };
    return colors[type] || '#5865F2';
}

async function getGlobalStats() {
    try {
        const { getLevelSystemStats } = require('../utils/levelEventHandler');
        return await getLevelSystemStats();
    } catch (error) {
        console.error('[LEVELS] Erreur lors du calcul des stats globales:', error);
        return null;
    }
}