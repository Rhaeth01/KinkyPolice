const { processTouretteMessage, hasForbiddenRole, TOURETTE_WORDS } = require('./commands/tourette.js');
const ConfigManager = require('./utils/configManager');

console.log('🧪 Test du système de tourette automatique\n');

// Test 1: Vérification des mots de tourette
console.log('📝 Test 1: Vérification des mots de tourette');
console.log(`Nombre de mots disponibles: ${TOURETTE_WORDS.length}`);
console.log(`Exemples de mots: ${TOURETTE_WORDS.slice(0, 5).join(', ')}`);
console.log('✅ Test 1 réussi\n');

// Test 2: Vérification de la configuration
console.log('⚙️ Test 2: Vérification de la configuration');
try {
    const config = new ConfigManager();
    const forbiddenRoleIds = config.forbiddenRoleIds;
    
    console.log('Configuration chargée avec succès');
    console.log(`forbiddenRoleIds: ${JSON.stringify(forbiddenRoleIds)}`);
    
    if (forbiddenRoleIds && Array.isArray(forbiddenRoleIds)) {
        console.log(`✅ Configuration valide - ${forbiddenRoleIds.length} rôle(s) configuré(s)`);
    } else {
        console.log('⚠️ Aucun rôle interdit configuré');
    }
} catch (error) {
    console.error('❌ Erreur de configuration:', error.message);
}
console.log('✅ Test 2 terminé\n');

// Test 3: Simulation de la fonction hasForbiddenRole
console.log('🎭 Test 3: Simulation de la fonction hasForbiddenRole');

// Mock d'un membre avec rôles
const mockMemberWithForbiddenRole = {
    roles: {
        cache: {
            has: (roleId) => {
                // Simuler qu'il a le rôle interdit
                return roleId === 'test_forbidden_role_id';
            }
        }
    }
};

const mockMemberWithoutForbiddenRole = {
    roles: {
        cache: {
            has: (roleId) => {
                // Simuler qu'il n'a pas le rôle interdit
                return false;
            }
        }
    }
};

// Mock temporaire de ConfigManager pour le test
const originalConfigManager = require('./utils/configManager');
const MockConfigManager = class {
    get forbiddenRoleIds() {
        return ['test_forbidden_role_id'];
    }
};

// Remplacer temporairement
require.cache[require.resolve('./utils/configManager')] = {
    exports: MockConfigManager
};

try {
    // Recharger la fonction avec le mock
    delete require.cache[require.resolve('./commands/tourette.js')];
    const { hasForbiddenRole: testHasForbiddenRole } = require('./commands/tourette.js');
    
    const result1 = testHasForbiddenRole(mockMemberWithForbiddenRole);
    const result2 = testHasForbiddenRole(mockMemberWithoutForbiddenRole);
    
    console.log(`Membre avec rôle interdit: ${result1 ? '✅ Détecté' : '❌ Non détecté'}`);
    console.log(`Membre sans rôle interdit: ${result2 ? '❌ Faux positif' : '✅ Correct'}`);
    
    if (result1 && !result2) {
        console.log('✅ Test 3 réussi - Détection des rôles fonctionne correctement');
    } else {
        console.log('❌ Test 3 échoué - Problème de détection des rôles');
    }
} catch (error) {
    console.error('❌ Erreur lors du test 3:', error.message);
} finally {
    // Restaurer le ConfigManager original
    require.cache[require.resolve('./utils/configManager')] = {
        exports: originalConfigManager
    };
}
console.log('✅ Test 3 terminé\n');

// Test 4: Test de génération de mots aléatoires
console.log('🎲 Test 4: Test de génération de mots aléatoires');
const randomWords = [];
for (let i = 0; i < 10; i++) {
    const randomWord = TOURETTE_WORDS[Math.floor(Math.random() * TOURETTE_WORDS.length)];
    randomWords.push(randomWord);
}

console.log('Mots aléatoires générés:');
randomWords.forEach((word, index) => {
    console.log(`  ${index + 1}. ${word}`);
});

const uniqueWords = new Set(randomWords);
console.log(`Diversité: ${uniqueWords.size}/${randomWords.length} mots uniques`);
console.log('✅ Test 4 terminé\n');

// Test 5: Vérification de l'export des fonctions
console.log('📦 Test 5: Vérification des exports');
try {
    const tourette = require('./commands/tourette.js');
    
    const requiredExports = ['processTouretteMessage', 'hasForbiddenRole', 'TOURETTE_WORDS'];
    const availableExports = Object.keys(tourette);
    
    console.log(`Exports disponibles: ${availableExports.join(', ')}`);
    
    const missingExports = requiredExports.filter(exp => !availableExports.includes(exp));
    if (missingExports.length === 0) {
        console.log('✅ Tous les exports requis sont présents');
    } else {
        console.log(`❌ Exports manquants: ${missingExports.join(', ')}`);
    }
    
    // Vérifier que data existe pour la commande slash
    if (tourette.data && tourette.data.name === 'tourette') {
        console.log('✅ Commande slash configurée correctement');
    } else {
        console.log('❌ Problème avec la configuration de la commande slash');
    }
    
} catch (error) {
    console.error('❌ Erreur lors du test 5:', error.message);
}
console.log('✅ Test 5 terminé\n');

console.log('🎉 Tests terminés !');
console.log('\n📋 Résumé:');
console.log('- Le système de tourette automatique est configuré');
console.log('- Il s\'applique aux utilisateurs avec forbiddenRoleIds');
console.log('- Les messages sont remplacés par: "**Nom:** MOT_ALEATOIRE"');
console.log('- La commande /tourette fournit des informations sur le système');
console.log('\n⚠️ Note: Pour tester complètement, assurez-vous que:');
console.log('1. forbiddenRoleIds est configuré dans config.json');
console.log('2. Le bot a les permissions de supprimer des messages');
console.log('3. Le système est intégré dans messageCreate.js (déjà fait)');