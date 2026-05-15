const dns = require('dns').promises;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { ips } = req.body;

    if (!ips || !Array.isArray(ips)) {
        return res.status(400).json({ error: 'Invalid IPs provided' });
    }

    const results = {};
    
    const checkIp = async (ip) => {
        try {
            // Set a timeout for each individual DNS lookup
            const ptrs = await dns.reverse(ip);
            return {
                ptr: ptrs[0] || 'No PTR record',
                status: ptrs[0] ? 'OK' : 'ERROR',
                timestamp: new Date().toLocaleString()
            };
        } catch (err) {
            return {
                ptr: 'NXDOMAIN / No PTR',
                status: 'ERROR',
                timestamp: new Date().toLocaleString(),
                error: err.code
            };
        }
    };

    // Chunk processing (10 at a time) to be stable
    const chunkSize = 10;
    for (let i = 0; i < ips.length; i += chunkSize) {
        const chunk = ips.slice(i, i + chunkSize);
        const chunkResults = await Promise.all(chunk.map(async (ip) => {
            const data = await checkIp(ip);
            return [ip.replace(/\./g, '_'), data];
        }));
        
        chunkResults.forEach(([key, val]) => {
            results[key] = val;
        });
    }

    return res.status(200).json({ results });
}
