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
    // Security check: only allow cron or manual trigger from app
    // In Vercel, cron jobs send a specific header
    const authHeader = req.headers['authorization'];
    if (req.method !== 'POST' && !authHeader?.includes('Bearer')) {
        return res.status(401).send('Unauthorized');
    }

    try {
        console.log('Starting Spamhaus check...');
        const snapshot = await db.ref('state').once('value');
        const state = snapshot.val();
        
        if (!state || !state.servers) {
            return res.status(400).send('No servers found in state');
        }

        const allIps = [];
        state.servers.forEach(s => {
            if (s.allIps) allIps.push(...s.allIps);
        });
        const uniqueIps = [...new Set(allIps)];
        
        const results = {};
        const timestamp = new Date().toISOString();
        const dateKey = timestamp.split('T')[0]; // YYYY-MM-DD

        // Reset progress
        await db.ref('state/spamhausProgress').set({
            total: uniqueIps.length,
            current: 0,
            status: 'running'
        });

        // Parallel checking with simple batching (concurrency = 50)
        const batchSize = 50;
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
            
            // Update progress in database
            await db.ref('state/spamhausProgress/current').set(Math.min(i + batchSize, uniqueIps.length));
        }

        // Update current state
        await db.ref('state/spamhaus').update(results);
        await db.ref('state/spamhausLastUpdate').set(new Date().toLocaleString());
        
        // Save to history
        await db.ref(`state/spamhausHistory/${dateKey}`).set({
            timestamp: timestamp,
            summary: {
                total: uniqueIps.length,
                listed: Object.values(results).filter(r => r.status === 'listed').length
            },
            results: results
        });

        // Mark progress as completed
        await db.ref('state/spamhausProgress/status').set('idle');

        res.status(200).json({ success: true, checked: uniqueIps.length });
    } catch (error) {
        console.error('Spamhaus Check Error:', error);
        await db.ref('state/spamhausProgress/status').set('error');
        res.status(500).send(error.message);
    }
}
