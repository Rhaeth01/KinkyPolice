const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder
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
                .setMaxValue(1440))
        .addStringOption(option =>
            option.setName('anonyme')
                .setDescription("Masquer l'identité de l'initiateur du vote")
                .setRequired(false)
                .addChoices(
                    { name: '👤 Vote public (par défaut)', value: 'false' },
                    { name: '🥸 Vote anonyme', value: 'true' }
                )),
    
    async execute(interaction) {
        try {
            // Récupérer la configuration
            const config = configManager.getConfig();

            // Utiliser les rôles de vote spécifiques (séparés des rôles Tourette)
            // Si voteRoleIds n'existe pas, utiliser forbiddenRoleIds pour compatibilité rétroactive
            const voteRoleIds = config.games?.voteRoleIds || config.games?.forbiddenRoleIds || [];

            if (voteRoleIds.length === 0) {
                return await interaction.reply({
                    content: "❌ Aucun rôle d'animation n'est configuré. Utilisez `/config` → 🎮 Jeux pour configurer les rôles de vote.",
                    ephemeral: true
                });
            }
            
            // Récupérer les options de base
            const targetUser = interaction.options.getUser('utilisateur');
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const durationMinutes = interaction.options.getInteger('temps');
            const isAnonymous = interaction.options.getString('anonyme') === 'true';
            
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
            
            // Récupérer les rôles disponibles
            const availableRoles = [];
            for (const roleId of voteRoleIds) {
                const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
                if (role) {
                    availableRoles.push(role);
                }
            }
            
            if (availableRoles.length === 0) {
                return await interaction.reply({
                    content: "❌ Les rôles configurés n'existent plus. Veuillez reconfigurer via `/config`.",
                    ephemeral: true
                });
            }
            
            // Si un seul rôle, l'utiliser directement
            if (availableRoles.length === 1) {
                const role = availableRoles[0];
                await this.createVote(interaction, targetUser, targetMember, role, durationMinutes, isAnonymous);
                return;
            }
            
            // Sinon, créer un menu de sélection
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('vote_role_select')
                .setPlaceholder('🎭 Sélectionnez un rôle drôle')
                .addOptions(availableRoles.map(role => ({
                    label: role.name,
                    value: role.id,
                    emoji: '🎭'
                })));
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            
            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🗳️ Sélection du rôle')
                .setDescription(`Choisissez le rôle à attribuer à **${targetUser.displayName}**`)
                .setFooter({ text: 'Sélectionnez un rôle ci-dessous' });
            
            const response = await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });
            
            // Collecter la sélection
            try {
                const selection = await response.awaitMessageComponent({
                    filter: i => i.user.id === interaction.user.id,
                    time: 60000
                });
                
                const role = availableRoles.find(r => r.id === selection.values[0]);
                await selection.deferUpdate();
                await interaction.deleteReply();
                
                // Créer le vote dans le channel
                await this.createVote(interaction.channel, targetUser, targetMember, role, durationMinutes, isAnonymous, interaction.user);
                
            } catch (error) {
                await interaction.editReply({
                    content: '⏱️ Temps écoulé.',
                    embeds: [],
                    components: []
                });
            }
            
        } catch (error) {
            console.error('[VOTE] Erreur:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue.',
                ephemeral: true
            }).catch(() => {});
        }
    },
    
    async createVote(targetChannel, targetUser, targetMember, role, durationMinutes, isAnonymous, initiator = null) {
        // Déterminer si c'est une interaction ou un channel
        const isInteraction = targetChannel.reply !== undefined;
        const actualChannel = isInteraction ? targetChannel.channel : targetChannel;
        const guild = isInteraction ? targetChannel.guild : actualChannel.guild;
        
        // Vérifier la hiérarchie des rôles
        if (role.position >= guild.members.me.roles.highest.position) {
            const errorMsg = '❌ Je ne peux pas attribuer ce rôle car il est supérieur ou égal au mien.';
            if (isInteraction) {
                return await targetChannel.reply({ content: errorMsg, ephemeral: true });
            }
            return await actualChannel.send(errorMsg);
        }
        
        // Créer l'embed de vote
        const voteEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle(`Vote pour attribuer le rôle ${role.name} à ${targetUser.displayName}`)
            .setDescription(isAnonymous 
                ? `Un vote anonyme a été lancé pour attribuer le rôle ${role} à ${targetUser} pendant ${durationMinutes} minute(s).`
                : `Un vote a été lancé par ${initiator || 'quelqu\'un'} pour attribuer le rôle ${role} à ${targetUser} pendant ${durationMinutes} minute(s).`)
            .addFields(
                { name: '⏱️ Durée', value: `${durationMinutes} minute(s)`, inline: true },
                { name: '🎯 Votes requis', value: '4 votes', inline: true },
                { name: '📊 Votes actuels', value: isAnonymous ? '1 / 4' : (initiator ? '2 / 4' : '1 / 4'), inline: true },
                { name: '✅ Pour (' + (isAnonymous ? '1' : (initiator ? '2' : '1')) + ')', value: 'KinkyPolice (Bot)' + (isAnonymous ? '' : (initiator ? ', ' + initiator.displayName : '')), inline: true },
                { name: '❌ Contre (1)', value: 'KinkyPolice (Bot)', inline: true }
            )
            .setFooter({ text: 'Le vote sera clôturé après 10 minutes' })
            .setTimestamp();
        
        // Créer les boutons
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
        
        // Envoyer le message
        let voteMessage;
        if (isInteraction) {
            // Si c'est une interaction et que c'est anonyme, créer un message séparé
            if (isAnonymous) {
                await targetChannel.reply({ 
                    content: "🗳️ Vote anonyme créé !",
                    ephemeral: true
                });
                voteMessage = await actualChannel.send({ 
                    embeds: [voteEmbed], 
                    components: [voteButtons]
                });
            } else {
                voteMessage = await targetChannel.reply({ 
                    embeds: [voteEmbed], 
                    components: [voteButtons],
                    fetchReply: true
                });
            }
        } else {
            voteMessage = await actualChannel.send({ 
                embeds: [voteEmbed], 
                components: [voteButtons]
            });
        }
        
        // Gestion des votes - Le bot vote automatiquement pour ET contre
        const client = isInteraction ? targetChannel.client : actualChannel.client;
        const votes = {
            yes: new Map([[client.user.id, 'KinkyPolice (Bot)']]),
            no: new Map([[client.user.id, 'KinkyPolice (Bot)']])
        };
        
        // Si le vote n'est pas anonyme, l'initiateur vote automatiquement pour
        if (initiator && !isAnonymous) {
            votes.yes.set(initiator.id, initiator.displayName);
        }
        
        const collector = voteMessage.createMessageComponentCollector({
            time: 10 * 60 * 1000
        });
        
        collector.on('collect', async (i) => {
            // Traitement du vote avec deferUpdate pour éviter l'erreur 10062
            try {
                // Defer immédiatement pour indiquer que l'interaction est traitée
                await i.deferUpdate();
                
                // Vérifier si l'utilisateur a déjà voté
                if (votes.yes.has(i.user.id) || votes.no.has(i.user.id)) {
                    // Envoyer un message éphémère à l'utilisateur
                    await i.followUp({ 
                        content: '❌ Vous avez déjà voté !', 
                        ephemeral: true 
                    });
                    return;
                }
                
                // Enregistrer le vote
                if (i.customId === 'vote_yes') {
                    votes.yes.set(i.user.id, i.member?.displayName || i.user.username);
                } else if (i.customId === 'vote_no') {
                    votes.no.set(i.user.id, i.member?.displayName || i.user.username);
                }
                
                // Confirmation du vote pour l'utilisateur
                await i.followUp({ 
                    content: `✅ Votre vote ${i.customId === 'vote_yes' ? 'pour' : 'contre'} a été enregistré !`, 
                    ephemeral: true 
                });
                
                // Confirmation publique seulement pour les votes anonymes
                if (isAnonymous) {
                    const voteConfirm = await actualChannel.send(`${i.user} a voté ${i.customId === 'vote_yes' ? '✅ pour' : '❌ contre'}`);
                    setTimeout(() => voteConfirm.delete().catch(() => {}), 3000);
                }
                
            } catch (error) {
                console.error('[VOTE] Erreur lors du traitement du vote:', error);
                // Essayer de répondre si possible
                if (!i.deferred && !i.replied) {
                    try {
                        await i.reply({ 
                            content: '❌ Une erreur est survenue lors du traitement de votre vote.', 
                            ephemeral: true 
                        });
                    } catch (replyError) {
                        console.error('[VOTE] Erreur lors de la réponse:', replyError);
                    }
                }
            }
            
            // Mettre à jour l'embed
            const yesVoters = Array.from(votes.yes.values());
            const noVoters = Array.from(votes.no.values());
            
            voteEmbed.setFields(
                { name: '⏱️ Durée', value: `${durationMinutes} minute(s)`, inline: true },
                { name: '🎯 Votes requis', value: '4 votes', inline: true },
                { name: '📊 Votes actuels', value: `${votes.yes.size} / 4`, inline: true },
                { name: `✅ Pour (${votes.yes.size})`, value: isAnonymous ? `${votes.yes.size} vote(s)` : (yesVoters.join(', ') || '*Aucun*'), inline: true },
                { name: `❌ Contre (${votes.no.size})`, value: isAnonymous ? `${votes.no.size} vote(s)` : (noVoters.join(', ') || '*Aucun*'), inline: true }
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
            voteButtons.components.forEach(btn => btn.setDisabled(true));
            
            if (reason === 'approved') {
                // Attribuer le rôle
                await targetMember.roles.add(role);
                
                voteEmbed.setColor('#2ECC71')
                    .setTitle(`✅ Vote approuvé : ${role.name} attribué`)
                    .setDescription(`Le rôle ${role} a été attribué à ${targetUser} pour ${durationMinutes} minute(s).`);
                
                await voteMessage.edit({ embeds: [voteEmbed], components: [voteButtons] });
                
                // Retirer le rôle après le délai
                setTimeout(async () => {
                    try {
                        const member = await guild.members.fetch(targetUser.id).catch(() => null);
                        if (member && member.roles.cache.has(role.id)) {
                            await member.roles.remove(role);
                            
                            const releaseEmbed = new EmbedBuilder()
                                .setColor('#3498DB')
                                .setTitle(`🔓 Rôle retiré`)
                                .setDescription(`Le rôle ${role} a été retiré de ${targetUser}.`)
                                .setTimestamp();
                            
                            await actualChannel.send({ embeds: [releaseEmbed] });
                        }
                    } catch (error) {
                        console.error('[VOTE] Erreur retrait rôle:', error);
                    }
                }, durationMinutes * 60 * 1000);
                
            } else if (reason === 'rejected') {
                voteEmbed.setColor('#E74C3C')
                    .setTitle(`❌ Vote rejeté`)
                    .setDescription(`Le vote a été rejeté.`);
                
                await voteMessage.edit({ embeds: [voteEmbed], components: [voteButtons] });
                
            } else {
                voteEmbed.setColor('#95A5A6')
                    .setTitle(`⏱️ Vote expiré`)
                    .setDescription(`Le vote a expiré sans atteindre le seuil requis.`);
                
                await voteMessage.edit({ embeds: [voteEmbed], components: [voteButtons] });
            }
        });
    }
};