require('dotenv').config();
const { REST, Routes } = require('discord.js');
const guildId = process.env.GUILD_ID;
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

console.log('=== DEPLOYMENT DEBUG ===');
console.log('GUILD_ID:', guildId ? 'Set' : 'Not set');
console.log('CLIENT_ID:', clientId ? 'Set' : 'Not set');
console.log('TOKEN:', token ? 'Set' : 'Not set');

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log('\n=== CHECKING EXISTING COMMANDS ===');
        
        let guildCommands = [];
        if (guildId) {
            console.log('Checking guild commands...');
            guildCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
            console.log(`Guild commands: ${guildCommands.length}`);
            guildCommands.forEach((cmd, i) => {
                console.log(`${i + 1}. ${cmd.name} (Guild)`);
            });
        }
        
        console.log('\nChecking global commands...');
        const globalCommands = await rest.get(Routes.applicationCommands(clientId));
        console.log(`Global commands: ${globalCommands.length}`);
        globalCommands.forEach((cmd, i) => {
            console.log(`${i + 1}. ${cmd.name} (Global)`);
        });
        
        console.log('\n=== POTENTIAL DUPLICATE DETECTION ===');
        const allCommandNames = [
            ...guildCommands.map(cmd => ({ name: cmd.name, type: 'Guild' })),
            ...globalCommands.map(cmd => ({ name: cmd.name, type: 'Global' }))
        ];
        
        const nameCount = new Map();
        allCommandNames.forEach(cmd => {
            const key = cmd.name;
            if (!nameCount.has(key)) {
                nameCount.set(key, []);
            }
            nameCount.get(key).push(cmd.type);
        });
        
        const duplicates = [];
        nameCount.forEach((types, name) => {
            if (types.length > 1) {
                duplicates.push({ name, types });
            }
        });
        
        if (duplicates.length > 0) {
            console.log('DUPLICATES FOUND:');
            duplicates.forEach(dup => {
                console.log(`- ${dup.name}: ${dup.types.join(', ')}`);
            });
        } else {
            console.log('No duplicates found in deployed commands.');
        }
        
    } catch (error) {
        console.error('Error checking commands:', error);
    }
})();