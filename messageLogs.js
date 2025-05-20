const { EmbedBuilder } = require('discord.js');
const { messageLogChannelID } = require('./config.json');

module.exports = {
    async logEditedMessage(oldMessage, newMessage) {
        const logEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('✏️ Message Édité')
            .setDescription(`Message édité dans ${oldMessage.channel}`)
            .addFields(
                { name: '👤 Auteur', value: `${oldMessage.author}`, inline: true },
                { name: '📜 Ancien contenu', value: oldMessage.content, inline: false },
                { name: '📝 Nouveau contenu', value: newMessage.content, inline: false }
            )
            .setTimestamp();

        const logChannel = oldMessage.guild.channels.cache.get(messageLogChannelID);
        if (logChannel) {
            await logChannel.send({ embeds: [logEmbed] });
        }
    },

    async logDeletedMessage(message) {
        const logEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🗑️ Message Supprimé')
            .setDescription(`Message supprimé dans ${message.channel}`)
            .addFields(
                { name: '👤 Auteur', value: `${message.author}`, inline: true },
                { name: '📜 Contenu', value: message.content, inline: false }
            )
            .setTimestamp();

        const logChannel = message.guild.channels.cache.get(messageLogChannelID);
        if (logChannel) {
            await logChannel.send({ embeds: [logEmbed] });
        }
    }
};