require('dotenv').config();
const configManager = require('./utils/configManager');

/**
 * Diagnostic script for the daily quiz system
 * Identifies configuration mismatches and missing getters
 */
function debugQuizSystem() {
    console.log('🔍 DIAGNOSTIC DU SYSTÈME DE QUIZ QUOTIDIEN\n');
    
    // 1. Vérifier la configuration actuelle
    console.log('1️⃣ CONFIGURATION ACTUELLE:');
    const config = configManager.getConfig();
    
    console.log('📋 Configuration complète des jeux:');
    console.log(JSON.stringify(config.games, null, 2));
    
    console.log('\n📋 Configuration de l\'économie (dailyQuiz):');
    console.log(JSON.stringify(config.economy?.dailyQuiz, null, 2));
    
    // 2. Vérifier les getters du configManager
    console.log('\n2️⃣ GETTERS DU CONFIG MANAGER:');
    
    // Tester les getters existants
    console.log(`confessionChannelId: "${configManager.confessionChannelId}"`);
    console.log(`logChannelId: "${configManager.logChannelId}"`);
    console.log(`ticketCategoryId: "${configManager.ticketCategoryId}"`);
    
    // Tester le getter manquant
    try {
        console.log(`dailyQuizChannelId: "${configManager.dailyQuizChannelId}"`);
    } catch (error) {
        console.log(`❌ dailyQuizChannelId: GETTER MANQUANT - ${error.message}`);
    }
    
    // 3. Vérifier ce que le scheduler essaie de lire
    console.log('\n3️⃣ ANALYSE DU SCHEDULER:');
    
    // Ce que index.js vérifie
    console.log('🔍 index.js vérifie: configManager.dailyQuizChannelId');
    console.log(`   Résultat: ${configManager.dailyQuizChannelId || 'undefined/null'}`);
    
    // Ce que dailyQuizScheduler.js lit
    console.log('🔍 dailyQuizScheduler.js lit: config.games?.gameChannel');
    console.log(`   Résultat: "${config.games?.gameChannel || 'undefined'}"`);
    
    // 4. Identifier le problème
    console.log('\n4️⃣ PROBLÈMES IDENTIFIÉS:');
    
    const problems = [];
    
    // Problème 1: Getter manquant
    if (!configManager.hasOwnProperty('dailyQuizChannelId') && 
        !Object.getOwnPropertyDescriptor(Object.getPrototypeOf(configManager), 'dailyQuizChannelId')) {
        problems.push({
            type: 'GETTER_MANQUANT',
            description: 'Le getter dailyQuizChannelId n\'existe pas dans configManager',
            impact: 'Le scheduler ne démarre jamais car la condition dans index.js échoue',
            solution: 'Ajouter le getter dailyQuizChannelId au configManager'
        });
    }
    
    // Problème 2: Configuration du canal
    const gameChannel = config.games?.gameChannel;
    if (!gameChannel || gameChannel.trim() === '') {
        problems.push({
            type: 'CANAL_NON_CONFIGURE',
            description: 'Le canal de jeu (gameChannel) n\'est pas configuré',
            impact: 'Même si le scheduler démarre, il ne peut pas envoyer de quiz',
            solution: 'Configurer le canal via /config > Jeux > Salon du quiz'
        });
    }
    
    // Problème 3: Quiz désactivé
    const quizEnabled = config.economy?.dailyQuiz?.enabled;
    if (!quizEnabled) {
        problems.push({
            type: 'QUIZ_DESACTIVE',
            description: 'Le quiz quotidien est désactivé dans la configuration',
            impact: 'Le système ne fonctionnera pas même si tout est configuré',
            solution: 'Activer le quiz via /config > Économie > Quiz quotidien'
        });
    }
    
    if (problems.length === 0) {
        console.log('✅ Aucun problème majeur détecté!');
    } else {
        problems.forEach((problem, index) => {
            console.log(`\n❌ PROBLÈME ${index + 1}: ${problem.type}`);
            console.log(`   Description: ${problem.description}`);
            console.log(`   Impact: ${problem.impact}`);
            console.log(`   Solution: ${problem.solution}`);
        });
    }
    
    // 5. Recommandations
    console.log('\n5️⃣ RECOMMANDATIONS:');
    
    if (problems.some(p => p.type === 'GETTER_MANQUANT')) {
        console.log('🔧 PRIORITÉ HAUTE: Corriger le getter manquant');
        console.log('   1. Ajouter le getter dailyQuizChannelId au configManager');
        console.log('   2. Redémarrer le bot');
    }
    
    if (problems.some(p => p.type === 'CANAL_NON_CONFIGURE')) {
        console.log('🔧 PRIORITÉ MOYENNE: Configurer le canal');
        console.log('   1. Utiliser /config');
        console.log('   2. Aller dans Jeux > Quiz Quotidien');
        console.log('   3. Sélectionner le salon du quiz');
    }
    
    if (problems.some(p => p.type === 'QUIZ_DESACTIVE')) {
        console.log('🔧 PRIORITÉ BASSE: Activer le quiz');
        console.log('   1. Utiliser /config');
        console.log('   2. Aller dans Économie > Quiz quotidien');
        console.log('   3. Activer le système');
    }
    
    // 6. Test de la logique de timing
    console.log('\n6️⃣ TEST DE LA LOGIQUE DE TIMING:');
    
    const quizConfig = config.economy?.dailyQuiz || { hour: 13, minute: 0 };
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(quizConfig.hour || 13, quizConfig.minute || 0, 0, 0);
    
    if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
    }
    
    const delay = targetTime.getTime() - now.getTime();
    const delayMinutes = Math.round(delay / (1000 * 60));
    
    console.log(`⏰ Heure configurée: ${String(quizConfig.hour || 13).padStart(2, '0')}:${String(quizConfig.minute || 0).padStart(2, '0')}`);
    console.log(`⏰ Heure actuelle: ${now.toLocaleTimeString('fr-FR')}`);
    console.log(`⏰ Prochain quiz dans: ${delayMinutes} minutes`);
    
    // 7. Résumé final
    console.log('\n7️⃣ RÉSUMÉ:');
    if (problems.length > 0) {
        console.log(`❌ ${problems.length} problème(s) trouvé(s) - Le quiz quotidien ne fonctionne pas`);
        console.log('🔧 Suivez les recommandations ci-dessus pour résoudre les problèmes');
    } else {
        console.log('✅ Configuration correcte - Le quiz quotidien devrait fonctionner');
        console.log(`📅 Prochain quiz: ${targetTime.toLocaleString('fr-FR')}`);
    }
}

// Exécuter le diagnostic
if (require.main === module) {
    debugQuizSystem();
}

module.exports = { debugQuizSystem };
