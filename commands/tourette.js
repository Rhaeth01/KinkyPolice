const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ConfigManager = require('../utils/configManager');

// Mots aléatoires pour remplacer les messages
const TOURETTE_WORDS = [
    'BANANA!', 'BISCUIT!', 'WAFFLES!', 'PICKLE RICK!', 'SQUEAKY CHEESE!',
    'RUBBER DUCK!', 'SPAGHETTI MONSTER!', 'DANCING LOBSTER!', 'COSMIC MUFFIN!',
    'RAINBOW EXPLOSION!', 'FLYING TACO!', 'MAGICAL UNICORN!', 'BOUNCING POTATO!',
    'GLITTERY DONUT!', 'SINGING CACTUS!', 'PURPLE ELEPHANT!', 'NINJA PENGUIN!',
    'SPARKLY BURRITO!', 'GIGANTIC MARSHMALLOW!', 'INVISIBLE SANDWICH!'
];

// Fonction pour vérifier si un utilisateur a le rôle interdit
function hasForbiddenRole(member) {
    try {
        const config = new ConfigManager();
        const forbiddenRoleIds = config.forbiddenRoleIds;
        
        if (!forbiddenRoleIds || !Array.isArray(forbiddenRoleIds)) {
            return false;
        }
        
        return forbiddenRoleIds.some(roleId => member.roles.cache.has(roleId));
    } catch (error) {
        console.error('[TOURETTE] Erreur lors de la vérification du rôle interdit:', error);
        return false;
    }
}

