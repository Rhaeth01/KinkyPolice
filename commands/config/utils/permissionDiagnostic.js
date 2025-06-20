/**
 * @file commands/config/utils/permissionDiagnostic.js
 * @description Comprehensive permission and setup diagnostic utility
 */

const { PermissionFlagsBits } = require('discord.js');

/**
 * Generates a comprehensive diagnostic report for configuration system issues
 * @param {import('discord.js').Interaction} interaction - The Discord interaction
 * @returns {Object} Diagnostic report
 */
function generateDiagnosticReport(interaction) {
    const report = {
        timestamp: new Date().toISOString(),
        user: {
            tag: interaction.user.tag,
            id: interaction.user.id,
            bot: interaction.user.bot
        },
        guild: {
            name: interaction.guild.name,
            id: interaction.guild.id,
            ownerId: interaction.guild.ownerId,
            memberCount: interaction.guild.memberCount
        },
        channel: {
            name: interaction.channel.name,
            id: interaction.channel.id,
            type: interaction.channel.type
        },
        permissions: {
            user: {},
            bot: {}
        },
        botInfo: {},
        issues: [],
        recommendations: []
    };

    // Analyze user permissions
    const userMember = interaction.member;
    const userPermissions = userMember.permissions;
    
    report.permissions.user = {
        administrator: userPermissions.has(PermissionFlagsBits.Administrator),
        manageGuild: userPermissions.has(PermissionFlagsBits.ManageGuild),
        manageChannels: userPermissions.has(PermissionFlagsBits.ManageChannels),
        manageRoles: userPermissions.has(PermissionFlagsBits.ManageRoles),
        isOwner: userMember.id === interaction.guild.ownerId,
        roleCount: userMember.roles.cache.size,
        highestRole: {
            name: userMember.roles.highest.name,
            id: userMember.roles.highest.id,
            position: userMember.roles.highest.position
        }
    };

    // Analyze bot permissions
    const botMember = interaction.guild.members.me;
    const botPermissions = botMember.permissions;
    
    report.permissions.bot = {
        administrator: botPermissions.has(PermissionFlagsBits.Administrator),
        manageGuild: botPermissions.has(PermissionFlagsBits.ManageGuild),
        manageChannels: botPermissions.has(PermissionFlagsBits.ManageChannels),
        manageRoles: botPermissions.has(PermissionFlagsBits.ManageRoles),
        useApplicationCommands: botPermissions.has(PermissionFlagsBits.UseApplicationCommands),
        sendMessages: botPermissions.has(PermissionFlagsBits.SendMessages),
        embedLinks: botPermissions.has(PermissionFlagsBits.EmbedLinks),
        roleCount: botMember.roles.cache.size,
        highestRole: {
            name: botMember.roles.highest.name,
            id: botMember.roles.highest.id,
            position: botMember.roles.highest.position
        }
    };

    // Bot information
    report.botInfo = {
        tag: botMember.user.tag,
        id: botMember.user.id,
        joinedAt: botMember.joinedAt?.toISOString(),
        nickname: botMember.nickname
    };

    // Identify issues
    if (!report.permissions.user.administrator && !report.permissions.user.isOwner) {
        report.issues.push({
            type: 'USER_PERMISSION',
            severity: 'HIGH',
            message: 'User lacks Administrator permission',
            details: 'The user must have Administrator permission or be the server owner to use the config command'
        });
        
        report.recommendations.push({
            type: 'USER_FIX',
            action: 'Grant Administrator role to user or have server owner run the command',
            priority: 'HIGH'
        });
    }

    if (!report.permissions.bot.administrator) {
        report.issues.push({
            type: 'BOT_PERMISSION',
            severity: 'CRITICAL',
            message: 'Bot lacks Administrator permission',
            details: 'The bot needs Administrator permission to manage server configuration'
        });
        
        report.recommendations.push({
            type: 'BOT_FIX',
            action: 'Grant Administrator role to bot or re-invite with proper permissions',
            priority: 'CRITICAL'
        });
    }

    if (!report.permissions.bot.useApplicationCommands) {
        report.issues.push({
            type: 'BOT_COMMAND_PERMISSION',
            severity: 'HIGH',
            message: 'Bot lacks Use Application Commands permission',
            details: 'The bot may not be able to respond to slash commands'
        });
    }

    // Role hierarchy issues
    if (report.permissions.bot.highestRole.position <= report.permissions.user.highestRole.position && !report.permissions.user.isOwner) {
        report.issues.push({
            type: 'ROLE_HIERARCHY',
            severity: 'MEDIUM',
            message: 'Bot role is not above user role in hierarchy',
            details: 'This might cause issues when the bot tries to manage roles'
        });
    }

    return report;
}

