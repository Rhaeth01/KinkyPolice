const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRandomGage } = require('../utils/jsonManager');
const kinkApiManager = require('../utils/kinkApiManager');
const kinkLevelManager = require('../utils/kinkLevelManager');
const contentFilter = require('../utils/contentFilter');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gage')
        .setDescription('Donne un "Gage" adapté à votre niveau d\'intensité.')
        .addStringOption(option =>
            option.setName('niveau')
                .setDescription('Niveau d\'intensité spécifique (optionnel)')
                .setRequired(false)
                .addChoices(
                    { name: '🌸 Doux', value: 'doux' },
                    { name: '🔥 Modéré', value: 'modéré' },
                    { name: '💀 Intense', value: 'intense' }
                )),
    async execute(interaction) {
        try {
            // Defer immédiatement pour éviter l'expiration
            await interaction.deferReply();
            
            const requestedLevel = interaction.options.getString('niveau') || 'doux';
            
            // Vérifications simples et rapides
            if (requestedLevel === 'modéré' && !interaction.channel.nsfw) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF6B6B)
                    .setTitle('🚫 Canal NSFW requis')
                    .setDescription('Le niveau modéré nécessite un canal NSFW.')
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                return;
            }
            
            if (requestedLevel === 'intense' && !interaction.channel.nsfw) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF6B6B)
                    .setTitle('🚫 Canal NSFW requis')
                    .setDescription('Le niveau intense nécessite un canal NSFW.')
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                return;
            }
            
            // Utiliser le niveau demandé ou doux par défaut
            const effectiveLevel = requestedLevel;

            let gage = null;
            let source = 'local';

            try {
                // Essayer d'obtenir du contenu via l'API manager
                const apiResult = await kinkApiManager.getRandomGage(effectiveLevel);
                gage = apiResult.content;
                source = apiResult.source;
            } catch (apiError) {
                console.log('API indisponible, utilisation du contenu local:', apiError.message);
                
                // Fallback vers le système local existant
                gage = getRandomGage();
            }

            if (!gage) {
                const embed = new EmbedBuilder()
                    .setColor(0xF39C12)
                    .setTitle('😅 Aucun gage disponible')
                    .setDescription('Désolé, il n\'y a aucun gage disponible pour ce niveau pour le moment.')
                    .addFields(
                        { name: '💡 Suggestion', value: 'Essayez un niveau différent ou ajoutez du contenu avec `/add-gage` !', inline: false }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            // Créer l'embed de réponse
            const embed = new EmbedBuilder()
                .setColor(this.getLevelColor(effectiveLevel))
                .setTitle(`${this.getLevelEmoji(effectiveLevel)} Gage !`)
                .setDescription(gage)
                .addFields(
                    { name: 'Niveau d\'intensité', value: `${this.getLevelEmoji(effectiveLevel)} ${effectiveLevel.charAt(0).toUpperCase() + effectiveLevel.slice(1)}`, inline: true },
                    { name: 'Catégorie', value: '🎯 Défi personnel', inline: true }
                )
                .setFooter({ text: `${interaction.user.displayName} • ${interaction.client.user.username}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur dans la commande gage:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Erreur')
                .setDescription('Une erreur est survenue lors de la récupération du gage.')
                .setTimestamp();

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },

    getLevelColor(level) {
        const colors = {
            'doux': 0xF8BBD9,      // Rose clair
            'modéré': 0xE67E22,    // Orange
            'intense': 0x8E44AD    // Violet foncé
        };
        return colors[level] || 0xE74C3C;
    },

    getLevelEmoji(level) {
        const emojis = {
            'doux': '🌸',
            'modéré': '🔥',
            'intense': '💀'
        };
        return emojis[level] || '😈';
    },

};
