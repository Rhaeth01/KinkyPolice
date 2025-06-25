const { AuditLogEvent } = require('discord.js');
const { logRoleChange } = require('../utils/modernRoleLogs');
const webhookLogger = require('../utils/webhookLogger');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember) {
        try {
            // Vérifier les changements de timeout (mute/unmute)
            await checkTimeoutChanges(oldMember, newMember);

            // Vérifier les rôles ajoutés
            const addedRoles = newMember.roles.cache.filter(
                role => !oldMember.roles.cache.has(role.id)
            );

            // Vérifier les rôles supprimés
            const removedRoles = oldMember.roles.cache.filter(
                role => !newMember.roles.cache.has(role.id)
            );

            // Optimisation : récupérer le modérateur une seule fois pour tous les changements
            let moderator = null;
            if (addedRoles.size > 0 || removedRoles.size > 0) {
                moderator = await getModerator(newMember.guild, newMember.user, null, null);
            }

            // Loguer chaque rôle ajouté
            for (const role of addedRoles.values()) {
                await logRoleChange(newMember, role, 'ajouté', moderator);
            }

            // Loguer chaque rôle supprimé
            for (const role of removedRoles.values()) {
                await logRoleChange(newMember, role, 'supprimé', moderator);
            }
        } catch (error) {
            console.error('Erreur dans guildMemberUpdate:', error);
        }
    }
};

/**
 * Récupère le modérateur qui a effectué le changement de rôle depuis les audit logs
 */
async function getModerator(guild, targetUser, role, action) {
    try {
        // Vérifier les permissions pour accéder aux audit logs
        if (!guild.members.me.permissions.has('ViewAuditLog')) {
            console.warn('⚠️ [RoleLogs] Pas de permission pour voir les audit logs');
            return 'Modérateur inconnu';
        }

        // Récupérer les audit logs récents pour les changements de rôles
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.MemberRoleUpdate,
            limit: 10
        });

        // Chercher l'entrée correspondante (dans les 30 dernières secondes)
        const thirtySecondsAgo = Date.now() - 30000;
        const auditEntry = auditLogs.entries.find(entry => {
            return entry.target?.id === targetUser.id &&
                   entry.createdTimestamp > thirtySecondsAgo &&
                   (role ? 
                       (entry.changes?.some(change => 
                           (change.key === '$add' && change.new?.some(r => r.id === role.id)) ||
                           (change.key === '$remove' && change.old?.some(r => r.id === role.id))
                       )) :
                       // Si pas de rôle spécifique, prendre le plus récent changement de rôle pour cet utilisateur
                       entry.changes?.some(change => change.key === '$add' || change.key === '$remove')
                   );
        });

        if (auditEntry && auditEntry.executor) {
            // Déterminer le type d'exécuteur
            if (auditEntry.executor.bot) {
                return `🤖 ${auditEntry.executor.username}`;
            } else {
                return auditEntry.executor; // User object pour mention automatique
            }
        }

        // Fallback si pas trouvé dans les audit logs
        return 'Modérateur inconnu';
        
    } catch (error) {
        console.error('❌ [RoleLogs] Erreur récupération audit logs:', error);
        return 'Erreur audit logs';
    }
}

/**
 * Vérifie les changements de timeout (mute/unmute) et les log
 */
async function checkTimeoutChanges(oldMember, newMember) {
    try {
        const oldTimeout = oldMember.communicationDisabledUntil;
        const newTimeout = newMember.communicationDisabledUntil;

        // Si pas de changement de timeout, on sort
        if (oldTimeout === newTimeout) return;

        const now = new Date();

        // Cas 1: Membre muté (nouveau timeout ou timeout étendu)
        if (newTimeout && (!oldTimeout || newTimeout > oldTimeout) && newTimeout > now) {
            console.log(`[MODERATION] Timeout détecté: ${newMember.user.tag} (${newMember.user.id})`);

            // Récupérer les informations du modérateur
            const moderatorInfo = await getTimeoutModerator(newMember.guild, newMember.user, AuditLogEvent.MemberUpdate);

            // Calculer la durée
            const duration = Math.round((newTimeout - now) / (1000 * 60)); // en minutes
            const formattedReason = `*Timeout automatique détecté*\n\n⏱️ Durée: **${duration} minute${duration > 1 ? 's' : ''}**`;

            // Log de l'action via webhook
            await webhookLogger.logModeration('Mise en Sourdine', newMember.user, moderatorInfo.moderator, formattedReason, {
                color: '#9932CC',
                thumbnail: newMember.user.displayAvatarURL({ dynamic: true })
            });
        }

        // Cas 2: Membre démuté (timeout retiré ou expiré)
        else if (oldTimeout && (!newTimeout || newTimeout <= now)) {
            console.log(`[MODERATION] Fin de timeout détectée: ${newMember.user.tag} (${newMember.user.id})`);

            // Récupérer les informations du modérateur
            const moderatorInfo = await getTimeoutModerator(newMember.guild, newMember.user, AuditLogEvent.MemberUpdate);

            // Log de l'action via webhook
            await webhookLogger.logModeration('Fin de Mise en Sourdine', newMember.user, moderatorInfo.moderator, '*Timeout retiré ou expiré*', {
                color: '#00FF00',
                thumbnail: newMember.user.displayAvatarURL({ dynamic: true })
            });
        }

    } catch (error) {
        console.error('Erreur lors de la vérification des timeouts:', error);
    }
}

/**
 * Récupère le modérateur qui a effectué le timeout depuis les audit logs
 */
async function getTimeoutModerator(guild, targetUser, auditLogType) {
    try {
        // Vérifier les permissions pour accéder aux audit logs
        if (!guild.members.me.permissions.has('ViewAuditLog')) {
            console.warn('⚠️ [AutoModeration] Pas de permission pour voir les audit logs');
            return { moderator: 'Modérateur inconnu', isBot: false };
        }

        // Récupérer les audit logs récents
        const auditLogs = await guild.fetchAuditLogs({
            type: auditLogType,
            limit: 10
        });

        // Chercher l'entrée correspondante (dans les 30 dernières secondes)
        const thirtySecondsAgo = Date.now() - 30000;
        const auditEntry = auditLogs.entries.find(entry => {
            return entry.target?.id === targetUser.id &&
                   entry.createdTimestamp > thirtySecondsAgo &&
                   entry.changes?.some(change => change.key === 'communication_disabled_until');
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
        console.error('❌ [AutoModeration] Erreur récupération audit logs pour timeout:', error);
        return { moderator: 'Erreur audit logs', isBot: false };
    }
}
