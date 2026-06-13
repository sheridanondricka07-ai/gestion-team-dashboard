const fs = require('fs');

const DB_URL = "https://gestion-team-e-default-rtdb.firebaseio.com";

async function backup() {
    console.log("Starting full Firebase Database Backup...");
    try {
        const paths = ['state', 'warmupData', 'warmupNotified', 'warmupRawLogs'];
        const backupData = {};

        for (const path of paths) {
            console.log(`Fetching ${path}...`);
            const resp = await fetch(`${DB_URL}/${path}.json`);
            if (!resp.ok) {
                throw new Error(`Failed to fetch ${path}: ${resp.statusText}`);
            }
            backupData[path] = await resp.json();
            console.log(`Fetched ${path} successfully.`);
        }

        fs.writeFileSync('database_backup.json', JSON.stringify(backupData, null, 2));
        console.log("Backup completed successfully! Saved to database_backup.json");
    } catch (e) {
        console.error("Backup failed:", e);
    }
}

backup();
