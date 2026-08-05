const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('database_backup.json', 'utf8'));
    console.log("Keys in backup:", Object.keys(data));
    
    if (data.warmupData) {
        const keys = Object.keys(data.warmupData);
        console.log("Number of warmupData keys:", keys.length);
        console.log("Sample warmupData keys:", keys.slice(0, 10));
        
        // Inspect one entry
        const sampleKey = keys[0];
        console.log(`Sample warmupData entry [${sampleKey}]:`, JSON.stringify(data.warmupData[sampleKey]));
    }
} catch (e) {
    console.error(e);
}
