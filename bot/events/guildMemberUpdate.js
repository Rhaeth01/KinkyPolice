const { AuditLogEvent } = require('discord.js');
const { logRoleChange } = require('../utils/modernRoleLogs');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember) {
        try {
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
