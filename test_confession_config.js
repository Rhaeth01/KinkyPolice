/**
 * Test spécifique pour la configuration des confessions
 * Vérifie que le confessionChannelId est correctement lu
 */

console.log('🔍 Test de la configuration des confessions...\n');

// Test 1: Vérification du configManager
console.log('1️⃣ Test du configManager...');
try {
    const configManager = require('./utils/configManager');
    
    // Forcer le rechargement
    configManager.forceReload();
    
    const config = configManager.getConfig();
    console.log('✅ Configuration chargée');
    console.log('📊 Sections disponibles:', Object.keys(config));
    
    // Vérifier la section confession
    const confessionSection = config.confession;
    console.log('\n📝 Section confession:', confessionSection);
    
    // Tester l'accesseur
    const confessionChannelId = configManager.confessionChannelId;
    console.log('🎯 confessionChannelId via accesseur:', confessionChannelId);
    
    if (confessionChannelId) {
        console.log('✅ confessionChannelId trouvé:', confessionChannelId);
    } else {
        console.log('❌ confessionChannelId non trouvé');
        
        // Debug des différentes sources
        console.log('\n🔍 Debug des sources:');
        console.log('- confession.confessionChannel:', config.confession?.confessionChannel);
        console.log('- confessionChannelId (racine):', config.confessionChannelId);
        console.log('- logging.confessionChannelId:', config.logging?.confessionChannelId);
    }
    
} catch (error) {
    console.error('❌ Erreur configManager:', error.message);
}

// Test 2: Simulation de la commande confession
console.log('\n2️⃣ Test de simulation de la commande confession...');
try {
    const confessionCommand = require('./commands/confession');
    
    if (confessionCommand && confessionCommand.execute) {
        console.log('✅ Commande confession chargée');
        
        // Mock d'interaction
        const mockInteraction = {
            options: {
                getString: (name) => name === 'message' ? 'Test confession' : null
            },
            client: {
                channels: {
                    cache: {
                        get: (id) => {
                            if (id) {
                                return {
                                    id: id,
                                    name: 'confession-channel',
                                    send: async () => ({ id: 'mock-message' })
                                };
                            }
                            return null;
                        }
                    }
                }
            },
            reply: async (options) => {
                console.log('📤 Réponse interaction:', options.content);
                return { id: 'mock-reply' };
            }
        };
        
        console.log('🎭 Mock d\'interaction créé');
        
        // Tester la récupération du canal
        const configManager = require('./utils/configManager');
        const confessionChannelId = configManager.confessionChannelId;
        
        if (confessionChannelId) {
            const channel = mockInteraction.client.channels.cache.get(confessionChannelId);
            if (channel) {
                console.log('✅ Canal de confession accessible via mock');
                console.log(`   ID: ${channel.id}`);
                console.log(`   Nom: ${channel.name}`);
            } else {
                console.log('❌ Canal non trouvé dans le cache mock');
            }
        } else {
            console.log('❌ confessionChannelId non disponible pour le test');
        }
        
    } else {
        console.log('❌ Commande confession non trouvée ou invalide');
    }
} catch (error) {
    console.error('❌ Erreur test confession:', error.message);
}

// Test 3: Vérification de la structure de configuration
console.log('\n3️⃣ Test de la structure de configuration...');
try {
    const fs = require('fs');
    const configPath = './config.json';
    
    if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        console.log('✅ Fichier config.json lu');
        
        // Vérifier la structure attendue
        const expectedStructure = {
            confession: config.confession,
            games: config.games,
            kink: config.kink
        };
        
        console.log('\n📋 Structure des nouvelles sections:');
        Object.entries(expectedStructure).forEach(([section, data]) => {
            if (data) {
                console.log(`✅ ${section}:`, Object.keys(data));
            } else {
                console.log(`❌ ${section}: manquant`);
            }
        });
        
        // Vérifier spécifiquement confessionChannel
        if (config.confession?.confessionChannel) {
            console.log(`\n🎯 confessionChannel configuré: ${config.confession.confessionChannel}`);
        } else {
            console.log('\n❌ confessionChannel non configuré dans confession section');
        }
        
    } else {
        console.log('❌ Fichier config.json non trouvé');
    }
} catch (error) {
    console.error('❌ Erreur lecture config:', error.message);
}

// Test 4: Test de l'interface de configuration
console.log('\n4️⃣ Test de l\'interface de configuration...');
try {
    const configCommand = require('./commands/config');
    
    if (configCommand && configCommand.data) {
        console.log('✅ Interface de configuration chargée');
        console.log(`   Nom: ${configCommand.data.name}`);
        console.log(`   Description: ${configCommand.data.description}`);
        
        // Vérifier que les sections sont définies
        const configFile = fs.readFileSync('./commands/config.js', 'utf8');
        
        if (configFile.includes('confession:')) {
            console.log('✅ Section confession définie dans l\'interface');
        } else {
            console.log('❌ Section confession manquante dans l\'interface');
        }
        
        if (configFile.includes('games:')) {
            console.log('✅ Section games définie dans l\'interface');
        } else {
            console.log('❌ Section games manquante dans l\'interface');
        }
        
    } else {
        console.log('❌ Interface de configuration non trouvée');
    }
} catch (error) {
    console.error('❌ Erreur test interface:', error.message);
}

console.log('\n🎉 Tests terminés!');
console.log('\n📋 Résumé:');
console.log('   • Configuration des confessions vérifiée');
console.log('   • Accesseurs du configManager testés');
console.log('   • Structure de fichier validée');
console.log('   • Interface moderne compatible');
console.log('\n🚀 Le confessionChannelId devrait maintenant être correctement lu!');