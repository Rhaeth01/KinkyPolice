const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const configManager = require('../utils/configManager');

// Mots de remplacement amusants
const TOURETTE_WORDS = [
 'Crache moi dessus stp, CALOTTE DE SES MORTS', 'Mes excuses, CHIENNE', 'gros enculé !', 'Excuse moi, je me contrôle pas.', 'Nique tes morts !', 'Des fois je dérape, mais c\'est pas de ma faute, connasse', 'J\'men branle',
 'il était une fois.. Ferme ta gueule !!', 'Raconte pas ta vie', 'Je suce pour 1 centimes', 'C\'est la femme à qui ?!', 'Je suis sexcité',"ERECTION PRODIGIEUSE", 'J\'ai mouillé ma culotte, SAALOPE',
 'Je suis une pute', 'Harder daddy !', "Les aliens sont des enculés", 'Je suis une grosse salope','Dans la gorge profonde de la baleine giraffe','J\'aime me faire bousiller le cul par un rhinocéros', 'Je suis un gros pervers', 'J\'ai besoin que tu me fasses mal', 'Gawk gawk gawk, QUOI?! Je m\entraîne ! SLURP', 'Tintin en voyage DANS TON CUL', 'Je suis une salope soumise',
  'Fais moi crier, non je rigole, JE ME SUIS DEFONCER LE PETIT ORTEIL CONTRE UN MEUBLE, PUTAIN','Nique les arbres, AH T Y AS CRU BATARD?S'
];

/**
 * Vérifie si un membre a un rôle interdit
 * @param {GuildMember} member - Le membre à vérifier
 * @returns {boolean} - True si le membre a un rôle interdit
 */
function hasForbiddenRole(member) {
    try {
        if (!member || !member.roles) {
            return false;
        }

        const config = configManager.getConfig();
        const forbiddenRoleIds = config?.games?.forbiddenRoleIds || [];

        if (!Array.isArray(forbiddenRoleIds) || forbiddenRoleIds.length === 0) {
            return false;
        }

        const hasRole = forbiddenRoleIds.some(roleId => member.roles.cache.has(roleId));

        return hasRole;
    } catch (error) {
        console.error('[TOURETTE] Erreur lors de la vérification du rôle interdit:', error);
        return false;
    }
}

/**
 * Traite un message pour le système de tourette automatique
 * @param {Message} message - Le message à traiter
 * @returns {boolean} - True si le message a été traité par tourette
 */
function processTouretteMessage(message) {
    try {
        // Ignorer les bots et les messages système
        if (!message.author || message.author.bot || message.system) {
            return false;
        }
        
        // Vérifier si l'auteur a un rôle interdit
        if (!message.member || !hasForbiddenRole(message.member)) {
            return false;
        }
        
        // Choisir un mot aléatoire
        const randomWord = TOURETTE_WORDS[Math.floor(Math.random() * TOURETTE_WORDS.length)];
        
        // Supprimer le message original et envoyer le remplacement
        message.delete().catch(console.error);
        
        const replacementMessage = `**${message.author.displayName}:** ${randomWord}`;
        message.channel.send(replacementMessage).catch(console.error);
        
        console.log(`[TOURETTE] Message de ${message.author.displayName} remplacé par "${randomWord}" dans ${message.guild?.name || 'DM'}`);
        
        return true;
    } catch (error) {
        console.error('[TOURETTE] Erreur lors du traitement du message:', error);
        return false;
    }
}

/**
 * Gère l'attribution d'un rôle interdit à un utilisateur
 * @param {CommandInteraction} interaction - L'interaction de la commande
 */
