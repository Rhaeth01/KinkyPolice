const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configurer le serveur avec une interface intuitive'),
        
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const config = configManager.getConfig();
            const sections = [
                { label: '⚙️ Général', value: 'general' },
                { label: '🚪 Entrée', value: 'entry' },
                { label: '📨 Modmail', value: 'modmail' },
                { label: '🎫 Tickets', value: 'tickets' },
                { label: '📊 Logs', value: 'logging' },
                { label: '👋 Bienvenue', value: 'welcome' }
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('config_section_select')
                .setPlaceholder('Sélectionnez une section')
                .addOptions(sections);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle('Configuration du serveur')
                .setDescription('Utilisez le menu déroulant pour sélectionner une section à configurer')
                .setColor('#6A0DAD');

            await interaction.editReply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });
            
            // Configuration du collector pour le menu déroulant
            const message = await interaction.fetchReply();
            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 300000
            });

            collector.on('collect', async i => {
                if (i.isStringSelectMenu() && i.customId === 'config_section_select') {
                    const sectionKey = i.values[0];
                    const section = sections.find(s => s.value === sectionKey);
                    await showSectionModal(i, section, config);
                }
            });

            collector.on('end', () => {
                message.edit({ components: [] });
            });

        } catch (error) {
            console.error('[CONFIG] Erreur:', error);
            await interaction.editReply({
                content: `❌ Erreur lors du chargement de la configuration: ${error.message}`,
                ephemeral: true
            });
        }
    }
};

async function showSectionModal(interaction, section, config) {
    const modal = new ModalBuilder()
        .setCustomId(`config_modal_${section.value}`)
        .setTitle(`Configuration: ${section.label}`);

    const sectionConfig = config[section.value] || {};
    const inputs = [];

    // Création dynamique des champs de texte
    Object.keys(sectionConfig).forEach(key => {
        const value = sectionConfig[key];
        const input = new TextInputBuilder()
            .setCustomId(key)
            .setLabel(key)
            .setStyle(TextInputStyle.Short)
            .setValue(String(value))
            .setRequired(false);
            
        inputs.push(new ActionRowBuilder().addComponents(input));
    });

    // Bouton d'ajout de nouveau paramètre
    const newFieldInput = new TextInputBuilder()
        .setCustomId('new_field')
        .setLabel('Nouveau paramètre (clé:valeur)')
        .setPlaceholder('ex: channel_id:123456789')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
        
    inputs.push(new ActionRowBuilder().addComponents(newFieldInput));

    modal.addComponents(...inputs);
    await interaction.showModal(modal);
    
    // Gestion de la soumission du modal
    const submitted = await interaction.awaitModalSubmit({
        time: 300000,
        filter: i => i.user.id === interaction.user.id
    }).catch(error => {
        console.error('Erreur modal:', error);
        return null;
    });

    if (submitted) {
        await handleModalSubmit(submitted, section.value, config);
    }
}

async function handleModalSubmit(interaction, sectionKey, config) {
    try {
        const updatedConfig = { ...config };
        const sectionConfig = updatedConfig[sectionKey] || {};
        let hasChanges = false;

        // Traitement des champs existants
        interaction.fields.fields.forEach(field => {
            const key = field.customId;
            const value = field.value.trim();
            
            if (key !== 'new_field' && value !== String(sectionConfig[key])) {
                sectionConfig[key] = isNaN(Number(value)) ? value : Number(value);
                hasChanges = true;
            }
        });

        // Traitement du nouveau champ
        const newFieldValue = interaction.fields.getTextInputValue('new_field');
        if (newFieldValue) {
            const [key, val] = newFieldValue.split(':').map(s => s.trim());
            if (key && val) {
                sectionConfig[key] = isNaN(Number(val)) ? val : Number(val);
                hasChanges = true;
            }
        }

        if (hasChanges) {
            updatedConfig[sectionKey] = sectionConfig;
            await configManager.updateConfig(updatedConfig);
            await interaction.reply({
                content: `✅ Configuration de la section **${sectionKey}** mise à jour avec succès!`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: '⏩ Aucun changement détecté.',
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Erreur mise à jour config:', error);
        await interaction.reply({
            content: `❌ Erreur lors de la mise à jour: ${error.message}`,
            ephemeral: true
        });
    }
}
