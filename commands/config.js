const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Interface de configuration du serveur')
        .addSubcommand(subcommand =>
            subcommand
                .setName('afficher')
                .setDescription('Affiche la configuration actuelle'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('modifier')
                .setDescription('Modifie la configuration via une interface interactive'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('recharger')
                .setDescription('Force le rechargement de la configuration sans redémarrage'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('manuel')
                .setDescription('Modification manuelle d\'une clé spécifique')
                .addStringOption(option =>
                    option.setName('cle')
                        .setDescription('Clé de configuration à modifier')
                        .setRequired(true)
                        .addChoices(
                            { name: 'logChannelId', value: 'logChannelId' },
                            { name: 'logActionMod', value: 'logActionMod' },
                            { name: 'staffRoleId', value: 'staffRoleId' },
                            { name: 'memberRoleId', value: 'memberRoleId' },
                            { name: 'newMemberRoleIds', value: 'newMemberRoleIds' },
                            { name: 'ticketCategoryId', value: 'ticketCategoryId' },
                            { name: 'entryRequestCategoryId', value: 'entryRequestCategoryId' },
                            { name: 'entryRequestChannelId', value: 'entryRequestChannelId' },
                            { name: 'acceptedEntryCategoryId', value: 'acceptedEntryCategoryId' },
                            { name: 'forbiddenRoleIds', value: 'forbiddenRoleIds' },
                            { name: 'reglesValidesId', value: 'reglesValidesId' },
                            { name: 'confessionChannelId', value: 'confessionChannelId' },
                            { name: 'logsTicketsChannelId', value: 'logsTicketsChannelId' },
                            { name: 'modmail.categoryId', value: 'modmail.categoryId' },
                            { name: 'modmail.staffRoleIds', value: 'modmail.staffRoleIds' },
                            { name: 'quizChannelId', value: 'quizChannelId' },
                            { name: 'entryRequestChannelId', value: 'entryRequestChannelId' },
                            { name: 'voiceLogChannelId', value: 'voiceLogChannelId' }
                        ))
                .addStringOption(option =>
                    option.setName('valeur')
                        .setDescription('Nouvelle valeur à définir')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'afficher') {
            await showCurrentConfig(interaction);
        } else if (subcommand === 'modifier') {
            await showConfigInterface(interaction);
        } else if (subcommand === 'recharger') {
            await reloadConfig(interaction);
        } else if (subcommand === 'manuel') {
            await handleManualConfig(interaction);
        }
    }
};

async function showCurrentConfig(interaction) {
    const configPath = path.join(__dirname, '../config.json');
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        
        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configuration Actuelle du Serveur')
            .setColor('#3498DB')
            .setTimestamp();

        // Salons
        const channels = [];
        if (config.logChannelId) channels.push(`**Log** : <#${config.logChannelId}>`);
        if (config.logActionMod) channels.push(`**Logs Modération** : <#${config.logActionMod}>`);
        if (config.confessionChannelId) channels.push(`**Confessions** : <#${config.confessionChannelId}>`);
        if (config.logsTicketsChannelId) channels.push(`**Logs Tickets** : <#${config.logsTicketsChannelId}>`);
        if (config.quizChannelId) channels.push(`**Quiz Quotidien** : <#${config.quizChannelId}>`);
        if (config.entryRequestChannelId) channels.push(`**Demandes d'entrée** : <#${config.entryRequestChannelId}>`);
        if (config.voiceLogChannelId) channels.push(`**Logs Vocaux** : <#${config.voiceLogChannelId}>`);
        
        if (channels.length > 0) {
            embed.addFields({ name: '📺 Salons', value: channels.join('\n'), inline: false });
        }

        // Catégories
        const categories = [];
        if (config.ticketCategoryId) categories.push(`**Tickets** : <#${config.ticketCategoryId}>`);
        if (config.entryRequestCategoryId) categories.push(`**Demandes d'entrée** : <#${config.entryRequestCategoryId}>`);
        if (config.acceptedEntryCategoryId) categories.push(`**Entrées acceptées** : <#${config.acceptedEntryCategoryId}>`);
        if (config.modmail?.categoryId) categories.push(`**ModMail** : <#${config.modmail.categoryId}>`);
        
        if (categories.length > 0) {
            embed.addFields({ name: '📁 Catégories', value: categories.join('\n'), inline: false });
        }

        // Rôles
        const roles = [];
        if (config.memberRoleId) roles.push(`**Membre** : <@&${config.memberRoleId}>`);
        if (config.reglesValidesId) roles.push(`**Règles validées** : <@&${config.reglesValidesId}>`);
        
        if (Array.isArray(config.staffRoleId)) {
            const staffRoles = config.staffRoleId.filter(id => /^\d+$/.test(id)).map(id => `<@&${id}>`).join(', ');
            if (staffRoles) roles.push(`**Staff** : ${staffRoles}`);
        } else if (config.staffRoleId && /^\d+$/.test(config.staffRoleId)) {
            roles.push(`**Staff** : <@&${config.staffRoleId}>`);
        }
        
        if (Array.isArray(config.newMemberRoleIds)) {
            const newMemberRoles = config.newMemberRoleIds.filter(id => /^\d+$/.test(id)).map(id => `<@&${id}>`).join(', ');
            if (newMemberRoles) roles.push(`**Nouveaux membres** : ${newMemberRoles}`);
        }
        
        if (Array.isArray(config.forbiddenRoleIds)) {
            const forbiddenRoles = config.forbiddenRoleIds.filter(id => /^\d+$/.test(id)).map(id => `<@&${id}>`).join(', ');
            if (forbiddenRoles) roles.push(`**Rôles interdits** : ${forbiddenRoles}`);
        }
        
        if (roles.length > 0) {
            embed.addFields({ name: '👥 Rôles', value: roles.join('\n'), inline: false });
        }

        // Modal d'entrée
        if (config.entryModal) {
            const modalInfo = [];
            modalInfo.push(`**Titre** : ${config.entryModal.title}`);
            modalInfo.push(`**Nombre de champs** : ${config.entryModal.fields.length}`);
            
            if (config.entryModal.fields.length > 0) {
                const fieldsPreview = config.entryModal.fields.map((field, index) =>
                    `${index + 1}. ${field.label} (${field.required ? 'Requis' : 'Optionnel'})`
                ).join('\n');
                modalInfo.push(`**Champs** :\n${fieldsPreview}`);
            }
            
            embed.addFields({ name: '📝 Modal d\'entrée', value: modalInfo.join('\n'), inline: false });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
        
    } catch (error) {
        console.error('Erreur lors de la lecture de la configuration:', error);
        await interaction.reply({ 
            content: '❌ Erreur lors de la lecture de la configuration.',
            ephemeral: true 
        });
    }
}

async function showConfigInterface(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('⚙️ Configuration Interactive du Serveur')
        .setDescription('Sélectionnez la catégorie de configuration que vous souhaitez modifier :')
        .setColor('#9B59B6')
        .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('config_category_select')
        .setPlaceholder('Choisissez une catégorie...')
        .addOptions([
            {
                label: '📺 Salons',
                description: 'Configurer les salons (logs, confessions, etc.)',
                value: 'channels',
                emoji: '📺'
            },
            {
                label: '📁 Catégories',
                description: 'Configurer les catégories (tickets, modmail, etc.)',
                value: 'categories',
                emoji: '📁'
            },
            {
                label: '👥 Rôles',
                description: 'Configurer les rôles (staff, membres, etc.)',
                value: 'roles',
                emoji: '👥'
            },
            {
                label: '📝 Modal d\'entrée',
                description: 'Configurer les champs du formulaire d\'accès',
                value: 'entry_modal',
                emoji: '📝'
            },
            {
                label: ' Afficher la config',
                description: 'Voir la configuration actuelle',
                value: 'show_config',
                emoji: '📋'
            }
        ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const reply = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true, fetchReply: true });

    const collector = reply.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async i => {
        if (i.customId === 'config_category_select') {
            const category = i.values[0];
            
            if (category === 'show_config') {
                await showCurrentConfig(i);
                return;
            }
            
            await handleCategorySelection(i, category);
        } else if (i.customId === 'config_channel_select' ||
                   i.customId === 'config_category_channel_select' ||
                   i.customId === 'config_role_select') {
            await handleConfigSelection(i);
        } else if (i.customId.startsWith('entry_modal_') ||
                   i.customId.startsWith('select_field_') ||
                   i.customId.startsWith('confirm_delete_') ||
                   i.customId === 'cancel_delete' ||
                   i.customId === 'confirm_reset' ||
                   i.customId === 'cancel_reset') {
            // Ces interactions sont gérées par leurs propres collecteurs
            return;
        }
    });

    collector.on('end', () => {
        // Optionnel: désactiver les composants après expiration
    });
}

async function handleCategorySelection(interaction, category) {
    let embed, selectMenu;

    if (category === 'channels') {
        embed = new EmbedBuilder()
            .setTitle('📺 Configuration des Salons')
            .setDescription('Sélectionnez le salon à configurer :')
            .setColor('#3498DB');

        selectMenu = new StringSelectMenuBuilder()
            .setCustomId('config_channel_select')
            .setPlaceholder('Choisissez un salon...')
            .addOptions([
                {
                    label: 'Salon de logs',
                    description: 'Salon pour les logs généraux',
                    value: 'logChannelId'
                },
                {
                    label: 'Logs de modération',
                    description: 'Salon pour les logs de modération (warn, mute, kick, ban)',
                    value: 'logActionMod'
                },
                {
                    label: 'Salon de confessions',
                    description: 'Salon pour les confessions anonymes',
                    value: 'confessionChannelId'
                },
                {
                    label: 'Logs des tickets',
                    description: 'Salon pour les transcriptions de tickets',
                    value: 'logsTicketsChannelId'
                },
                {
                    label: 'Salon de quiz quotidien',
                    description: 'Salon où les quiz quotidiens seront envoyés',
                    value: 'quizChannelId'
                },
                {
                    label: 'Demandes d\'entrée',
                    description: 'Salon pour les demandes d\'accès au serveur',
                    value: 'entryRequestChannelId'
                },
                {
                    label: 'Logs vocaux',
                    description: 'Salon pour les logs d\'activité vocale',
                    value: 'voiceLogChannelId'
                }
            ]);
    } else if (category === 'categories') {
        embed = new EmbedBuilder()
            .setTitle('📁 Configuration des Catégories')
            .setDescription('Sélectionnez la catégorie à configurer :')
            .setColor('#E67E22');

        selectMenu = new StringSelectMenuBuilder()
            .setCustomId('config_category_channel_select')
            .setPlaceholder('Choisissez une catégorie...')
            .addOptions([
                {
                    label: 'Catégorie Tickets',
                    description: 'Catégorie pour les tickets de support',
                    value: 'ticketCategoryId'
                },
                {
                    label: 'Demandes d\'entrée',
                    description: 'Catégorie pour les demandes d\'accès',
                    value: 'entryRequestCategoryId'
                },
                {
                    label: 'Entrées acceptées',
                    description: 'Catégorie pour les entrées validées',
                    value: 'acceptedEntryCategoryId'
                },
                {
                    label: 'ModMail',
                    description: 'Catégorie pour les tickets ModMail',
                    value: 'modmail.categoryId'
                }
            ]);
    } else if (category === 'roles') {
        embed = new EmbedBuilder()
            .setTitle('👥 Configuration des Rôles')
            .setDescription('Sélectionnez le rôle à configurer :')
            .setColor('#E74C3C');

        selectMenu = new StringSelectMenuBuilder()
            .setCustomId('config_role_select')
            .setPlaceholder('Choisissez un rôle...')
            .addOptions([
                {
                    label: 'Rôles Staff',
                    description: 'Rôles ayant les permissions de modération',
                    value: 'staffRoleId'
                },
                {
                    label: 'Rôle Membre',
                    description: 'Rôle principal des membres',
                    value: 'memberRoleId'
                },
                {
                    label: 'Rôles Nouveaux Membres',
                    description: 'Rôles attribués aux nouveaux arrivants',
                    value: 'newMemberRoleIds'
                },
                {
                    label: 'Rôle Règles Validées',
                    description: 'Rôle pour ceux qui ont accepté le règlement',
                    value: 'reglesValidesId'
                },
                {
                    label: 'Rôles Interdits',
                    description: 'Rôles qui ne peuvent pas faire de demandes',
                    value: 'forbiddenRoleIds'
                }
            ]);
    } else if (category === 'entry_modal') {
        await handleEntryModalConfig(interaction);
        return;
    }

    const row = new ActionRowBuilder().addComponents(selectMenu);
    await interaction.update({ embeds: [embed], components: [row] });
}

async function handleConfigSelection(interaction) {
    const configKey = interaction.values[0];
    const isChannelConfig = interaction.customId === 'config_channel_select' || interaction.customId === 'config_category_channel_select';
    const isRoleConfig = interaction.customId === 'config_role_select';

    let embed, component;

    if (isChannelConfig) {
        embed = new EmbedBuilder()
            .setTitle('📺 Sélection de Salon/Catégorie')
            .setDescription(`Sélectionnez le salon/catégorie pour **${configKey}** :`)
            .setColor('#3498DB');

        const channelTypes = interaction.customId === 'config_category_channel_select' 
            ? [ChannelType.GuildCategory] 
            : [ChannelType.GuildText];

        component = new ChannelSelectMenuBuilder()
            .setCustomId(`config_set_${configKey}`)
            .setPlaceholder('Sélectionnez un salon/catégorie...')
            .setChannelTypes(channelTypes);
    } else if (isRoleConfig) {
        embed = new EmbedBuilder()
            .setTitle('👥 Sélection de Rôle')
            .setDescription(`Sélectionnez le(s) rôle(s) pour **${configKey}** :`)
            .setColor('#E74C3C');

        component = new RoleSelectMenuBuilder()
            .setCustomId(`config_set_${configKey}`)
            .setPlaceholder('Sélectionnez un ou plusieurs rôles...');

        // Permettre la sélection multiple pour certains rôles
        if (['staffRoleId', 'newMemberRoleIds', 'forbiddenRoleIds'].includes(configKey)) {
            component.setMaxValues(10);
        }
    }

    const row = new ActionRowBuilder().addComponents(component);
    await interaction.update({ embeds: [embed], components: [row] });

    // Attendre la sélection
    const filter = i => i.customId === `config_set_${configKey}` && i.user.id === interaction.user.id;
    const collector = interaction.message.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        await saveConfigValue(i, configKey);
        collector.stop();
    });
}

