const RoleLogger = require('../roleLogs');

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

            // Loguer chaque rôle ajouté
            for (const role of addedRoles.values()) {
                await RoleLogger.logRoleChange(newMember, role, 'ajouté', 'Modérateur');
            }

            // Loguer chaque rôle supprimé
            for (const role of removedRoles.values()) {
                await RoleLogger.logRoleChange(newMember, role, 'supprimé', 'Modérateur');
            }
        } catch (error) {
            console.error('Erreur dans guildMemberUpdate:', error);
        }
    }
};
