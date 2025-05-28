const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUserBalance, removeCurrency } = require('../utils/currencyManager');
const { getMessage } = require('../utils/messageManager');
const shopItems = require('../config/shopItems.json').items;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Affiche les articles disponibles à l\'achat dans la boutique KinkyCoins.')
        .addStringOption(option =>
            option.setName('item_id')
                .setDescription('L\'ID de l\'article à acheter.')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const itemId = interaction.options.getString('item_id');
        const userId = interaction.user.id;
        const userBalance = await getUserBalance(userId);

        if (!itemId) {
            // Afficher la liste des articles
            const shopEmbed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('🛍️ Boutique KinkyCoins')
                .setDescription('Voici les articles disponibles à l\'achat. Utilisez `/shop <item_id>` pour acheter un article.')
                .setFooter({ text: `Votre solde: ${userBalance} KinkyCoins` })
                .setTimestamp();

            shopItems.forEach(item => {
                shopEmbed.addFields({
                    name: `${item.name} (${item.price} KinkyCoins)`,
                    value: `ID: \`${item.id}\`\n${item.description}`,
                    inline: false
                });
            });

            await interaction.editReply({ embeds: [shopEmbed] });

        } else {
            // Tenter d'acheter un article
            const itemToBuy = shopItems.find(item => item.id === itemId);

            if (!itemToBuy) {
                return interaction.editReply({ content: getMessage('shop.itemNotFound', { itemId: itemId }) });
            }

            if (userBalance < itemToBuy.price) {
                return interaction.editReply({ content: getMessage('shop.insufficientFunds', { itemName: itemToBuy.name, price: itemToBuy.price, balance: userBalance }) });
            }

            // Procéder à l'achat
            const success = await removeCurrency(userId, itemToBuy.price);

            if (!success) {
                return interaction.editReply({ content: getMessage('shop.purchaseFailed') });
            }

            let purchaseMessage = getMessage('shop.purchaseSuccess', { itemName: itemToBuy.name, price: itemToBuy.price, newBalance: await getUserBalance(userId) });

            // Logique spécifique au type d'article
            if (itemToBuy.type === 'role') {
                const role = interaction.guild.roles.cache.get(itemToBuy.roleId);
                if (role) {
                    try {
                        await interaction.member.roles.add(role);
                        purchaseMessage += getMessage('shop.roleAdded', { roleName: role.name });
                        // Gérer la durée si c'est un rôle temporaire
                        if (itemToBuy.durationHours) {
                            purchaseMessage += getMessage('shop.roleTemporary', { duration: itemToBuy.durationHours });
                            setTimeout(async () => {
                                if (interaction.member.roles.cache.has(role.id)) {
                                    await interaction.member.roles.remove(role);
                                    // Optionnel: Envoyer un DM à l'utilisateur que le rôle a expiré
                                }
                            }, itemToBuy.durationHours * 60 * 60 * 1000);
                        }
                    } catch (error) {
                        console.error(`Erreur lors de l'attribution du rôle ${role.name} à ${interaction.user.tag}:`, error);
                        purchaseMessage += getMessage('shop.roleAddError', { roleName: role.name });
                        // Rembourser l'utilisateur si le rôle n'a pas pu être ajouté
                        await addCurrency(userId, itemToBuy.price);
                    }
                } else {
                    purchaseMessage += getMessage('shop.roleNotFound', { roleId: itemToBuy.roleId });
                    await addCurrency(userId, itemToBuy.price); // Rembourser
                }
            } else if (itemToBuy.type === 'emoji_pack') {
                purchaseMessage += getMessage('shop.emojiPackUnlocked');
                // Logique pour "débloquer" les emojis (peut être juste un message, ou ajouter à une liste interne)
            }

            await interaction.editReply({ content: purchaseMessage });
        }
    },
};