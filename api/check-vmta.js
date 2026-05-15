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
    
    // Process in batches to avoid timeouts (Vercel limit is usually 10s on hobby)
    const checkIp = async (ip) => {
        try {
            const ptrs = await dns.reverse(ip);
            return {
                ptr: ptrs[0] || 'No PTR record',
                status: 'OK',
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

    // Use Promise.all with a bit of caution for large lists
    const entries = await Promise.all(ips.map(async (ip) => {
        const data = await checkIp(ip);
        return [ip.replace(/\./g, '_'), data];
    }));

    entries.forEach(([key, val]) => {
        results[key] = val;
    });

    return res.status(200).json({ results });
}
