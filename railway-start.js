#!/usr/bin/env node

/**
 * Script de démarrage pour Railway
 * Déploie les commandes puis démarre le bot avec gestion d'erreurs
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 [RAILWAY] Démarrage du bot KinkyPolice...');

// Vérifier les variables d'environnement critiques
const requiredEnvVars = ['TOKEN', 'CLIENT_ID'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ [RAILWAY] Variables d\'environnement manquantes:', missingVars.join(', '));
    process.exit(1);
}

console.log('✅ [RAILWAY] Variables d\'environnement vérifiées');

// Fonction pour exécuter un script Node.js
function runScript(scriptPath, description) {
    return new Promise((resolve, reject) => {
        console.log(`🔄 [RAILWAY] ${description}...`);
        
        const child = spawn('node', [scriptPath], {
            stdio: 'inherit',
            env: process.env
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ [RAILWAY] ${description} terminé avec succès`);
                resolve();
            } else {
                console.error(`❌ [RAILWAY] ${description} échoué avec le code: ${code}`);
                reject(new Error(`${description} failed with code ${code}`));
            }
        });

        child.on('error', (error) => {
            console.error(`❌ [RAILWAY] Erreur lors de l'exécution de ${description}:`, error);
            reject(error);
        });
    });
}

// Démarrage séquentiel
async function start() {
    try {
        // Étape 1: Déployer les commandes
        console.log('📋 [RAILWAY] Étape 1: Déploiement des commandes');
        await runScript('deploy-commands.js', 'Déploiement des commandes');
        
        // Petite pause pour laisser Discord traiter les commandes
        console.log('⏳ [RAILWAY] Pause de 2 secondes...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Étape 2: Démarrer le bot
        console.log('🤖 [RAILWAY] Étape 2: Démarrage du bot');
        await runScript('index.js', 'Démarrage du bot');
        
    } catch (error) {
        console.error('💥 [RAILWAY] Erreur critique lors du démarrage:', error);
        
        // En cas d'échec du déploiement des commandes, essayer de démarrer le bot quand même
        if (error.message.includes('Déploiement des commandes')) {
            console.log('🔄 [RAILWAY] Tentative de démarrage du bot sans redéploiement des commandes...');
            try {
                await runScript('index.js', 'Démarrage du bot (mode dégradé)');
            } catch (botError) {
                console.error('💥 [RAILWAY] Impossible de démarrer le bot:', botError);
                process.exit(1);
            }
        } else {
            process.exit(1);
        }
    }
}

// Gestion des signaux pour arrêt propre
process.on('SIGINT', () => {
    console.log('\n🔄 [RAILWAY] Arrêt demandé...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🔄 [RAILWAY] Arrêt demandé par Railway...');
    process.exit(0);
});

// Démarrer le processus
start();