async function handleAddRole(interaction) {
    try {
        const targetUser = interaction.options.getUser('utilisateur');
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        if (!targetMember) {
            return await interaction.reply({
                content: '❌ Cet utilisateur n\'est pas membre de ce serveur.',
                ephemeral: true
            });
        }
        
        // Vérifications de sécurité
        if (targetUser.id === interaction.user.id) {
            return await interaction.reply({
                content: '❌ Vous ne pouvez pas vous attribuer le rôle interdit à vous-même.',
                ephemeral: true
            });
        }
        
        if (targetUser.bot) {
            return await interaction.reply({
                content: '❌ Impossible d\'attribuer le rôle interdit à un bot.',
                ephemeral: true
            });
        }
        
        // Récupérer la configuration
        const config = configManager.getConfig();
        const forbiddenRoleIds = config?.games?.forbiddenRoleIds || [];
        
        if (!Array.isArray(forbiddenRoleIds) || forbiddenRoleIds.length === 0) {
            return await interaction.reply({
                content: '❌ Aucun rôle interdit configuré. Veuillez configurer `forbiddenRoleIds` dans la configuration.',
                ephemeral: true
            });
        }
        
        // Utiliser le premier rôle configuré
        const roleId = forbiddenRoleIds[0];
        const role = interaction.guild.roles.cache.get(roleId);
        
        if (!role) {
            return await interaction.reply({
                content: `❌ Le rôle configuré (ID: ${roleId}) n'existe pas sur ce serveur.`,
                ephemeral: true
            });
        }
        
        // Vérifier la hiérarchie des rôles
        if (role.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return await interaction.reply({
                content: '❌ Vous ne pouvez pas attribuer un rôle supérieur ou égal au vôtre.',
                ephemeral: true
            });
        }
        
        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return await interaction.reply({
                content: '❌ Je ne peux pas attribuer ce rôle car il est supérieur ou égal au mien.',
                ephemeral: true
            });
        }
        
        // Vérifier si l'utilisateur a déjà le rôle
        if (targetMember.roles.cache.has(roleId)) {
            return await interaction.reply({
                content: `❌ ${targetUser.displayName} possède déjà le rôle interdit.`,
                ephemeral: true
            });
        }
        
        // Attribuer le rôle
        await targetMember.roles.add(role);
        
        // Créer l'embed de confirmation
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🎭 Rôle Interdit Attribué')
            .addFields(
                { name: '👤 Utilisateur', value: `${targetUser}`, inline: true },
                { name: '🎭 Rôle', value: `${role}`, inline: true },
                { name: '⚡ Effet', value: 'Les messages seront maintenant remplacés automatiquement', inline: false }
            )
            .setFooter({ text: `Attribué par ${interaction.user.displayName}` })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
        console.log(`[TOURETTE] Rôle interdit attribué à ${targetUser.displayName} (${targetUser.id}) par ${interaction.user.displayName} dans ${interaction.guild.name}`);
        
    } catch (error) {
        console.error('[TOURETTE] Erreur lors de l\'attribution du rôle:', error);
        await interaction.reply({
            content: '❌ Une erreur est survenue lors de l\'attribution du rôle.',
            ephemeral: true
        });
    }
}

/**
 * Gère le retrait d'un rôle interdit d'un utilisateur
 * @param {CommandInteraction} interaction - L'interaction de la commande
 */
