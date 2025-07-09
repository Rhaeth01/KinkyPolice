const fs = require('fs');
const path = require('path');

// Simple command name extractor
function extractCommandNames() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandNames = [];
    
    function scanDirectory(dir) {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const itemPath = path.join(dir, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
                // Skip config folder
                if (item === 'config' && dir === commandsPath) {
                    continue;
                }
                scanDirectory(itemPath);
            } else if (item.endsWith('.js')) {
                try {
                    const content = fs.readFileSync(itemPath, 'utf8');
                    const nameMatch = content.match(/\.setName\(['"`]([^'"`]+)['"`]\)/);
                    if (nameMatch) {
                        commandNames.push({
                            name: nameMatch[1],
                            file: itemPath
                        });
                    }
                } catch (error) {
                    console.log(`Error reading ${itemPath}:`, error.message);
                }
            }
        }
    }
    
    scanDirectory(commandsPath);
    return commandNames;
}

// Check for duplicates
const commands = extractCommandNames();
const nameMap = new Map();
const duplicates = [];

commands.forEach(cmd => {
    if (nameMap.has(cmd.name)) {
        duplicates.push({
            name: cmd.name,
            files: [nameMap.get(cmd.name), cmd.file]
        });
    } else {
        nameMap.set(cmd.name, cmd.file);
    }
});

console.log('=== COMMAND ANALYSIS ===');
console.log(`Total commands found: ${commands.length}`);
console.log(`Unique command names: ${nameMap.size}`);
console.log(`Duplicates found: ${duplicates.length}`);

console.log('\n=== ALL COMMANDS ===');
commands.forEach(cmd => {
    console.log(`${cmd.name} - ${cmd.file}`);
});

if (duplicates.length > 0) {
    console.log('\n=== DUPLICATES ===');
    duplicates.forEach(dup => {
        console.log(`DUPLICATE: ${dup.name}`);
        dup.files.forEach(file => {
            console.log(`  - ${file}`);
        });
    });
}