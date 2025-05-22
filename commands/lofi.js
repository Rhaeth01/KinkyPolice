const { SlashCommandBuilder } = require('discord.js');
// Les imports de Player et YouTubeExtractor ne sont plus nécessaires ici,
// car le player est initialisé et géré dans interactionCreate.js

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lofi')
        .setDescription('Joue de la musique lofi dans votre salon vocal'),
    
    async execute(interaction) {
        const voiceChannel = interaction.member.voice.channel;
        
        if (!voiceChannel) {
            return interaction.reply({ 
                content: 'Vous devez être dans un salon vocal pour utiliser cette commande !', 
                ephemeral: true 
            });
        }
        
        // Récupérer le lecteur depuis le client
        const player = interaction.client.player;
        
        if (!player) {
            // Cela ne devrait pas arriver si interactionCreate.js l'initialise correctement
            console.error('Player non trouvé sur interaction.client.player dans la commande lofi.');
            return interaction.reply({ 
                content: 'Le lecteur de musique n\'est pas encore prêt. Veuillez réessayer dans un instant.', 
                ephemeral: true 
            });
        }
        
        try {
            await interaction.deferReply();
            
            const lofiUrl = 'https://www.youtube.com/watch?v=5qap5aO4i9A'; // Lofi Girl stream
            
            // Utiliser player.play() qui gère la recherche, la file d'attente et la connexion.
            // Elle retourne { track, queue }
            const { track } = await player.play(voiceChannel, lofiUrl, {
                nodeOptions: { // Options pour la node (queue) lorsqu'elle est créée
                    metadata: {
                        channel: interaction.channel, // Salon textuel où la commande a été lancée
                        client: interaction.client,
                        requestedBy: interaction.user,
                        interaction: interaction // Garder une référence à l'interaction
                    },
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300000, // 5 minutes
                    leaveOnEnd: false, // Important pour une radio, ne pas quitter à la fin du stream
                    leaveOnEndCooldown: 0, // Pas de cooldown pour quitter à la fin pour une radio
                    leaveOnStop: false, // Garder la connexion après un arrêt manuel
                    leaveOnStopCooldown: 0,
                    selfDeaf: true, // Le bot se met en sourdine pour économiser de la bande passante
                    volume: 70, // Volume par défaut (ajustez selon vos préférences)
                },
                connectionOptions: {
                    deaf: true // S'assurer que le bot est en sourdine lors de la connexion
                }
                // searchEngine: QueryType.AUTO // discord-player v6 détecte souvent automatiquement
            });
            
            await interaction.editReply(`🎵 Je joue maintenant de la musique lofi : **${track.title}** ! Détendez-vous et profitez ! 🎧`);
            
        } catch (error) {
            console.error('Erreur globale dans la commande lofi:', error);
            let errorMessage = 'Une erreur est survenue lors de la lecture de la musique lofi.';
            if (error.message) {
                if (error.message.includes('No results found')) {
                    errorMessage = 'Impossible de trouver la musique lofi demandée.';
                } else if (error.message.includes('Could not connect to the voice channel')) {
                    errorMessage = 'Impossible de me connecter à votre salon vocal. Vérifiez mes permissions !';
                } else if (error.message.includes('Voice connection destroyed')) {
                    errorMessage = 'La connexion vocale a été interrompue.';
                } else {
                    errorMessage = `Erreur: ${error.message.substring(0, 200)}`; // Message d'erreur plus précis
                }
            }

            // Nettoyer la queue si elle existe et que l'erreur n'est pas juste "pas de résultats"
            if (!error.message?.includes('No results found')) {
                const queue = player.nodes.get(interaction.guildId);
                if (queue && !queue.deleted) {
                    queue.delete(); // Supprime la queue et déconnecte
                }
            }
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ 
                    content: errorMessage
                }).catch(console.error);
            } else {
                await interaction.reply({ 
                    content: errorMessage, 
                    ephemeral: true 
                }).catch(console.error);
            }
        }
    },
};
