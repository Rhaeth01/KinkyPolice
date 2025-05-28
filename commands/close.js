const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Ferme le ticket (retire l\'accès au créateur et renomme le salon).')
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de la fermeture du ticket')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) // Seuls ceux qui peuvent gérer les salons peuvent utiliser cette commande
        .setDMPermission(false),
    async execute(interaction) {
        // Obtenir la configuration actuelle
        const config = configManager.getConfig();
        const { logChannelId, ticketCategoryId, acceptedEntryCategoryId } = config;
        const staffRoleIds = configManager.getValidStaffRoleIds();
        
        console.log(`[CLOSE DEBUG] Configuration chargée:`, {
            logChannelId,
            ticketCategoryId,
            acceptedEntryCategoryId,
            staffRoleIds
        });
        
        const ticketChannel = interaction.channel;
        const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

        // Vérifier si le salon est bien un ticket (appartient à une des catégories de ticket)
        if (ticketChannel.parentId !== ticketCategoryId && ticketChannel.parentId !== acceptedEntryCategoryId) {
            return interaction.reply({ content: "Cette commande ne peut être utilisée que dans un salon de ticket.", ephemeral: true });
        }

        let creatorId = null;
        // Essayer de récupérer l'ID du créateur depuis le topic (pour les tickets standards)
        if (ticketChannel.topic && ticketChannel.topic.match(/^\d{17,19}$/)) { // Regex simple pour un ID Discord
            creatorId = ticketChannel.topic;
        } else if (ticketChannel.name.startsWith('entrée-')) {
            // Pour les tickets d'entrée, l'ID du créateur n'est pas stocké dans le topic par défaut.
            // La logique des boutons stocke l'ID dans le customId, ce qui n'est pas accessible ici.
            // Il faudrait une méthode pour retrouver le créateur d'un ticket d'entrée si cette commande doit les gérer.
            // Pour l'instant, on pourrait se baser sur les permissions ou demander à ce que l'ID soit dans le topic.
            // Alternative: on ne permet la fermeture que par le staff, qui n'a pas besoin de retirer ses propres perms.
            // Pour cette version, on va loguer un avertissement si on ne trouve pas le créateur d'un ticket d'entrée.
            console.warn(`Impossible de déterminer le créateur du ticket d'entrée ${ticketChannel.name} via le topic.`);
            // On pourrait tenter de chercher dans les logs du bot qui a créé le salon, mais c'est complexe.
            // Si la commande est exécutée par le créateur lui-même (peu probable avec ManageChannels), on pourrait utiliser interaction.user.id
            // Mais la permission ManageChannels suggère que c'est un staff.
        }

        if (!creatorId && ticketChannel.parentId === ticketCategoryId) {
             return interaction.reply({ content: "Impossible de déterminer le créateur de ce ticket standard (ID non trouvé dans le topic).", ephemeral: true });
        }

        const originalChannelName = ticketChannel.name;
        let newChannelName = `closed-${originalChannelName.replace('ticket-', '').replace('entrée-', '')}`.substring(0, 100); // Nom de base

        try {
            let creatorMember;
            if (creatorId) {
                creatorMember = await interaction.guild.members.fetch(creatorId).catch(() => null);
            }

            if (creatorMember) {
                await ticketChannel.permissionOverwrites.edit(creatorMember.id, {
                    ViewChannel: false
                });
                newChannelName = `closed-${creatorMember.user.username.substring(0, 25)}`;
                await ticketChannel.setName(newChannelName);
                await interaction.reply({ content: `Le ticket a été fermé pour ${creatorMember.user.tag}. Le salon a été renommé en "${newChannelName}".\nRaison: ${reason}`, ephemeral: false });
            } else {
                // Si pas de créateur (ex: ticket d'entrée sans ID dans topic, ou créateur parti)
                if (creatorId) {
                    newChannelName = `closed-${originalChannelName.replace('ticket-', '').replace('entrée-', '')}-${creatorId.slice(-4)}`;
                }
                await ticketChannel.setName(newChannelName);
                await interaction.reply({ content: `Le ticket a été fermé. Le salon a été renommé en "${newChannelName}". Le créateur initial (ID: ${creatorId || 'Inconnu'}) n'a pas pu être trouvé ou modifié.\nRaison: ${reason}`, ephemeral: false });
            }

            // Log l'action
            const logChannel = interaction.guild.channels.cache.get(logChannelId); // logChannelId doit être dans config.json
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0xFFA500) // Orange
                    .setTitle('🚪 Ticket Fermé (Commande)')
                    .setDescription(`Ticket **${originalChannelName}** (maintenant ${newChannelName}) fermé par ${interaction.user.tag}`)
                    .addFields(
                        { name: '📅 Date', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true },
                        { name: '🛠️ Action par', value: `${interaction.user}`, inline: true },
                        { name: '👤 Créateur affecté', value: creatorMember ? `${creatorMember.user.tag} (${creatorId})` : `ID: ${creatorId || 'Inconnu'}` },
                        { name: 'Raison', value: reason, inline: false }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('Erreur lors de la fermeture douce du ticket via commande:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Erreur lors de la fermeture du ticket.', ephemeral: true });
            } else {
                await interaction.followUp({ content: 'Erreur lors de la fermeture du ticket.', ephemeral: true });
            }
        }
    }
};