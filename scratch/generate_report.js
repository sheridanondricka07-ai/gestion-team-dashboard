const fs = require('fs');

const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";

async function main() {
    console.log("Fetching warmupData from Firebase...");
    try {
        const resp = await fetch(`${DB_URL}/warmupData.json?orderBy="$key"&limitToLast=2000`);
        const allData = await resp.json();
        if (!allData) {
            console.error("No data found.");
            return;
        }

        const now = Date.now();
        const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
        
        // Group records by domain/IP to find the latest within 24 hours
        const domainsMap = {};

        Object.values(allData).forEach(r => {
            if (!r.timestamp || r.timestamp < twentyFourHoursAgo) return;
            
            // Extract domain/IP
            const domainName = r.domain || r.ip || 'Unknown';
            if (domainName === '[rdns]' || domainName === 'rdns' || !domainName) return;

            const inVal = parseInt(r.inVal, 10) || 0;
            const timestamp = r.timestamp;
            const server = r.server || 'Unknown';

            if (!domainsMap[domainName] || timestamp > domainsMap[domainName].timestamp) {
                domainsMap[domainName] = {
                    domain: domainName,
                    warmupSize: inVal,
                    server: server,
                    timestamp: timestamp,
                    date: new Date(timestamp).toLocaleString()
                };
            }
        });

        const activeDomains = Object.values(domainsMap);
        console.log(`Found ${activeDomains.length} active domains in the last 24 hours.`);

        // Generate CSV content
        let csvContent = "\ufeffDomain,Latest Warmup Size (Send Size),Server,Last Active Time\n";
        activeDomains.forEach(item => {
            csvContent += `"${item.domain}",${item.warmupSize},"${item.server}","${item.date}"\n`;
        });

        const reportPath = "c:/Users/admin_11/Documents/Gestion_Team/warmup_domains_report.csv";
        fs.writeFileSync(reportPath, csvContent, "utf8");
        console.log(`Report successfully written to: ${reportPath}`);
    } catch (e) {
        console.error("Error generating report:", e);
    }
}

main();
