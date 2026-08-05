const fs = require('fs');

const serversToCheck = [
    "s_wmn3_2160",
    "s_wmn3_2182",
    "s_wmn3_2193",
    "s_wmn3_2200",
    "s_wmn3_2204",
    "s_wmn3_2234",
    "s_wmn3_2243",
    "s_wmn3_2249",
    "s_wmn3_2250",
    "s_wmn3_2257",
    "s_wmn3_2259"
];

try {
    const backup = JSON.parse(fs.readFileSync('database_backup.json', 'utf8'));
    const state = backup.state || {};
    const servers = state.servers || [];
    const vmtaResults = state.vmtaResults || {};
    const spamhaus = state.spamhaus || {};

    console.log("Analyzing IP statuses and RDNS mapping per server...\n");

    serversToCheck.forEach(srvName => {
        const srv = servers.find(s => s.name === srvName);
        if (!srv) {
            console.log(`${srvName} : Server not found in database.`);
            return;
        }

        const ips = srv.allIps || [];
        let totalIps = ips.length;
        let rdnsCleanCount = 0;
        let listedCount = 0;
        let noRdnsCount = 0;

        ips.forEach(ip => {
            const key = ip.replace(/\./g, '_');
            
            // Check Spamhaus status
            const sh = spamhaus[key] || {};
            const isListed = sh.status === 'listed';
            
            // Check PTR/RDNS status
            const vmta = vmtaResults[key] || {};
            const hasRdns = vmta.ptr && vmta.ptr !== 'NXDOMAIN / No PTR' && vmta.ptr !== 'No PTR record' && vmta.status !== 'ERROR';

            if (isListed) {
                listedCount++;
            } else if (!hasRdns) {
                noRdnsCount++;
            } else {
                rdnsCleanCount++;
            }
        });

        console.log(`${srvName} : ${rdnsCleanCount} inbox (RDNS) [Total IPs: ${totalIps}, Clean with RDNS: ${rdnsCleanCount}, Listed: ${listedCount}, No RDNS/Error: ${noRdnsCount}]`);
    });

} catch (e) {
    console.error("Error reading database backup:", e);
}
