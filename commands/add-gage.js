const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const kinkApiManager = require('../utils/kinkApiManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-gage')
        .setDescription('Ajoute un nouveau "Gage" à la liste.')
        .addStringOption(option =>
            option.setName('texte')
                .setDescription('Le texte du gage à ajouter.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('niveau')
                .setDescription('Niveau d\'intensité du gage.')
                .setRequired(true)
                .addChoices(
                    { name: '🌸 Doux', value: 'doux' },
                    { name: '🔥 Modéré', value: 'modéré' },
                    { name: '💀 Intense', value: 'intense' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        const texteGage = interaction.options.getString('texte');
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
            const success = kinkApiManager.addCustomContent('gages', niveau, texteGage);

            if (success) {
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Gage ajouté !')
                    .setDescription(`Le gage a été ajouté avec succès au niveau **${niveau}**.`)
                    .addFields(
                        { name: 'Contenu', value: `"${texteGage}"`, inline: false },
                        { name: 'Niveau', value: `${this.getLevelEmoji(niveau)} ${niveau.charAt(0).toUpperCase() + niveau.slice(1)}`, inline: true }
                    )
                    .setFooter({ text: `Ajouté par ${interaction.user.tag}` })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } else {
                const embed = new EmbedBuilder()
                    .setColor(0xFF6B6B)
                    .setTitle('❌ Échec de l\'ajout')
                    .setDescription('Impossible d\'ajouter le gage. Il existe peut-être déjà ou une erreur s\'est produite.')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error) {
            console.error('Erreur lors de l\'ajout de gage:', error);
            
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Erreur')
                .setDescription('Une erreur est survenue lors de l\'ajout du gage.')
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
