const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";

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

async function run() {
    try {
        console.log("Fetching live servers data...");
        const serversResp = await fetch(`${DB_URL}/state/servers.json`);
        const servers = await serversResp.json();

        console.log("Fetching live statuses data...");
        const statusesResp = await fetch(`${DB_URL}/state/statuses.json`);
        const statuses = await statusesResp.json();

        // Let's identify all unique dates present in live statuses
        const allDates = new Set();
        Object.values(statuses || {}).forEach(ipDates => {
            Object.keys(ipDates).forEach(d => allDates.add(d));
        });
        const sortedDates = Array.from(allDates).sort();
        console.log("Live unique dates (last 5):", sortedDates.slice(-5));

        const today = sortedDates[sortedDates.length - 1] || '2026-07-13';
        console.log(`Checking statuses for date: ${today}`);

        serversToCheck.forEach(srvName => {
            // Find server by name
            const srv = Object.values(servers || {}).find(s => s && s.name === srvName);
            if (!srv) {
                console.log(`${srvName} : Not found in live servers`);
                return;
            }

            const ips = srv.allIps || [];
            let countTodayRdns = 0;
            let countTodaySpam = 0;
            let countTodayDown = 0;
            let countNone = 0;

            ips.forEach(ip => {
                const key = ip.replace(/\./g, '_');
                const ipStatuses = statuses[key] || {};
                const status = ipStatuses[today] || 'none';
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
        console.error("Error fetching live data:", e);
    }
}

run();
