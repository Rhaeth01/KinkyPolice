const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
// ticketCategoryId sera utilisé dans interactionCreate.js

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed-ticket')
        .setDescription('Envoie l\'embed pour la création de tickets.')
        .addStringOption(option =>
            option.setName('titre')
                .setDescription('Le titre de l\'embed (ex: "Support & Assistance").')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('texte')
                .setDescription('Le texte principal de l\'embed (ex: "Cliquez ci-dessous pour ouvrir un ticket.").')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('salon')
                .setDescription('Le salon où envoyer l\'embed de création de ticket.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('texte_bouton')
                .setDescription('Le texte du bouton (ex: "Ouvrir un ticket").')
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('role_staff_1')
                .setDescription('Premier rôle staff autorisé à voir les tickets.')
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('role_staff_2')
                .setDescription('Deuxième rôle staff autorisé à voir les tickets.')
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('role_staff_3')
                .setDescription('Troisième rôle staff autorisé à voir les tickets.')
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('role_staff_4')
                .setDescription('Quatrième rôle staff autorisé à voir les tickets.')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    async execute(interaction) {
        console.log(`[EMBED-TICKET DEBUG] Début d'exécution - ID: ${interaction.id}, User: ${interaction.user.tag}`);
        console.log(`[EMBED-TICKET DEBUG] État initial - Deferred: ${interaction.deferred}, Replied: ${interaction.replied}`);
        
        const titre = interaction.options.getString('titre');
        const texte = interaction.options.getString('texte');
        const targetChannel = interaction.options.getChannel('salon');
        const texteBouton = interaction.options.getString('texte_bouton') || 'Créer un ticket';
        const rolesAutorises = [];
        for (let i = 1; i <= 4; i++) {
            const role = interaction.options.getRole(`role_staff_${i}`);
            if (role) {
                rolesAutorises.push(role.id);
            }
        }

        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
            console.log(`[EMBED-TICKET DEBUG] Salon invalide - Type: ${targetChannel?.type}`);
            return interaction.reply({ content: 'Veuillez sélectionner un salon textuel valide pour envoyer l\'embed.', ephemeral: true });
        }

        console.log(`[EMBED-TICKET DEBUG] Création de l'embed pour le salon: ${targetChannel.name} (${targetChannel.id})`);

        const embed = new EmbedBuilder()
            .setColor(0x3498DB) // Bleu clair
            .setTitle(titre)
            .setDescription(texte);

        // Encoder les rôles autorisés dans l'ID du bouton si spécifiés
        const buttonCustomId = rolesAutorises.length > 0 ?
            `create_ticket_button_${Buffer.from(rolesAutorises.join(',')).toString('base64')}` :
            'create_ticket_button';

        const createTicketButton = new ButtonBuilder()
            .setCustomId(buttonCustomId)
            .setLabel(texteBouton)
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(createTicketButton);

        try {
            console.log(`[EMBED-TICKET DEBUG] Tentative d'envoi de l'embed dans ${targetChannel.name}`);
            const sentMessage = await targetChannel.send({ embeds: [embed], components: [row] });
            console.log(`[EMBED-TICKET DEBUG] Embed envoyé avec succès - Message ID: ${sentMessage.id}`);
            
            console.log(`[EMBED-TICKET DEBUG] État avant reply - Deferred: ${interaction.deferred}, Replied: ${interaction.replied}`);
            await interaction.reply({ content: `L'embed de création de ticket a été envoyé avec succès dans ${targetChannel}.`, ephemeral: true });
            console.log(`[EMBED-TICKET DEBUG] Reply envoyé avec succès`);
        } catch (error) {
            console.error(`[EMBED-TICKET DEBUG] Erreur lors de l'envoi de l'embed de ticket:`, error);
            console.log(`[EMBED-TICKET DEBUG] État lors de l'erreur - Deferred: ${interaction.deferred}, Replied: ${interaction.replied}`);
            
            // Vérifier si on peut encore répondre à l'interaction
            if (!interaction.replied && !interaction.deferred) {
                console.log(`[EMBED-TICKET DEBUG] Tentative de reply d'erreur`);
                try {
                    await interaction.reply({ content: 'Une erreur est survenue lors de l\'envoi de l\'embed.', ephemeral: true });
                    console.log(`[EMBED-TICKET DEBUG] Reply d'erreur envoyé avec succès`);
                } catch (replyError) {
                    console.error(`[EMBED-TICKET DEBUG] Impossible de répondre à l'interaction:`, replyError);
                }
            } else {
                console.log(`[EMBED-TICKET DEBUG] Interaction déjà traitée, pas de reply d'erreur`);
            }
        }
    },
};
