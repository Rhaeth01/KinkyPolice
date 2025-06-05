const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Fait dire un message au bot')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Message à envoyer')
                .setRequired(true)),
                
    async execute(interaction) {
        const message = interaction.options.getString('message');
        
        // Réponse éphémère de confirmation
        await interaction.reply({ 
            content: 'Message envoyé !', 
            ephemeral: true 
        });
        
        // Envoi du message dans le canal (sans référence à l'utilisateur)
        await interaction.channel.send(message);
    }
};
