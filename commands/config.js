const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Gérer la configuration du serveur')
        .addSubcommand(subcommand => 
            subcommand.setName('modifier')
                .setDescription('Modifier un paramètre de configuration')
        )
        .addSubcommand(subcommand => 
            subcommand.setName('afficher')
                .setDescription('Afficher la configuration actuelle')
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const config = configManager.getConfig();
            const currentPage = 0;
            const pages = [
                { name: '⚙️ Général', key: 'general' },
                { name: '🚪 Entrée', key: 'entry' },
                { name: '📨 Modmail', key: 'modmail' },
                { name: '🎫 Tickets', key: 'tickets' },
                { name: '📊 Logs', key: 'logging' },
                { name: '👋 Bienvenue', key: 'welcome' }
            ];

            const embed = createEmbed(pages[currentPage], config, pages);
            const buttons = createButtons(pages, currentPage);

            await interaction.editReply({
                embeds: [embed],
                components: [buttons],
                ephemeral: true
            });

            const message = await interaction.fetchReply();
            setupCollector(message, config, pages, interaction.user);
        } catch (error) {
            console.error('[CONFIG] Erreur:', error);
            await interaction.editReply({
                content: `❌ Erreur lors du chargement de la configuration: ${error.message}`,
                ephemeral: true
            });
        }
    }
};

function createEmbed(page, config, pages) {
    const section = config[page.key] || {};
    const fields = Object.entries(section).map(([key, value]) => ({
        name: `\`${key}\``,
        value: typeof value === 'object' 
            ? '```json\n' + JSON.stringify(value, null, 2) + '\n```' 
            : `\`\`\`${value}\`\`\``,
        inline: true
    }));

    return new EmbedBuilder()
        .setTitle(`Configuration - ${page.name}`)
        .setColor('#4B0082')
        .addFields(fields)
        .setFooter({ text: `Page ${pages.findIndex(p => p.key === page.key) + 1}/${pages.length}` });
}

function createButtons(pages, currentPage) {
    const row = new ActionRowBuilder();
    
    // Boutons de navigation
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('config_prev')
            .setLabel('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0)
    );
    
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('config_next')
            .setLabel('▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === pages.length - 1)
    );
    
    // Bouton de modification
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('config_modify')
            .setLabel('✏️ Modifier')
            .setStyle(ButtonStyle.Primary)
    );
    
    // Bouton de sauvegarde
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('config_save')
            .setLabel('💾 Sauvegarder')
            .setStyle(ButtonStyle.Success)
    );
    
    return row;
}

function setupCollector(message, config, pages, user) {
    const collector = message.createMessageComponentCollector({
        filter: i => i.user.id === user.id,
        time: 300000 // 5 minutes
    });

    let currentPage = 0;
    
    collector.on('collect', async i => {
        try {
            if (i.customId === 'config_prev' && currentPage > 0) {
                currentPage--;
            } else if (i.customId === 'config_next' && currentPage < pages.length - 1) {
                currentPage++;
            } else if (i.customId === 'config_save') {
                await configManager.updateConfig(config);
                await i.reply({ content: '✅ Configuration sauvegardée avec succès!', ephemeral: true });
                return;
            } else if (i.customId === 'config_modify') {
                // Ouvrir un modal pour modification
                // Implémentation à compléter avec context7
                await i.reply({ content: '🛠️ Fonctionnalité de modification en développement...', ephemeral: true });
                return;
            }
            
            await i.update({
                embeds: [createEmbed(pages[currentPage], config, pages)],
                components: [createButtons(pages, currentPage)]
            });
            
        } catch (error) {
            console.error('[CONFIG INTERACTION] Erreur:', error);
            await i.reply({ 
                content: `❌ Erreur: ${error.message}`, 
                ephemeral: true 
            });
        }
    });

    collector.on('end', () => {
        message.edit({ 
            components: [] 
        });
    });
}
