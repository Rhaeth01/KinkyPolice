# Système de Configuration Interactive

## Vue d'ensemble

Le nouveau système de configuration offre une interface utilisateur moderne et intuitive pour configurer tous les aspects du bot Discord. Il utilise des menus déroulants pour la sélection des salons et rôles, et des modals pour l'édition de texte.

## Architecture

```
commands/config/
├── configInteractionHandler.js     # Gestionnaire de sessions
├── handlers/
│   └── configInteractionManager.js # Routeur principal d'interactions
├── menus/
│   ├── generalMenu.js              # Configuration générale
│   ├── loggingMenu.js              # Configuration des logs
│   ├── economyMenu.js              # Configuration économique
│   └── entryMenu.js                # Configuration d'entrée et formulaires
└── README.md                       # Cette documentation
```

## Utilisation

### Pour les utilisateurs

1. Utilisez la commande `/config` (nécessite les permissions d'administrateur)
2. Naviguez entre les catégories avec le menu déroulant
3. Configurez les paramètres avec les boutons et menus contextuels
4. Sauvegardez vos changements avec le bouton "💾 Sauvegarder"

### Fonctionnalités principales

- **Sélection de salons** : Menus déroulants avec autocomplétion
- **Sélection de rôles** : Menus déroulants avec validation
- **Édition de texte** : Modals avec validation
- **Boutons de toggle** : Pour activer/désactiver les fonctionnalités
- **Gestion de listes** : Ajout/suppression d'éléments dans les exclusions
- **Navigation intuitive** : Breadcrumb et bouton retour
- **Changements en attente** : Prévisualisation avant sauvegarde

### Catégories disponibles

1. **⚙️ Général** : Préfixe, rôles admin/mod
2. **🚪 Entrée** : Accueil, formulaire d'accès, rôles de vérification
3. **📝 Logs** : Configuration des logs et exclusions
4. **💰 Économie** : Système de points, activités, quiz quotidien
5. **📊 Niveaux** : Système XP et récompenses (à implémenter)
6. **🎮 Jeux** : Configuration des mini-jeux (à implémenter)
7. **🎫 Tickets** : Système de support (à implémenter)
8. **📬 Modmail** : Messages privés staff (à implémenter)

## Sécurité

- **Sessions utilisateur** : Un seul utilisateur peut configurer à la fois
- **Timeout automatique** : Sessions fermées après 5 minutes d'inactivité
- **Validation des permissions** : Vérification des droits admin
- **Validation des données** : Contrôle des valeurs saisies
- **Sauvegarde atomique** : Utilise le système de verrous du configManager

## Développement

### Ajouter une nouvelle catégorie

1. Créez un nouveau fichier dans `menus/` (ex: `ticketsMenu.js`)
2. Implémentez les méthodes statiques :
   - `createEmbed(config, guild)` : Crée l'embed de la catégorie
   - `createComponents()` : Crée les boutons et menus
   - `handle*()` : Gère les interactions spécifiques
3. Ajoutez la catégorie dans `configInteractionHandler.js`
4. Mettez à jour le routeur dans `configInteractionManager.js`

### Structure d'un menu

```javascript
class ExampleMenu {
    static createEmbed(config, guild) {
        // Retourne un EmbedBuilder
    }
    
    static createComponents() {
        // Retourne un array d'ActionRowBuilder
    }
    
    static handleButtonInteraction(interaction, addPendingChanges) {
        // Traite les boutons spécifiques à cette catégorie
    }
}
```

### Gestion des changements

Tous les changements passent par `configInteractionHandler.addPendingChanges()` :

```javascript
const changes = {
    general: {
        prefix: '!'
    }
};
configHandler.addPendingChanges(userId, changes);
```

## Notes techniques

- Utilise Discord.js v14
- Compatible avec le configManager existant
- Gestion automatique des erreurs et timeouts
- Interface responsive (boutons désactivés selon le contexte)
- Breadcrumb navigation pour l'UX

## Limitations actuelles

- Maximum 5 champs par formulaire d'entrée (limitation Discord)
- Certaines catégories ne sont pas encore implémentées
- Pas de système de permissions granulaires par catégorie

## Prochaines étapes

1. Implémenter les catégories manquantes (niveaux, jeux, tickets, modmail)
2. Ajouter le système de webhooks pour les logs
3. Créer des présets de configuration
4. Ajouter l'import/export de configuration
5. Implémenter la validation de configuration en temps réel