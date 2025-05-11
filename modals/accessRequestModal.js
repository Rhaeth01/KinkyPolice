const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Crée le modal de demande d'accès
function createAccessRequestModal() {
    const modal = new ModalBuilder()
        .setCustomId('access_request_modal')
        .setTitle('Formulaire de demande d\'accès');

    // Crée les champs de saisie de texte
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
        .setRequired(false) // Optionnel
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

    // Ajoute les champs au modal
    const firstActionRow = new ActionRowBuilder().addComponents(pseudoInput);
    const secondActionRow = new ActionRowBuilder().addComponents(motivationInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(experienceInput);
    const fourthActionRow = new ActionRowBuilder().addComponents(rulesInput);
    const fifthActionRow = new ActionRowBuilder().addComponents(anythingElseInput);

    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);

    return modal;
}

module.exports = { createAccessRequestModal };
