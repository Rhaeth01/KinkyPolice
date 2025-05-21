const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Rejoint votre salon vocal'),
    
    async execute(interaction) {
        // Vérifier si l'utilisateur est dans un salon vocal
        const voiceChannel = interaction.member.voice.channel;
        
        if (!voiceChannel) {
            return interaction.reply({ 
                content: 'Vous devez être dans un salon vocal pour utiliser cette commande !', 
                ephemeral: true 
            });
        }
        
        try {
            // Rejoindre le salon vocal
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });
            
            await interaction.reply(`J'ai rejoint le salon vocal ${voiceChannel.name} !`);
        } catch (error) {
            console.error('Erreur lors de la connexion au salon vocal:', error);
            await interaction.reply({ 
                content: 'Une erreur est survenue lors de la connexion au salon vocal.', 
                ephemeral: true 
            });
        }
    },
};