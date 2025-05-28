const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');
const { addWarning, getUserWarnings } = require('../utils/warningsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Avertit un membre du serveur.')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Le membre à avertir.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('La raison de l\'avertissement.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) // Ou une permission plus appropriée comme KickMembers si vous voulez que les mêmes personnes puissent warn et kick
        .setDMPermission(false),
    async execute(interaction) {
        try {
            // === PHASE 1: VALIDATION DES PARAMÈTRES ===
            const targetUser = interaction.options.getUser('utilisateur');
            const reason = interaction.options.getString('raison');
            const member = interaction.guild.members.resolve(targetUser);

            // Validation de base
            const validationError = this.validateWarningRequest(interaction, member, targetUser);
            if (validationError) {
                return interaction.reply({ content: validationError, ephemeral: true });
            }

            // === PHASE 2: RÉCUPÉRATION DES DONNÉES EXISTANTES ===
            let currentWarnings = [];
            let currentTotal = 0;
            
            try {
                currentWarnings = getUserWarnings(interaction.guild.id, targetUser.id);
                currentTotal = currentWarnings.length;
            } catch (warningError) {
                console.error(`Erreur lors de la récupération des avertissements pour ${targetUser.tag}:`, warningError);
                // On continue avec des valeurs par défaut
                currentWarnings = [];
                currentTotal = 0;
            }

            // === PHASE 3: AJOUT DU NOUVEL AVERTISSEMENT ===
            const warningAdded = addWarning(interaction.guild.id, targetUser.id, interaction.user.id, reason);
            
            if (!warningAdded) {
                console.error(`Échec critique de l'enregistrement de l'avertissement pour ${targetUser.tag} par ${interaction.user.tag}`);
                return interaction.reply({
                    content: '❌ **Erreur système** - Impossible d\'enregistrer l\'avertissement. Contactez un administrateur.',
                    ephemeral: true
                });
            }

            // === PHASE 4: CALCUL DU NOUVEAU TOTAL ===
            const newTotal = currentTotal + 1;

            // === PHASE 5: NOTIFICATION PRIVÉE À L'UTILISATEUR ===
            const dmResult = await this.sendWarningDM(targetUser, interaction, reason, newTotal);

            // === PHASE 6: RÉPONSE À L'INTERACTION ===
            await this.sendSuccessResponse(interaction, targetUser, reason, newTotal, dmResult.success);

            // === PHASE 7: LOG DE MODÉRATION ===
            await this.logModerationAction(interaction, targetUser, reason, newTotal);

        } catch (error) {
            console.error('Erreur critique dans la commande warn:', error);
            
            // Gestion d'erreur robuste
            const errorMessage = '❌ **Erreur inattendue** - La commande a échoué. L\'incident a été enregistré.';
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                } else if (interaction.deferred) {
                    await interaction.editReply({ content: errorMessage });
                }
            } catch (replyError) {
                console.error('Impossible de répondre à l\'interaction après erreur:', replyError);
            }
        }
    },

    // === MÉTHODES UTILITAIRES ===
    
    /**
     * Valide la demande d'avertissement
     */
    validateWarningRequest(interaction, member, targetUser) {
        if (!member) {
            return 'Impossible de trouver ce membre sur le serveur.';
        }

        if (member.id === interaction.user.id) {
            return 'Vous ne pouvez pas vous avertir vous-même.';
        }

        if (member.id === interaction.client.user.id) {
            return 'Je ne peux pas m\'avertir moi-même.';
        }

        if (interaction.member.roles.highest.position <= member.roles.highest.position) {
            return 'Vous ne pouvez pas avertir un membre ayant un rôle égal ou supérieur au vôtre.';
        }

        return null; // Pas d'erreur
    },

    /**
     * Envoie le message privé d'avertissement
     */
    async sendWarningDM(targetUser, interaction, reason, totalWarnings) {
        const dmEmbed = new EmbedBuilder()
            .setColor('#FFB347')
            .setTitle('⚠️ Avertissement Reçu')
            .setDescription(`**Vous avez reçu un avertissement officiel**`)
            .addFields(
                { name: '🏛️ Serveur', value: `**${interaction.guild.name}**`, inline: true },
                { name: '👮 Modérateur', value: `**${interaction.user.tag}**`, inline: true },
                { name: '📊 Total d\'avertissements', value: `**${totalWarnings}**`, inline: true },
                { name: '📝 Motif de l\'avertissement', value: `\`\`\`${reason}\`\`\``, inline: false },
                { name: '📋 Que faire maintenant ?', value: '• Prenez connaissance de ce motif\n• Respectez le règlement du serveur\n• Contactez un modérateur si vous avez des questions', inline: false },
                { name: '⚠️ Rappel Important', value: 'Les avertissements répétés peuvent entraîner des sanctions plus sévères (mute, kick, ban).', inline: false }
            )
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setFooter({
                text: `Modération ${interaction.guild.name} • ${new Date().toLocaleDateString('fr-FR')}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        try {
            await targetUser.send({ embeds: [dmEmbed] });
            return { success: true };
        } catch (dmError) {
            console.warn(`Impossible d'envoyer un DM à ${targetUser.tag} pour son avertissement:`, dmError.message);
            return { success: false, error: dmError.message };
        }
    },

    /**
     * Envoie la réponse de succès
     */
    async sendSuccessResponse(interaction, targetUser, reason, totalWarnings, dmSent) {
        const successEmbed = new EmbedBuilder()
            .setColor(0xFFB347)
            .setTitle('⚠️ Avertissement appliqué')
            .setDescription(`**${targetUser.displayName}** a reçu un avertissement`)
            .addFields(
                { name: '📝 Raison', value: `\`\`\`${reason}\`\`\``, inline: false },
                { name: '📊 Total des avertissements', value: `**${totalWarnings}**`, inline: true },
                { name: '👤 Utilisateur', value: `<@${targetUser.id}>`, inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({
                text: dmSent ? 'Utilisateur notifié par MP' : 'Notification MP échouée (DM fermés)',
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            });
            
        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    },

    /**
     * Log l'action de modération
     */
    async logModerationAction(interaction, targetUser, reason, totalWarnings) {
        try {
            const logActionModId = configManager.logActionMod;
            if (!logActionModId) return;

            const logChannel = interaction.guild.channels.cache.get(logActionModId);
            if (!logChannel) return;

            const logEmbed = new EmbedBuilder()
                .setColor('#FFB347')
                .setTitle('⚠️ Avertissement !')
                .setDescription(`Un avertissement a été donné à un membre`)
                .addFields(
                    { name: '👤 Membre Averti', value: `<@${targetUser.id}>`, inline: true },
                    { name: '👮 Modérateur', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📊 Total Avertissements', value: `**${totalWarnings}** avertissement${totalWarnings > 1 ? 's' : ''}`, inline: true },
                    { name: '📝 Raison', value: `\`\`\`${reason}\`\`\``, inline: false },
                    { name: '📍 Salon', value: `<#${interaction.channelId}>`, inline: true },
                    { name: '🕐 Heure', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setFooter({
                    text: `Modération • ${targetUser.tag}`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
        } catch (logError) {
            console.error('Erreur lors du log de modération:', logError);
            // On ne fait pas échouer la commande pour un problème de log
        }
    }
};