const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Map pour stocker les utilisateurs affectés par la tourette
const touretteUsers = new Map();

// Mots aléatoires pour remplacer les messages
const TOURETTE_WORDS = [
    'Ntm fdp', 'Connard', 't`es raciste en plus ?', 'T pas le pinguin qui glisse le plus loin, catin', 'Idiot', 'J`te baise', 'Bouffon','Calotte de ses morts', 'Balec frère',
    'Suceur', 'Clown de merde', 'T ki fdp', 'Grosse merde', 'Bouche à queues', 'Sale renifleur de iep', 'Je suis désolé ENCULE', 'Buveur de pisse', 'Nique les stups et la hierarchie',
    'Gode ceinture de taille abyssale'
];  

// Fonction pour nettoyer les tourettes expirées
function cleanupExpiredTourettes() {
    const now = Date.now();
    for (const [key, data] of touretteUsers.entries()) {
        if (now >= data.endTime) {
            touretteUsers.delete(key);
            console.log(`[TOURETTE] Nettoyage automatique pour l'utilisateur ${data.userId} dans le serveur ${data.guildId}`);
        }
    }
}

// Nettoyer toutes les 5 minutes
setInterval(cleanupExpiredTourettes, 5 * 60 * 1000);

// Fonction pour traiter les messages des utilisateurs affectés
function processTouretteMessage(message) {
    if (message.author.bot) return false;
    if (!message.guild) return false;
    
    const key = `${message.guild.id}-${message.author.id}`;
    const touretteData = touretteUsers.get(key);
    
    if (!touretteData) return false;
    
    // Vérifier si la tourette est encore active
    if (Date.now() >= touretteData.endTime) {
        touretteUsers.delete(key);
        return false;
    }
    
    // Supprimer le message original
    message.delete().catch(console.error);
    
    // Choisir un mot aléatoire
    const randomWord = TOURETTE_WORDS[Math.floor(Math.random() * TOURETTE_WORDS.length)];
    
    // Envoyer le message de remplacement
    message.channel.send({
        content: `**${message.author.username}:** ${randomWord}`
    }).catch(console.error);
    
    // Incrémenter le compteur
    touretteData.messageCount++;
    
    console.log(`[TOURETTE] Message de ${message.author.username} remplacé dans ${message.guild.name}`);
    
    return true;
}

