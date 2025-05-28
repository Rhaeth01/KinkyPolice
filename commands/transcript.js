const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transcript')
        .setDescription('Envoie une transcription du ticket actuel dans le salon de logs des tickets.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) // Ou un rôle staff spécifique si vous préférez
        .setDMPermission(false),
    async execute(interaction) {
        const ticketChannel = interaction.channel;
        
        // Obtenir la configuration actuelle via le ConfigManager
        const config = configManager.getConfig();
        const { logsTicketsChannelId, ticketCategoryId, acceptedEntryCategoryId } = config;
        const validStaffRoleIds = configManager.getValidStaffRoleIds();
        
        console.log(`[TRANSCRIPT DEBUG] Configuration chargée:`, {
            logsTicketsChannelId,
            ticketCategoryId,
            acceptedEntryCategoryId,
            validStaffRoleIds
        });

        // Vérifier si le salon est bien un ticket et si l'utilisateur a la permission
        if (ticketChannel.parentId !== ticketCategoryId && ticketChannel.parentId !== acceptedEntryCategoryId) {
            return interaction.reply({ content: "Cette commande ne peut être utilisée que dans un salon de ticket.", ephemeral: true });
        }

        // Vérifier les permissions - soit ManageChannels soit un rôle staff valide
        const hasManageChannels = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
        const hasStaffRole = validStaffRoleIds.some(roleId => interaction.member.roles.cache.has(roleId));
        
        console.log(`[TRANSCRIPT DEBUG] Vérification permissions pour ${interaction.user.tag}:`, {
            hasManageChannels,
            hasStaffRole,
            userRoles: interaction.member.roles.cache.map(r => r.id),
            validStaffRoleIds
        });
        
        if (!hasManageChannels && !hasStaffRole) {
             return interaction.reply({ content: "Vous n'avez pas la permission d'exécuter cette commande.", ephemeral: true });
        }

        if (!logsTicketsChannelId) {
            console.error('[TRANSCRIPT DEBUG] logsTicketsChannelId non configuré dans config.json.');
            return interaction.reply({ content: 'Le salon de logs pour les transcriptions n\'est pas configuré. Veuillez contacter un administrateur.', ephemeral: true });
        }

        const targetLogsChannel = interaction.guild.channels.cache.get(logsTicketsChannelId);
        if (!targetLogsChannel) {
            return interaction.reply({ content: 'Le salon de logs pour les transcriptions est introuvable. Veuillez vérifier la configuration.', ephemeral: true });
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            let fetchedMessages = await ticketChannel.messages.fetch({ limit: 100 });
            // Convertir la collection en tableau et trier par timestamp
            fetchedMessages = [...fetchedMessages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            let transcriptContent = fetchedMessages.map(m => 
                `[${new Date(m.createdTimestamp).toLocaleString('fr-FR')}] ${m.author.tag}: ${m.content}${m.attachments.size > 0 ? ' ' + m.attachments.map(a => a.url).join(' ') : ''}`
            ).join('\n');

            if (transcriptContent.length === 0) {
                transcriptContent = "Aucun message dans ce ticket.";
            }

            const fileName = `transcript-${ticketChannel.name}-${Date.now()}.txt`;
            const embedTitle = `📜 Transcription du Ticket: ${ticketChannel.name}`;

            if (transcriptContent.length > 4000) { // Limite approximative pour la description d'un embed
                const attachment = new AttachmentBuilder(Buffer.from(transcriptContent, 'utf-8'), { name: fileName });
                await targetLogsChannel.send({ 
                    content: `${embedTitle} (demandé par ${interaction.user.tag} via commande /transcript)`, 
                    files: [attachment] 
                });
                await interaction.editReply({ content: `Transcription envoyée sous forme de fichier dans ${targetLogsChannel}.`});
            } else {
                const transcriptEmbed = new EmbedBuilder()
                    .setColor(0xFFA500) // Orange
                    .setTitle(embedTitle)
                    .setDescription(transcriptContent.substring(0, 4096))
                    .setFooter({ text: `Demandé par ${interaction.user.tag} via commande /transcript` })
                    .setTimestamp();
                await targetLogsChannel.send({ embeds: [transcriptEmbed] });
                await interaction.editReply({ content: `Transcription envoyée avec succès dans ${targetLogsChannel}.`});
            }

        } catch (error) {
            console.error('Erreur lors de la transcription du ticket via commande:', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: "Une erreur est survenue lors de la transcription du ticket.", ephemeral: true });
            } else {
                await interaction.reply({ content: "Une erreur est survenue lors de la transcription du ticket.", ephemeral: true });
            }
        }
    }
};