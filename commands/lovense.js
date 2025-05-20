const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { registerToy, removeToy, getUserToys, controlToy } = require('../utils/lovenseManager');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lovense')
        .setDescription('Gère les jouets Lovense')
        .addSubcommand(subcommand =>
            subcommand
                .setName('register')
                .setDescription('Enregistre un jouet Lovense')
                .addStringOption(option =>
                    option.setName('toy_id')
                        .setDescription('L\'identifiant du jouet Lovense')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('toy_name')
                        .setDescription('Un nom pour identifier ce jouet')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Supprime un jouet Lovense enregistré')
                .addStringOption(option =>
                    option.setName('toy_id')
                        .setDescription('L\'identifiant du jouet à supprimer')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Liste vos jouets Lovense enregistrés'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('vibrate')
                .setDescription('Fait vibrer un jouet Lovense')
                .addStringOption(option =>
                    option.setName('toy_id')
                        .setDescription('L\'identifiant du jouet à contrôler')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('intensity')
                        .setDescription('Intensité de la vibration (0-20)')
                        .setMinValue(0)
                        .setMaxValue(20)
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Durée en secondes (1-30)')
                        .setMinValue(1)
                        .setMaxValue(30)
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .setDMPermission(true),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        
        // Vérifier si la clé API est configurée
        if (!process.env.LOVENSE_API_KEY) {
            return interaction.reply({ 
                content: 'La clé API Lovense n\'est pas configurée. Veuillez contacter l\'administrateur du bot.', 
                ephemeral: true 
            });
        }
        
        try {
            switch (subcommand) {
                case 'register': {
                    const toyId = interaction.options.getString('toy_id');
                    const toyName = interaction.options.getString('toy_name');
                    
                    const success = registerToy(userId, toyId, toyName);
                    
                    if (success) {
                        await interaction.reply({ 
                            content: `Le jouet "${toyName}" a été enregistré avec succès !`, 
                            ephemeral: true 
                        });
                    } else {
                        await interaction.reply({ 
                            content: 'Une erreur est survenue lors de l\'enregistrement du jouet.', 
                            ephemeral: true 
                        });
                    }
                    break;
                }
                
                case 'remove': {
                    const toyId = interaction.options.getString('toy_id');
                    
                    const success = removeToy(userId, toyId);
                    
                    if (success) {
                        await interaction.reply({ 
                            content: 'Le jouet a été supprimé avec succès !', 
                            ephemeral: true 
                        });
                    } else {
                        await interaction.reply({ 
                            content: 'Jouet non trouvé ou erreur lors de la suppression.', 
                            ephemeral: true 
                        });
                    }
                    break;
                }
                
                case 'list': {
                    const toys = getUserToys(userId);
                    
                    if (toys.length === 0) {
                        await interaction.reply({ 
                            content: 'Vous n\'avez aucun jouet Lovense enregistré.', 
                            ephemeral: true 
                        });
                    } else {
                        const embed = new EmbedBuilder()
                            .setColor(0xFF69B4)
                            .setTitle('Vos jouets Lovense')
                            .setDescription('Voici la liste de vos jouets enregistrés :')
                            .addFields(
                                toys.map(toy => ({
                                    name: toy.name,
                                    value: `ID: ${toy.id}`,
                                    inline: true
                                }))
                            )
                            .setTimestamp();
                        
                        await interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                    break;
                }
                
                case 'vibrate': {
                    const toyId = interaction.options.getString('toy_id');
                    const intensity = interaction.options.getInteger('intensity');
                    const duration = interaction.options.getInteger('duration') || 5;
                    
                    // Vérifier si l'utilisateur possède ce jouet
                    const toys = getUserToys(userId);
                    const toy = toys.find(t => t.id === toyId);
                    
                    if (!toy) {
                        return interaction.reply({ 
                            content: 'Ce jouet ne vous appartient pas ou n\'est pas enregistré.', 
                            ephemeral: true 
                        });
                    }
                    
                    await interaction.deferReply({ ephemeral: true });
                    
                    try {
                        const result = await controlToy(toyId, 'Vibrate', intensity, duration);
                        
                        if (result.code === 200) {
                            await interaction.editReply({ 
                                content: `Commande envoyée avec succès au jouet "${toy.name}" ! Intensité: ${intensity}, Durée: ${duration}s`, 
                                ephemeral: true 
                            });
                        } else {
                            await interaction.editReply({ 
                                content: `Erreur lors de l'envoi de la commande: ${result.message || 'Erreur inconnue'}`, 
                                ephemeral: true 
                            });
                        }
                    } catch (error) {
                        await interaction.editReply({ 
                            content: `Erreur lors du contrôle du jouet: ${error.message}`, 
                            ephemeral: true 
                        });
                    }
                    break;
                }
            }
        } catch (error) {
            console.error('Erreur dans la commande Lovense:', error);
            
            if (interaction.deferred) {
                await interaction.editReply({ 
                    content: 'Une erreur est survenue lors de l\'exécution de la commande.', 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: 'Une erreur est survenue lors de l\'exécution de la commande.', 
                    ephemeral: true 
                });
            }
        }
    },
};