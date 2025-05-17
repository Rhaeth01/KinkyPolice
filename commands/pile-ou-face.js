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
        const color = 0x3498DB; // Bleu

        // Vérifier que l'utilisateur ne se défie pas lui-même
        if (opponent && opponent.id === interaction.user.id) {
            return interaction.reply({
                content: "Vous ne pouvez pas vous défier vous-même !",
                ephemeral: true
            });
        }

        // Si un adversaire est spécifié mais pas de choix, on propose des boutons
        if (opponent && !userChoice) {
            const challengeEmbed = new EmbedBuilder()
                .setTitle(`${emoji} Défi de Pile ou Face`)
                .setDescription(`${interaction.user} défie ${opponent} à un jeu de pile ou face!\n\n${interaction.user}, faites votre choix:`)
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
                    i.user.id === interaction.user.id;
            };

            const collector = response.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                const challengerChoice = i.customId.startsWith('pile_') ? 'Pile' : 'Face';
                const opponentChoice = challengerChoice === 'Pile' ? 'Face' : 'Pile';

                // Désactiver les boutons
                pileButton.setDisabled(true);
                faceButton.setDisabled(true);

                await i.update({
                    components: [new ActionRowBuilder().addComponents(pileButton, faceButton)]
                });

                // Lancer la pièce
                await playGame(i, challengerChoice, opponentChoice, interaction.user, opponent);
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle(`${emoji} Défi expiré`)
                        .setDescription(`${interaction.user} n'a pas fait son choix à temps.`)
                        .setColor('#808080')
                        .setFooter({ text: 'Pile ou Face - Défi expiré' })
                        .setTimestamp();

                    // Désactiver les boutons
                    pileButton.setDisabled(true);
                    faceButton.setDisabled(true);
                    
                    interaction.editReply({
                        embeds: [timeoutEmbed],
                        components: [new ActionRowBuilder().addComponents(pileButton, faceButton)]
                    }).catch(console.error);
                }
            });
        }
        // Si aucun choix n'est fait (et pas d'adversaire), proposer des boutons
        else if (!userChoice) {
            const choiceEmbed = new EmbedBuilder()
                .setTitle(`${emoji} Pile ou Face`)
                .setDescription('Choisissez pile ou face pour lancer la pièce:')
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
                return i.customId.startsWith('solo_') && i.user.id === interaction.user.id;
            };

            const collector = response.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                const choice = i.customId.includes('pile') ? 'Pile' : 'Face';

                // Désactiver les boutons
                pileButton.setDisabled(true);
                faceButton.setDisabled(true);

                await i.update({
                    components: [new ActionRowBuilder().addComponents(pileButton, faceButton)]
                });

                // Lancer la pièce
                await playGame(i, choice);
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    // Si aucune interaction n'a été collectée
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle(`${emoji} Temps écoulé`)
                        .setDescription('Vous n\'avez pas fait de choix à temps.')
                        .setColor('#808080')
                        .setFooter({ text: 'Pile ou Face - Temps écoulé' })
                        .setTimestamp();

                    // Désactiver les boutons
                    pileButton.setDisabled(true);
                    faceButton.setDisabled(true);

                    interaction.editReply({
                        embeds: [timeoutEmbed],
                        components: [new ActionRowBuilder().addComponents(pileButton, faceButton)]
                    }).catch(console.error);
                }
            });
        }
        // Si un choix est directement spécifié
        else {
            // Jeu contre un adversaire
            if (opponent) {
                // L'adversaire aura automatiquement l'autre choix
                const opponentChoice = userChoice === 'Pile' ? 'Face' : 'Pile';
                
                // Informer que le jeu commence
                await interaction.reply({
                    content: `${interaction.user} a choisi **${userChoice}** et défie ${opponent} qui aura **${opponentChoice}**!`,
                    fetchReply: true
                });
                
                // Lancer la pièce
                await playGame(interaction, userChoice, opponentChoice, interaction.user, opponent);
            }
            // Jeu solo
            else {
                await interaction.reply({
                    content: `Vous avez choisi **${userChoice}**!`,
                    fetchReply: true
                });
                
                // Lancer la pièce
                await playGame(interaction, userChoice);
            }
        }
    }
};

async function playGame(interaction, playerChoice, opponentChoice = null, player = null, opponent = null) {
    // Déterminer le résultat aléatoirement
    const result = Math.random() < 0.5 ? 'Pile' : 'Face';

    // Emoji et couleur pour l'embed
    const emoji = '😈';
    const color = 0x9B59B6; // Violet

    // Créer l'embed initial (animation)
    const loadingEmbed = new EmbedBuilder()
        .setTitle(`${emoji} Lancement de la pièce...`)
        .setDescription('La pièce tourne dans les airs...')
        .setColor(color)
        .setFooter({ text: 'Pile ou Face' })
        .setTimestamp();

    // Envoyer ou mettre à jour l'embed initial
    let response;
    try {
        response = await interaction.followUp({
            embeds: [loadingEmbed],
            fetchReply: true
        });
    } catch (error) {
        // Si followUp échoue, essayer editReply
        response = await interaction.editReply({
            embeds: [loadingEmbed]
        });
    }

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
    try {
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
            await i.followUp({ 
                content: 'Vous pouvez relancer la commande `/pile-ou-face` pour une nouvelle partie.', 
                ephemeral: true 
            });
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                // Si le temps s'écoule et que le bouton n'est pas cliqué, désactive-le quand même
                replayButton.setDisabled(true);
                interaction.editReply({ 
                    components: [new ActionRowBuilder().addComponents(replayButton)] 
                }).catch(console.error);
            }
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du résultat:', error);
        try {
            await interaction.followUp({
                content: `**Résultat:** La pièce est tombée sur **${result}**!`,
                ephemeral: true
            });
        } catch (followUpError) {
            console.error('Erreur lors de la tentative de followUp:', followUpError);
        }
    }
}
