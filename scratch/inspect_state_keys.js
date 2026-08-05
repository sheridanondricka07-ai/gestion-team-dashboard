const fs = require('fs');

try {
    const backup = JSON.parse(fs.readFileSync('database_backup.json', 'utf8'));
    const state = backup.state || {};
    console.log("State keys:", Object.keys(state));
    
    // Look up 51_68_216_143 in state
    const key = '51_68_216_143';
    console.log("Looking up IP:", key);
    for (const [stateKey, val] of Object.entries(state)) {
        if (val && typeof val === 'object') {
            if (val[key]) {
                console.log(`Found in state.${stateKey}:`, val[key]);
            }
        }
    }
} catch (e) {
    console.error(e);
}