// Fonction pour obtenir la liste des utilisateurs affectés (pour debug)
function getTouretteUsers() {
    return Array.from(touretteUsers.entries()).map(([key, data]) => ({
        key,
        ...data,
        remainingTime: Math.max(0, data.endTime - Date.now())
    }));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tourette')
        .setDescription('Active/désactive le mode tourette pour un utilisateur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à affecter')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action à effectuer')
                .setRequired(true)
                .addChoices(
                    { name: 'Activer', value: 'activer' },
                    { name: 'Désactiver', value: 'désactiver' },
                    { name: 'Statut', value: 'statut' }
                ))
        .addIntegerOption(option =>
            option.setName('duree')
                .setDescription('Durée en minutes (1-1440)')
                .setMinValue(1)
                .setMaxValue(1440)),

    async execute(interaction) {
        // Vérifier les permissions
        if (!interaction.member.permissions.has('ModerateMembers')) {
            return interaction.reply({
                content: '❌ Vous devez avoir la permission de modérer les membres pour utiliser cette commande.',
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('utilisateur');
        const action = interaction.options.getString('action');
        const duration = interaction.options.getInteger('duree') || 10;

        // Vérifications de sécurité
        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ Vous ne pouvez pas vous appliquer la tourette à vous-même.',
                ephemeral: true
            });
        }

        if (targetUser.bot) {
            return interaction.reply({
                content: '❌ Les bots ne peuvent pas être affectés par la tourette.',
                ephemeral: true
            });
        }

        // Vérifier que l'utilisateur est membre du serveur
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

        const key = `${interaction.guild.id}-${targetUser.id}`;

        switch (action) {
            case 'activer':
                // Vérifier si déjà actif
                if (touretteUsers.has(key)) {
                    return interaction.reply({
                        content: '❌ Cet utilisateur est déjà affecté par la tourette.',
                        ephemeral: true
                    });
                }

                // Calculer les timestamps
                const startTime = Date.now();
                const endTime = startTime + (duration * 60 * 1000);

                // Ajouter à la map
                touretteUsers.set(key, {
                    userId: targetUser.id,
                    guildId: interaction.guild.id,
                    startTime,
                    endTime,
                    duration,
                    moderator: interaction.user.username,
                    messageCount: 0
                });

                // Programmer la désactivation automatique
                setTimeout(() => {
                    if (touretteUsers.has(key)) {
                        touretteUsers.delete(key);
                        console.log(`[TOURETTE] Désactivé automatiquement pour ${targetUser.username} (${targetUser.id}) dans ${interaction.guild.name}`);
                    }
                }, duration * 60 * 1000);

                // Créer l'embed de confirmation
                const activateEmbed = new EmbedBuilder()
                    .setTitle('🤪 Mode Tourette Activé')
                    .setColor('#ff6b6b')
                    .addFields(
                        { name: '👤 Utilisateur', value: `${targetUser}`, inline: true },
                        { name: '⏱️ Durée', value: `${duration} minute${duration > 1 ? 's' : ''}`, inline: true },
                        { name: '🕐 Fin prévue', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true },
                        { name: '🎭 Effet', value: 'Tous les messages seront remplacés par des mots aléatoires', inline: false }
                    )
                    .setFooter({ text: `Activé par ${interaction.user.username}` })
                    .setTimestamp();

                // Créer les boutons de contrôle
                const controlButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`tourette_disable_${targetUser.id}`)
                            .setLabel('🔴 Désactiver maintenant')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId(`tourette_status_${targetUser.id}`)
                            .setLabel('📊 Voir le statut')
                            .setStyle(ButtonStyle.Secondary)
                    );

                await interaction.reply({
                    embeds: [activateEmbed],
                    components: [controlButtons]
                });

                console.log(`[TOURETTE] Activé pour ${targetUser.username} (${targetUser.id}) dans ${interaction.guild.name} par ${interaction.user.username} pour ${duration} minutes`);
                break;

            case 'désactiver':
                if (!touretteUsers.has(key)) {
                    return interaction.reply({
                        content: '❌ Cet utilisateur n\'est pas affecté par la tourette.',
                        ephemeral: true
                    });
                }

                const touretteData = touretteUsers.get(key);
                touretteUsers.delete(key);

                const deactivateEmbed = new EmbedBuilder()
                    .setTitle('🟢 Mode Tourette Désactivé')
                    .setColor('#51cf66')
                    .addFields(
                        { name: '👤 Utilisateur', value: `${targetUser}`, inline: true },
                        { name: '📊 Messages remplacés', value: `${touretteData.messageCount}`, inline: true },
                        { name: '⏱️ Durée d\'activité', value: `${Math.floor((Date.now() - touretteData.startTime) / 1000 / 60)} minute(s)`, inline: true }
                    )
                    .setFooter({ text: `Désactivé par ${interaction.user.username}` })
                    .setTimestamp();

                await interaction.reply({
                    embeds: [deactivateEmbed]
                });

                console.log(`[TOURETTE] Désactivé pour ${targetUser.username} (${targetUser.id}) dans ${interaction.guild.name} par ${interaction.user.username}`);
                break;

            case 'statut':
                if (!touretteUsers.has(key)) {
                    return interaction.reply({
                        content: '❌ Cet utilisateur n\'est pas affecté par la tourette.',
                        ephemeral: true
                    });
                }

                const statusData = touretteUsers.get(key);
                const remainingTime = Math.max(0, Math.floor((statusData.endTime - Date.now()) / 1000 / 60));
                const elapsedTime = Math.floor((Date.now() - statusData.startTime) / 1000 / 60);

                const statusEmbed = new EmbedBuilder()
                    .setTitle('📊 Statut du Mode Tourette')
                    .setColor('#4c6ef5')
                    .addFields(
                        { name: '👤 Utilisateur', value: `${targetUser}`, inline: true },
                        { name: '🟢 État', value: 'Actif', inline: true },
                        { name: '⏱️ Temps restant', value: `${remainingTime} minute${remainingTime > 1 ? 's' : ''}`, inline: true },
                        { name: '📅 Activé depuis', value: `${elapsedTime} minute${elapsedTime > 1 ? 's' : ''}`, inline: true },
                        { name: '📊 Messages remplacés', value: `${statusData.messageCount}`, inline: true },
                        { name: '👮 Modérateur', value: statusData.moderator, inline: true }
                    )
                    .setFooter({ text: `Fin prévue dans ${remainingTime} minute(s)` })
                    .setTimestamp();

                await interaction.reply({
                    embeds: [statusEmbed],
                    ephemeral: true
                });
                break;
        }
    },

    // Exporter les fonctions utilitaires
    processTouretteMessage,
    getTouretteUsers,
    touretteUsers
};