async function handleRemoveRole(interaction) {
    try {
        const targetUser = interaction.options.getUser('utilisateur');
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        if (!targetMember) {
            return await interaction.reply({
                content: '❌ Cet utilisateur n\'est pas membre de ce serveur.',
                ephemeral: true
            });
        }
        
        // Récupérer la configuration
        const config = configManager.getConfig();
        const forbiddenRoleIds = config?.games?.forbiddenRoleIds || [];
        
        if (!Array.isArray(forbiddenRoleIds) || forbiddenRoleIds.length === 0) {
            return await interaction.reply({
                content: '❌ Aucun rôle interdit configuré.',
                ephemeral: true
            });
        }
        
        // Trouver tous les rôles interdits que possède l'utilisateur
        const userForbiddenRoles = forbiddenRoleIds
            .map(roleId => interaction.guild.roles.cache.get(roleId))
            .filter(role => role && targetMember.roles.cache.has(role.id));
        
        if (userForbiddenRoles.length === 0) {
            return await interaction.reply({
                content: `❌ ${targetUser.displayName} ne possède aucun rôle interdit.`,
                ephemeral: true
            });
        }
        
        // Vérifier la hiérarchie pour tous les rôles
        for (const role of userForbiddenRoles) {
            if (role.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
                return await interaction.reply({
                    content: `❌ Vous ne pouvez pas retirer le rôle ${role.name} car il est supérieur ou égal au vôtre.`,
                    ephemeral: true
                });
            }
            
            if (role.position >= interaction.guild.members.me.roles.highest.position) {
                return await interaction.reply({
                    content: `❌ Je ne peux pas retirer le rôle ${role.name} car il est supérieur ou égal au mien.`,
                    ephemeral: true
                });
            }
        }
        
        // Retirer tous les rôles interdits
        await targetMember.roles.remove(userForbiddenRoles);
        
        // Créer l'embed de confirmation
        const rolesList = userForbiddenRoles.map(role => role.name).join(', ');
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎭 Rôle Interdit Retiré')
            .addFields(
                { name: '👤 Utilisateur', value: `${targetUser}`, inline: true },
                { name: '🎭 Rôles retirés', value: rolesList, inline: true },
                { name: '⚡ Effet', value: 'Les messages ne seront plus remplacés', inline: false }
            )
            .setFooter({ text: `Retiré par ${interaction.user.displayName}` })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
        console.log(`[TOURETTE] Rôle(s) interdit(s) retiré(s) de ${targetUser.displayName} (${targetUser.id}) par ${interaction.user.displayName} dans ${interaction.guild.name}`);
        
    } catch (error) {
        console.error('[TOURETTE] Erreur lors du retrait du rôle:', error);
        await interaction.reply({
            content: '❌ Une erreur est survenue lors du retrait du rôle.',
            ephemeral: true
        });
    }
}

/**
 * Gère l'affichage de la liste des utilisateurs avec un rôle interdit
 * @param {CommandInteraction} interaction - L'interaction de la commande
 */
