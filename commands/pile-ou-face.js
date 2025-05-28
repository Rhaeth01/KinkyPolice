const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { addCurrency, removeCurrency, getUserBalance } = require('../utils/currencyManager');

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
                ))
        .addIntegerOption(option =>
            option.setName('mise')
                .setDescription('Le montant de Kinky Points à miser pour cette partie.')
                .setRequired(false)
                .setMinValue(1)),

    async execute(interaction) {
        // Récupérer les options
        const opponent = interaction.options.getUser('adversaire');
        const userChoice = interaction.options.getString('choix');
        const betAmount = interaction.options.getInteger('mise') || 0;

        if (betAmount > 0) {
            const userBalance = await getUserBalance(interaction.user.id);
            if (userBalance < betAmount) {
                return interaction.reply({
                    content: `Tu n'as pas assez de Kinky Points pour miser ${betAmount} ! Ton solde actuel est de ${userBalance} Kinky Points.`,
                    ephemeral: true
                });
            }
            await removeCurrency(interaction.user.id, betAmount);
        }

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

            // Attendre le choix de l'utilisateur
            try {
                const filter = i => [
                    `pile_${interaction.user.id}_${opponent.id}`,
                    `face_${interaction.user.id}_${opponent.id}`
                ].includes(i.customId) && i.user.id === interaction.user.id;

                const challengerChoice = await response.awaitMessageComponent({ filter, time: 30000 });
                const playerChoice = challengerChoice.customId.startsWith('pile_') ? 'Pile' : 'Face';
                const opponentChoice = playerChoice === 'Pile' ? 'Face' : 'Pile';
                
                // Désactiver les boutons
                pileButton.setDisabled(true);
                faceButton.setDisabled(true);
                
                await challengerChoice.update({
                    content: `${interaction.user} a choisi ${playerChoice} et défie ${opponent} qui aura ${opponentChoice}!`,
                    components: [new ActionRowBuilder().addComponents(pileButton, faceButton)]
                });
                
                // Jouer la partie
                await playGame(interaction, playerChoice, opponentChoice, interaction.user, opponent, betAmount);
                
            } catch (error) {
                // En cas d'erreur ou de timeout
                console.error(error);
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle(`${emoji} Défi expiré`)
                    .setDescription(`${interaction.user} n'a pas fait son choix à temps. Défi annulé.`)
                    .setColor('#E74C3C')
                    .setFooter({ text: 'Pile ou Face - Défi expiré' })
                    .setTimestamp();
                    
                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: []
                }).catch(console.error);

                // Rembourser la mise si le défi expire
                if (betAmount > 0) {
                    await addCurrency(interaction.user.id, betAmount);
                    await interaction.followUp({ content: `Votre mise de ${betAmount} Kinky Points a été remboursée.`, ephemeral: true });
                }
            }
            
            return;
        }

        // Si aucun adversaire et pas de choix, on propose à l'utilisateur de choisir
        if (!opponent && !userChoice) {
            const soloEmbed = new EmbedBuilder()
                .setTitle(`${emoji} Pile ou Face`)
                .setDescription(`Choisissez pile ou face:`)
                .setColor(color)
                .setFooter({ text: 'Pile ou Face' })
                .setTimestamp();

            // Créer les boutons pour choisir
            const pileButton = new ButtonBuilder()
                .setCustomId(`pile_solo_${interaction.user.id}`)
                .setLabel('Pile')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🪙');

            const faceButton = new ButtonBuilder()
                .setCustomId(`face_solo_${interaction.user.id}`)
                .setLabel('Face')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🎭');

            const row = new ActionRowBuilder().addComponents(pileButton, faceButton);

            // Envoyer le message avec les boutons
            const soloResponse = await interaction.reply({
                embeds: [soloEmbed],
                components: [row],
                fetchReply: true
            });

            // Attendre le choix de l'utilisateur
            try {
                const filter = i => [
                    `pile_solo_${interaction.user.id}`,
                    `face_solo_${interaction.user.id}`
                ].includes(i.customId) && i.user.id === interaction.user.id;

                const userInteraction = await soloResponse.awaitMessageComponent({ filter, time: 30000 });
                const playerChoice = userInteraction.customId.startsWith('pile_') ? 'Pile' : 'Face';
                
                // Désactiver les boutons
                pileButton.setDisabled(true);
                faceButton.setDisabled(true);
                
                await userInteraction.update({
                    components: [new ActionRowBuilder().addComponents(pileButton, faceButton)]
                });
                
                // Jouer la partie
                await playGame(interaction, playerChoice, null, interaction.user, null, betAmount);
                
            } catch (error) {
                // En cas d'erreur ou de timeout
                console.error(error);
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle(`${emoji} Temps écoulé`)
                    .setDescription(`Vous n'avez pas fait votre choix à temps.`)
                    .setColor('#E74C3C')
                    .setFooter({ text: 'Pile ou Face - Temps écoulé' })
                    .setTimestamp();
                    
                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: []
                }).catch(console.error);

                // Rembourser la mise si le temps expire
                if (betAmount > 0) {
                    await addCurrency(interaction.user.id, betAmount);
                    await interaction.followUp({ content: `Votre mise de ${betAmount} Kinky Points a été remboursée.`, ephemeral: true });
                }
            }
            
            return;
        }

        // Si l'utilisateur a spécifié son choix directement (avec ou sans adversaire)
        if (userChoice) {
            if (opponent) {
                const opponentChoice = userChoice === 'Pile' ? 'Face' : 'Pile';
                await interaction.reply(`${interaction.user} a choisi ${userChoice} et défie ${opponent} qui aura ${opponentChoice}!`);
                await playGame(interaction, userChoice, opponentChoice, interaction.user, opponent, betAmount);
            } else {
                await interaction.reply(`${interaction.user} a choisi ${userChoice}!`);
                await playGame(interaction, userChoice, null, interaction.user, null, betAmount);
            }
        }
    }
};

