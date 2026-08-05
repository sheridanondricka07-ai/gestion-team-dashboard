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
    const statuses = state.statuses || {};

    // Let's find all unique dates in statuses
    const allDates = new Set();
    Object.values(statuses).forEach(ipDates => {
        Object.keys(ipDates).forEach(d => allDates.add(d));
    });
    console.log("All unique dates in statuses:", Array.from(allDates).sort().slice(-10));

    // We will check statuses for each server's IPs for today's date: '2026-07-13'
    const today = '2026-07-13';
    console.log(`\nChecking statuses for date: ${today}`);

    serversToCheck.forEach(srvName => {
        const srv = servers.find(s => s.name === srvName);
        if (!srv) {
            console.log(`${srvName} : Not found`);
            return;
        }

        const ips = srv.allIps || [];
        let countTodayRdns = 0;
        let countTodaySpam = 0;
        let countTodayDown = 0;
        let countNone = 0;
        const details = [];

        ips.forEach(ip => {
            const key = ip.replace(/\./g, '_');
            const ipStatuses = statuses[key] || {};
            const status = ipStatuses[today] || 'none';
            details.push(`${ip}:${status}`);
            if (status === 'rdns') {
                countTodayRdns++;
            } else if (status === 'spam') {
                countTodaySpam++;
            } else if (status === 'down') {
                countTodayDown++;
            } else {
                countNone++;
            }
        });

        console.log(`${srvName} : ${countTodayRdns} inbox (RDNS) [Total: ${ips.length}, RDNS: ${countTodayRdns}, SPAM: ${countTodaySpam}, DOWN: ${countTodayDown}, None/Other: ${countNone}]`);
    });

} catch (e) {
    console.error(e);
}
