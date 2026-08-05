const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('database_backup.json', 'utf8')).state;
    const vmtaResults = data.vmtaResults || {};
    const spamhaus = data.spamhaus || {};
    
    console.log("Analyzing data fields...");
    
    // Check structure of vmtaResults
    const sampleVmtaKey = Object.keys(vmtaResults)[0];
    console.log("Sample vmtaResults entry:", sampleVmtaKey, JSON.stringify(vmtaResults[sampleVmtaKey]));
    
    // Check structure of spamhaus
    const sampleSpamhausKey = Object.keys(spamhaus)[0];
    console.log("Sample spamhaus entry:", sampleSpamhausKey, JSON.stringify(spamhaus[sampleSpamhausKey]));
    
    // Extract unique domains from PTRs
    const uniqueDomains = new Set();
    let ptrCount = 0;
    
    Object.keys(vmtaResults).forEach(ipKey => {
        const entry = vmtaResults[ipKey];
        if (entry && entry.ptr && entry.ptr !== 'NXDOMAIN / No PTR' && entry.ptr !== 'No PTR record') {
            ptrCount++;
            // Clean up domain name
            const cleanHost = entry.ptr.trim().replace(/\.$/, '').toLowerCase();
            const parts = cleanHost.split('.');
            if (parts.length >= 2) {
                // Get main domain (e.g. durmorel.store)
                const domain = parts.slice(-2).join('.');
                uniqueDomains.add(domain);
            }
        }
    });
    
    console.log(`Total active PTR records: ${ptrCount}`);
    console.log(`Total unique root domains: ${uniqueDomains.size}`);
    console.log("Unique domains:", Array.from(uniqueDomains).slice(0, 10));

} catch (e) {
    console.error(e);
}
