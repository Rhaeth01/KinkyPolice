const { Permissions } = require('discord.js');

module.exports = {
    name: 'ban',
    description: 'Bannir un utilisateur',
    async execute(interaction) {
        const targetMember = interaction.options.getMember('user'); // L'utilisateur ciblé
        const executorMember = interaction.member; // L'utilisateur qui exécute la commande

        // Vérifier si l'utilisateur ciblé existe
        if (!targetMember) {
            return interaction.reply({ content: "Utilisateur introuvable.", ephemeral: true });
        }

        // Vérifier si l'utilisateur qui exécute la commande a un rôle supérieur
        if (executorMember.roles.highest.position <= targetMember.roles.highest.position) {
            return interaction.reply({
                content: "Vous ne pouvez pas utiliser cette commande sur un utilisateur ayant un rôle égal ou supérieur au vôtre.",
                ephemeral: true
            });
        }

        // Vérifier si l'utilisateur a la permission de bannir
        if (!executorMember.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
            return interaction.reply({
                content: "Vous n'avez pas la permission de bannir des membres.",
                ephemeral: true
            });
        }

        // Vérifier si le bot peut bannir l'utilisateur
        if (!targetMember.bannable) {
            return interaction.reply({
                content: "Je ne peux pas bannir cet utilisateur.",
                ephemeral: true
            });
        }

        // Bannir l'utilisateur
        await targetMember.ban({ reason: 'Violation des règles' });
        return interaction.reply({ content: `${targetMember.user.tag} a été banni avec succès.` });
    },
};