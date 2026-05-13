const dns = require('dns').promises;
const admin = require('firebase-admin');

// Initialize Firebase Admin with the database URL
if (!admin.apps.length) {
    admin.initializeApp({
        databaseURL: "https://gestion-team-c-default-rtdb.firebaseio.com"
    });
}

const db = admin.database();

// Spamhaus accounts provided by the user
const accounts = [
    { name: 'spamhaus1', customerId: '86022311', email: 'mickeyjohn911@gmail.com' },
    { name: 'spamhaus2', customerId: '81321951', email: 'thenewonetwo123@gmail.com' }
];

async function checkIP(ip) {
    const reversedIP = ip.split('.').reverse().join('.');
    // zen.spamhaus.org is the combined list (SBL, XBL, PBL)
    // For free use, Spamhaus blocks public resolvers. 
    // In a production environment, you should use your DQS key here:
    // const query = `${reversedIP}.${DQS_KEY}.zen.spamhaus.org`;
    const query = `${reversedIP}.zen.spamhaus.org`;
    
    try {
        const addresses = await dns.resolve4(query);
        if (addresses.length > 0) {
            const result = addresses[0];
            let list = 'LISTED';
            if (result === '127.0.0.3') list = 'CSS';
            else if (result === '127.0.0.2') list = 'SBL';
            return { status: 'listed', list: list };
        }
    } catch (err) {
        if (err.code === 'ENOTFOUND') {
            return { status: 'clean' };
        }
        throw err;
    }
    return { status: 'clean' };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        // Fetch state via REST
        const stateRes = await fetch(`${DB_URL}/state.json`);
        const state = await stateRes.json();
        
        if (!state || !state.servers) {
            return res.status(400).send('No servers found in state');
        }

        const allIps = [];
        state.servers.forEach(s => {
            if (s.allIps) allIps.push(...s.allIps);
        });
        const uniqueIps = [...new Set(allIps)];
        
        if (uniqueIps.length === 0) {
            return res.status(200).json({ success: true, message: 'No IPs to check' });
        }

        const results = {};
        const timestamp = new Date().toISOString();
        const dateKey = timestamp.split('T')[0];

        // Start progress
        await setFirebase('spamhausProgress', {
            total: uniqueIps.length,
            current: 0,
            status: 'running'
        });

        const batchSize = 5;
        let currentCount = 0;
        
        for (let i = 0; i < uniqueIps.length; i += batchSize) {
            const batch = uniqueIps.slice(i, i + batchSize);
            await Promise.all(batch.map(async (ip) => {
                try {
                    const result = await checkIP(ip);
                    const safeIp = ip.replace(/\./g, '_');
                    results[safeIp] = {
                        ...result,
                        timestamp: timestamp
                    };
                } catch (err) {
                    console.error(`Failed to check ${ip}:`, err.message);
                }
            }));
            
            currentCount += batch.length;
            await updateFirebase('spamhausProgress', { current: currentCount });
        }

        // Final updates
        await updateFirebase('spamhaus', results);
        await setFirebase('spamhausLastUpdate', new Date().toLocaleString());
        await setFirebase(`spamhausHistory/${dateKey}`, {
            timestamp: timestamp,
            summary: {
                total: uniqueIps.length,
                listed: Object.values(results).filter(r => r.status === 'listed').length
            },
            results: results
        });
        await updateFirebase('spamhausProgress', { status: 'idle' });

        res.status(200).json({ success: true, checked: uniqueIps.length });
    } catch (error) {
        console.error('Critical Handler Error:', error);
        res.status(500).send('Critical Error: ' + error.message);
    }
}
