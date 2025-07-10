const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');
const fs = require('node:fs');
const path = require('node:path');

// Chemin vers le fichier qui stockera le compteur de confessions
const confessionCounterPath = path.join(__dirname, '..', 'data', 'confessionCounter.json');

// Fonction pour obtenir le numéro de confession actuel
function getConfessionCounter() {
    try {
        if (fs.existsSync(confessionCounterPath)) {
            const data = fs.readFileSync(confessionCounterPath, 'utf8');
            return JSON.parse(data).counter || 0;
        }
        return 0;
    } catch (error) {
        console.error('Erreur lors de la lecture du compteur de confessions:', error);
        return 0;
    }
}

// Fonction pour incrémenter et sauvegarder le compteur
function incrementConfessionCounter() {
    try {
        const counter = getConfessionCounter() + 1;
        
        // Assurer que le répertoire data existe
        const dataDir = path.dirname(confessionCounterPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(confessionCounterPath, JSON.stringify({ counter }), 'utf8');
        return counter;
    } catch (error) {
        console.error('Erreur lors de l\'incrémentation du compteur de confessions:', error);
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('confession')
        .setDescription('Envoie une confession anonyme')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('ConFESSE toi')
                .setRequired(true)),
    
    // Définir un cooldown de 2 minutes (120000 ms)
    cooldown: 120,
    
    async execute(interaction) {
        // Récupérer le message de la confession
        const message = interaction.options.getString('message');
        
        // Récupérer le salon de confession avec la configuration dynamique
        const confessionChannelId = configManager.confessionChannelId;
        console.log(`[CONFIG DEBUG] confessionChannelId utilisé dans /confession: ${confessionChannelId}`);
        
        const confessionChannel = interaction.client.channels.cache.get(confessionChannelId);
        if (!confessionChannel) {
            return interaction.reply({
                content: 'Le salon de confession n\'est pas configuré correctement. Veuillez contacter un administrateur.',
                ephemeral: true
            });
        }
        
        // Incrémenter le compteur de confessions
        const confessionNumber = incrementConfessionCounter();
        if (confessionNumber === null) {
            return interaction.reply({ 
                content: 'Une erreur est survenue lors de l\'enregistrement de votre confession. Veuillez réessayer.', 
                ephemeral: true 
            });
        }
        
        // Créer l'embed de confession
        const confessionEmbed = new EmbedBuilder()
            .setColor(0x9B59B6) // Couleur violette
            .setTitle(`Confession Anonyme #${confessionNumber} 😈`)
            .setDescription(message)
            .setTimestamp();
        
        // Envoyer la confession dans le salon dédié
        await confessionChannel.send({ embeds: [confessionEmbed] });
        
        // Vérifier si les logs sont activés et envoyer dans le canal de logs
        const config = configManager.getConfig();
        if (config.confession?.logsEnabled && config.confession?.logsChannel) {
            const logsChannelId = config.confession.logsChannel;
            const logsChannel = interaction.client.channels.cache.get(logsChannelId);
            
            if (logsChannel) {
                // Créer l'embed de log
                const logEmbed = new EmbedBuilder()
                    .setColor(0x9B59B6) // Même couleur que la confession
                    .setTitle(`📋 Log Confession #${confessionNumber}`)
                    .setDescription(`**Auteur:** ${interaction.user} (${interaction.user.tag})\n**ID:** \`${interaction.user.id}\``)
                    .addFields(
                        {
                            name: '💬 Contenu de la confession',
                            value: message.length > 1024 ? message.substring(0, 1021) + '...' : message,
                            inline: false
                        },
                        {
                            name: '📊 Informations',
                            value: `**Numéro:** #${confessionNumber}\n**Canal:** ${confessionChannel}\n**Heure:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                            inline: false
                        }
                    )
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 64 }))
                    .setTimestamp()
                    .setFooter({ text: `Confession #${confessionNumber} • ID Auteur: ${interaction.user.id}` });
                
                try {
                    await logsChannel.send({ embeds: [logEmbed] });
                } catch (error) {
                    console.error('[CONFESSION] Erreur lors de l\'envoi du log:', error);
                }
            } else {
                console.warn('[CONFESSION] Canal de logs configuré mais introuvable:', logsChannelId);
            }
        }
        
        // Confirmer à l'utilisateur que sa confession a été envoyée
        await interaction.reply({ 
            content: 'Votre confession a été envoyée anonymement !', 
            ephemeral: true 
        });
    },
};