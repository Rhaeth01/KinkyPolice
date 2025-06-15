const { EmbedBuilder } = require('discord.js');
const { addXpToUser, createLevelUpMessage, getUserStats } = require('./levelManager');
const configManager = require('./configManager');

/**
 * Gestionnaire d'événements pour le système de niveaux
 * Intégré avec les systèmes existants de messages et vocal
 */

/**
 * Traite le gain d'XP pour un message
 */
async function handleMessageXp(message) {
    try {
        const config = configManager.getConfig();
        if (!config.levels?.enabled) return;

        const levelConfig = config.levels;
        const xpConfig = levelConfig.xpGain?.message || { min: 15, max: 25 };
        
        // Calculer l'XP aléatoire dans la fourchette
        const randomXp = Math.floor(Math.random() * (xpConfig.max - xpConfig.min + 1)) + xpConfig.min;
        
        // Ajouter l'XP
        const result = await addXpToUser(message.author.id, randomXp, 'message', message.member);
        
        if (result.success && result.levelUp) {
            await handleLevelUpAnnouncement(message, result);
        }
        
        return result;
        
    } catch (error) {
        console.error('[LevelEventHandler] Erreur lors du traitement du message XP:', error);
        return { success: false, reason: 'Erreur système' };
    }
}

/**
 * Traite le gain d'XP pour l'activité vocale
 */
async function handleVoiceXp(userId, guildMember, client) {
    try {
        const config = configManager.getConfig();
        if (!config.levels?.enabled) return;

        const levelConfig = config.levels;
        const xpPerMinute = levelConfig.xpGain?.voice?.perMinute || 10;
        
        // Ajouter l'XP vocal
        const result = await addXpToUser(userId, xpPerMinute, 'voice', guildMember);
        
        if (result.success && result.levelUp) {
            // Pour les level ups vocaux, on a besoin de récupérer le guild et créer un message fictif
            const guild = guildMember.guild;
            const channel = await getLevelUpChannel(guild, config);
            
            if (channel) {
                await handleLevelUpAnnouncementVoice(guildMember, result, channel);
            }
        }
        
        return result;
        
    } catch (error) {
        console.error('[LevelEventHandler] Erreur lors du traitement du vocal XP:', error);
        return { success: false, reason: 'Erreur système' };
    }
}

/**
 * Gère l'annonce de level up pour les messages
 */
async function handleLevelUpAnnouncement(message, levelUpResult) {
    try {
        const config = configManager.getConfig();
        const levelConfig = config.levels;
        
        // Vérifier si les annonces sont activées
        if (!levelConfig.messages?.enabled) return;
        
        // Obtenir le canal d'annonce
        const announcementChannel = await getLevelUpChannel(message.guild, config) || message.channel;
        
        // Créer l'embed de level up
        const embed = await createLevelUpEmbed(message.author, levelUpResult);
        
        // Envoyer l'annonce
        await announcementChannel.send({ embeds: [embed] });
        
        console.log(`[LevelEventHandler] Annonce de level up envoyée pour ${message.author.tag} (niveau ${levelUpResult.newLevel})`);
        
    } catch (error) {
        console.error('[LevelEventHandler] Erreur lors de l\'annonce de level up:', error);
    }
}

/**
 * Gère l'annonce de level up pour l'activité vocale
 */
async function handleLevelUpAnnouncementVoice(guildMember, levelUpResult, channel) {
    try {
        const config = configManager.getConfig();
        const levelConfig = config.levels;
        
        // Vérifier si les annonces sont activées
        if (!levelConfig.messages?.enabled) return;
        
        // Créer l'embed de level up
        const embed = await createLevelUpEmbed(guildMember.user, levelUpResult);
        
        // Envoyer l'annonce
        await channel.send({ embeds: [embed] });
        
        console.log(`[LevelEventHandler] Annonce de level up vocal envoyée pour ${guildMember.user.tag} (niveau ${levelUpResult.newLevel})`);
        
    } catch (error) {
        console.error('[LevelEventHandler] Erreur lors de l\'annonce de level up vocal:', error);
    }
}

