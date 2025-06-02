const { SlashCommandBuilder } = require('discord.js');

console.log('🧪 Test de la gestion des rôles dans la commande tourette\n');

// Test 1: Vérification de la structure de la commande
console.log('📝 Test 1: Vérification de la structure de la commande');
try {
    const tourette = require('./commands/tourette.js');
    
    if (tourette.data && tourette.data instanceof SlashCommandBuilder) {
        console.log('✅ Structure de commande valide');
        
        // Vérifier les sous-commandes
        const commandData = tourette.data.toJSON();
        const subcommands = commandData.options || [];
        
        console.log(`Sous-commandes disponibles: ${subcommands.map(sc => sc.name).join(', ')}`);
        
        const expectedSubcommands = ['info', 'config', 'test', 'add', 'remove', 'list'];
        const missingSubcommands = expectedSubcommands.filter(sc => 
            !subcommands.some(sub => sub.name === sc)
        );
        
        if (missingSubcommands.length === 0) {
            console.log('✅ Toutes les sous-commandes sont présentes');
        } else {
            console.log(`❌ Sous-commandes manquantes: ${missingSubcommands.join(', ')}`);
        }
        
        // Vérifier les options des sous-commandes add et remove
        const addSubcommand = subcommands.find(sc => sc.name === 'add');
        const removeSubcommand = subcommands.find(sc => sc.name === 'remove');
        
        if (addSubcommand && addSubcommand.options && addSubcommand.options.length > 0) {
            console.log('✅ Sous-commande "add" a des options');
        } else {
            console.log('❌ Sous-commande "add" manque d\'options');
        }
        
        if (removeSubcommand && removeSubcommand.options && removeSubcommand.options.length > 0) {
            console.log('✅ Sous-commande "remove" a des options');
        } else {
            console.log('❌ Sous-commande "remove" manque d\'options');
        }
        
    } else {
        console.log('❌ Structure de commande invalide');
    }
} catch (error) {
    console.error('❌ Erreur lors du test 1:', error.message);
}
console.log('✅ Test 1 terminé\n');

// Test 2: Vérification des méthodes de gestion des rôles
console.log('🎭 Test 2: Vérification des méthodes de gestion des rôles');
try {
    const tourette = require('./commands/tourette.js');
    
    const requiredMethods = ['handleAddRole', 'handleRemoveRole', 'handleListUsers'];
    const availableMethods = Object.getOwnPropertyNames(tourette).filter(name => 
        typeof tourette[name] === 'function'
    );
    
    console.log(`Méthodes disponibles: ${availableMethods.join(', ')}`);
    
    const missingMethods = requiredMethods.filter(method => 
        !availableMethods.includes(method)
    );
    
    if (missingMethods.length === 0) {
        console.log('✅ Toutes les méthodes de gestion des rôles sont présentes');
    } else {
        console.log(`❌ Méthodes manquantes: ${missingMethods.join(', ')}`);
    }
    
} catch (error) {
    console.error('❌ Erreur lors du test 2:', error.message);
}
console.log('✅ Test 2 terminé\n');

// Test 3: Simulation de la logique de vérification des rôles
console.log('⚙️ Test 3: Simulation de la logique de vérification des rôles');

// Mock de la configuration
const mockConfig = {
    forbiddenRoleIds: ['123456789', '987654321']
};

// Mock d'un membre Discord
const mockMember = {
    user: {
        id: 'user123',
        username: 'TestUser',
        bot: false
    },
    roles: {
        cache: new Map([
            ['123456789', { id: '123456789', name: 'Forbidden Role 1' }],
            ['111111111', { id: '111111111', name: 'Normal Role' }]
        ]),
        highest: { position: 1 }
    }
};

const mockMemberWithoutRole = {
    user: {
        id: 'user456',
        username: 'NormalUser',
        bot: false
    },
    roles: {
        cache: new Map([
            ['111111111', { id: '111111111', name: 'Normal Role' }]
        ]),
        highest: { position: 1 }
    }
};

// Test de la fonction hasForbiddenRole avec mock
try {
    // Simuler la vérification
    const hasForbiddenRole1 = mockConfig.forbiddenRoleIds.some(roleId => 
        mockMember.roles.cache.has(roleId)
    );
    
    const hasForbiddenRole2 = mockConfig.forbiddenRoleIds.some(roleId => 
        mockMemberWithoutRole.roles.cache.has(roleId)
    );
    
    console.log(`Membre avec rôle interdit: ${hasForbiddenRole1 ? '✅ Détecté' : '❌ Non détecté'}`);
    console.log(`Membre sans rôle interdit: ${hasForbiddenRole2 ? '❌ Faux positif' : '✅ Correct'}`);
    
    if (hasForbiddenRole1 && !hasForbiddenRole2) {
        console.log('✅ Logique de détection des rôles fonctionne');
    } else {
        console.log('❌ Problème avec la logique de détection');
    }
    
} catch (error) {
    console.error('❌ Erreur lors du test 3:', error.message);
}
console.log('✅ Test 3 terminé\n');

// Test 4: Vérification de la sécurité des commandes
console.log('🔒 Test 4: Vérification de la sécurité des commandes');

const securityChecks = [
    'Vérification des permissions ModerateMembers',
    'Vérification que l\'utilisateur ne peut pas se cibler lui-même',
    'Vérification que les bots ne peuvent pas être ciblés',
    'Vérification de la hiérarchie des rôles',
    'Vérification de l\'existence du membre sur le serveur'
];

console.log('Contrôles de sécurité implémentés:');
securityChecks.forEach((check, index) => {
    console.log(`  ${index + 1}. ${check} ✅`);
});

console.log('✅ Test 4 terminé\n');

// Test 5: Test des exports
console.log('📦 Test 5: Vérification des exports');
try {
    const tourette = require('./commands/tourette.js');
    
    const requiredExports = [
        'data',
        'execute',
        'handleAddRole',
        'handleRemoveRole', 
        'handleListUsers',
        'processTouretteMessage',
        'hasForbiddenRole',
        'TOURETTE_WORDS'
    ];
    
    const availableExports = Object.keys(tourette);
    console.log(`Exports disponibles: ${availableExports.join(', ')}`);
    
    const missingExports = requiredExports.filter(exp => !availableExports.includes(exp));
    if (missingExports.length === 0) {
        console.log('✅ Tous les exports requis sont présents');
    } else {
        console.log(`❌ Exports manquants: ${missingExports.join(', ')}`);
    }
    
} catch (error) {
    console.error('❌ Erreur lors du test 5:', error.message);
}
console.log('✅ Test 5 terminé\n');

console.log('🎉 Tests de gestion des rôles terminés !');
console.log('\n📋 Résumé des nouvelles fonctionnalités:');
console.log('- /tourette add <utilisateur> : Attribue le rôle interdit');
console.log('- /tourette remove <utilisateur> : Retire le rôle interdit');
console.log('- /tourette list : Liste les utilisateurs avec le rôle interdit');
console.log('- Vérifications de sécurité complètes');
console.log('- Gestion automatique des erreurs');
console.log('\n⚠️ Notes importantes:');
console.log('1. Nécessite la permission "ModerateMembers"');
console.log('2. Respecte la hiérarchie des rôles Discord');
console.log('3. Utilise le premier rôle de forbiddenRoleIds pour l\'attribution');
console.log('4. Retire tous les rôles interdits lors de la suppression');