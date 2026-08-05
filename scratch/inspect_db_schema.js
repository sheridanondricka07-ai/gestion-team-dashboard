const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('database_backup.json', 'utf8'));
    console.log("Keys in backup:", Object.keys(data));
    if (data.state) {
        console.log("Keys in state:", Object.keys(data.state));
        console.log("Number of servers:", data.state.servers ? data.state.servers.length : 0);
        console.log("Number of spamhaus entries:", data.state.spamhaus ? Object.keys(data.state.spamhaus).length : 0);
        console.log("Number of vmtaResults entries:", data.state.vmtaResults ? Object.keys(data.state.vmtaResults).length : 0);
    }
} catch (e) {
    console.error(e);
}
