const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle
} = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription('🗳️ Lancer un vote pour attribuer un rôle temporaire à un utilisateur')
        .addUserOption(option => 
            option.setName('utilisateur')
                .setDescription("L'utilisateur qui recevra le rôle")
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('temps')
                .setDescription("Durée en minutes pendant laquelle l'utilisateur aura le rôle")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(1440)), // Maximum 24 heures (1440 minutes)
    
    async execute(interaction) {
        try {
            // Récupérer les options
            const targetUser = interaction.options.getUser('utilisateur');
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const durationMinutes = interaction.options.getInteger('temps');
            
            // Récupérer le rôle interdit configuré
            const forbiddenRoleIds = configManager.forbiddenRoleIds || [];
            
            if (!Array.isArray(forbiddenRoleIds) || forbiddenRoleIds.length === 0) {
                return await interaction.reply({
                    content: "\u274c Aucun rôle interdit n'est configuré. Veuillez configurer `forbiddenRoleIds` dans la configuration.",
                    ephemeral: true
                });
            }
            
            // Utiliser le premier rôle configuré dans forbiddenRoleIds
            const roleId = forbiddenRoleIds[0];
            const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
            
            if (!role) {
                return await interaction.reply({
                    content: `\u274c Le rôle configuré (ID: ${roleId}) n'existe pas ou n'est pas accessible.`,
                    ephemeral: true
                });
            }
            
            // Vérifications de base
            if (!targetMember) {
                return await interaction.reply({
                    content: "❌ Cet utilisateur n'est pas membre de ce serveur.",
                    ephemeral: true
                });
            }
            
            if (targetUser.id === interaction.user.id) {
                return await interaction.reply({
                    content: '❌ Vous ne pouvez pas lancer un vote contre vous-même.',
                    ephemeral: true
                });
            }
            
            if (targetUser.bot) {
                return await interaction.reply({
                    content: '❌ Impossible de lancer un vote contre un bot.',
                    ephemeral: true
                });
            }
            
            // Vérifier la hiérarchie des rôles
            if (role.position >= interaction.guild.members.me.roles.highest.position) {
                return await interaction.reply({
                    content: '❌ Je ne peux pas attribuer ce rôle car il est supérieur ou égal au mien.',
                    ephemeral: true
                });
            }
            
            // Créer l'embed de vote
            const voteEmbed = new EmbedBuilder()
                .setColor('#9B59B6') // Violet
                .setTitle(`Vote pour attribuer le rôle ${role.name} à ${targetUser.displayName}`)
                .setDescription(`Un vote a été lancé par ${interaction.user} pour attribuer le rôle ${role} à ${targetUser} pendant ${durationMinutes} minute(s).`)
                .addFields(
                    { name: '⏱️ Durée', value: `${durationMinutes} minute(s)`, inline: true },
                    { name: '🎯 Votes requis', value: '4 votes', inline: true },
                    { name: '📊 Votes actuels', value: '0 / 4', inline: true }
                )
                .setFooter({ text: 'Le vote sera automatiquement clôturé après 10 minutes' })
                .setTimestamp();
            
            // Créer les boutons de vote
            const voteButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('vote_yes')
                        .setLabel('Pour')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId('vote_no')
                        .setLabel('Contre')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );
            
            // Envoyer le message de vote
            const voteMessage = await interaction.reply({ 
                embeds: [voteEmbed], 
                components: [voteButtons],
                fetchReply: true
            });
            
            // Initialiser les votes
            const votes = {
                yes: new Set([interaction.client.user.id]), // Le bot vote automatiquement oui
                no: new Set()
            };
            
            // Mettre à jour l'embed avec le vote initial du bot
            voteEmbed.setFields(
                { name: '⏱️ Durée', value: `${durationMinutes} minute(s)`, inline: true },
                { name: '🎯 Votes requis', value: '4 votes', inline: true },
                { name: '📊 Votes actuels', value: '1 / 4', inline: true }
            );
            
            await voteMessage.edit({ embeds: [voteEmbed] });
            
            // Créer le collecteur d'interactions
            const collector = voteMessage.createMessageComponentCollector({
                time: 10 * 60 * 1000 // 10 minutes
            });
            
            collector.on('collect', async (i) => {
                // Vérifier que l'utilisateur n'a pas déjà voté
                if (votes.yes.has(i.user.id) || votes.no.has(i.user.id)) {
                    await i.reply({
                        content: '❌ Vous avez déjà voté.',
                        ephemeral: true
                    });
                    return;
                }
                
                // Enregistrer le vote
                if (i.customId === 'vote_yes') {
                    votes.yes.add(i.user.id);
                    await i.reply({
                        content: '✅ Vous avez voté pour attribuer le rôle.',
                        ephemeral: true
                    });
                } else if (i.customId === 'vote_no') {
                    votes.no.add(i.user.id);
                    await i.reply({
                        content: "❌ Vous avez voté contre l'attribution du rôle.",
                        ephemeral: true
                    });
                }
                
                // Mettre à jour l'embed
                voteEmbed.setFields(
                    { name: '⏱️ Durée', value: `${durationMinutes} minute(s)`, inline: true },
                    { name: '🎯 Votes requis', value: '4 votes', inline: true },
                    { name: '📊 Votes actuels', value: `${votes.yes.size} / 4`, inline: true }
                );
                
                await voteMessage.edit({ embeds: [voteEmbed] });
                
                // Vérifier si le vote est terminé
                if (votes.yes.size >= 4) {
                    collector.stop('approved');
                } else if (votes.no.size >= 4) {
                    collector.stop('rejected');
                }
            });
            
            collector.on('end', async (collected, reason) => {
                // Désactiver les boutons
                const disabledButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('vote_yes')
                            .setLabel('Pour')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('✅')
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('vote_no')
                            .setLabel('Contre')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('❌')
                            .setDisabled(true)
                    );
                
                // Traiter le résultat du vote
                if (reason === 'approved') {
                    // Attribuer le rôle
                    await targetMember.roles.add(role);
                    
                    // Mettre à jour l'embed
                    voteEmbed.setColor('#2ECC71')
                        .setTitle(`✅ Vote approuvé : ${role.name} attribué à ${targetUser.displayName}`)
                        .setDescription(`Le rôle ${role} a été attribué à ${targetUser} pour ${durationMinutes} minute(s).`)
                        .setFields(
                            { name: '⏱️ Durée', value: `${durationMinutes} minute(s)`, inline: true },
                            { name: '📊 Résultat', value: `✅ ${votes.yes.size} pour | ❌ ${votes.no.size} contre`, inline: true }
                        );
                    
                    await voteMessage.edit({ embeds: [voteEmbed], components: [disabledButtons] });
                    
                    // Planifier le retrait du rôle
                    setTimeout(async () => {
                        try {
                            // Vérifier si l'utilisateur a toujours le rôle
                            const updatedMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                            
                            if (updatedMember && updatedMember.roles.cache.has(role.id)) {
                                // Retirer le rôle
                                await updatedMember.roles.remove(role);
                                
                                // Créer l'embed de notification
                                const releaseEmbed = new EmbedBuilder()
                                    .setColor('#3498DB')
                                    .setTitle(`🔓 Rôle retiré : ${targetUser.displayName} libéré`)
                                    .setDescription(`Le rôle ${role} a été retiré de ${targetUser} après ${durationMinutes} minute(s).`)
                                    .setTimestamp();
                                
                                // Envoyer la notification dans le même canal
                                await interaction.channel.send({ embeds: [releaseEmbed] });
                            }
                        } catch (error) {
                            console.error('[VOTE] Erreur lors du retrait du rôle:', error);
                        }
                    }, durationMinutes * 60 * 1000);
                    
                } else if (reason === 'rejected') {
                    // Vote rejeté
                    voteEmbed.setColor('#E74C3C')
                        .setTitle(`❌ Vote rejeté : ${role.name} non attribué`)
                        .setDescription(`Le vote pour attribuer le rôle ${role} à ${targetUser} a été rejeté.`)
                        .setFields(
                            { name: '📊 Résultat', value: `✅ ${votes.yes.size} pour | ❌ ${votes.no.size} contre`, inline: true }
                        );
                    
                    await voteMessage.edit({ embeds: [voteEmbed], components: [disabledButtons] });
                    
                } else {
                    // Vote expiré
                    voteEmbed.setColor('#95A5A6')
                        .setTitle(`⏱️ Vote expiré : ${role.name} non attribué`)
                        .setDescription(`Le vote pour attribuer le rôle ${role} à ${targetUser} a expiré faute de votes suffisants.`)
                        .setFields(
                            { name: '📊 Résultat final', value: `✅ ${votes.yes.size} pour | ❌ ${votes.no.size} contre`, inline: true }
                        );
                    
                    await voteMessage.edit({ embeds: [voteEmbed], components: [disabledButtons] });
                }
            });
            
        } catch (error) {
            console.error("[VOTE] Erreur lors de l'exécution de la commande:", error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "❌ Une erreur est survenue lors de l'exécution de la commande.",
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: "❌ Une erreur est survenue lors de l'exécution de la commande.",
                    ephemeral: true
                });
            }
        }
    }
};