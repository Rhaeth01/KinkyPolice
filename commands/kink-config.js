const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const kinkLevelManager = require('../utils/kinkLevelManager');
const contentFilter = require('../utils/contentFilter');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kink-config')
        .setDescription('Configure les niveaux d\'intensité pour les commandes kink')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('niveau')
                .setDescription('Définit votre niveau d\'intensité préféré')
                .addStringOption(option =>
                    option.setName('intensité')
                        .setDescription('Niveau d\'intensité souhaité')
                        .setRequired(true)
                        .addChoices(
                            { name: '🌸 Doux - Contenu léger et amusant', value: 'doux' },
                            { name: '🔥 Modéré - Contenu suggestif (NSFW)', value: 'modéré' },
                            { name: '💀 Intense - Contenu explicite BDSM/Kink (NSFW + Rôle)', value: 'intense' }
                        ))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('serveur')
                .setDescription('Définit le niveau par défaut du serveur (Admin uniquement)')
                .addStringOption(option =>
                    option.setName('intensité')
                        .setDescription('Niveau d\'intensité par défaut pour le serveur')
                        .setRequired(true)
                        .addChoices(
                            { name: '🌸 Doux - Contenu léger et amusant', value: 'doux' },
                            { name: '🔥 Modéré - Contenu suggestif (NSFW)', value: 'modéré' },
                            { name: '💀 Intense - Contenu explicite BDSM/Kink (NSFW + Rôle)', value: 'intense' }
                        ))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Affiche les informations sur votre configuration actuelle')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Teste votre accès aux différents niveaux')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Remet votre configuration à zéro')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'niveau':
                    await this.handleSetUserLevel(interaction);
                    break;
                case 'serveur':
                    await this.handleSetGuildLevel(interaction);
                    break;
                case 'info':
                    await this.handleShowInfo(interaction);
                    break;
                case 'test':
                    await this.handleTestAccess(interaction);
                    break;
                case 'reset':
                    await this.handleReset(interaction);
                    break;
                default:
                    await interaction.reply({ 
                        content: 'Sous-commande non reconnue.', 
                        ephemeral: true 
                    });
            }
        } catch (error) {
            console.error('Erreur dans kink-config:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Erreur')
                .setDescription('Une erreur est survenue lors de l\'exécution de la commande.')
                .setTimestamp();

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },

    async handleSetUserLevel(interaction) {
        const requestedLevel = interaction.options.getString('intensité');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        // Vérifier l'accès au niveau demandé
        const accessCheck = kinkLevelManager.checkUserAccess(interaction, requestedLevel);
        
        if (!accessCheck.hasAccess) {
            const embed = new EmbedBuilder()
                .setColor(0xFF6B6B)
                .setTitle('🚫 Accès refusé')
                .setDescription(`Vous ne pouvez pas accéder au niveau **${requestedLevel}**.`)
                .addFields(
                    { name: 'Raison', value: accessCheck.reason, inline: false }
                );

            if (accessCheck.requiresNSFW) {
                embed.addFields({
                    name: '💡 Solution',
                    value: 'Utilisez cette commande dans un canal NSFW.',
                    inline: false
                });
            }

            if (accessCheck.requiresRoles && accessCheck.requiresRoles.length > 0) {
                embed.addFields({
                    name: '💡 Rôles requis',
                    value: `Vous devez avoir l'un de ces rôles : ${accessCheck.requiresRoles.map(r => `\`${r}\``).join(', ')}`,
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        // Sauvegarder la préférence
        const success = kinkLevelManager.setUserLevel(userId, guildId, requestedLevel);
        
        if (success) {
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Configuration mise à jour')
                .setDescription(`Votre niveau d'intensité a été défini sur **${requestedLevel}**.`)
                .addFields(
                    { 
                        name: 'Description', 
                        value: kinkLevelManager.getLevelDescription(requestedLevel), 
                        inline: false 
                    },
                    {
                        name: '💡 Info',
                        value: 'Ce niveau sera utilisé par défaut pour les commandes `/gage`, `/action` et `/verite`.',
                        inline: false
                    }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            await interaction.reply({ 
                content: 'Erreur lors de la sauvegarde de votre configuration.', 
                ephemeral: true 
            });
        }
    },

    async handleSetGuildLevel(interaction) {
        // Vérifier les permissions d'administrateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({ 
                content: '🚫 Vous devez être administrateur pour modifier la configuration du serveur.', 
                ephemeral: true 
            });
            return;
        }

        const requestedLevel = interaction.options.getString('intensité');
        const guildId = interaction.guild.id;

        const success = kinkLevelManager.setGuildLevel(guildId, requestedLevel);
        
        if (success) {
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Configuration du serveur mise à jour')
                .setDescription(`Le niveau par défaut du serveur a été défini sur **${requestedLevel}**.`)
                .addFields(
                    { 
                        name: 'Description', 
                        value: kinkLevelManager.getLevelDescription(requestedLevel), 
                        inline: false 
                    },
                    {
                        name: '💡 Info',
                        value: 'Ce niveau sera utilisé par défaut pour tous les utilisateurs qui n\'ont pas défini de préférence personnelle.',
                        inline: false
                    }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({ 
                content: 'Erreur lors de la sauvegarde de la configuration du serveur.', 
                ephemeral: true 
            });
        }
    },

    async handleShowInfo(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        
        const userLevel = kinkLevelManager.getUserLevel(userId, guildId);
        const guildLevel = kinkLevelManager.getGuildLevel(guildId);
        const guildConfig = kinkLevelManager.getGuildConfig(guildId);
        
        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('📊 Configuration des niveaux Kink')
            .setDescription('Voici votre configuration actuelle :')
            .addFields(
                {
                    name: '👤 Votre niveau personnel',
                    value: `**${userLevel}** - ${kinkLevelManager.getLevelDescription(userLevel)}`,
                    inline: false
                },
                {
                    name: '🏠 Niveau par défaut du serveur',
                    value: `**${guildLevel}** - ${kinkLevelManager.getLevelDescription(guildLevel)}`,
                    inline: false
                },
                {
                    name: '📈 Statistiques du serveur',
                    value: `${guildConfig.userCount} utilisateur(s) avec des préférences personnalisées`,
                    inline: false
                }
            )
            .setTimestamp();

        // Ajouter les niveaux disponibles
        const levelsInfo = kinkLevelManager.getAvailableLevels()
            .map(level => `**${level}** : ${kinkLevelManager.getLevelDescription(level)}`)
            .join('\n');
        
        embed.addFields({
            name: '📋 Niveaux disponibles',
            value: levelsInfo,
            inline: false
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async handleTestAccess(interaction) {
        const levels = kinkLevelManager.getAvailableLevels();
        const results = [];

        for (const level of levels) {
            const accessCheck = kinkLevelManager.checkUserAccess(interaction, level);
            const emoji = accessCheck.hasAccess ? '✅' : '❌';
            const status = accessCheck.hasAccess ? 'Accessible' : 'Bloqué';
            
            results.push(`${emoji} **${level}** : ${status}`);
            if (!accessCheck.hasAccess) {
                results.push(`   └─ *${accessCheck.reason}*`);
            }
        }

        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('🧪 Test d\'accès aux niveaux')
            .setDescription('Voici votre accès aux différents niveaux :')
            .addFields({
                name: 'Résultats',
                value: results.join('\n'),
                inline: false
            })
            .addFields({
                name: '💡 Conseils',
                value: '• Utilisez un canal NSFW pour accéder aux niveaux modéré et intense\n• Demandez un rôle adulte vérifié pour le niveau intense',
                inline: false
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async handleReset(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        
        const success = kinkLevelManager.removeUserConfig(userId, guildId);
        
        if (success) {
            const guildLevel = kinkLevelManager.getGuildLevel(guildId);
            
            const embed = new EmbedBuilder()
                .setColor(0xF39C12)
                .setTitle('🔄 Configuration réinitialisée')
                .setDescription('Votre configuration personnelle a été supprimée.')
                .addFields({
                    name: 'Nouveau niveau',
                    value: `Vous utilisez maintenant le niveau par défaut du serveur : **${guildLevel}**`,
                    inline: false
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            await interaction.reply({ 
                content: 'Aucune configuration personnelle à supprimer.', 
                ephemeral: true 
            });
        }
    }
};