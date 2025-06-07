const { Events } = require('discord.js');
const webhookLogger = require('../utils/webhookLogger');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        console.log(`Membre parti : ${member.user.tag} (${member.id}) a quitté le serveur ${member.guild.name}.`);
        
        // Log via webhook du départ du membre
        await webhookLogger.logMemberLeave(member);
    },
};