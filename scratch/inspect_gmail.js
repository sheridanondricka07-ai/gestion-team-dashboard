const fs = require('fs');

try {
    const backup = JSON.parse(fs.readFileSync('database_backup.json', 'utf8'));
    const state = backup.state || {};
    const ipKey = '51_68_216_143';
    
    console.log("gmail keys count:", Object.keys(state.gmail || {}).length);
    console.log("gmail_status keys count:", Object.keys(state.gmail_status || {}).length);
    
    if (state.gmail && state.gmail[ipKey]) {
        console.log("Found in state.gmail:", state.gmail[ipKey]);
    }
    if (state.gmail_status && state.gmail_status[ipKey]) {
        console.log("Found in state.gmail_status:", state.gmail_status[ipKey]);
    }
    
    // Let's search for "13/07" or other keys in state.gmail or similar properties
    // Print a sample of state.gmail and state.gmail_status
    console.log("Sample gmail entries:", Object.entries(state.gmail || {}).slice(0, 2));
    console.log("Sample gmail_status entries:", Object.entries(state.gmail_status || {}).slice(0, 2));
} catch (e) {
    console.error(e);
}