/**
 * Récupère le canal d'annonce de level up
 */
async function getLevelUpChannel(guild, config) {
    const channelId = config.levels?.levelUpChannel;
    if (!channelId) return null;
    
    try {
        return await guild.channels.fetch(channelId);
    } catch (error) {
        console.error('[LevelEventHandler] Canal de level up introuvable:', channelId);
        return null;
    }
}

/**
 * Crée un embed moderne pour les annonces de level up
 */
async function createLevelUpEmbed(user, levelUpResult) {
    const config = configManager.getConfig();
    const levelConfig = config.levels;
    
    // Obtenir les stats utilisateur pour les détails
    const userStats = await getUserStats(user.id);
    
    // Couleurs par niveau pour l'embed
    const levelColors = {
        1: '#95A5A6',    // Gris - débutant
        5: '#3498DB',    // Bleu - novice
        10: '#2ECC71',   // Vert - intermédiaire
        20: '#F39C12',   // Orange - avancé
        30: '#E74C3C',   // Rouge - expert
        40: '#9B59B6',   // Violet - maître
        50: '#F1C40F',   // Or - légendaire
        75: '#E67E22',   // Orange foncé - mythique
        100: '#1ABC9C'   // Turquoise - divin
    };
    
    // Trouver la couleur appropriée
    let embedColor = '#95A5A6';
    for (const [threshold, color] of Object.entries(levelColors).reverse()) {
        if (levelUpResult.newLevel >= parseInt(threshold)) {
            embedColor = color;
            break;
        }
    }
    
    // Déterminer l'icône et le titre selon le niveau
    let icon = '🎉';
    let titleSuffix = '';
    
    if (levelUpResult.newLevel >= 100) {
        icon = '👑';
        titleSuffix = ' - Rang Divin !';
    } else if (levelUpResult.newLevel >= 75) {
        icon = '🌟';
        titleSuffix = ' - Statut Mythique !';
    } else if (levelUpResult.newLevel >= 50) {
        icon = '🏆';
        titleSuffix = ' - Légende !';
    } else if (levelUpResult.newLevel >= 25) {
        icon = '⭐';
        titleSuffix = ' - Expert !';
    } else if (levelUpResult.newLevel >= 10) {
        icon = '🎯';
        titleSuffix = ' - Membre Expérimenté !';
    }
    
    // Créer l'embed
    const embed = new EmbedBuilder()
        .setTitle(`${icon} Level Up !${titleSuffix}`)
        .setDescription(`**${user.displayName || user.username}** vient d'atteindre le niveau **${levelUpResult.newLevel}** !`)
        .setColor(embedColor)
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .addFields([
            {
                name: '📈 Progression',
                value: `**Niveau:** ${levelUpResult.oldLevel} → **${levelUpResult.newLevel}**\n**XP Total:** ${userStats.totalXp.toLocaleString()}`,
                inline: true
            },
            {
                name: '🎯 Prochain Niveau',
                value: `**Progrès:** ${userStats.progress.current}/${userStats.progress.needed} XP\n**Complétion:** ${Math.round(userStats.progress.percentage)}%`,
                inline: true
            },
            {
                name: '🏆 Rang',
                value: `**Position:** #${userStats.rank || 'N/A'}\n**Statut:** ${getLevelTitle(levelUpResult.newLevel)}`,
                inline: true
            }
        ])
        .setFooter({ 
            text: `💫 Continuez à progresser ! • Niveau ${levelUpResult.newLevel}`, 
            iconURL: user.displayAvatarURL({ size: 32 })
        })
        .setTimestamp();
    
    // Ajouter les récompenses si applicables
    const rewards = getRewardsForLevel(levelUpResult.newLevel, config);
    if (rewards.length > 0) {
        embed.addFields({
            name: '🎁 Récompenses',
            value: rewards.join('\n'),
            inline: false
        });
    }
    
    return embed;
}

