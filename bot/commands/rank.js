const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getUserStats, LEVEL_FORMULAS } = require('../utils/levelManager');
const { getLevelTitle } = require('../utils/levelEventHandler');
// Canvas will be loaded dynamically if available
let Canvas, createCanvas, loadImage;
try {
    const canvas = require('@napi-rs/canvas');
    Canvas = canvas.Canvas;
    createCanvas = canvas.createCanvas;
    loadImage = canvas.loadImage;
} catch (error) {
    console.log('[RANK] Canvas non disponible, les images de rang seront désactivées');
    createCanvas = null;
    loadImage = null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('📊 Affiche votre niveau et progression XP')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Voir le niveau d\'un autre utilisateur')
                .setRequired(false))
        .setDMPermission(false),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
        const member = interaction.guild.members.cache.get(targetUser.id);
        
        if (!member) {
            return interaction.reply({
                content: '❌ Utilisateur introuvable sur ce serveur.',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const userStats = await getUserStats(targetUser.id);
            
            // Créer l'embed de niveau
            const embed = await createRankEmbed(targetUser, member, userStats);
            
            // Créer l'image de progression (optionnel)
            let attachment = null;
            try {
                attachment = await createRankCard(targetUser, member, userStats);
            } catch (error) {
                console.log('[RANK] Impossible de créer l\'image de rang, utilisation de l\'embed seul');
            }
            
            const response = { embeds: [embed] };
            if (attachment) {
                response.files = [attachment];
                embed.setImage('attachment://rank-card.png');
            }
            
            await interaction.editReply(response);

        } catch (error) {
            console.error('Erreur lors de l\'affichage du rang:', error);
            await interaction.editReply({
                content: '❌ Une erreur est survenue lors de l\'affichage de votre rang.'
            });
        }
    }
};

/**
 * Crée un embed détaillé pour le rang
 */
async function createRankEmbed(user, member, stats) {
    // Couleurs par niveau
    const levelColors = {
        1: '#95A5A6',    // Gris
        5: '#3498DB',    // Bleu
        10: '#2ECC71',   // Vert
        20: '#F39C12',   // Orange
        30: '#E74C3C',   // Rouge
        40: '#9B59B6',   // Violet
        50: '#F1C40F',   // Or
        75: '#E67E22',   // Orange foncé
        100: '#1ABC9C'   // Turquoise
    };
    
    let embedColor = '#95A5A6';
    for (const [threshold, color] of Object.entries(levelColors).reverse()) {
        if (stats.level >= parseInt(threshold)) {
            embedColor = color;
            break;
        }
    }
    
    const title = getLevelTitle(stats.level);
    
    const embed = new EmbedBuilder()
        .setTitle(`📊 Profil de ${user.displayName || user.username}`)
        .setColor(embedColor)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields([
            {
                name: '🏆 Niveau Actuel',
                value: `**${stats.level}** (${title})`,
                inline: true
            },
            {
                name: '🎯 Rang Serveur',
                value: `**#${stats.rank || 'N/A'}**`,
                inline: true
            },
            {
                name: '⭐ XP Total',
                value: `**${stats.totalXp.toLocaleString()}** XP`,
                inline: true
            },
            {
                name: '📈 Progression Actuelle',
                value: `**${stats.progress.current}** / **${stats.progress.needed}** XP\n` +
                       `${createProgressBar(stats.progress.percentage)} **${Math.round(stats.progress.percentage)}%**`,
                inline: false
            },
            {
                name: '🎯 Prochain Niveau',
                value: `**Niveau ${stats.level + 1}**\nEncore **${stats.progress.needed - stats.progress.current}** XP nécessaires`,
                inline: true
            },
            {
                name: '💎 Statut',
                value: getStatusMessage(stats.level, member),
                inline: true
            }
        ])
        .setFooter({ 
            text: `💫 Continuez à progresser ! • ${getMotivationalMessage(stats.level)}`, 
            iconURL: user.displayAvatarURL({ size: 32 })
        })
        .setTimestamp();
    
    return embed;
}

/**
 * Crée une barre de progression textuelle
 */
