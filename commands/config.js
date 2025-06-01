const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } = require('discord.js');
const configManager = require('../utils/configManager');

// Définitions des sections avec descriptions détaillées
const SECTIONS = {
    general: {
        label: '⚙️ Général',
        description: 'Configuration générale du serveur',
        fields: {
            prefix: 'Préfixe des commandes (ex: !)',
            adminRole: 'ID du rôle administrateur',
            modRole: 'ID du rôle modérateur'
        }
    },
    entry: {
        label: '🚪 Entrée',
        description: 'Paramètres pour les nouveaux membres',
        fields: {
            welcomeChannel: 'ID du canal de bienvenue',
            rulesChannel: 'ID du canal des règles',
            verificationRole: 'ID du rôle après vérification'
        }
    },
    modmail: {
        label: '📨 Modmail',
        description: 'Configuration du système de modmail',
        fields: {
            modmailCategory: 'ID de la catégorie des tickets modmail',
            modmailLogs: 'ID du canal de logs modmail'
        }
    },
    tickets: {
        label: '🎫 Tickets',
        description: 'Gestion des tickets de support',
        fields: {
            ticketCategory: 'ID de la catégorie des tickets',
            supportRole: 'ID du rôle support',
            ticketLogs: 'ID du canal des logs de tickets'
        }
    },
    logging: {
        label: '📊 Logs',
        description: 'Configuration des logs serveur',
        fields: {
            modLogs: 'ID du canal des logs de modération',
            messageLogs: 'ID du canal des logs de messages',
            voiceLogs: 'ID du canal des logs vocaux',
            memberLogs: 'ID du canal des logs de membres'
        }
    },
    welcome: {
        label: '👋 Bienvenue',
        description: 'Messages de bienvenue et onboarding',
        fields: {
            welcomeMessage: 'Message de bienvenue personnalisé',
            rulesMessage: 'Message des règles à accepter',
            welcomeDM: 'Message privé de bienvenue'
        }
    },
    confession: {
        label: '🙊 Confessions',
        description: 'Configuration des confessions anonymes',
        fields: {
            confessionChannel: 'ID du canal des confessions',
            confessionLogs: 'ID du canal des logs de confessions',
            confessionRole: 'ID du rôle qui peut modérer les confessions'
        }
    },
    games: {
        label: '🎮 Jeux',
        description: 'Configuration des jeux et activités',
        fields: {
            gameChannel: 'ID du canal dédié aux jeux',
            gameLeaderboard: 'ID du canal des classements'
        }
    },
    kink: {
        label: '🔞 Kink',
        description: 'Configuration des contenus NSFW',
        fields: {
            nsfwChannel: 'ID du canal NSFW',
            kinkLevels: 'Activer les niveaux kink (true/false)',
            kinkLogs: 'ID du canal des logs kink'
        }
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configurer le serveur avec une interface intuitive'),
        
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const config = configManager.getConfig();
            const sections = Object.entries(SECTIONS).map(([value, { label }]) => ({
                label,
                value
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('config_section_select')
                .setPlaceholder('Sélectionnez une section')
                .addOptions(sections);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle('Configuration du serveur')
                .setDescription('Sélectionnez une section à configurer dans le menu déroulant 👇')
                .setColor('#6A0DAD')
                .setFooter({ text: 'Chaque section contient des paramètres pré-définis avec descriptions' });

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
                    const section = SECTIONS[sectionKey];
                    await showSectionModal(i, sectionKey, section, config);
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

async function showSectionModal(interaction, sectionKey, section, config) {
    const modal = new ModalBuilder()
        .setCustomId(`config_modal_${sectionKey}`)
        .setTitle(`${section.label} - Configuration`);

    const sectionConfig = config[sectionKey] || {};
    const inputs = [];

    // Ajout des champs prédéfinis avec descriptions
    Object.entries(section.fields).forEach(([key, description]) => {
        const value = sectionConfig[key] || '';
        const input = new TextInputBuilder()
            .setCustomId(key)
            .setLabel(description)
            .setStyle(TextInputStyle.Short)
            .setValue(String(value))
            .setRequired(false);
            
        inputs.push(new ActionRowBuilder().addComponents(input));
    });

    // Bouton d'ajout de nouveau paramètre
    const newFieldInput = new TextInputBuilder()
        .setCustomId('new_field')
        .setLabel('Nouveau paramètre (format: clé:valeur)')
        .setPlaceholder('ex: notification_channel:123456789')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
        
    inputs.push(new ActionRowBuilder().addComponents(newFieldInput));

    // Bouton de suppression de paramètre
    const deleteFieldInput = new TextInputBuilder()
        .setCustomId('delete_field')
        .setLabel('Supprimer un paramètre (entrez la clé)')
        .setPlaceholder('ex: old_setting')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
        
    inputs.push(new ActionRowBuilder().addComponents(deleteFieldInput));

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
        await handleModalSubmit(submitted, sectionKey, config);
    }
}

async function handleModalSubmit(interaction, sectionKey, config) {
    try {
        const updatedConfig = { ...config };
        const sectionConfig = updatedConfig[sectionKey] || {};
        let hasChanges = false;
        let responseMessage = '';

        // Traitement des champs existants
        interaction.fields.fields.forEach(field => {
            const key = field.customId;
            const value = field.value.trim();
            
            // Ignorer les champs spéciaux
            if (key === 'new_field' || key === 'delete_field') return;
            
            if (value !== String(sectionConfig[key])) {
                // Validation des IDs (doivent être numériques)
                if (key.endsWith('Channel') || key.endsWith('Role') || key.endsWith('Category')) {
                    if (!/^\d+$/.test(value)) {
                        responseMessage += `⚠️ "${key}" doit être un ID numérique. Valeur non modifiée.\n`;
                        return;
                    }
                }
                
                sectionConfig[key] = isNaN(Number(value)) ? value : Number(value);
                hasChanges = true;
                responseMessage += `✅ "${key}" mis à jour\n`;
            }
        });

        // Traitement du nouveau champ
        const newFieldValue = interaction.fields.getTextInputValue('new_field');
        if (newFieldValue) {
            const [key, val] = newFieldValue.split(':').map(s => s.trim());
            if (key && val) {
                // Vérifier si la clé existe déjà
                if (sectionConfig.hasOwnProperty(key)) {
                    responseMessage += `⚠️ La clé "${key}" existe déjà. Utilisez le champ existant.\n`;
                } else {
                    sectionConfig[key] = isNaN(Number(val)) ? val : Number(val);
                    hasChanges = true;
                    responseMessage += `✅ Nouveau paramètre "${key}" ajouté\n`;
                }
            } else {
                responseMessage += '⚠️ Format invalide pour nouveau paramètre. Utilisez "clé:valeur"\n';
            }
        }

        // Traitement de la suppression
        const deleteFieldKey = interaction.fields.getTextInputValue('delete_field');
        if (deleteFieldKey) {
            if (sectionConfig.hasOwnProperty(deleteFieldKey)) {
                delete sectionConfig[deleteFieldKey];
                hasChanges = true;
                responseMessage += `✅ Paramètre "${deleteFieldKey}" supprimé\n`;
            } else {
                responseMessage += `⚠️ Clé "${deleteFieldKey}" introuvable. Aucune suppression effectuée.\n`;
            }
        }

        if (hasChanges) {
            updatedConfig[sectionKey] = sectionConfig;
            await configManager.updateConfig(updatedConfig);
            await interaction.reply({
                content: `✅ Configuration "${SECTIONS[sectionKey].label}" mise à jour:\n${responseMessage}`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: `⏩ Aucun changement détecté:\n${responseMessage || 'Aucune modification demandée'}`,
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
