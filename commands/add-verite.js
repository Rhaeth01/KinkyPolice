const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const kinkApiManager = require('../utils/kinkApiManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-verite')
        .setDescription('Ajoute une nouvelle question "Vérité" à la liste.')
        .addStringOption(option =>
            option.setName('texte')
                .setDescription('Le texte de la vérité à ajouter.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('niveau')
                .setDescription('Niveau d\'intensité de la vérité.')
                .setRequired(true)
                .addChoices(
                    { name: '🌸 Doux', value: 'doux' },
                    { name: '🔥 Modéré', value: 'modéré' },
                    { name: '💀 Intense', value: 'intense' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        const texteVerite = interaction.options.getString('texte');
        const niveau = interaction.options.getString('niveau');

        // Vérifier les permissions NSFW pour les niveaux élevés
        if ((niveau === 'modéré' || niveau === 'intense') && !interaction.channel.nsfw) {
            const embed = new EmbedBuilder()
                .setColor(0xFF6B6B)
                .setTitle('🚫 Canal NSFW requis')
                .setDescription(`L'ajout de contenu niveau "${niveau}" nécessite un canal NSFW.`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        try {
            const success = kinkApiManager.addCustomContent('truths', niveau, texteVerite);

            if (success) {
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Vérité ajoutée !')
                    .setDescription(`La vérité a été ajoutée avec succès au niveau **${niveau}**.`)
                    .addFields(
                        { name: 'Contenu', value: `"${texteVerite}"`, inline: false },
                        { name: 'Niveau', value: `${this.getLevelEmoji(niveau)} ${niveau.charAt(0).toUpperCase() + niveau.slice(1)}`, inline: true }
                    )
                    .setFooter({ text: `Ajouté par ${interaction.user.tag}` })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } else {
                const embed = new EmbedBuilder()
                    .setColor(0xFF6B6B)
                    .setTitle('❌ Échec de l\'ajout')
                    .setDescription('Impossible d\'ajouter la vérité. Elle existe peut-être déjà ou une erreur s\'est produite.')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error) {
            console.error('Erreur lors de l\'ajout de vérité:', error);
            
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Erreur')
                .setDescription('Une erreur est survenue lors de l\'ajout de la vérité.')
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    getLevelEmoji(level) {
        const emojis = {
            'doux': '🌸',
            'modéré': '🔥',
            'intense': '💀'
        };
        return emojis[level] || '💥';
    }
};
