const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const webhookLogger = require('../utils/webhookLogger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('webhook-test')
        .setDescription('Teste le système de webhooks avec des messages d\'exemple (Admin seulement)')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type de log à tester')
                .setRequired(true)
                .addChoices(
                    { name: 'Messages', value: 'messages' },
                    { name: 'Modération', value: 'moderation' },
                    { name: 'Vocal', value: 'voice' },
                    { name: 'Rôles', value: 'roles' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            const testType = interaction.options.getString('type');
            
            console.log(`[WEBHOOK-TEST] Test du type: ${testType}`);
            
            // Créer un embed de test selon le type
            const embed = new EmbedBuilder()
                .setTitle(`🧪 Test du Système - ${testType.charAt(0).toUpperCase() + testType.slice(1)}`)
                .setDescription(`Ceci est un message de test pour vérifier le bon fonctionnement des webhooks.`)
                .addFields([
                    { name: '🎯 Type testé', value: testType, inline: true },
                    { name: '👤 Testé par', value: `${interaction.user}`, inline: true },
                    { name: '🕐 Horodatage', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: false }
                ])
                .setColor('#00FF00')
                .setTimestamp();
            
            // Envoyer selon le type
            let result;
            switch (testType) {
                case 'messages':
                    result = await webhookLogger.log('messageLogs', embed);
                    break;
                case 'moderation':
                    result = await webhookLogger.logModeration('Test Modération', interaction.user, interaction.user, 'Test automatique du système', {
                        color: '#FF8C00'
                    });
                    break;
                case 'voice':
                    result = await webhookLogger.log('voiceLogs', embed);
                    break;
                case 'roles':
                    result = await webhookLogger.log('roleLogs', embed);
                    break;
                default:
                    throw new Error('Type de test non reconnu');
            }
            
            await interaction.editReply({
                content: `✅ Test envoyé pour le type **${testType}**!\n\n` +
                        `🔍 Vérifiez le canal correspondant pour voir si le message est apparu.\n` +
                        `📝 Si le message n'apparaît pas, le système est en mode fallback ou le canal n'est pas configuré.`
            });
            
        } catch (error) {
            console.error('[WEBHOOK-TEST] Erreur:', error);
            
            await interaction.editReply({
                content: `❌ Erreur lors du test: ${error.message}\n\n` +
                        `💡 Cela peut indiquer un problème de configuration des webhooks ou des canaux.`
            });
        }
    },
};