async function handleListUsers(interaction) {
    try {
        // Récupérer la configuration
        const config = configManager.getConfig();
        const forbiddenRoleIds = config?.games?.forbiddenRoleIds || [];
        
        if (!Array.isArray(forbiddenRoleIds) || forbiddenRoleIds.length === 0) {
            return await interaction.reply({
                content: '❌ Aucun rôle interdit configuré.',
                ephemeral: true
            });
        }
        
        // Collecter tous les utilisateurs avec des rôles interdits
        const usersWithForbiddenRoles = [];
        
        for (const roleId of forbiddenRoleIds) {
            const role = interaction.guild.roles.cache.get(roleId);
            if (role) {
                role.members.forEach(member => {
                    if (!usersWithForbiddenRoles.find(u => u.id === member.id)) {
                        usersWithForbiddenRoles.push({
                            id: member.id,
                            displayName: member.displayName,
                            roleName: role.name
                        });
                    }
                });
            }
        }
        
        // Créer l'embed
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🎭 Utilisateurs avec Rôle Interdit')
            .setTimestamp();
        
        if (usersWithForbiddenRoles.length === 0) {
            embed.setDescription('Aucun utilisateur n\'a actuellement de rôle interdit.');
        } else {
            const usersList = usersWithForbiddenRoles
                .map(user => `• ${user.displayName} (${user.roleName})`)
                .join('\n');
            
            embed.setDescription(`**${usersWithForbiddenRoles.length} utilisateur(s) affecté(s) :**\n\n${usersList}`);
        }
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
    } catch (error) {
        console.error('[TOURETTE] Erreur lors de l\'affichage de la liste:', error);
        await interaction.reply({
            content: '❌ Une erreur est survenue lors de l\'affichage de la liste.',
            ephemeral: true
        });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tourette')
        .setDescription('Gestion du système de tourette automatique')
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Affiche les informations sur le système de tourette')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Affiche la configuration actuelle du système')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Teste le système avec un mot aléatoire')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Attribue le rôle interdit à un utilisateur')
                .addUserOption(option =>
                    option
                        .setName('utilisateur')
                        .setDescription('L\'utilisateur à qui attribuer le rôle interdit')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Retire le rôle interdit d\'un utilisateur')
                .addUserOption(option =>
                    option
                        .setName('utilisateur')
                        .setDescription('L\'utilisateur à qui retirer le rôle interdit')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Liste tous les utilisateurs avec un rôle interdit')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'info':
                    const infoEmbed = new EmbedBuilder()
                        .setColor('#0099FF')
                        .setTitle('🎭 Système de Tourette Automatique')
                        .setDescription('Le système de tourette remplace automatiquement tous les messages des utilisateurs ayant un rôle interdit par leur nom suivi d\'un mot aléatoire amusant.')
                        .addFields(
                            { name: '🎯 Fonctionnement', value: 'Automatique basé sur les rôles configurés', inline: true },
                            { name: '🎲 Mots disponibles', value: `${TOURETTE_WORDS.length} mots amusants`, inline: true },
                            { name: '⚙️ Configuration', value: 'Basé sur `forbiddenRoleIds`', inline: true },
                            { name: '🔧 Gestion', value: 'Utilisez `/tourette add/remove` pour gérer les rôles', inline: false }
                        )
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [infoEmbed] });
                    break;

                case 'config':
                    const config = configManager.getConfig();
                    const forbiddenRoleIds = config?.games?.forbiddenRoleIds || [];
                    
                    const configEmbed = new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle('⚙️ Configuration du Système')
                        .setTimestamp();
                    
                    if (!Array.isArray(forbiddenRoleIds) || forbiddenRoleIds.length === 0) {
                        configEmbed.setDescription('❌ Aucun rôle interdit configuré.\n\nVeuillez configurer `forbiddenRoleIds` dans la configuration du bot.');
                    } else {
                        const rolesList = forbiddenRoleIds
                            .map(roleId => {
                                const role = interaction.guild.roles.cache.get(roleId);
                                return role ? `• ${role.name} (${roleId})` : `• Rôle introuvable (${roleId})`;
                            })
                            .join('\n');
                        
                        configEmbed.addFields(
                            { name: '🎭 Rôles interdits', value: rolesList, inline: false },
                            { name: '📊 Statut', value: '✅ Système actif', inline: true },
                            { name: '🎲 Mots', value: `${TOURETTE_WORDS.length} disponibles`, inline: true }
                        );
                    }
                    
                    await interaction.reply({ embeds: [configEmbed] });
                    break;

                case 'test':
                    const randomWord = TOURETTE_WORDS[Math.floor(Math.random() * TOURETTE_WORDS.length)];
                    const testEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🧪 Test du Système')
                        .setDescription(`**${interaction.user.displayName}:** ${randomWord}`)
                        .setFooter({ text: 'Ceci est un exemple de remplacement' })
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [testEmbed] });
                    break;

                case 'add':
                    // Vérifier les permissions
                    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                        return await interaction.reply({
                            content: '❌ Vous devez avoir la permission "Modérer les membres" pour utiliser cette commande.',
                            ephemeral: true
                        });
                    }
                    
                    await handleAddRole(interaction);
                    break;

                case 'remove':
                    // Vérifier les permissions
                    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                        return await interaction.reply({
                            content: '❌ Vous devez avoir la permission "Modérer les membres" pour utiliser cette commande.',
                            ephemeral: true
                        });
                    }
                    
                    await handleRemoveRole(interaction);
                    break;

                case 'list':
                    // Vérifier les permissions
                    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                        return await interaction.reply({
                            content: '❌ Vous devez avoir la permission "Modérer les membres" pour utiliser cette commande.',
                            ephemeral: true
                        });
                    }
                    
                    await handleListUsers(interaction);
                    break;

                default:
                    await interaction.reply({
                        content: '❌ Sous-commande non reconnue.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('[TOURETTE] Erreur lors de l\'exécution de la commande:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
                    ephemeral: true
                });
            }
        }
    },

    // Exports pour l'intégration avec messageCreate
    processTouretteMessage,
    hasForbiddenRole,
    handleAddRole,
    handleRemoveRole,
    handleListUsers,
    TOURETTE_WORDS
};