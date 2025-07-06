const { Events, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');
const webhookLogger = require('../utils/webhookLogger');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        console.log(`Nouveau membre : ${member.user.tag} (${member.id}) a rejoint le serveur ${member.guild.name}.`);

        const newMemberRoleIds = configManager.newMemberRoleIds;
        if (!newMemberRoleIds || !Array.isArray(newMemberRoleIds) || newMemberRoleIds.length === 0) {
            console.warn('newMemberRoleIds n\'est pas configuré comme un tableau non vide dans config.json. Aucun rôle ne sera attribué automatiquement.');
            return;
        }

        const rolesToAdd = [];
        const addedRoleNames = [];

        for (const roleId of newMemberRoleIds) {
            const role = member.guild.roles.cache.get(roleId);
            if (role) {
                rolesToAdd.push(role);
            } else {
                console.error(`Le rôle avec l'ID ${roleId} est introuvable sur le serveur ${member.guild.name}.`);
            }
        }

        if (rolesToAdd.length === 0) {
            console.log(`Aucun rôle valide trouvé à attribuer à ${member.user.tag}.`);
            return;
        }

        try {
            await member.roles.add(rolesToAdd);
            rolesToAdd.forEach(r => addedRoleNames.push(r.name));
            console.log(`Rôles "${addedRoleNames.join(', ')}" attribués à ${member.user.tag}.`);

            // Log via webhook de l'attribution des rôles
            await webhookLogger.logMemberJoin(member);
            
            // Log supplémentaire pour l'attribution des rôles
            if (addedRoleNames.length > 0) {
                const rolesEmbed = new EmbedBuilder()
                    .setColor('#38A169')
                    .setTitle('Rôles automatiques attribués')
                    .setDescription(`${member.user.tag} a reçu les rôles automatiques`)
                    .addFields(
                        { name: '👤 Nouveau membre', value: `${member}`, inline: true },
                        { name: '🆔 ID', value: `\`${member.id}\``, inline: true },
                        { name: '🔐 Rôles attribués', value: addedRoleNames.map(r => `\`${r}\``).join(', '), inline: false }
                    )
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();
                
                await webhookLogger.log('memberLogs', rolesEmbed);
            }

        } catch (error) {
            console.error(`Impossible d'attribuer les rôles à ${member.user.tag}:`, error);
        }

        // Log pour les membres qui rejoignent sans recevoir de rôles
        if (rolesToAdd.length === 0 || !newMemberRoleIds || newMemberRoleIds.length === 0) {
            await webhookLogger.logMemberJoin(member);
        }
    },
};