/**
 * Obtient le titre selon le niveau
 */
function getLevelTitle(level) {
    if (level >= 100) return '👑 Divinité';
    if (level >= 75) return '🌟 Mythique';
    if (level >= 50) return '🏆 Légende';
    if (level >= 40) return '💎 Maître';
    if (level >= 30) return '🔥 Expert';
    if (level >= 20) return '⚡ Avancé';
    if (level >= 10) return '🎯 Intermédiaire';
    if (level >= 5) return '📘 Novice';
    return '🌱 Débutant';
}

/**
 * Obtient les récompenses pour un niveau donné
 */
function getRewardsForLevel(level, config) {
    const rewards = [];
    const levelConfig = config.levels;
    
    // Récompenses en coins
    const coinReward = levelConfig.rewards?.coins?.[level];
    if (coinReward) {
        rewards.push(`💰 **${coinReward}** KinkyCoins`);
    }
    
    // Récompenses de paliers
    const milestoneReward = levelConfig.rewards?.milestones?.[level];
    if (milestoneReward) {
        if (milestoneReward.coins) {
            rewards.push(`🎉 **Bonus de palier:** ${milestoneReward.coins} KinkyCoins`);
        }
        if (milestoneReward.message) {
            rewards.push(`📜 ${milestoneReward.message}`);
        }
    }
    
    return rewards;
}

/**
 * Vérifie si un utilisateur peut gagner de l'XP dans un canal donné
 */
function canGainXpInChannel(channelId, config) {
    const excludedChannels = config.levels?.excludedChannels || [];
    return !excludedChannels.includes(channelId);
}

/**
 * Vérifie si un utilisateur peut gagner de l'XP avec ses rôles
 */
function canGainXpWithRoles(member, config) {
    const excludedRoles = config.levels?.excludedRoles || [];
    return !excludedRoles.some(roleId => member.roles.cache.has(roleId));
}

/**
 * Obtient le multiplicateur d'XP pour un membre
 */
function getXpMultiplier(member, config) {
    let multiplier = config.levels?.multipliers?.globalMultiplier || 1.0;
    
    // Bonus premium/nitro
    if (member.premiumSince) {
        multiplier *= config.levels?.multipliers?.premiumMultiplier || 1.2;
    }
    
    // Bonus de rôles booster
    const boosterRoles = config.levels?.boosterRoles || {};
    for (const [roleId, roleMultiplier] of Object.entries(boosterRoles)) {
        if (member.roles.cache.has(roleId)) {
            multiplier *= roleMultiplier;
            break; // Premier trouvé
        }
    }
    
    return multiplier;
}

/**
 * Statistiques rapides du système de niveaux
 */
async function getLevelSystemStats() {
    try {
        const { loadLevelsData } = require('./levelManager');
        const data = await loadLevelsData();
        
        const users = Object.values(data.users);
        if (users.length === 0) {
            return {
                totalUsers: 0,
                averageLevel: 0,
                highestLevel: 0,
                totalXp: 0
            };
        }
        
        const totalXp = users.reduce((sum, user) => sum + user.totalXp, 0);
        const averageLevel = users.reduce((sum, user) => sum + user.level, 0) / users.length;
        const highestLevel = Math.max(...users.map(user => user.level));
        
        return {
            totalUsers: users.length,
            averageLevel: Math.round(averageLevel * 10) / 10,
            highestLevel,
            totalXp: Math.round(totalXp)
        };
        
    } catch (error) {
        console.error('[LevelEventHandler] Erreur lors du calcul des stats:', error);
        return null;
    }
}

module.exports = {
    handleMessageXp,
    handleVoiceXp,
    handleLevelUpAnnouncement,
    createLevelUpEmbed,
    canGainXpInChannel,
    canGainXpWithRoles,
    getXpMultiplier,
    getLevelSystemStats,
    getLevelTitle
};