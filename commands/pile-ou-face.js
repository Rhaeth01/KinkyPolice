const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pile-ou-face')
        .setDescription('Lance une pièce pour jouer à pile ou face')
        .addUserOption(option =>
            option.setName('adversaire')
                .setDescription('Joueur contre qui vous voulez jouer (optionnel)')
                .setRequired(false))
                .addStringOption(option =>
                    option.setName('choix')
                        .setDescription('Choisissez pile ou face (obligatoire pour défier un adversaire)')
                        .setRequired(false)
                .addChoices(
                    { name: 'Pile', value: 'Pile' },
                    { name: 'Face', value: 'Face' }
                )),

    async execute(interaction) {
        // Récupérer les options
        const opponent = interaction.options.getUser('adversaire');
        const userChoice = interaction.options.getString('choix');

        // Emoji et couleur pour l'embed
        const emoji = '😈';
        const color = 0x3498DB; // Bleu (même couleur que dans pendu.js)

        // Si un adversaire est spécifié mais pas de choix, on propose des boutons
        if (opponent && !userChoice) {
            const challengeEmbed = new EmbedBuilder()
                .setTitle(`${emoji} Défi de Pile ou Face`)
                .setDescription(`${interaction.user} défie ${opponent} à un jeu de pile ou face!\n\n${opponent}, faites votre choix:`)
                .setColor(color)
                .setFooter({ text: 'Pile ou Face - Défi' })
                .setTimestamp();

            // Créer les boutons pour choisir
            const pileButton = new ButtonBuilder()
                .setCustomId(`pile_${interaction.user.id}_${opponent.id}`)
                .setLabel('Pile')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🪙');

            const faceButton = new ButtonBuilder()
                .setCustomId(`face_${interaction.user.id}_${opponent.id}`)
                .setLabel('Face')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🎭');

            const row = new ActionRowBuilder().addComponents(pileButton, faceButton);

            // Envoyer le message avec les boutons
            const response = await interaction.reply({
                embeds: [challengeEmbed],
                components: [row],
                fetchReply: true
            });

            // Créer un collecteur pour les boutons
            const filter = i => {
                return (i.customId.startsWith('pile_') || i.customId.startsWith('face_')) &&
                       i.user.id === opponent.id;
            };

            const collector = response.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                const opponentChoice = i.customId.startsWith('pile_') ? 'Pile' : 'Face';
                const challengerChoice = opponentChoice === 'Pile' ? 'Face' : 'Pile';

                // Désactiver les boutons
                pileButton.setDisabled(true);
                faceButton.setDisabled(true);

                await i.update({
                    components: [new ActionRowBuilder().addComponents(pileButton, faceButton)]
                });

                // Lancer la pièce
                await playGame(interaction, challengerChoice, opponentChoice, interaction.user, opponent);
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle(`${emoji} Défi expiré`)
                        .setDescription(`${opponent} n'a pas répondu au défi de ${interaction.user} à temps.`)
                        .setColor('#808080')
                        .setFooter({ text: 'Pile ou Face - Défi expiré' })
                        .setTimestamp();

                    interaction.editReply({
                        embeds: [timeoutEmbed],
                        components: []
                    });
                }
            });

            return;
        }

        // Mode solo ou avec choix prédéfini
        if (!opponent) {
            // Si l'utilisateur n'a pas fait de choix, lui proposer des boutons
            if (!userChoice) {
                const choiceEmbed = new EmbedBuilder()
                    .setTitle(`${emoji} Pile ou Face`)
                    .setDescription(`${interaction.user}, faites votre choix:`)
                    .setColor(color)
                    .setFooter({ text: 'Pile ou Face' })
                    .setTimestamp();

                // Créer les boutons pour choisir
                const pileButton = new ButtonBuilder()
                    .setCustomId(`solo_pile_${interaction.user.id}`)
                    .setLabel('Pile')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🪙');

                const faceButton = new ButtonBuilder()
                    .setCustomId(`solo_face_${interaction.user.id}`)
                    .setLabel('Face')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎭');

                const row = new ActionRowBuilder().addComponents(pileButton, faceButton);

                // Envoyer le message avec les boutons
                const response = await interaction.reply({
                    embeds: [choiceEmbed],
                    components: [row],
                    fetchReply: true
                });

                // Créer un collecteur pour les boutons
                const filter = i => {
                    return (i.customId.startsWith('solo_pile_') || i.customId.startsWith('solo_face_')) &&
                           i.user.id === interaction.user.id;
                };

                const collector = response.createMessageComponentCollector({ filter, time: 60000 });

                collector.on('collect', async i => {
                    const playerChoice = i.customId.startsWith('solo_pile_') ? 'Pile' : 'Face';

                    // Désactiver les boutons
                    pileButton.setDisabled(true);
                    faceButton.setDisabled(true);

                    await i.update({
                        components: [new ActionRowBuilder().addComponents(pileButton, faceButton)]
                    });

                    // Lancer la pièce
                    await playGame(interaction, playerChoice);
                });

                collector.on('end', collected => {
                    if (collected.size === 0) {
                        const timeoutEmbed = new EmbedBuilder()
                            .setTitle(`${emoji} Temps écoulé`)
                            .setDescription(`Vous n'avez pas fait de choix à temps.`)
                            .setColor('#808080')
                            .setFooter({ text: 'Pile ou Face - Temps écoulé' })
                            .setTimestamp();

                        interaction.editReply({
                            embeds: [timeoutEmbed],
                            components: []
                        });
                    }
                });

                return;
            }

            // Si l'utilisateur a déjà fait un choix via l'option
            await playGame(interaction, userChoice);
        } else {
            // Mode 2 joueurs avec choix prédéfini
            const opponentChoice = userChoice === 'Pile' ? 'Face' : 'Pile';
            await playGame(interaction, userChoice, opponentChoice, interaction.user, opponent);
        }
    },
};