async function playGame(interaction, playerChoice, opponentChoice = null, player = null, opponent = null, betAmount = 0) {
    // Déterminer le résultat aléatoirement
    const result = Math.random() < 0.5 ? 'Pile' : 'Face';
    let winnings = 0;

    // Emoji et couleur pour l'embed
    const emoji = '😈';
    const color = 0x9B59B6; // Violet

    // Créer l'embed initial (animation)
    const loadingEmbed = new EmbedBuilder()
        .setTitle(`${emoji} Lancement de la pièce...`)
        .setDescription('La pièce tourne dans les airs...')
        .setColor(color)
        .setFooter({ text: 'Pile ou Face • ' + new Date().toLocaleTimeString() })
        .setTimestamp();

    // Utiliser une description avec une animation ASCII au lieu d'une image
    loadingEmbed.setDescription(`
La pièce tourne dans les airs...
\`\`\`
      ____
     /    \\
    |      |
     \\____/
\`\`\`
`);

    // Envoyer l'animation comme premier message
    let response;
    try {
        // Nouvelle réponse pour l'animation
        response = await interaction.followUp({
            embeds: [loadingEmbed],
            fetchReply: true
        });

        // Attendre un court instant pour l'effet d'animation
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Déterminer le gagnant
        let resultDescription = '';

        if (opponent) {
            // Mode 2 joueurs
            if (result === playerChoice) {
                resultDescription = `🏆 **${player} a gagné!**\n\n${player} avait choisi **${playerChoice}**\n${opponent} avait choisi **${opponentChoice}**\nLa pièce est tombée sur **${result}**!`;
                winnings = betAmount > 0 ? betAmount * 2 : 10; // Gain de base ou double de la mise
                await addCurrency(player.id, winnings);
                resultDescription += `\n\n💰 ${player} gagne **${winnings}** Kinky Points !`;
            } else {
                resultDescription = `🏆 **${opponent} a gagné!**\n\n${player} avait choisi **${playerChoice}**\n${opponent} avait choisi **${opponentChoice}**\nLa pièce est tombée sur **${result}**!`;
                winnings = betAmount > 0 ? betAmount * 2 : 10; // Gain de base ou double de la mise
                await addCurrency(opponent.id, winnings);
                resultDescription += `\n\n💰 ${opponent} gagne **${winnings}** Kinky Points !`;
            }
        } else {
            // Mode solo
            if (result === playerChoice) {
                resultDescription = `🏆 **Vous avez gagné!**\n\nVous aviez choisi **${playerChoice}**\nLa pièce est tombée sur **${result}**!`;
                winnings = betAmount > 0 ? betAmount * 2 : 10; // Gain de base ou double de la mise
                await addCurrency(player.id, winnings);
                resultDescription += `\n\n💰 Vous gagnez **${winnings}** Kinky Points !`;
            } else {
                resultDescription = `💀 **Vous avez perdu!**\n\nVous aviez choisi **${playerChoice}**\nLa pièce est tombée sur **${result}**!`;
                if (betAmount > 0) {
                    resultDescription += `\n\n💸 Vous perdez votre mise de **${betAmount}** Kinky Points.`;
                }
            }
        }

        // Créer l'embed final avec le résultat
        const resultEmbed = new EmbedBuilder()
            .setTitle(`${emoji} Résultat : ${result}`)
            .setColor(result === playerChoice ? '#2ECC71' : '#E74C3C') // Vert si gagné, rouge si perdu
            .setFooter({ text: `Demandé par ${interaction.user.username}` })
            .setTimestamp();

        // Utiliser ASCII art pour le résultat
        if (result === 'Pile') {
            resultEmbed.setDescription(`${resultDescription}\n\n\`\`\`
  _________
 /         \\
|   PILE    |
 \\_________/
\`\`\``);
        } else {
            resultEmbed.setDescription(`${resultDescription}\n\n\`\`\`
  _________
 /         \\
|   FACE    |
 \\_________/
\`\`\``);
        }

        // Ajouter un bouton pour rejouer
        const replayButton = new ButtonBuilder()
            .setCustomId(`replay_${interaction.user.id}`)
            .setLabel('Rejouer')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔄');

        const row = new ActionRowBuilder().addComponents(replayButton);

        // Créer un NOUVEAU message avec le résultat (au lieu de modifier le message d'animation)
        const resultResponse = await interaction.followUp({
            embeds: [resultEmbed],
            components: [row],
            fetchReply: true
        });

        // Créer un collecteur pour le bouton rejouer
        const filter = i => i.customId === `replay_${interaction.user.id}` && i.user.id === interaction.user.id;
        const collector = resultResponse.createMessageComponentCollector({ filter, time: 60000 });

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
                try {
                    resultResponse.edit({ 
                        components: [new ActionRowBuilder().addComponents(replayButton)] 
                    }).catch(console.error);
                } catch (error) {
                    console.error("Impossible de désactiver le bouton:", error);
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors du jeu:', error);
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