/**
 * Formats a diagnostic report into a user-friendly message
 * @param {Object} report - The diagnostic report
 * @returns {string} Formatted message
 */
function formatDiagnosticMessage(report) {
    let message = `🔍 **Diagnostic du Système de Configuration**\n\n`;
    
    // User info
    message += `👤 **Utilisateur:** ${report.user.tag}\n`;
    message += `🏠 **Serveur:** ${report.guild.name}\n`;
    message += `📍 **Canal:** ${report.channel.name}\n\n`;
    
    // Permission status
    message += `🔐 **Permissions Utilisateur:**\n`;
    message += `• Administrateur: ${report.permissions.user.administrator ? '✅' : '❌'}\n`;
    message += `• Propriétaire: ${report.permissions.user.isOwner ? '✅' : '❌'}\n`;
    message += `• Gérer le serveur: ${report.permissions.user.manageGuild ? '✅' : '❌'}\n\n`;
    
    message += `🤖 **Permissions Bot:**\n`;
    message += `• Administrateur: ${report.permissions.bot.administrator ? '✅' : '❌'}\n`;
    message += `• Commandes d'application: ${report.permissions.bot.useApplicationCommands ? '✅' : '❌'}\n`;
    message += `• Gérer le serveur: ${report.permissions.bot.manageGuild ? '✅' : '❌'}\n\n`;
    
    // Issues
    if (report.issues.length > 0) {
        message += `⚠️ **Problèmes Détectés:**\n`;
        report.issues.forEach((issue, index) => {
            const severity = issue.severity === 'CRITICAL' ? '🔴' : issue.severity === 'HIGH' ? '🟠' : '🟡';
            message += `${severity} ${issue.message}\n`;
        });
        message += `\n`;
    }
    
    // Recommendations
    if (report.recommendations.length > 0) {
        message += `💡 **Recommandations:**\n`;
        report.recommendations.forEach((rec, index) => {
            message += `${index + 1}. ${rec.action}\n`;
        });
        message += `\n`;
    }
    
    // Quick fixes
    message += `🛠️ **Solutions Rapides:**\n`;
    if (!report.permissions.bot.administrator) {
        message += `• **Bot:** Rôle → ${report.botInfo.tag} → Cocher "Administrateur"\n`;
    }
    if (!report.permissions.user.administrator && !report.permissions.user.isOwner) {
        message += `• **Utilisateur:** Donner un rôle avec permission "Administrateur"\n`;
    }
    
    message += `\n📝 *Diagnostic généré le ${new Date(report.timestamp).toLocaleString('fr-FR')}*`;
    
    return message;
}

/**
 * Creates a simple permission check result
 * @param {import('discord.js').Interaction} interaction - The Discord interaction
 * @returns {Object} Simple check result
 */
function quickPermissionCheck(interaction) {
    const userAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    const botAdmin = interaction.guild.members.me.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = interaction.member.id === interaction.guild.ownerId;
    
    return {
        userCanUse: userAdmin || isOwner,
        botCanOperate: botAdmin,
        allGood: (userAdmin || isOwner) && botAdmin,
        issues: {
            userPermission: !userAdmin && !isOwner,
            botPermission: !botAdmin
        }
    };
}

/**
 * Generates a Discord OAuth2 invite URL with proper permissions
 * @param {string} clientId - Bot's client ID
 * @returns {string} Invite URL
 */
function generateInviteUrl(clientId) {
    const permissions = [
        PermissionFlagsBits.Administrator
    ].reduce((a, b) => a | b, 0n);
    
    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`;
}

module.exports = {
    generateDiagnosticReport,
    formatDiagnosticMessage,
    quickPermissionCheck,
    generateInviteUrl
};