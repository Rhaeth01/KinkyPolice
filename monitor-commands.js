require('dotenv').config();
const { REST, Routes } = require('discord.js');

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const rest = new REST().setToken(token);

/**
 * Monitore les commandes déployées pour détecter les duplications
 */
async function monitorCommands() {
    try {
        console.log('🔍 [MONITOR] Vérification des commandes déployées...');
        
        let allCommands = [];
        
        // Récupérer les commandes globales
        const globalCommands = await rest.get(Routes.applicationCommands(clientId));
        allCommands = allCommands.concat(globalCommands.map(cmd => ({ ...cmd, scope: 'Global' })));
        
        // Récupérer les commandes de guilde si GUILD_ID est défini
        if (guildId) {
            const guildCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
            allCommands = allCommands.concat(guildCommands.map(cmd => ({ ...cmd, scope: 'Guild' })));
        }
        
        console.log(`📊 [MONITOR] Total des commandes trouvées: ${allCommands.length}`);
        
        // Détecter les duplications
        const commandNames = new Map();
        const duplicates = [];
        
        allCommands.forEach(cmd => {
            if (commandNames.has(cmd.name)) {
                const existing = commandNames.get(cmd.name);
                if (!duplicates.find(d => d.name === cmd.name)) {
                    duplicates.push({
                        name: cmd.name,
                        instances: [existing, { scope: cmd.scope, id: cmd.id }]
                    });
                } else {
                    const duplicate = duplicates.find(d => d.name === cmd.name);
                    duplicate.instances.push({ scope: cmd.scope, id: cmd.id });
                }
            } else {
                commandNames.set(cmd.name, { scope: cmd.scope, id: cmd.id });
            }
        });
        
        if (duplicates.length > 0) {
            console.log('⚠️  [MONITOR] DUPLICATIONS DÉTECTÉES:');
            duplicates.forEach(dup => {
                console.log(`   🔴 ${dup.name}:`);
                dup.instances.forEach(instance => {
                    console.log(`      - ${instance.scope} (ID: ${instance.id})`);
                });
            });
            
            // Optionnel: Nettoyer automatiquement les duplications
            if (process.argv.includes('--auto-clean')) {
                console.log('🧹 [MONITOR] Nettoyage automatique des duplications...');
                await cleanDuplicates(duplicates);
            }
        } else {
            console.log('✅ [MONITOR] Aucune duplication détectée');
        }
        
        // Afficher un résumé
        console.log('\n📋 [MONITOR] Résumé:');
        const globalCount = allCommands.filter(cmd => cmd.scope === 'Global').length;
        const guildCount = allCommands.filter(cmd => cmd.scope === 'Guild').length;
        console.log(`   Global: ${globalCount} commandes`);
        console.log(`   Guild: ${guildCount} commandes`);
        console.log(`   Duplications: ${duplicates.length}`);
        
    } catch (error) {
        console.error('❌ [MONITOR] Erreur lors de la surveillance:', error);
    }
}

/**
 * Nettoie les commandes dupliquées (garde les globales, supprime les guild)
 */
async function cleanDuplicates(duplicates) {
    for (const duplicate of duplicates) {
        const guildInstances = duplicate.instances.filter(i => i.scope === 'Guild');
        
        for (const instance of guildInstances) {
            try {
                await rest.delete(Routes.applicationGuildCommand(clientId, guildId, instance.id));
                console.log(`   ✅ Supprimé: ${duplicate.name} (Guild)`);
            } catch (error) {
                console.error(`   ❌ Erreur suppression ${duplicate.name}:`, error.message);
            }
        }
    }
}

// Exécuter le monitoring
if (require.main === module) {
    monitorCommands();
}

module.exports = { monitorCommands };
