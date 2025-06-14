const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, RoleSelectMenuBuilder } = require('discord.js');
const configManager = require('../../../utils/configManager');

class GamesMenu {
    static async show(interaction) {
        const config = configManager.getConfig();
        const gamesConfig = config.games || {};
        const forbiddenRoles = [];
        
        // Récupérer les rôles interdits
        if (gamesConfig.forbiddenRoleIds && Array.isArray(gamesConfig.forbiddenRoleIds)) {
            for (const roleId of gamesConfig.forbiddenRoleIds) {
                const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
                if (role) {
                    forbiddenRoles.push(role);
                }
            }
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🎮 Configuration des Jeux & Animation')
            .setDescription('Gérez les **rôles drôles** qui peuvent être attribués temporairement via la commande `/vote` pour animer le serveur !\n\n**Commandes de jeux disponibles:**\n• `/kinky` - Jeux NSFW\n• `/quiz-kinky` - Quiz NSFW\n• `/pendu` - Jeu du pendu\n• `/pile-ou-face` - Pile ou face\n• `/black-jack` - Blackjack')
            .setColor('#E74C3C')
            .addFields(
                {
                    name: '🎭 Rôles d\'Animation (Vote)',
                    value: forbiddenRoles.length > 0 
                        ? forbiddenRoles.map(role => `<@&${role.id}>`).join('\n')
                        : 'Aucun rôle drôle configuré',
                    inline: false
                },
                {
                    name: '🎯 Comment ça marche ?',
                    value: 'Avec `/vote @utilisateur role temps`, la communauté peut voter pour attribuer temporairement ces rôles embarrassants/drôles ! Il faut 4 votes pour que ça passe.',
                    inline: false
                }
            )
            .setFooter({ text: 'Cliquez sur le bouton ci-dessous pour configurer les rôles drôles' })
            .setTimestamp();

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('games_forbidden_roles')
                    .setLabel('Configurer les Rôles Drôles')
                    .setEmoji('🎭')
                    .setStyle(ButtonStyle.Danger)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('config_back')
                    .setLabel('Retour')
                    .setEmoji('◀️')
                    .setStyle(ButtonStyle.Secondary)
            );

        return { embeds: [embed], components: [row1, row2] };
    }

    static async handleForbiddenRoles(interaction) {
        const config = configManager.getConfig();
        const gamesConfig = config.games || {};
        const forbiddenRoleIds = gamesConfig.forbiddenRoleIds || [];
        
        // Créer un Role Select Menu Discord natif (avec recherche intégrée)
        const roleSelectMenu = new RoleSelectMenuBuilder()
            .setCustomId('games_forbidden_roles_select')
            .setPlaceholder('🔍 Rechercher et sélectionner les rôles drôles...')
            .setMinValues(0)
            .setMaxValues(10); // Limite raisonnable pour éviter le spam

        const row = new ActionRowBuilder().addComponents(roleSelectMenu);

        const embed = new EmbedBuilder()
            .setTitle('🎭 Sélection des Rôles d\'Animation')
            .setDescription('**Utilisez le menu ci-dessous** pour sélectionner les rôles drôles/embarrassants !\n\n' +
                '🔍 **Recherche intégrée** : Tapez le nom du rôle pour le trouver rapidement\n' +
                '🎯 **Sélection multiple** : Vous pouvez choisir jusqu\'à 10 rôles\n' +
                '🎭 **Rôles actuels** : ' + (forbiddenRoleIds.length > 0 ? 
                    forbiddenRoleIds.map(id => `<@&${id}>`).join(', ') : 
                    'Aucun rôle configuré') + '\n\n' +
                '**Exemples de rôles drôles :**\n' +
                '• 🤡 Clown du serveur\n' +
                '• 😳 Victime du jour\n' +
                '• 🙈 Gêné(e)\n' +
                '• 💩 Caca\n' +
                '• 🦄 Licorne rose\n\n' +
                '⚠️ **Note** : Les rôles staff et avec permissions spéciales seront automatiquement filtrés lors de la sauvegarde.')
            .setColor('#E74C3C')
            .setFooter({ text: 'Ces rôles seront disponibles dans la commande /vote pour l\'animation !' });

        await interaction.update({ embeds: [embed], components: [row] });
    }

    static async handleForbiddenRolesSelect(interaction, addPendingChanges) {
        const selectedRoles = interaction.roles;
        const selectedRoleIds = Array.from(selectedRoles.keys());
        
        // Filtrer les rôles pour exclure les rôles staff
        const config = configManager.getConfig();
        const adminRoleId = config.general?.adminRole;
        const modRoleId = config.general?.modRole;
        const supportRoleId = config.tickets?.supportRole;
        
        const filteredRoleIds = selectedRoleIds.filter(roleId => {
            const role = selectedRoles.get(roleId);
            if (!role) return false;
            
            // Exclure les rôles problématiques
            return roleId !== interaction.guild.id && // @everyone
                   !role.managed && // rôles de bots
                   roleId !== adminRoleId && // admin
                   roleId !== modRoleId && // modérateur
                   roleId !== supportRoleId && // support
                   !role.permissions.has('Administrator') && // permissions admin
                   !role.permissions.has('ModerateMembers'); // permissions modération
        });
        
        const filteredCount = selectedRoleIds.length - filteredRoleIds.length;
        
        // Ajouter les changements en attente via le configHandler
        if (addPendingChanges) {
            addPendingChanges(interaction.user.id, {
                'games.forbiddenRoleIds': filteredRoleIds
            });
        } else {
            // Fallback si addPendingChanges n'est pas fourni
            if (!config.games) config.games = {};
            config.games.forbiddenRoleIds = filteredRoleIds;
            await configManager.saveConfig(config);
        }

        let message = `✅ Les rôles d'animation ont été mis à jour ! ${filteredRoleIds.length} rôle(s) configuré(s).`;
        if (filteredCount > 0) {
            message += `\n⚠️ ${filteredCount} rôle(s) staff exclu(s) automatiquement.`;
        }

        await interaction.followUp({
            content: message,
            ephemeral: true
        });

        // Rafraîchir le menu
        const menuContent = await this.show(interaction);
        await interaction.editReply(menuContent);
    }
}

module.exports = GamesMenu;