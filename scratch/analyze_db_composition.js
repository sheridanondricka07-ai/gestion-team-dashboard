const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('database_backup.json', 'utf8')).state;
    const servers = data.servers || [];
    const vmtaResults = data.vmtaResults || {};
    const spamhaus = data.spamhaus || {};
    const drops = data.drops || [];
    const rpInventory = data.rpInventory || [];

    console.log("Analyzing database composition...");
    
    // Group IPs by Server
    const serverIPStats = {};
    
    servers.forEach(srv => {
        serverIPStats[srv.name] = {
            totalIps: 0,
            listedIps: 0,
            ips: [],
            provider: srv.provider || 'Unknown',
            entity: srv.entity || 'Unknown',
            group: srv.group || 'Unknown'
        };
        
        const srvIps = srv.allIps || [];
        srvIps.forEach(ip => {
            const safeIp = ip.replace(/\./g, '_');
            const sh = spamhaus[safeIp] || {};
            const isListed = sh.status === 'listed';
            
            serverIPStats[srv.name].totalIps++;
            if (isListed) {
                serverIPStats[srv.name].listedIps++;
            }
            serverIPStats[srv.name].ips.push({ ip, listed: isListed, listType: sh.list || 'none' });
        });
    });

    console.log("\n================ SERVER LISTING RATES ================");
    Object.keys(serverIPStats).forEach(srvName => {
        const stats = serverIPStats[srvName];
        const rate = stats.totalIps > 0 ? ((stats.listedIps / stats.totalIps) * 100).toFixed(1) : '0.0';
        console.log(`${srvName.padEnd(16)} | Provider: ${stats.provider.padEnd(10)} | Entity: ${stats.entity.padEnd(8)} | IPs: ${String(stats.totalIps).padEnd(4)} | Listed: ${String(stats.listedIps).padEnd(4)} | Rate: ${rate}%`);
    });

    // Check by IP Subnet / Class
    const subnetStats = {};
    Object.keys(spamhaus).forEach(safeIp => {
        const ip = safeIp.replace(/_/g, '.');
        const octets = ip.split('.');
        if (octets.length === 4) {
            const classC = `${octets[0]}.${octets[1]}.${octets[2]}.0/24`;
            const classB = `${octets[0]}.${octets[1]}.0.0/16`;
            
            if (!subnetStats[classC]) subnetStats[classC] = { total: 0, listed: 0 };
            subnetStats[classC].total++;
            if (spamhaus[safeIp].status === 'listed') {
                subnetStats[classC].listed++;
            }
        }
    });

    console.log("\n================ SUBNET /24 CONCENTRATIONS (Top Listed) ================");
    const sortedSubnets = Object.keys(subnetStats)
        .map(sub => ({ subnet: sub, ...subnetStats[sub] }))
        .filter(s => s.total > 2)
        .sort((a, b) => (b.listed / b.total) - (a.listed / a.total));
        
    sortedSubnets.slice(0, 15).forEach(s => {
        const rate = ((s.listed / s.total) * 100).toFixed(1);
        console.log(`${s.subnet.padEnd(18)} | Total IPs in DB: ${String(s.total).padEnd(4)} | Listed: ${String(s.listed).padEnd(4)} | Rate: ${rate}%`);
    });

    // Look at drops history to correlate volume/activity with listing
    // Count drops per server
    const serverDrops = {};
    drops.forEach(d => {
        const srvs = (d.servers || '').split(',').map(s => s.trim());
        srvs.forEach(s => {
            if (s && s !== 'Unknown Server') {
                if (!serverDrops[s]) serverDrops[s] = { count: 0, totalOut: 0, totalRev: 0 };
                serverDrops[s].count++;
                serverDrops[s].totalOut += parseInt(d.totalOut || 0);
                serverDrops[s].totalRev += parseFloat(d.rev || 0);
            }
        });
    });

    console.log("\n================ SERVER ACTIVITY VS LISTINGS ================");
    Object.keys(serverIPStats).forEach(srvName => {
        const stats = serverIPStats[srvName];
        const act = serverDrops[srvName] || { count: 0, totalOut: 0, totalRev: 0 };
        const rate = stats.totalIps > 0 ? ((stats.listedIps / stats.totalIps) * 100).toFixed(1) : '0.0';
        console.log(`${srvName.padEnd(16)} | Listing Rate: ${rate.padStart(5)}% | Drops: ${String(act.count).padStart(4)} | Total Out: ${String(act.totalOut).padStart(9)} | Rev: $${act.totalRev.toFixed(0)}`);
    });

    // Look at Spamhaus Listing Reasons
    const reasonCounts = {};
    Object.keys(spamhaus).forEach(k => {
        const sh = spamhaus[k];
        if (sh.status === 'listed') {
            const reason = sh.reason || 'Unknown';
            const list = sh.list || 'CSS';
            const key = `${list} (${reason})`;
            reasonCounts[key] = (reasonCounts[key] || 0) + 1;
        }
    });
    console.log("\n================ SPAMHAUS LISTING TYPES ================");
    Object.keys(reasonCounts).forEach(r => {
        console.log(`${r.padEnd(25)}: ${reasonCounts[r]} occurrences`);
    });

} catch (e) {
    console.error(e);
}