async function saveConfigValue(interaction, configKey) {
    const configPath = path.join(__dirname, '../config.json');
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        
        let newValue;
        if (interaction.isChannelSelectMenu()) {
            newValue = interaction.values[0];
        } else if (interaction.isRoleSelectMenu()) {
            newValue = interaction.values.length === 1 ? interaction.values[0] : interaction.values;
        }

        // Gestion des clés imbriquées
        const keyParts = configKey.split('.');
        let configTarget = config;
        let targetKey = configKey;
        
        if (keyParts.length > 1) {
            for (let i = 0; i < keyParts.length - 1; i++) {
                const part = keyParts[i];
                if (!configTarget[part]) configTarget[part] = {};
                configTarget = configTarget[part];
            }
            targetKey = keyParts[keyParts.length - 1];
        }

        configTarget[targetKey] = newValue;
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        // Log pour diagnostic - vérifier si la config est bien sauvegardée
        console.log(`[CONFIG DEBUG] Configuration mise à jour - ${configKey}: ${JSON.stringify(newValue)}`);
        console.log(`[CONFIG DEBUG] Fichier config.json modifié à: ${new Date().toISOString()}`);
        
        // Forcer le rechargement de la configuration
        const configManager = require('../utils/configManager');
        configManager.forceReload();
        console.log(`[CONFIG DEBUG] Configuration rechargée automatiquement`);
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Configuration mise à jour')
            .setDescription(`**${configKey}** a été configuré avec succès !`)
            .addFields({
                name: 'Nouvelle valeur',
                value: Array.isArray(newValue) 
                    ? newValue.map(id => `<@&${id}>`).join(', ')
                    : (configKey.includes('Channel') || configKey.includes('category')) 
                        ? `<#${newValue}>`
                        : `<@&${newValue}>`,
                inline: false
            })
            .setTimestamp();
        
        await interaction.update({ embeds: [embed], components: [] });

    } catch (error) {
        console.error('Erreur de configuration:', error);
        await interaction.update({ 
            content: `❌ Erreur lors de la mise à jour : ${error.message}`,
            embeds: [],
            components: []
        });
    }
}

