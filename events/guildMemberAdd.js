const { Events, EmbedBuilder } = require('discord.js'); // Ajout de EmbedBuilder
const configManager = require('../utils/configManager'); // Utiliser le configManager au lieu de config.json direct

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

            // Log optionnel de l'attribution des rôles
            const logChannelId = configManager.logChannelId;
            const logChannel = member.guild.channels.cache.get(logChannelId);
            if (logChannel && logChannel.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setColor(0x57F287) // Vert clair
                    .setTitle('Rôles automatiques attribués')
                    .setDescription(`${member.user.tag} (\`${member.id}\`) a rejoint et a reçu le(s) rôle(s) : ${addedRoleNames.join(', ')}.`)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error(`Impossible d'attribuer les rôles à ${member.user.tag}:`, error);
        }

        // Vous pouvez ajouter ici un message de bienvenue dans un salon spécifique si nécessaire.
    },
};
