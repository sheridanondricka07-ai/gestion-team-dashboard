const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('database_backup.json', 'utf8')).state;
    console.log("Mailers in database:");
    (data.mailers || []).forEach(m => {
        console.log(`- ID: ${m.id}, Name: ${m.name}`);
    });
} catch (e) {
    console.error(e);
}