// Fonction pour traiter les messages des utilisateurs avec le rôle interdit
function processTouretteMessage(message) {
    if (message.author.bot) return false;
    if (!message.guild) return false;
    
    // Récupérer le membre
    const member = message.member;
    if (!member) return false;
    
    // Vérifier si l'utilisateur a le rôle interdit
    if (!hasForbiddenRole(member)) return false;
    
    // Supprimer le message original
    message.delete().catch(console.error);
    
    // Choisir un mot aléatoire
    const randomWord = TOURETTE_WORDS[Math.floor(Math.random() * TOURETTE_WORDS.length)];
    
    // Envoyer le message de remplacement
    message.channel.send({
        content: `**${message.author.username}:** ${randomWord}`
    }).catch(console.error);
    
    console.log(`[TOURETTE] Message de ${message.author.username} remplacé par "${randomWord}" dans ${message.guild.name}`);
    
    return true;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tourette')
        .setDescription('Gère le système de tourette automatique')
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Affiche les informations sur le système'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Affiche la configuration actuelle'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Teste un mot aléatoire'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Attribue le rôle interdit à un utilisateur')
                .addUserOption(option =>
                    option.setName('utilisateur')
                        .setDescription('L\'utilisateur à qui attribuer le rôle')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Retire le rôle interdit d\'un utilisateur')
                .addUserOption(option =>
                    option.setName('utilisateur')
                        .setDescription('L\'utilisateur à qui retirer le rôle')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Liste les utilisateurs ayant le rôle interdit')),
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')        
        // Vérifier les permissions pour les commandes de gestion des rôles
        if (['add', 'remove', 'list'].includes(subcommand)) {
            if (!interaction.member.permissions.has('ModerateMembers')) {
                return interaction.reply({
                    content: '❌ Vous devez avoir la permission de modérer les membres pour utiliser cette commande.',
                    ephemeral: true
                });
            }
        }                .setDescription('Attribue le rôle interdit à un utilisateur')
                .addUserOption(option =>
                    option.setName('utilisateur')
                        .setDescription('L\'utilisateur à qui attribuer le rôle')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Retire le rôle interdit d\'un utilisateur')
                .addUserOption(option =>
                    option.setName('utilisateur')
                        .setDescription('L\'utilisateur à qui retirer le rôle')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Liste les utilisateurs ayant le rôle interdit')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {                        },
                        {
                            name: '🔧 Gestion',
                            value: 'Utilisez `/tourette add` et `/tourette remove` pour gérer les utilisateurs affectés',
                            inline: false            case 'info':
                const infoEmbed = new EmbedBuilder()
                    .setFooter({ text: 'Système automatique basé sur les rôles' })
                    .setColor('#ff6b6b')
                    .setDescription('Le système de tourette s\'applique automatiquement aux utilisateurs ayant le rôle interdit.')
                    .addFields(
                        { 
                            name: '🎯 Fonctionnement', 
                            value: 'Tous les messages des utilisateurs avec le rôle interdit sont automatiquement supprimés et remplacés par leur nom suivi d\'un mot aléatoire.', 
                            inline: false 
                        },
                        { 
                            name: '🎭 Mots utilisés', 
                            value: `${TOURETTE_WORDS.length} mots aléatoires disponibles`, 
                            inline: true 
                        },
                        { 
                            name: '⚙️ Configuration', 
                            value: 'Basé sur les `forbiddenRoleIds` dans la configuration', 
                            inline: true 
                        }
                    )
                    .setFooter({ text: 'Système automatique - Aucune intervention manuelle requise' })
                    .setTimestamp();

                await interaction.reply({
                    embeds: [infoEmbed],
                    ephemeral: true
                });
                break;

            case 'config':
                try {
                    const config = new ConfigManager();
                    const forbiddenRoleIds = config.forbiddenRoleIds;
                    
                    let roleInfo = 'Aucun rôle configuré';
                    if (forbiddenRoleIds && Array.isArray(forbiddenRoleIds) && forbiddenRoleIds.length > 0) {
                        const roleList = forbiddenRoleIds.map(roleId => `<@&${roleId}>`).join('\n');
                        roleInfo = `**Rôles concernés :**\n${roleList}`;
                    }
                    
                    const configEmbed = new EmbedBuilder()
                        .setTitle('⚙️ Configuration du Système Tourette')
                        .setColor('#4c6ef5')
                        .setDescription(roleInfo)
                        .addFields(
                            { 
                                name: '📊 Statut', 
                                value: forbiddenRoleIds && forbiddenRoleIds.length > 0 ? '🟢 Actif' : '🔴 Inactif', 
                                inline: true 
                            },
                            { 
                                name: '🎲 Mots disponibles', 
                                value: `${TOURETTE_WORDS.length} mots`, 
                                inline: true 
                            }
                        )
                        .setFooter({ text: 'Configuration automatique basée sur forbiddenRoleIds' })
                        .setTimestamp();

                    await interaction.reply({
                        embeds: [configEmbed],
                        ephemeral: true
                    });
                } catch (error) {
                    console.error('[TOURETTE] Erreur lors de la récupération de la configuration:', error);
                    await interaction.reply({
                      
            case 'add':
                await this.handleAddRole(interaction);
                break;

            case 'remove':
                await this.handleRemoveRole(interaction);
                break;

            case 'list':
                await this.handleListUsers(interaction);
                break;                        ephemeral: true
      
    async handleAddRole(interaction) {
        const targetUser = interaction.options.getUser('utilisateur');
        
        try {
            // Vérifications de sécurité
            if (targetUser.id === interaction.user.id) {
                return interaction.reply({
                    content: '❌ Vous ne pouvez pas vous attribuer le rôle interdit à vous-même.',
                    ephemeral: true
                });
            }

            if (targetUser.bot) {
                return interaction.reply({
                    content: '❌ Les bots ne peuvent pas recevoir le rôle interdit.',
                    ephemeral: true
                });
            }

            // Récupérer le membre
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) {
                return interaction.reply({
                    content: '❌ Cet utilisateur n\'est pas membre de ce serveur.',
                    ephemeral: true
                });
            }

            // Vérifier la hiérarchie des rôles
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
                return interaction.reply({
                    content: '❌ Vous ne pouvez pas affecter un utilisateur ayant un rôle égal ou supérieur au vôtre.',
                    ephemeral: true
                });
            }

            // Récupérer la configuration
            const config = new ConfigManager();
            const forbiddenRoleIds = config.forbiddenRoleIds;
            
            if (!forbiddenRoleIds || !Array.isArray(forbiddenRoleIds) || forbiddenRoleIds.length === 0) {
                return interaction.reply({
                    content: '❌ Aucun rôle interdit configuré. Veuillez configurer `forbiddenRoleIds` d\'abord.',
                    ephemeral: true
                });
            }

            // Prendre le premier rôle interdit configuré
            const forbiddenRoleId = forbiddenRoleIds[0];
            const forbiddenRole = interaction.guild.roles.cache.get(forbiddenRoleId);
            
            if (!forbiddenRole) {
                return interaction.reply({
                    content: `❌ Le rôle interdit configuré (ID: ${forbiddenRoleId}) n'existe pas sur ce serveur.`,
                    ephemeral: true
                });
            }

            // Vérifier si l'utilisateur a déjà le rôle
            if (targetMember.roles.cache.has(forbiddenRoleId)) {
                return interaction.reply({
                    content: `❌ ${targetUser.username} a déjà le rôle ${forbiddenRole.name}.`,
                    ephemeral: true
                });
            }

            // Attribuer le rôle
            await targetMember.roles.add(forbiddenRole);

            const successEmbed = new EmbedBuilder()
                .setTitle('🤪 Rôle Interdit Attribué')
                .setColor('#ff6b6b')
                .addFields(
                    { name: '👤 Utilisateur', value: `${targetUser}`, inline: true },
                    { name: '🎭 Rôle', value: `${forbiddenRole}`, inline: true },
                    { name: '⚡ Effet', value: 'Les messages seront maintenant remplacés automatiquement', inline: false }
                )
                .setFooter({ text: `Attribué par ${interaction.user.username}` })
                .setTimestamp();

            await interaction.reply({
                embeds: [successEmbed]
            });

            console.log(`[TOURETTE] Rôle interdit attribué à ${targetUser.username} (${targetUser.id}) par ${interaction.user.username} dans ${interaction.guild.name}`);

        } catch (error) {
            console.error('[TOURETTE] Erreur lors de l\'attribution du rôle:', error);
            await interaction.reply({
                content: '❌ Une erreur s\'est produite lors de l\'attribution du rôle.',
                ephemeral: true
            });
        }
    },

    async handleRemoveRole(interaction) {
        const targetUser = interaction.options.getUser('utilisateur');
        
        try {
            // Récupérer le membre
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) {
                return interaction.reply({
                    content: '❌ Cet utilisateur n\'est pas membre de ce serveur.',
                    ephemeral: true
                });
            }

            // Vérifier la hiérarchi                }
                break;

            case 'test':
                const randomWord = TOURETTE_WORDS[Math.floor(Math.random() * TOURETTE_WORDS.length)];
                
                const testEmbed = new EmbedBuilder()
                    .setTitle('🎲 Test du Système Tourette')
                    .setColor('#51cf66')
                    .setDescription(`**${interaction.user.username}:** ${randomWord}`)
                    .setFooter({ text: 'Exemple de remplacement de message' })
                    .setTimestamp();

                await interaction.reply({
                    embeds: [testEmbed],
                    ephemeral: true
                });
                break;
        }
    },

    // Exporter la fonction de traitement des messages
    processTouretteMessage,
    hasForbiddenRole,
    TOURETTE_WORDS
};