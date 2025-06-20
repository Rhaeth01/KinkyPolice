const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, RoleSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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
            .setDescription('Gérez les paramètres des jeux et animations du serveur !\n\n**Commandes de jeux disponibles:**\n• `/kinky` - Jeux NSFW\n• `/quiz-kinky` - Quiz NSFW interactif\n• `/pendu` - Jeu du pendu\n• `/pile-ou-face` - Pile ou face\n• `/black-jack` - Blackjack\n• `/vote` - Vote communautaire pour les rôles drôles')
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
                    name: '📚 Quiz Quotidien',
                    value: config.games?.quiz?.enabled ? 
                        `✅ Activé - ${config.games.quiz.pointsPerCorrectAnswer || 100}pts/réponse\n🕐 Heure: ${String(config.games.quiz.hour || 13).padStart(2, '0')}:${String(config.games.quiz.minute || 0).padStart(2, '0')}` : 
                        '❌ Désactivé',
                    inline: true
                },
                {
                    name: '🎯 Système de Vote',
                    value: 'Avec `/vote @utilisateur role temps`, la communauté peut voter pour attribuer temporairement les rôles drôles ! Il faut 4 votes pour que ça passe.',
                    inline: false
                }
            )
            .setFooter({ text: 'Configurez les rôles drôles et le quiz quotidien' })
            .setTimestamp();

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('games_forbidden_roles')
                    .setLabel('Configurer les Rôles Drôles')
                    .setEmoji('🎭')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('games_quiz_toggle')
                    .setLabel(`Quiz: ${config.games?.quiz?.enabled ? '✅' : '❌'}`)
                    .setStyle(config.games?.quiz?.enabled ? ButtonStyle.Success : ButtonStyle.Secondary)
            );
        
        const row1b = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('games_quiz_settings')
                    .setLabel('📚 Paramètres Quiz')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!config.games?.quiz?.enabled)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('config_back')
                    .setLabel('Retour')
                    .setEmoji('◀️')
                    .setStyle(ButtonStyle.Secondary)
            );

        return { embeds: [embed], components: [row1, row1b, row2] };
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

    static async handleForbiddenRolesSelect(interaction, saveChanges) {
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
        
        // Sauvegarder immédiatement les changements
        await saveChanges(interaction.user.id, {
            'games.forbiddenRoleIds': filteredRoleIds
        });

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

    /**
     * Crée l'embed de configuration du quiz
     * @param {Object} quizConfig - Configuration du quiz
     * @returns {Object} Embed et composants
     */
    static createQuizConfigEmbed(quizConfig = {}) {
        const config = configManager.getConfig();
        const gameChannel = config.games?.gameChannel;
        
        const embed = new EmbedBuilder()
            .setTitle('📚 Configuration Quiz Quotidien')
            .setDescription('Paramètres du quiz quotidien automatique qui envoie des questions chaque jour')
            .setColor(0x5865F2)
            .addFields([
                {
                    name: '⚙️ État',
                    value: quizConfig.enabled ? '✅ Activé' : '❌ Désactivé',
                    inline: true
                },
                {
                    name: '📺 Salon du quiz',
                    value: gameChannel ? `<#${gameChannel}>` : '❌ Aucun salon configuré',
                    inline: true
                },
                {
                    name: '💎 Points par bonne réponse',
                    value: `${quizConfig.pointsPerCorrectAnswer || 100} point(s)`,
                    inline: true
                },
                {
                    name: '⏰ Max points par jour',
                    value: `${quizConfig.maxPointsPerDay || 500} point(s)`,
                    inline: true
                },
                {
                    name: '🕐 Heure de publication',
                    value: `${String(quizConfig.hour || 13).padStart(2, '0')}:${String(quizConfig.minute || 0).padStart(2, '0')}`,
                    inline: true
                }
            ])
            .setFooter({ text: 'Configuration > Jeux > Quiz Quotidien' });

        const configRow1 = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('games_quiz_select_channel')
                .setLabel('📺 Salon du quiz')
                .setStyle(gameChannel ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('games_quiz_edit_points')
                .setLabel('✏️ Points/réponse')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('games_quiz_edit_max_points')
                .setLabel('✏️ Max points/jour')
                .setStyle(ButtonStyle.Primary)
        ]);

        const configRow2 = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('games_quiz_edit_time')
                .setLabel('✏️ Heure')
                .setStyle(ButtonStyle.Primary)
        ]);

        const backRow = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId('games_back_to_main')
                .setLabel('◀️ Retour aux jeux')
                .setStyle(ButtonStyle.Secondary)
        ]);

        return { embed, components: [configRow1, configRow2, backRow] };
    }

    /**
     * Crée le modal d'édition des valeurs numériques pour le quiz
     * @param {string} field - Champ à éditer
     * @param {number} currentValue - Valeur actuelle
     * @param {string} label - Libellé du champ
     * @param {string} placeholder - Texte d'aide
     * @returns {import('discord.js').ModalBuilder} Le modal
     */
    static createQuizNumericModal(field, currentValue, label, placeholder) {
        const modal = new ModalBuilder()
            .setCustomId(`games_quiz_numeric_modal_${field}`)
            .setTitle(`Modifier ${label}`);

        const input = new TextInputBuilder()
            .setCustomId('numeric_value')
            .setLabel(label)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(placeholder)
            .setValue(currentValue?.toString() || '0')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(input)
        );

        return modal;
    }

    /**
     * Gère le toggle du quiz
     * @param {import('discord.js').ButtonInteraction} interaction - L'interaction
     * @param {Function} addPendingChanges - Fonction pour ajouter des changements
     */
    static async handleQuizToggle(interaction, saveChanges) {
        const config = configManager.getConfig();
        const currentEnabled = config.games?.quiz?.enabled || false;
        
        const changes = {
            games: {
                quiz: {
                    enabled: !currentEnabled
                }
            }
        };
        
        await saveChanges(interaction.user.id, changes);
        
        // Rafraîchir immédiatement la vue avec les nouvelles valeurs
        const menuContent = await this.show(interaction);
        await interaction.update(menuContent);
    }

    /**
     * Affiche le menu de configuration du quiz
     * @param {import('discord.js').ButtonInteraction} interaction - L'interaction
     */
    static async showQuizSettings(interaction) {
        const config = configManager.getConfig();
        const quizConfig = config.games?.quiz || {};
        const { embed, components } = this.createQuizConfigEmbed(quizConfig);
        
        await interaction.update({
            embeds: [embed],
            components: components
        });
    }
}

module.exports = GamesMenu;