async function playGame(interaction, playerChoice, opponentChoice = null, player = null, opponent = null) {
    // Déterminer le résultat aléatoirement
    const result = Math.random() < 0.5 ? 'Pile' : 'Face';

    // Emoji et couleur pour l'embed
    const emoji = '😈';
    const color = 0x9B59B6; // Violet

    // Animation de lancement (émojis)
    const spinEmojis = ['🪙', '💫', '✨', '🌀', '💫', '🪙'];

    // Créer l'embed initial (animation)
    const loadingEmbed = new EmbedBuilder()
        .setTitle(`${emoji} Lancement de la pièce...`)
        .setDescription('La pièce tourne dans les airs...')
        .setColor(color)
        .setFooter({ text: 'Pile ou Face' })
        .setTimestamp();

    // Envoyer ou mettre à jour l'embed initial
    const response = await interaction.editReply({
        embeds: [loadingEmbed],
        components: []
    });

    // Attendre un court instant pour l'effet d'animation
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Déterminer le gagnant
    let resultDescription = '';

    if (opponent) {
        // Mode 2 joueurs
        if (result === playerChoice) {
            resultDescription = `🏆 **${player} a gagné!**\n\n${player} avait choisi **${playerChoice}**\n${opponent} avait choisi **${opponentChoice}**\nLa pièce est tombée sur **${result}**!`;
        } else {
            resultDescription = `🏆 **${opponent} a gagné!**\n\n${player} avait choisi **${playerChoice}**\n${opponent} avait choisi **${opponentChoice}**\nLa pièce est tombée sur **${result}**!`;
        }
    } else {
        // Mode solo
        if (result === playerChoice) {
            resultDescription = `🏆 **Vous avez gagné!**\n\nVous aviez choisi **${playerChoice}**\nLa pièce est tombée sur **${result}**!`;
        } else {
            resultDescription = `💀 **Vous avez perdu!**\n\nVous aviez choisi **${playerChoice}**\nLa pièce est tombée sur **${result}**!`;
        }
    }

    // Créer l'embed final avec le résultat
    const resultEmbed = new EmbedBuilder()
        .setTitle(`${emoji} Résultat : ${result}`)
        .setDescription(resultDescription)
        .setColor(result === playerChoice ? '#2ECC71' : '#E74C3C') // Vert si gagné, rouge si perdu
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    // Ajouter une image ASCII art au lieu d'un GIF
    const pileArt = `\`\`\`
  _______
 /       \\
|  PILE   |
|         |
 \\_______/
\`\`\``;

    const faceArt = `\`\`\`
  _______
 /       \\
|  FACE   |
|         |
 \\_______/
\`\`\``;

    resultEmbed.addFields({ name: 'Résultat', value: result === 'Pile' ? pileArt : faceArt, inline: false });

    // Ajouter un bouton pour rejouer
    const replayButton = new ButtonBuilder()
        .setCustomId(`replay_${interaction.user.id}`)
        .setLabel('Rejouer')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🔄');

    const row = new ActionRowBuilder().addComponents(replayButton);

    // Mettre à jour le message avec le résultat
    const finalResponse = await interaction.editReply({
        embeds: [resultEmbed],
        components: [row]
    });

    // Créer un collecteur pour le bouton rejouer
    const filter = i => i.customId === `replay_${interaction.user.id}` && i.user.id === interaction.user.id;
    const collector = finalResponse.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        // Désactiver le bouton "Rejouer" après le clic
        replayButton.setDisabled(true);
        await i.update({ components: [new ActionRowBuilder().addComponents(replayButton)] });

        // Informer l'utilisateur qu'il peut relancer la commande
        await i.followUp({ content: 'Vous pouvez relancer la commande `/pile-ou-face` pour une nouvelle partie.', ephemeral: true });
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            // Si le temps s'écoule et que le bouton n'est pas cliqué, désactive-le quand même
            replayButton.setDisabled(true);
            interaction.editReply({ components: [new ActionRowBuilder().addComponents(replayButton)] }).catch(console.error);
        }
    });
}