async function handleManualConfig(interaction) {
    const key = interaction.options.getString('cle');
    const value = interaction.options.getString('valeur');
    const configPath = path.join(__dirname, '../config.json');

    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        
        const keyParts = key.split('.');
        let configTarget = config;
        let targetKey = key;
        
        if (keyParts.length > 1) {
            for (let i = 0; i < keyParts.length - 1; i++) {
                const part = keyParts[i];
                if (!configTarget[part]) configTarget[part] = {};
                configTarget = configTarget[part];
            }
            targetKey = keyParts[keyParts.length - 1];
        }
        
        const originalType = typeof configTarget[targetKey];
        let parsedValue = value;
        
        if (originalType === 'number') parsedValue = Number(value);
        if (originalType === 'boolean') parsedValue = value === 'true';
        
        if (Array.isArray(configTarget[targetKey])) {
            parsedValue = value.split(',').map(item => item.trim());
            
            if (targetKey.toLowerCase().includes('id')) {
                parsedValue = parsedValue.filter(id => /^\d+$/.test(id));
                
                if (parsedValue.length === 0 && value.trim() !== '') {
                    throw new Error(`Format d'ID invalide. Utilisez uniquement des chiffres séparés par des virgules.`);
                }
            }
        }

        configTarget[targetKey] = parsedValue;
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Configuration mise à jour')
            .addFields(
                { name: 'Clé', value: key, inline: true },
                { name: 'Nouvelle valeur', value: value, inline: true }
            );
        
        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('Erreur de configuration:', error);
        await interaction.reply({ 
            content: `❌ Erreur lors de la mise à jour : ${error.message}`,
            ephemeral: true 
        });
    }
}