function createProgressBar(percentage, length = 15) {
    const filledLength = Math.round((percentage / 100) * length);
    const emptyLength = length - filledLength;
    
    const filledBar = '▰'.repeat(filledLength);
    const emptyBar = '▱'.repeat(emptyLength);
    
    return `${filledBar}${emptyBar}`;
}

/**
 * Obtient un message de statut personnalisé
 */
function getStatusMessage(level, member) {
    let status = getLevelTitle(level);
    
    // Ajouter des infos supplémentaires
    const extras = [];
    
    if (member.premiumSince) {
        extras.push('💎 Premium');
    }
    
    if (member.roles.cache.some(role => role.name.toLowerCase().includes('boost'))) {
        extras.push('🚀 Booster');
    }
    
    if (level >= 50) {
        extras.push('👑 VIP');
    }
    
    if (extras.length > 0) {
        status += `\n${extras.join(' • ')}`;
    }
    
    return status;
}

/**
 * Obtient un message motivationnel selon le niveau
 */
function getMotivationalMessage(level) {
    if (level >= 100) return 'Vous avez atteint la perfection !';
    if (level >= 75) return 'Statut mythique atteint !';
    if (level >= 50) return 'Vous êtes une légende !';
    if (level >= 40) return 'Maîtrise impressionnante !';
    if (level >= 30) return 'Expertise reconnue !';
    if (level >= 20) return 'Progression excellente !';
    if (level >= 10) return 'Très bon travail !';
    if (level >= 5) return 'Vous progressez bien !';
    return 'Bienvenue dans l\'aventure !';
}

/**
 * Crée une carte de rang visuelle (optionnel)
 */
async function createRankCard(user, member, stats) {
    try {
        if (!createCanvas) {
            console.log('[RANK CARD] Canvas non disponible');
            return null;
        }
        
        const canvas = createCanvas(800, 250);
        const ctx = canvas.getContext('2d');
        
        // Arrière-plan dégradé
        const gradient = ctx.createLinearGradient(0, 0, 800, 0);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 250);
        
        // Overlay semi-transparent
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, 800, 250);
        
        // Avatar
        try {
            const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 128 }));
            ctx.save();
            ctx.beginPath();
            ctx.arc(100, 125, 60, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatar, 40, 65, 120, 120);
            ctx.restore();
            
            // Bordure avatar
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(100, 125, 60, 0, Math.PI * 2);
            ctx.stroke();
        } catch (error) {
            console.log('[RANK CARD] Impossible de charger l\'avatar');
        }
        
        // Nom d'utilisateur
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.fillText(user.displayName || user.username, 200, 80);
        
        // Titre/Rang
        ctx.fillStyle = '#cccccc';
        ctx.font = '20px Arial';
        ctx.fillText(getLevelTitle(stats.level), 200, 110);
        
        // Niveau
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial';
        ctx.fillText(`Niveau ${stats.level}`, 580, 80);
        
        // Rang
        ctx.fillStyle = '#cccccc';
        ctx.font = '18px Arial';
        ctx.fillText(`Rang #${stats.rank || 'N/A'}`, 580, 110);
        
        // Barre de progression
        const barWidth = 400;
        const barHeight = 20;
        const barX = 200;
        const barY = 180;
        
        // Fond de la barre
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Progression
        const progressWidth = (stats.progress.percentage / 100) * barWidth;
        const progressGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
        progressGradient.addColorStop(0, '#56ab2f');
        progressGradient.addColorStop(1, '#a8e6cf');
        ctx.fillStyle = progressGradient;
        ctx.fillRect(barX, barY, progressWidth, barHeight);
        
        // Texte de progression
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        const progressText = `${stats.progress.current} / ${stats.progress.needed} XP (${Math.round(stats.progress.percentage)}%)`;
        ctx.fillText(progressText, barX, barY + 40);
        
        // XP Total
        ctx.fillStyle = '#cccccc';
        ctx.font = '14px Arial';
        ctx.fillText(`XP Total: ${stats.totalXp.toLocaleString()}`, barX + 300, barY + 40);
        
        const buffer = canvas.toBuffer('image/png');
        return new AttachmentBuilder(buffer, { name: 'rank-card.png' });
        
    } catch (error) {
        console.error('[RANK CARD] Erreur lors de la création de la carte:', error);
        return null;
    }
}