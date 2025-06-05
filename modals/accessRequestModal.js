const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// Crée le modal de demande d'accès avec configuration dynamique
function createAccessRequestModal() {
    const configPath = path.join(__dirname, '../config.json');
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        const entryModal = config.entryModal || getDefaultEntryModalConfig();
        
        const modal = new ModalBuilder()
            .setCustomId('access_request_modal')
            .setTitle(entryModal.title || 'Formulaire de demande d\'accès');

        // Créer les champs dynamiquement à partir de la configuration
        const actionRows = [];
        
        for (const fieldConfig of entryModal.fields) {
            const textInput = new TextInputBuilder()
                .setCustomId(fieldConfig.customId)
                .setLabel(fieldConfig.label)
                .setStyle(fieldConfig.style === 'Short' ? TextInputStyle.Short : TextInputStyle.Paragraph)
                .setRequired(fieldConfig.required);
            
            if (fieldConfig.placeholder) {
                textInput.setPlaceholder(fieldConfig.placeholder);
            }
            
            const actionRow = new ActionRowBuilder().addComponents(textInput);
            actionRows.push(actionRow);
            
            // Discord limite à 5 champs par modal
            if (actionRows.length >= 5) break;
        }
        
        // Si aucun champ configuré, utiliser la configuration par défaut
        if (actionRows.length === 0) {
            console.warn('[MODAL] Aucun champ configuré, utilisation de la configuration par défaut');
            return createDefaultModal();
        }
        
        modal.addComponents(...actionRows);
        return modal;
        
    } catch (error) {
        console.error('[MODAL] Erreur lors de la lecture de la configuration, utilisation des valeurs par défaut:', error);
        return createDefaultModal();
    }
}

// Configuration par défaut si aucune configuration n'est trouvée
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

// Modal par défaut en cas d'erreur
function createDefaultModal() {
    const modal = new ModalBuilder()
        .setCustomId('access_request_modal')
        .setTitle('Formulaire de demande d\'accès');

    const pseudoInput = new TextInputBuilder()
        .setCustomId('pseudo_input')
        .setLabel("Quel est votre pseudo principal ?")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Ex: SuperJoueur123');

    const motivationInput = new TextInputBuilder()
        .setCustomId('motivation_input')
        .setLabel("Quelles sont vos motivations à rejoindre ?")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('Décrivez en quelques mots pourquoi vous souhaitez nous rejoindre.');

    const experienceInput = new TextInputBuilder()
        .setCustomId('experience_input')
        .setLabel("Expérience similaire (serveurs, jeux) ?")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setPlaceholder('Si oui, laquelle ?');

    const rulesInput = new TextInputBuilder()
        .setCustomId('rules_input')
        .setLabel("Avez-vous lu et compris le règlement ?")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Oui/Non');

    const anythingElseInput = new TextInputBuilder()
        .setCustomId('anything_else_input')
        .setLabel("Avez-vous quelque chose à ajouter ?")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setPlaceholder('Remarques, questions, etc.');

    const firstActionRow = new ActionRowBuilder().addComponents(pseudoInput);
    const secondActionRow = new ActionRowBuilder().addComponents(motivationInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(experienceInput);
    const fourthActionRow = new ActionRowBuilder().addComponents(rulesInput);
    const fifthActionRow = new ActionRowBuilder().addComponents(anythingElseInput);

    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);
    return modal;
}

module.exports = { createAccessRequestModal };
