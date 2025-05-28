const { MessageFlags, EmbedBuilder } = require('discord.js');
const { getMessage } = require('./messageManager');

async function handleGameButtons(interaction) {
    try {
        const customId = interaction.customId;
        
        let gameType, action;
        
        if (customId.includes('_replay_')) {
            const parts = customId.split('_replay_');
            gameType = parts[0];
            action = 'replay';
        } else if (customId.includes('_review_')) {
            const parts = customId.split('_review_');
            gameType = parts[0];
            action = 'review';
        }
        
        const gameCommands = {
            'quiz': 'quiz-kinky',
            'anagram': 'anagram-kinky',
            'memory': 'memory-kinky',
            'mystery': 'word-mystery-kinky',
            'guess': 'guess-number',
            'reaction': 'reaction-race'
        };
        
        const commandName = gameCommands[gameType];
        
        if (!commandName) {
            return interaction.reply({
                content: getMessage('errors.gameTypeNotFound'), // Nouveau message
                ephemeral: true
            });
        }
        
        if (action === 'replay') {
            const command = interaction.client.commands.get(commandName);

            if (command) {
                try {
                    await interaction.deferUpdate(); // Acknowledge the button press
                    await command.execute(interaction); // Execute the command
                } catch (executeError) {
                    console.error(`Error executing command ${commandName} from replay button:`, executeError);
                    // interaction.followUp might be needed if deferUpdate was successful but execute failed
                    // For now, try to reply or followUp, ensuring one of them works.
                    const errorMessage = getMessage('errors.commandExecutionError', { commandName: commandName });
                    if (interaction.deferred || interaction.replied) {
                        await interaction.followUp({ content: errorMessage, ephemeral: true }).catch(console.error);
                    } else {
                        await interaction.reply({ content: errorMessage, ephemeral: true }).catch(console.error);
                    }
                }
            } else {
                await interaction.reply({
                    content: getMessage('errors.commandNotFound', { commandName: commandName }), // Assuming this key exists or will be added
                    ephemeral: true
                });
            }
        } else if (action === 'review') {
            if (gameType === 'quiz') {
                const { getFinishedQuizGameData } = require('../commands/games/quiz-kinky');
                const gameId = customId.split('_').pop();
                const gameData = getFinishedQuizGameData(gameId);

                if (!gameData) {
                    return interaction.reply({
                        content: getMessage('quizGame.reviewDataNotFound'),
                        ephemeral: true
                    });
                }

                const reviewEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(getMessage('quizGame.reviewTitle', { username: gameData.player.username }))
                    .setDescription(getMessage('quizGame.reviewDescription'))
                    .setTimestamp();

                gameData.answers.forEach((answer, index) => {
                    const emoji = answer.isCorrect ? '✅' : '❌';
                    reviewEmbed.addFields({
                        name: getMessage('quizGame.reviewQuestionTitle', { index: index + 1, question: answer.question }),
                        value: getMessage('quizGame.reviewQuestionDetails', {
                            userAnswer: answer.userAnswer !== -1 ? gameData.questions[index].options[answer.userAnswer] : getMessage('quizGame.timeoutAnswer'),
                            correctAnswer: gameData.questions[index].options[answer.correctAnswer],
                            explanation: answer.explanation,
                            resultEmoji: emoji,
                            resultText: answer.isCorrect ? getMessage('quizGame.correct') : getMessage('quizGame.incorrect')
                        }),
                        inline: false
                    });
                });

                await interaction.reply({ embeds: [reviewEmbed], ephemeral: true });

            } else {
                await interaction.reply({
                    content: getMessage('quizGame.reviewNotAvailable'),
                    ephemeral: true
                });
            }
        }
        
    } catch (error) {
        console.error('Erreur dans la gestion des boutons de jeux:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: getMessage('errors.genericActionError'), // Nouveau message
                ephemeral: true
            }).catch(console.error);
        }
    }
}

module.exports = {
    handleGameButtons
};