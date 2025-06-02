const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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
        .setDescription('Configurer le serveur avec une interface intuitive')
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Modifier la configuration du serveur'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Afficher la configuration actuelle'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('diagnostic')
                .setDescription('Diagnostiquer les problèmes de configuration')),
        
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'diagnostic') {
            return await handleDiagnostic(interaction);
        } else if (subcommand === 'view') {
            return await handleView(interaction);
        } else {
            return await handleEdit(interaction);
        }
    }
};

async function handleDiagnostic(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const fs = require('node:fs');
        const path = require('node:path');
        
        let diagnosticMessage = '🔍 **Diagnostic de la configuration**\n\n';
        
        // Vérifier l'existence des fichiers
        const configPath = path.join(__dirname, '../config.json');
        const schemaPath = path.join(__dirname, '../config.schema.json');
        
        diagnosticMessage += `📁 **Fichiers:**\n`;
        diagnosticMessage += `- config.json: ${fs.existsSync(configPath) ? '✅ Existe' : '❌ Manquant'}\n`;
        diagnosticMessage += `- config.schema.json: ${fs.existsSync(schemaPath) ? '✅ Existe' : '❌ Manquant'}\n\n`;
        
        // Vérifier les permissions
        try {
            fs.accessSync(configPath, fs.constants.R_OK | fs.constants.W_OK);
            diagnosticMessage += `🔐 **Permissions:** ✅ Lecture/Écriture OK\n\n`;
        } catch (error) {
            diagnosticMessage += `🔐 **Permissions:** ❌ ${error.message}\n\n`;
        }
        
        // Tester le chargement de la configuration
        try {
            const config = configManager.getConfig();
            diagnosticMessage += `📊 **Chargement:** ✅ Configuration chargée\n`;
            diagnosticMessage += `📊 **Sections:** ${Object.keys(config).length} sections trouvées\n\n`;
            
            // Vérifier chaque section
            diagnosticMessage += `📋 **Sections détaillées:**\n`;
            Object.entries(SECTIONS).forEach(([key, section]) => {
                const sectionData = config[key] || {};
                const fieldCount = Object.keys(sectionData).length;
                diagnosticMessage += `- ${section.label}: ${fieldCount} paramètres\n`;
            });
            
        } catch (error) {
            diagnosticMessage += `📊 **Chargement:** ❌ ${error.message}\n\n`;
        }
        
        // Test de sauvegarde
        try {
            const testConfig = configManager.getConfig();
            testConfig._diagnostic_test = Date.now();
            await configManager.updateConfig(testConfig);
            
            // Vérifier que le test a été sauvegardé
            const verifyConfig = configManager.forceReload();
            if (verifyConfig._diagnostic_test) {
                diagnosticMessage += `💾 **Sauvegarde:** ✅ Test réussi\n`;
                // Nettoyer le test
                delete verifyConfig._diagnostic_test;
                await configManager.updateConfig(verifyConfig);
            } else {
                diagnosticMessage += `💾 **Sauvegarde:** ❌ Test échoué - données non persistées\n`;
            }
        } catch (error) {
            diagnosticMessage += `💾 **Sauvegarde:** ❌ ${error.message}\n`;
        }
        
        await interaction.editReply({
            content: diagnosticMessage,
            ephemeral: true
        });
        
    } catch (error) {
        await interaction.editReply({
            content: `❌ Erreur lors du diagnostic: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleView(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const config = configManager.getConfig();
        
        const embed = new EmbedBuilder()
            .setTitle('📋 Configuration actuelle')
            .setColor('#6A0DAD')
            .setTimestamp();
        
        Object.entries(SECTIONS).forEach(([key, section]) => {
            const sectionData = config[key] || {};
            const fields = Object.entries(sectionData)
                .map(([k, v]) => `**${k}:** ${v || '*vide*'}`)
                .join('\n') || '*Aucun paramètre*';
            
            embed.addFields({
                name: section.label,
                value: fields.length > 1024 ? fields.substring(0, 1021) + '...' : fields,
                inline: false
            });
        });
        
        await interaction.editReply({
            embeds: [embed],
            ephemeral: true
        });
        
    } catch (error) {
        await interaction.editReply({
            content: `❌ Erreur lors de l'affichage: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleEdit(interaction) {
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
        await interaction.deferReply({ ephemeral: true });
        
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
            
            const currentValue = sectionConfig[key] || '';
            if (value !== String(currentValue)) {
                // Vérification pour les champs qui nécessitent un ID et si la valeur est vide -> suppression
                if (key.endsWith('Channel') || key.endsWith('Role') || key.endsWith('Category') || key.endsWith('Logs')) {
                    if (value === '') {
                        // Supprimer la clé
                        delete sectionConfig[key];
                        hasChanges = true;
                        responseMessage += `✅ "${key}" supprimé (valeur vide)\n`;
                        return;
                    }
                    // Validation des IDs (doivent être numériques)
                    if (!/^\d+$/.test(value)) {
                        responseMessage += `⚠️ "${key}" doit être un ID numérique. Valeur non modifiée.\n`;
                        return;
                    }
                }
                
                // Conversion automatique des valeurs numériques
                const finalValue = /^\d+$/.test(value) ? value : value;
                sectionConfig[key] = finalValue;
                hasChanges = true;
                responseMessage += `✅ "${key}" mis à jour: "${finalValue}"\n`;
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
                    const finalValue = /^\d+$/.test(val) ? val : val;
                    sectionConfig[key] = finalValue;
                    hasChanges = true;
                    responseMessage += `✅ Nouveau paramètre "${key}" ajouté: "${finalValue}"\n`;
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
            
            // Forcer la sauvegarde avec gestion d'erreur améliorée
            try {
                await configManager.updateConfig(updatedConfig);
                
                // Vérification que les changements ont bien été sauvegardés
                const verificationConfig = configManager.forceReload();
                const savedSection = verificationConfig[sectionKey] || {};
                
                let verificationMessage = '';
                Object.keys(sectionConfig).forEach(key => {
                    if (savedSection[key] !== sectionConfig[key]) {
                        verificationMessage += `⚠️ "${key}" n'a pas été sauvegardé correctement\n`;
                    }
                });
                
                if (verificationMessage) {
                    responseMessage += '\n🔍 Vérification:\n' + verificationMessage;
                }
                
                await interaction.editReply({
                    content: `✅ Configuration "${SECTIONS[sectionKey].label}" mise à jour avec succès!\n\n📝 Modifications:\n${responseMessage}`,
                    ephemeral: true
                });
                
                console.log(`[CONFIG] Section "${sectionKey}" mise à jour par ${interaction.user.tag}`);
                
            } catch (saveError) {
                console.error('[CONFIG] Erreur de sauvegarde:', saveError);
                await interaction.editReply({
                    content: `❌ Erreur lors de la sauvegarde de la configuration:\n${saveError.message}\n\n📝 Modifications tentées:\n${responseMessage}`,
                    ephemeral: true
                });
            }
        } else {
            await interaction.editReply({
                content: `⏩ Aucun changement détecté pour "${SECTIONS[sectionKey].label}":\n${responseMessage || 'Aucune modification demandée'}`,
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('[CONFIG] Erreur handleModalSubmit:', error);
        try {
            await interaction.editReply({
                content: `❌ Erreur lors du traitement de la configuration: ${error.message}`,
                ephemeral: true
            });
        } catch (replyError) {
            console.error('[CONFIG] Erreur lors de la réponse:', replyError);
        }
    }
}