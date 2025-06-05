const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');
const { getUserWarnings, removeWarningAsync, clearUserWarningsAsync } = require('../utils/warningsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-warns')
        .setDescription('Supprime des avertissements d\'un utilisateur.')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur dont supprimer les avertissements.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action à effectuer.')
                .setRequired(true)
                .addChoices(
                    { name: 'Supprimer tous les avertissements', value: 'all' },
                    { name: 'Supprimer un avertissement spécifique', value: 'specific' }
                ))
        .addStringOption(option =>
            option.setName('warning_id')
                .setDescription('ID de l\'avertissement à supprimer (requis si action = specific).')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de la suppression des avertissements.')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),
    async execute(interaction) {
        const startTime = Date.now();
        console.log(`[REMOVE-WARNS DEBUG] Début d'exécution - ID: ${interaction.id}, Temps: ${startTime}`);
        
        // Déférer immédiatement l'interaction pour éviter l'expiration
        await interaction.deferReply({ ephemeral: true });
        console.log(`[REMOVE-WARNS DEBUG] DeferReply effectué - Temps écoulé: ${Date.now() - startTime}ms`);
        
        const targetUser = interaction.options.getUser('utilisateur');
        const action = interaction.options.getString('action');
        const warningId = interaction.options.getString('warning_id');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée.';

        // Vérifications de base
        if (targetUser.id === interaction.user.id) {
            return interaction.editReply({ content: 'Vous ne pouvez pas supprimer vos propres avertissements.' });
        }

        if (targetUser.id === interaction.client.user.id) {
            return interaction.editReply({ content: 'Je ne peux pas supprimer mes propres avertissements.' });
        }

        // Récupérer les avertissements actuels
        const beforeGetWarnings = Date.now();
        const userWarnings = getUserWarnings(interaction.guild.id, targetUser.id);
        console.log(`[REMOVE-WARNS DEBUG] getUserWarnings terminé - Temps écoulé: ${Date.now() - beforeGetWarnings}ms`);
        
        if (userWarnings.length === 0) {
            console.log(`[REMOVE-WARNS DEBUG] Aucun avertissement trouvé - Temps total: ${Date.now() - startTime}ms`);
            return interaction.editReply({
                content: `${targetUser.tag} n'a aucun avertissement à supprimer.`
            });
        }

        let success = false;
        let removedCount = 0;
        let actionDescription = '';

        if (action === 'all') {
            // Supprimer tous les avertissements
            const beforeClear = Date.now();
            success = await clearUserWarningsAsync(interaction.guild.id, targetUser.id);
            console.log(`[REMOVE-WARNS DEBUG] clearUserWarningsAsync terminé - Temps écoulé: ${Date.now() - beforeClear}ms`);
            removedCount = userWarnings.length;
            actionDescription = 'Tous les avertissements supprimés';
        } else if (action === 'specific') {
            // Supprimer un avertissement spécifique
            if (!warningId) {
                return interaction.editReply({
                    content: 'Vous devez spécifier l\'ID de l\'avertissement à supprimer.'
                });
            }

            // Vérifier que l'avertissement existe
            const warningExists = userWarnings.find(warn => warn.id === warningId);
            if (!warningExists) {
                return interaction.editReply({
                    content: `Aucun avertissement trouvé avec l'ID \`${warningId}\` pour ${targetUser.tag}.`
                });
            }

            const beforeRemove = Date.now();
            success = await removeWarningAsync(interaction.guild.id, targetUser.id, warningId);
            console.log(`[REMOVE-WARNS DEBUG] removeWarningAsync terminé - Temps écoulé: ${Date.now() - beforeRemove}ms`);
            removedCount = 1;
            actionDescription = `Avertissement \`${warningId}\` supprimé`;
        }

        if (!success) {
            return interaction.editReply({
                content: 'Une erreur est survenue lors de la suppression des avertissements.'
            });
        }

        // Récupérer le nombre d'avertissements restants
        const beforeGetRemaining = Date.now();
        const remainingWarnings = getUserWarnings(interaction.guild.id, targetUser.id);
        console.log(`[REMOVE-WARNS DEBUG] getUserWarnings (restants) terminé - Temps écoulé: ${Date.now() - beforeGetRemaining}ms`);

        // DM à l'utilisateur pour l'informer
        const dmEmbed = new EmbedBuilder()
            .setColor('#00FF00') // Vert pour bonne nouvelle
            .setTitle('✅ Avertissements Supprimés')
            .setDescription(`**Des avertissements ont été supprimés de votre dossier**`)
            .addFields(
                { name: '🏛️ Serveur', value: `**${interaction.guild.name}**`, inline: true },
                { name: '👮 Modérateur', value: `**${interaction.user.tag}**`, inline: true },
                { name: '📊 Avertissements supprimés', value: `**${removedCount}**`, inline: true },
                { name: '📊 Avertissements restants', value: `**${remainingWarnings.length}**`, inline: true },
                { name: '📝 Raison de la suppression', value: `\`\`\`${reason}\`\`\``, inline: false },
                { name: '🎉 Bonne nouvelle !', value: 'Votre dossier disciplinaire a été allégé. Continuez à respecter le règlement du serveur.', inline: false }
            )
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setFooter({ 
                text: `Modération ${interaction.guild.name} • Suppression d'avertissements`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        // Envoyer le DM en parallèle avec la réponse pour optimiser les performances
        const beforeDM = Date.now();
        const dmPromise = targetUser.send({ embeds: [dmEmbed] }).catch(dmError => {
            console.warn(`Impossible d'envoyer un DM à ${targetUser.tag} pour la suppression d'avertissements.`);
            return null;
        });

        // Réponse à l'interaction
        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00') // Vert pour succès
            .setTitle('✅ Avertissements Supprimés')
            .setDescription(`**${actionDescription}** pour **${targetUser.displayName}**`)
            .addFields(
                { name: '📝 Raison', value: `\`\`\`${reason}\`\`\``, inline: false },
                { name: '📊 Supprimés', value: `**${removedCount}** avertissement${removedCount > 1 ? 's' : ''}`, inline: true },
                { name: '📊 Restants', value: `**${remainingWarnings.length}** avertissement${remainingWarnings.length > 1 ? 's' : ''}`, inline: true },
                { name: '👤 Utilisateur', value: `<@${targetUser.id}>`, inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        // Attendre le résultat du DM pour mettre à jour le footer
        const dmResult = await dmPromise;
        console.log(`[REMOVE-WARNS DEBUG] DM envoyé - Temps écoulé: ${Date.now() - beforeDM}ms`);
        const dmSent = dmResult !== null;
        
        successEmbed.setFooter({
            text: dmSent ? 'Utilisateur notifié par MP' : 'Notification MP échouée (DM fermés)',
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        });
        
        const beforeReply = Date.now();
        await interaction.editReply({ embeds: [successEmbed] });
        console.log(`[REMOVE-WARNS DEBUG] EditReply terminé - Temps écoulé: ${Date.now() - beforeReply}ms`);

        // Log de l'action dans le salon de modération
        const logActionModId = configManager.modLogChannelId;
        const logChannel = interaction.guild.channels.cache.get(logActionModId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor('#00FF00') // Vert pour suppression
                .setTitle('✅ Suppression d\'Avertissements')
                .setDescription(`Des avertissements ont été supprimés`)
                .addFields(
                    { name: '👤 Utilisateur Concerné', value: `<@${targetUser.id}>`, inline: true },
                    { name: '👮 Modérateur', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📊 Supprimés', value: `**${removedCount}** avertissement${removedCount > 1 ? 's' : ''}`, inline: true },
                    { name: '📊 Restants', value: `**${remainingWarnings.length}** avertissement${remainingWarnings.length > 1 ? 's' : ''}`, inline: true },
                    { name: '🔧 Action', value: actionDescription, inline: true },
                    { name: '📍 Salon', value: `<#${interaction.channelId}>`, inline: true },
                    { name: '📝 Raison', value: `\`\`\`${reason}\`\`\``, inline: false },
                    { name: '🕐 Heure', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setFooter({
                    text: `Modération • ${targetUser.tag}`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();
            const beforeLog = Date.now();
            await logChannel.send({ embeds: [logEmbed] });
            console.log(`[REMOVE-WARNS DEBUG] Log envoyé - Temps écoulé: ${Date.now() - beforeLog}ms`);
        }
        
        console.log(`[REMOVE-WARNS DEBUG] Commande terminée avec succès - Temps total: ${Date.now() - startTime}ms`);
    },
};