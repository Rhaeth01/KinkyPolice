const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sniperconfession')
        .setDescription('Récupère l\'auteur d\'une confession via le lien du message (Staff uniquement)')
        .addStringOption(option =>
            option.setName('lien')
                .setDescription('Lien du message de la confession')
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
        
        const messageLink = interaction.options.getString('lien');
        const linkRegex = /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/;
        const match = messageLink.match(linkRegex);

        if (!match) {
            return interaction.reply({
                content: 'Le lien du message fourni n\'est pas valide. Veuillez fournir un lien de message Discord valide.',
                ephemeral: true
            });
        }

        const [, guildId, channelId, messageId] = match;

        // Vérifier si le message provient bien du serveur actuel
        if (guildId !== interaction.guildId) {
            return interaction.reply({
                content: 'Le message lié ne provient pas de ce serveur.',
                ephemeral: true,
            });
        }

        try {
            const channel = await interaction.client.channels.fetch(channelId);
            if (!channel) {
                return interaction.reply({ content: 'Le salon du message est introuvable.', ephemeral: true });
            }

            const confessionMessage = await channel.messages.fetch(messageId);
            if (!confessionMessage) {
                return interaction.reply({ content: 'Le message de confession est introuvable.', ephemeral: true });
            }

            const confessionEmbed = confessionMessage.embeds[0];
            if (!confessionEmbed || !confessionEmbed.title) {
                return interaction.reply({ content: 'Impossible de trouver l\'embed de la confession ou son titre.', ephemeral: true });
            }

            const confessionNumberMatch = confessionEmbed.title.match(/#(\d+)/);
            const confessionNumber = confessionNumberMatch ? confessionNumberMatch[1] : null;
            if (!confessionNumber) {
                 return interaction.reply({ content: 'Impossible de déterminer le numéro de la confession à partir du message.', ephemeral: true });
            }

            // Nouvelle logique: lire depuis le fichier confessions.json
            const confessionsPath = path.join(__dirname, '..', 'data', 'confessions.json');

            if (!fs.existsSync(confessionsPath)) {
                return interaction.reply({
                    content: 'Le fichier de données des confessions est introuvable. Aucune confession n\'a encore été enregistrée.',
                    ephemeral: true
                });
            }

            const confessionsData = fs.readFileSync(confessionsPath, 'utf8');
            const confessions = JSON.parse(confessionsData);

            // Le numéro de confession est une chaîne, le convertir en nombre pour la comparaison
            const confessionNumberInt = parseInt(confessionNumber, 10);
            const confession = confessions.find(c => c.number === confessionNumberInt);

            if (confession) {
                try {
                    const author = await interaction.client.users.fetch(confession.authorId);
                    const authorInfo = `${author.tag} (${author.id})`;
                    return interaction.reply({
                        content: `La confession #${confessionNumber} a été envoyée par : **${authorInfo}**.`,
                        ephemeral: true
                    });
                } catch (userFetchError) {
                    console.error(`Erreur lors de la récupération de l'auteur ${confession.authorId}:`, userFetchError);
                    return interaction.reply({
                        content: `L'auteur de la confession #${confessionNumber} (ID: ${confession.authorId}) n'a pas pu être trouvé.`,
                        ephemeral: true
                    });
                }
            } else {
                return interaction.reply({
                    content: `Aucune confession trouvée avec le numéro #${confessionNumber}.`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Erreur lors de la récupération de la confession via le lien:', error);
            return interaction.reply({
                content: 'Une erreur est survenue lors de la récupération des informations de la confession.',
                ephemeral: true
            });
        }
    },
};
