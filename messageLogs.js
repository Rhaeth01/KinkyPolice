const { EmbedBuilder } = require('discord.js');
const { messageLogChannelId } = require('./config.json'); // Correction: messageLogChannelId au lieu de messageLogChannelID

module.exports = {
    async logEditedMessage(oldMessage, newMessage) {
        try {
            console.log('🔍 [MessageLogger] Tentative de log d\'un message édité...');
            console.log('🔍 [MessageLogger] Canal de log configuré:', messageLogChannelId);
            
            // Vérification des messages partiels
            if (oldMessage.partial) {
                console.log('🔍 [MessageLogger] Ancien message partiel détecté, tentative de récupération...');
                try {
                    await oldMessage.fetch();
                } catch (error) {
                    console.error('❌ [MessageLogger] Impossible de récupérer l\'ancien message:', error.message);
                    return;
                }
            }
            
            if (newMessage.partial) {
                console.log('🔍 [MessageLogger] Nouveau message partiel détecté, tentative de récupération...');
                try {
                    await newMessage.fetch();
                } catch (error) {
                    console.error('❌ [MessageLogger] Impossible de récupérer le nouveau message:', error.message);
                    return;
                }
            }

            // Ignorer les messages de bots
            if (oldMessage.author.bot) {
                console.log('🔍 [MessageLogger] Message de bot ignoré');
                return;
            }

            const logEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('✏️ Message Édité')
                .setDescription(`Message édité dans ${oldMessage.channel}`)
                .addFields(
                    { name: '👤 Auteur', value: `${oldMessage.author}`, inline: true },
                    { name: '📜 Ancien contenu', value: oldMessage.content || '*Contenu vide*', inline: false },
                    { name: '📝 Nouveau contenu', value: newMessage.content || '*Contenu vide*', inline: false }
                )
                .setTimestamp();

            const logChannel = oldMessage.guild.channels.cache.get(messageLogChannelId);
            console.log('🔍 [MessageLogger] Canal de log trouvé:', logChannel ? `#${logChannel.name}` : 'INTROUVABLE');
            
            if (logChannel) {
                await logChannel.send({ embeds: [logEmbed] });
                console.log('✅ [MessageLogger] Message édité loggé avec succès');
            } else {
                console.error('❌ [MessageLogger] Canal de log introuvable avec l\'ID:', messageLogChannelId);
            }
        } catch (error) {
            console.error('❌ [MessageLogger] Erreur lors du log du message édité:', error);
        }
    },

    async logDeletedMessage(message) {
        try {
            console.log('🔍 [MessageLogger] Tentative de log d\'un message supprimé...');
            console.log('🔍 [MessageLogger] Canal de log configuré:', messageLogChannelId);
            
            // Vérification des messages partiels
            if (message.partial) {
                console.log('🔍 [MessageLogger] Message partiel détecté, tentative de récupération...');
                try {
                    await message.fetch();
                } catch (error) {
                    console.error('❌ [MessageLogger] Impossible de récupérer le message supprimé:', error.message);
                    return;
                }
            }

            // Ignorer les messages de bots
            if (message.author && message.author.bot) {
                console.log('🔍 [MessageLogger] Message de bot ignoré');
                return;
            }

            const logEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🗑️ Message Supprimé')
                .setDescription(`Message supprimé dans ${message.channel}`)
                .addFields(
                    { name: '👤 Auteur', value: message.author ? `${message.author}` : '*Auteur inconnu*', inline: true },
                    { name: '📜 Contenu', value: message.content || '*Contenu vide ou non récupérable*', inline: false }
                )
                .setTimestamp();

            const logChannel = message.guild.channels.cache.get(messageLogChannelId);
            console.log('🔍 [MessageLogger] Canal de log trouvé:', logChannel ? `#${logChannel.name}` : 'INTROUVABLE');
            
            if (logChannel) {
                await logChannel.send({ embeds: [logEmbed] });
                console.log('✅ [MessageLogger] Message supprimé loggé avec succès');
            } else {
                console.error('❌ [MessageLogger] Canal de log introuvable avec l\'ID:', messageLogChannelId);
            }
        } catch (error) {
            console.error('❌ [MessageLogger] Erreur lors du log du message supprimé:', error);
        }
    }
};