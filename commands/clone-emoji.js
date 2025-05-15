const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clone-emoji')
    .setDescription("Clone un emoji depuis un lien")
    .addStringOption(option =>
      option.setName('url')
        .setDescription('Lien de l\'emoji à cloner')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('nom')
        .setDescription('Nom pour le nouvel emoji')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers),

  async execute(interaction) {
    const url = interaction.options.getString('url');
    const name = interaction.options.getString('nom').replace(/[^a-zA-Z0-9_]/g, '');

    // Vérification du format de l'URL
    if (!url.match(/https?:\/\/.+.(png|jpe?g|webp|gif)/)) {
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setDescription('❌ URL d\'emoji invalide. Utilisez un lien direct vers une image.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      // Création de l'emoji
      const emoji = await interaction.guild.emojis.create({
        attachment: url,
        name: name
      });

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setDescription(`✅ Emoji ${emoji} cloné avec succès sous le nom \`${name}\``);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setDescription('❌ Erreur lors du clonage - Vérifiez les permissions du bot et la validité de l\'image.');
      interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};