const { EmbedBuilder } = require('discord.js');
const configManager = require('./utils/configManager');

module.exports = {
    async logRoleChange(member, role, action, moderator) {
        try {
            console.log(`🔍 [RoleLogger] Tentative de log ${action} du rôle...`);
            
            const logEmbed = new EmbedBuilder()
                .setColor(action === 'ajouté' ? 0x00FF00 : 0xFF0000)
                .setTitle(`🛡️ Rôle ${action}`)
                .setDescription(`Rôle **${role.name}** ${action} pour ${member.user.tag}`)
                .addFields(
                    { name: '👤 Utilisateur', value: `${member}`, inline: true },
                    { name: '🛡️ Rôle', value: `${role}`, inline: true },
                    { name: '👮 Modérateur', value: `${moderator}`, inline: false }
                )
                .setTimestamp();

            const logChannel = member.guild.channels.cache.get(configManager.roleLogChannelId);
            
            if (logChannel) {
                await logChannel.send({ embeds: [logEmbed] });
                console.log(`✅ [RoleLogger] Rôle ${action} loggé avec succès`);
            } else {
                console.error('❌ [RoleLogger] Canal de log introuvable');
            }
        } catch (error) {
            console.error(`❌ [RoleLogger] Erreur lors du log du rôle ${action}:`, error);
        }
    }
};
