const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sniperconfession')
        .setDescription('Récupère l\'auteur d\'une confession par son numéro (Staff uniquement)')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('Numéro de la confession')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),

    async execute(interaction) {
        // Vérifier les permissions (double vérification)
        const config = configManager.getConfig();
        const hasPermission = 
            interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
            interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
            (config.general?.adminRole && interaction.member.roles.cache.has(config.general.adminRole)) ||
            (config.general?.modRole && interaction.member.roles.cache.has(config.general.modRole));
        
        if (!hasPermission) {
            return interaction.reply({
                content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande. Seuls les modérateurs et administrateurs peuvent "sniper" les confessions.',
                ephemeral: true
            });
        }
        
        const confessionNumber = interaction.options.getInteger('id');
        
        if (!config.confession?.logsChannel) {
            return interaction.reply({
                content: 'Le canal de logs des confessions n\'est pas configuré.',
                ephemeral: true
            });
        }

        const logsChannelId = config.confession.logsChannel;
        const logsChannel = interaction.client.channels.cache.get(logsChannelId);

        if (!logsChannel) {
            return interaction.reply({
                content: 'Impossible de trouver le canal de logs des confessions.',
                ephemeral: true
            });
        }

        try {
            const messages = await logsChannel.messages.fetch({ limit: 100 });
            const confessionLog = messages.find(msg =>
                msg.embeds[0]?.title === `📋 Log Confession #${confessionNumber}`
            );

            if (confessionLog) {
                const description = confessionLog.embeds[0].description;
                const authorMatch = description.match(/\*\*Auteur:\*\* (.*?) \((.*?)\)/);
                const authorInfo = authorMatch 
                    ? `${authorMatch[1]} (${authorMatch[2]})`
                    : 'Auteur non trouvé.';

                return interaction.reply({
                    content: `Confession #${confessionNumber}: ${authorInfo}`,
                    ephemeral: true
                });
            } else {
                return interaction.reply({
                    content: `Aucun log trouvé pour la confession #${confessionNumber}.`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Erreur lors de la recherche de la confession:', error);
            return interaction.reply({
                content: 'Erreur lors de la récupération de la confession. Veuillez réessayer.',
                ephemeral: true
            });
        }
    },
};