// ===== FONCTIONS POUR LA CONFIGURATION DU MODAL D'ENTRÉE =====

async function handleEntryModalConfig(interaction) {
    const configPath = path.join(__dirname, '../config.json');
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        const entryModal = config.entryModal || getDefaultEntryModalConfig();
        
        const embed = new EmbedBuilder()
            .setTitle('📝 Configuration du Modal d\'Entrée')
            .setDescription('Configurez les champs du formulaire de demande d\'accès')
            .setColor('#9B59B6')
            .addFields(
                {
                    name: '📊 État actuel',
                    value: `**${entryModal.fields.length}** champ(s) configuré(s)`,
                    inline: true
                },
                {
                    name: '📋 Titre du modal',
                    value: entryModal.title || 'Formulaire de demande d\'accès',
                    inline: true
                }
            );

        // Afficher un aperçu des champs existants
        if (entryModal.fields.length > 0) {
            const fieldsPreview = entryModal.fields.map((field, index) =>
                `**${index + 1}.** ${field.label} ${field.required ? '(Requis)' : '(Optionnel)'}`
            ).join('\n');
            
            embed.addFields({
                name: '🔍 Champs actuels',
                value: fieldsPreview.length > 1024 ? fieldsPreview.substring(0, 1021) + '...' : fieldsPreview,
                inline: false
            });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('entry_modal_action_select')
            .setPlaceholder('Choisissez une action...')
            .addOptions([
                {
                    label: '➕ Ajouter un champ',
                    description: 'Ajouter un nouveau champ au formulaire',
                    value: 'add_field',
                    emoji: '➕'
                },
                {
                    label: '✏️ Modifier un champ',
                    description: 'Modifier un champ existant',
                    value: 'edit_field',
                    emoji: '✏️'
                },
                {
                    label: '🗑️ Supprimer un champ',
                    description: 'Supprimer un champ du formulaire',
                    value: 'delete_field',
                    emoji: '🗑️'
                },
                {
                    label: '📝 Modifier le titre',
                    description: 'Changer le titre du modal',
                    value: 'edit_title',
                    emoji: '📝'
                },
                {
                    label: '🔄 Réinitialiser',
                    description: 'Remettre la configuration par défaut',
                    value: 'reset_config',
                    emoji: '🔄'
                },
                {
                    label: '👁️ Prévisualiser',
                    description: 'Voir un aperçu du modal configuré',
                    value: 'preview_modal',
                    emoji: '👁️'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        await interaction.update({ embeds: [embed], components: [row] });

        // Collecter les interactions
        const filter = i => i.customId === 'entry_modal_action_select' && i.user.id === interaction.user.id;
        const collector = interaction.message.createMessageComponentCollector({ filter, time: 300000 });

        collector.on('collect', async i => {
            const action = i.values[0];
            
            switch (action) {
                case 'add_field':
                    await handleAddField(i);
                    break;
                case 'edit_field':
                    await handleEditField(i);
                    break;
                case 'delete_field':
                    await handleDeleteField(i);
                    break;
                case 'edit_title':
                    await handleEditTitle(i);
                    break;
                case 'reset_config':
                    await handleResetConfig(i);
                    break;
                case 'preview_modal':
                    await handlePreviewModal(i);
                    break;
            }
        });

    } catch (error) {
        console.error('Erreur lors de la configuration du modal d\'entrée:', error);
        await interaction.update({
            content: '❌ Erreur lors de la lecture de la configuration du modal.',
            embeds: [],
            components: []
        });
    }
}

function getDefaultEntryModalConfig() {
    return {
        title: "Formulaire de demande d'accès",
        fields: [
            {
                customId: 'pseudo_input',
                label: "Quel est votre pseudo principal ?",
                style: 'Short',
                required: true,
                placeholder: 'Ex: SuperJoueur123'
            },
            {
                customId: 'motivation_input',
                label: "Quelles sont vos motivations à rejoindre ?",
                style: 'Paragraph',
                required: true,
                placeholder: 'Décrivez en quelques mots pourquoi vous souhaitez nous rejoindre.'
            },
            {
                customId: 'experience_input',
                label: "Expérience similaire (serveurs, jeux) ?",
                style: 'Paragraph',
                required: false,
                placeholder: 'Si oui, laquelle ?'
            },
            {
                customId: 'rules_input',
                label: "Avez-vous lu et compris le règlement ?",
                style: 'Short',
                required: true,
                placeholder: 'Oui/Non'
            },
            {
                customId: 'anything_else_input',
                label: "Avez-vous quelque chose à ajouter ?",
                style: 'Paragraph',
                required: false,
                placeholder: 'Remarques, questions, etc.'
            }
        ]
    };
}

async function handleAddField(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('➕ Ajouter un Champ')
        .setDescription('Configurez le nouveau champ à ajouter au formulaire')
        .setColor('#27AE60');

    const labelInput = new TextInputBuilder()
        .setCustomId('field_label')
        .setLabel('Question/Label du champ')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Ex: Quel est votre âge ?')
        .setMaxLength(45);

    const placeholderInput = new TextInputBuilder()
        .setCustomId('field_placeholder')
        .setLabel('Texte d\'aide (placeholder)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('Ex: Entrez votre âge en années')
        .setMaxLength(100);

    const styleInput = new TextInputBuilder()
        .setCustomId('field_style')
        .setLabel('Type de champ')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Short (une ligne) ou Paragraph (plusieurs lignes)')
        .setValue('Short');

    const requiredInput = new TextInputBuilder()
        .setCustomId('field_required')
        .setLabel('Champ obligatoire ?')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('true ou false')
        .setValue('true');

    const customIdInput = new TextInputBuilder()
        .setCustomId('field_custom_id')
        .setLabel('ID unique du champ (technique)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Ex: age_input (sans espaces, lettres et _ uniquement)')
        .setMaxLength(100);

    const modal = new ModalBuilder()
        .setCustomId('add_field_modal')
        .setTitle('Nouveau Champ')
        .addComponents(
            new ActionRowBuilder().addComponents(labelInput),
            new ActionRowBuilder().addComponents(placeholderInput),
            new ActionRowBuilder().addComponents(styleInput),
            new ActionRowBuilder().addComponents(requiredInput),
            new ActionRowBuilder().addComponents(customIdInput)
        );

    await interaction.showModal(modal);

    // Attendre la soumission du modal
    const filter = i => i.customId === 'add_field_modal' && i.user.id === interaction.user.id;
    try {
        const modalSubmission = await interaction.awaitModalSubmit({ filter, time: 300000 });
        await saveNewField(modalSubmission);
    } catch (error) {
        console.error('Timeout ou erreur lors de l\'ajout du champ:', error);
    }
}

async function saveNewField(interaction) {
    const configPath = path.join(__dirname, '../config.json');
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        if (!config.entryModal) config.entryModal = getDefaultEntryModalConfig();

        const label = interaction.fields.getTextInputValue('field_label');
        const placeholder = interaction.fields.getTextInputValue('field_placeholder') || '';
        const style = interaction.fields.getTextInputValue('field_style');
        const required = interaction.fields.getTextInputValue('field_required').toLowerCase() === 'true';
        const customId = interaction.fields.getTextInputValue('field_custom_id');

        // Validation
        if (!['Short', 'Paragraph'].includes(style)) {
            throw new Error('Le style doit être "Short" ou "Paragraph"');
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(customId)) {
            throw new Error('L\'ID doit contenir uniquement des lettres, chiffres et underscores, et commencer par une lettre');
        }

        // Vérifier que l'ID n'existe pas déjà
        if (config.entryModal.fields.some(field => field.customId === customId)) {
            throw new Error('Un champ avec cet ID existe déjà');
        }

        // Limiter à 5 champs maximum (limite Discord)
        if (config.entryModal.fields.length >= 5) {
            throw new Error('Maximum 5 champs autorisés par Discord');
        }

        const newField = {
            customId,
            label,
            style,
            required,
            placeholder
        };

        config.entryModal.fields.push(newField);
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Champ ajouté avec succès')
            .setDescription(`Le champ **${label}** a été ajouté au formulaire`)
            .addFields(
                { name: 'Type', value: style, inline: true },
                { name: 'Obligatoire', value: required ? 'Oui' : 'Non', inline: true },
                { name: 'ID', value: customId, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        // Recharger la configuration
        const configManager = require('../utils/configManager');
        configManager.forceReload();

    } catch (error) {
        console.error('Erreur lors de l\'ajout du champ:', error);
        await interaction.reply({
            content: `❌ Erreur lors de l'ajout : ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleEditField(interaction) {
    const configPath = path.join(__dirname, '../config.json');
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        const entryModal = config.entryModal || getDefaultEntryModalConfig();
        
        if (entryModal.fields.length === 0) {
            await interaction.update({
                content: '❌ Aucun champ à modifier. Ajoutez d\'abord des champs.',
                embeds: [],
                components: []
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('✏️ Modifier un Champ')
            .setDescription('Sélectionnez le champ à modifier')
            .setColor('#F39C12');

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_field_to_edit')
            .setPlaceholder('Choisissez un champ...')
            .addOptions(
                entryModal.fields.map((field, index) => ({
                    label: field.label.length > 100 ? field.label.substring(0, 97) + '...' : field.label,
                    description: `${field.style} - ${field.required ? 'Requis' : 'Optionnel'}`,
                    value: index.toString()
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);
        await interaction.update({ embeds: [embed], components: [row] });

        // Attendre la sélection
        const filter = i => i.customId === 'select_field_to_edit' && i.user.id === interaction.user.id;
        const collector = interaction.message.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            const fieldIndex = parseInt(i.values[0]);
            await showEditFieldModal(i, fieldIndex);
            collector.stop();
        });

    } catch (error) {
        console.error('Erreur lors de la modification du champ:', error);
        await interaction.update({
            content: '❌ Erreur lors de la lecture des champs.',
            embeds: [],
            components: []
        });
    }
}

async function showEditFieldModal(interaction, fieldIndex) {
    const configPath = path.join(__dirname, '../config.json');
    const config = JSON.parse(fs.readFileSync(configPath));
    const field = config.entryModal.fields[fieldIndex];

    const labelInput = new TextInputBuilder()
        .setCustomId('field_label')
        .setLabel('Question/Label du champ')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(field.label)
        .setMaxLength(45);

    const placeholderInput = new TextInputBuilder()
        .setCustomId('field_placeholder')
        .setLabel('Texte d\'aide (placeholder)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setValue(field.placeholder || '')
        .setMaxLength(100);

    const styleInput = new TextInputBuilder()
        .setCustomId('field_style')
        .setLabel('Type de champ')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(field.style);

    const requiredInput = new TextInputBuilder()
        .setCustomId('field_required')
        .setLabel('Champ obligatoire ?')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(field.required.toString());

    const customIdInput = new TextInputBuilder()
        .setCustomId('field_custom_id')
        .setLabel('ID unique du champ (technique)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(field.customId)
        .setMaxLength(100);

    const modal = new ModalBuilder()
        .setCustomId(`edit_field_modal_${fieldIndex}`)
        .setTitle('Modifier le Champ')
        .addComponents(
            new ActionRowBuilder().addComponents(labelInput),
            new ActionRowBuilder().addComponents(placeholderInput),
            new ActionRowBuilder().addComponents(styleInput),
            new ActionRowBuilder().addComponents(requiredInput),
            new ActionRowBuilder().addComponents(customIdInput)
        );

    await interaction.showModal(modal);

    // Attendre la soumission
    const filter = i => i.customId === `edit_field_modal_${fieldIndex}` && i.user.id === interaction.user.id;
    try {
        const modalSubmission = await interaction.awaitModalSubmit({ filter, time: 300000 });
        await saveEditedField(modalSubmission, fieldIndex);
    } catch (error) {
        console.error('Timeout ou erreur lors de la modification:', error);
    }
}

async function saveEditedField(interaction, fieldIndex) {
    const configPath = path.join(__dirname, '../config.json');
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        
        const label = interaction.fields.getTextInputValue('field_label');
        const placeholder = interaction.fields.getTextInputValue('field_placeholder') || '';
        const style = interaction.fields.getTextInputValue('field_style');
        const required = interaction.fields.getTextInputValue('field_required').toLowerCase() === 'true';
        const customId = interaction.fields.getTextInputValue('field_custom_id');

        // Validation
        if (!['Short', 'Paragraph'].includes(style)) {
            throw new Error('Le style doit être "Short" ou "Paragraph"');
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(customId)) {
            throw new Error('L\'ID doit contenir uniquement des lettres, chiffres et underscores');
        }

        // Vérifier que l'ID n'existe pas déjà (sauf pour le champ actuel)
        const existingField = config.entryModal.fields.find((field, index) =>
            field.customId === customId && index !== fieldIndex
        );
        if (existingField) {
            throw new Error('Un autre champ avec cet ID existe déjà');
        }

        config.entryModal.fields[fieldIndex] = {
            customId,
            label,
            style,
            required,
            placeholder
        };

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Champ modifié avec succès')
            .setDescription(`Le champ **${label}** a été mis à jour`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        // Recharger la configuration
        const configManager = require('../utils/configManager');
        configManager.forceReload();

    } catch (error) {
        console.error('Erreur lors de la modification:', error);
        await interaction.reply({
            content: `❌ Erreur lors de la modification : ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleDeleteField(interaction) {
    const configPath = path.join(__dirname, '../config.json');
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        const entryModal = config.entryModal || getDefaultEntryModalConfig();
        
        if (entryModal.fields.length === 0) {
            await interaction.update({
                content: '❌ Aucun champ à supprimer.',
                embeds: [],
                components: []
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Supprimer un Champ')
            .setDescription('⚠️ **Attention** : Cette action est irréversible !\nSélectionnez le champ à supprimer')
            .setColor('#E74C3C');

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_field_to_delete')
            .setPlaceholder('Choisissez un champ à supprimer...')
            .addOptions(
                entryModal.fields.map((field, index) => ({
                    label: field.label.length > 100 ? field.label.substring(0, 97) + '...' : field.label,
                    description: `${field.style} - ${field.required ? 'Requis' : 'Optionnel'}`,
                    value: index.toString()
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);
        await interaction.update({ embeds: [embed], components: [row] });

        // Attendre la sélection
        const filter = i => i.customId === 'select_field_to_delete' && i.user.id === interaction.user.id;
        const collector = interaction.message.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            const fieldIndex = parseInt(i.values[0]);
            await confirmDeleteField(i, fieldIndex);
            collector.stop();
        });

    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        await interaction.update({
            content: '❌ Erreur lors de la lecture des champs.',
            embeds: [],
            components: []
        });
    }
}

async function confirmDeleteField(interaction, fieldIndex) {
    const configPath = path.join(__dirname, '../config.json');
    const config = JSON.parse(fs.readFileSync(configPath));
    const field = config.entryModal.fields[fieldIndex];

    const embed = new EmbedBuilder()
        .setTitle('⚠️ Confirmation de Suppression')
        .setDescription(`Êtes-vous sûr de vouloir supprimer ce champ ?\n\n**${field.label}**`)
        .setColor('#E74C3C');

    const confirmButton = new ButtonBuilder()
        .setCustomId(`confirm_delete_${fieldIndex}`)
        .setLabel('Confirmer la suppression')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🗑️');

    const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_delete')
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌');

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
    await interaction.update({ embeds: [embed], components: [row] });

    // Attendre la confirmation
    const filter = i => (i.customId === `confirm_delete_${fieldIndex}` || i.customId === 'cancel_delete') && i.user.id === interaction.user.id;
    const collector = interaction.message.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async i => {
        if (i.customId === `confirm_delete_${fieldIndex}`) {
            await executeDeleteField(i, fieldIndex);
        } else {
            await i.update({
                content: '❌ Suppression annulée.',
                embeds: [],
                components: []
            });
        }
        collector.stop();
    });
}

async function executeDeleteField(interaction, fieldIndex) {
    const configPath = path.join(__dirname, '../config.json');
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        const deletedField = config.entryModal.fields[fieldIndex];
        
        config.entryModal.fields.splice(fieldIndex, 1);
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Champ supprimé')
            .setDescription(`Le champ **${deletedField.label}** a été supprimé du formulaire`)
            .setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });

        // Recharger la configuration
        const configManager = require('../utils/configManager');
        configManager.forceReload();

    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        await interaction.update({
            content: `❌ Erreur lors de la suppression : ${error.message}`,
            embeds: [],
            components: []
        });
    }
}

async function handleEditTitle(interaction) {
    const titleInput = new TextInputBuilder()
        .setCustomId('modal_title')
        .setLabel('Nouveau titre du modal')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Ex: Formulaire de candidature')
        .setMaxLength(45);

    const modal = new ModalBuilder()
        .setCustomId('edit_title_modal')
        .setTitle('Modifier le Titre')
        .addComponents(new ActionRowBuilder().addComponents(titleInput));

    await interaction.showModal(modal);

    // Attendre la soumission
    const filter = i => i.customId === 'edit_title_modal' && i.user.id === interaction.user.id;
    try {
        const modalSubmission = await interaction.awaitModalSubmit({ filter, time: 300000 });
        await saveNewTitle(modalSubmission);
    } catch (error) {
        console.error('Timeout lors de la modification du titre:', error);
    }
}

async function saveNewTitle(interaction) {
    const configPath = path.join(__dirname, '../config.json');
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        if (!config.entryModal) config.entryModal = getDefaultEntryModalConfig();

        const newTitle = interaction.fields.getTextInputValue('modal_title');
        config.entryModal.title = newTitle;
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Titre modifié')
            .setDescription(`Le titre du modal a été changé pour : **${newTitle}**`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        // Recharger la configuration
        const configManager = require('../utils/configManager');
        configManager.forceReload();

    } catch (error) {
        console.error('Erreur lors de la modification du titre:', error);
        await interaction.reply({
            content: `❌ Erreur lors de la modification : ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleResetConfig(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🔄 Réinitialiser la Configuration')
        .setDescription('⚠️ **Attention** : Cette action supprimera tous vos champs personnalisés et remettra la configuration par défaut.\n\nÊtes-vous sûr de vouloir continuer ?')
        .setColor('#E74C3C');

    const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_reset')
        .setLabel('Confirmer la réinitialisation')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔄');

    const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_reset')
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌');

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
    await interaction.update({ embeds: [embed], components: [row] });

    // Attendre la confirmation
    const filter = i => (i.customId === 'confirm_reset' || i.customId === 'cancel_reset') && i.user.id === interaction.user.id;
    const collector = interaction.message.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async i => {
        if (i.customId === 'confirm_reset') {
            await executeReset(i);
        } else {
            await i.update({
                content: '❌ Réinitialisation annulée.',
                embeds: [],
                components: []
            });
        }
        collector.stop();
    });
}

async function executeReset(interaction) {
    const configPath = path.join(__dirname, '../config.json');
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        config.entryModal = getDefaultEntryModalConfig();
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Configuration réinitialisée')
            .setDescription('La configuration du modal d\'entrée a été remise par défaut avec 5 champs standards.')
            .setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });

        // Recharger la configuration
        const configManager = require('../utils/configManager');
        configManager.forceReload();

    } catch (error) {
        console.error('Erreur lors de la réinitialisation:', error);
        await interaction.update({
            content: `❌ Erreur lors de la réinitialisation : ${error.message}`,
            embeds: [],
            components: []
        });
    }
}

async function handlePreviewModal(interaction) {
    const configPath = path.join(__dirname, '../config.json');
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        const entryModal = config.entryModal || getDefaultEntryModalConfig();
        
        const embed = new EmbedBuilder()
            .setTitle('👁️ Aperçu du Modal Configuré')
            .setDescription(`**Titre :** ${entryModal.title}\n**Nombre de champs :** ${entryModal.fields.length}`)
            .setColor('#3498DB');

        // Afficher tous les champs
        entryModal.fields.forEach((field, index) => {
            embed.addFields({
                name: `${index + 1}. ${field.label}`,
                value: `**Type :** ${field.style}\n**Obligatoire :** ${field.required ? 'Oui' : 'Non'}\n**Placeholder :** ${field.placeholder || 'Aucun'}\n**ID :** \`${field.customId}\``,
                inline: true
            });
        });

        if (entryModal.fields.length === 0) {
            embed.addFields({
                name: '⚠️ Aucun champ configuré',
                value: 'Ajoutez des champs pour que le modal fonctionne.',
                inline: false
            });
        }

        await interaction.update({ embeds: [embed], components: [] });

    } catch (error) {
        console.error('Erreur lors de l\'aperçu:', error);
        await interaction.update({
            content: '❌ Erreur lors de la génération de l\'aperçu.',
            embeds: [],
            components: []
        });
    }
}

async function reloadConfig(interaction) {
    const configManager = require('../utils/configManager');
    
    try {
        // Forcer le rechargement de la configuration
        const newConfig = configManager.forceReload();
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🔄 Configuration rechargée')
            .setDescription('La configuration a été rechargée avec succès depuis le fichier config.json')
            .addFields({
                name: 'Statut',
                value: 'Toutes les modifications de configuration sont maintenant actives sans redémarrage',
                inline: false
            })
            .setTimestamp();
        
        console.log('[CONFIG] Configuration rechargée manuellement par', interaction.user.tag);
        
        // Vérification de sécurité avant de répondre
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            console.warn('[CONFIG] Tentative de réponse à une interaction déjà traitée');
        }

    } catch (error) {
        console.error('Erreur lors du rechargement de la configuration:', error);
        
        // Gestion d'erreur robuste
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `❌ Erreur lors du rechargement de la configuration : ${error.message}`,
                    ephemeral: true
                });
            } else if (interaction.deferred && !interaction.replied) {
                await interaction.editReply({
                    content: `❌ Erreur lors du rechargement de la configuration : ${error.message}`
                });
            }
            // Si déjà répondue, ne rien faire
        } catch (replyError) {
            console.error('Impossible de répondre à l\'erreur de configuration:', replyError);
        }
    }
}