const { Events, AuditLogEvent } = require('discord.js');
const webhookLogger = require('../utils/webhookLogger');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        console.log(`Membre parti : ${member.user.tag} (${member.id}) a quitté le serveur ${member.guild.name}.`);

        // Vérifier si c'est un kick en consultant les audit logs
        const kickInfo = await checkForKick(member);

        if (kickInfo.isKick) {
            console.log(`[MODERATION] Expulsion détectée: ${member.user.tag} (${member.user.id})`);

            // Log de l'expulsion via webhook
            await webhookLogger.logModeration('Expulsion', member.user, kickInfo.moderator, kickInfo.reason, {
                color: '#FF8C00',
                thumbnail: member.user.displayAvatarURL({ dynamic: true })
            });
        } else {
            // Log via webhook du départ normal du membre
            await webhookLogger.logMemberLeave(member);
        }
    },
};

/**
 * Vérifie si le départ du membre est dû à un kick
 */
async function checkForKick(member) {
    try {
        // Vérifier les permissions pour accéder aux audit logs
        if (!member.guild.members.me.permissions.has('ViewAuditLog')) {
            console.warn('⚠️ [AutoModeration] Pas de permission pour voir les audit logs');
            return { isKick: false, moderator: 'Modérateur inconnu', reason: '*Aucune raison fournie*' };
        }

        // Récupérer les audit logs récents pour les kicks
        const auditLogs = await member.guild.fetchAuditLogs({
            type: AuditLogEvent.MemberKick,
            limit: 5
        });

        // Chercher l'entrée correspondante (dans les 10 dernières secondes)
        const tenSecondsAgo = Date.now() - 10000;
        const auditEntry = auditLogs.entries.find(entry => {
            return entry.target?.id === member.user.id &&
                   entry.createdTimestamp > tenSecondsAgo;
        });

        if (auditEntry && auditEntry.executor) {
            // C'est bien un kick
            let moderator;
            if (auditEntry.executor.bot) {
                moderator = `🤖 ${auditEntry.executor.username}`;
            } else {
                moderator = auditEntry.executor;
            }

            return {
                isKick: true,
                moderator: moderator,
                reason: auditEntry.reason || '*Aucune raison fournie*'
            };
        }

        // Pas de kick trouvé, c'est un départ normal
        return { isKick: false, moderator: null, reason: null };

    } catch (error) {
        console.error('❌ [AutoModeration] Erreur lors de la vérification du kick:', error);
        return { isKick: false, moderator: 'Erreur audit logs', reason: '*Erreur lors de la vérification*' };
    }
}