const { Events, AuditLogEvent } = require('discord.js');
const webhookLogger = require('../utils/webhookLogger');

module.exports = {
    name: Events.GuildBanAdd,
    async execute(ban) {
        try {
            console.log(`[MODERATION] Bannissement détecté: ${ban.user.tag} (${ban.user.id})`);
            
            // Récupérer les informations du modérateur depuis les audit logs
            const moderatorInfo = await getModerator(ban.guild, ban.user, AuditLogEvent.MemberBanAdd);
            
            // Formater la raison
            const reason = ban.reason || '*Aucune raison fournie*';
            
            // Log de l'action via webhook
            await webhookLogger.logModeration('Bannissement', ban.user, moderatorInfo.moderator, reason, {
                color: '#DC143C',
                thumbnail: ban.user.displayAvatarURL({ dynamic: true })
            });
            
        } catch (error) {
            console.error('Erreur lors du traitement du bannissement automatique:', error);
        }
    }
};

/**
 * Récupère le modérateur qui a effectué l'action depuis les audit logs
 */
async function getModerator(guild, targetUser, auditLogType) {
    try {
        // Vérifier les permissions pour accéder aux audit logs
        if (!guild.members.me.permissions.has('ViewAuditLog')) {
            console.warn('⚠️ [AutoModeration] Pas de permission pour voir les audit logs');
            return { moderator: 'Modérateur inconnu', isBot: false };
        }

        // Récupérer les audit logs récents
        const auditLogs = await guild.fetchAuditLogs({
            type: auditLogType,
            limit: 5
        });

        // Chercher l'entrée correspondante (dans les 30 dernières secondes)
        const thirtySecondsAgo = Date.now() - 30000;
        const auditEntry = auditLogs.entries.find(entry => {
            return entry.target?.id === targetUser.id &&
                   entry.createdTimestamp > thirtySecondsAgo;
        });

        if (auditEntry && auditEntry.executor) {
            // Déterminer le type d'exécuteur
            if (auditEntry.executor.bot) {
                return { 
                    moderator: `🤖 ${auditEntry.executor.username}`, 
                    isBot: true,
                    executor: auditEntry.executor
                };
            } else {
                return { 
                    moderator: auditEntry.executor, 
                    isBot: false,
                    executor: auditEntry.executor
                };
            }
        }

        // Fallback si pas trouvé dans les audit logs
        return { moderator: 'Modérateur inconnu', isBot: false };
        
    } catch (error) {
        console.error('❌ [AutoModeration] Erreur récupération audit logs:', error);
        return { moderator: 'Erreur audit logs', isBot: false };
    }
}
