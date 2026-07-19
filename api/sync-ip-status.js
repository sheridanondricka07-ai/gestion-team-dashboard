const imap = require('imap-simple');

const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";
async function getFirebaseData(path) {
    try {
        const resp = await fetch(`${DB_URL}/${path}.json`);
        return await resp.json();
    } catch (e) {
        return null;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { email, password, targetIps = [] } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and App Password are required' });
    }

    const config = {
        imap: {
            user: email,
            password: password,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            authTimeout: 15000,
            tlsOptions: { rejectUnauthorized: false }
        }
    };

    try {
        const vmtaResults = await getFirebaseData('state/vmtaResults') || {};
        const rdnsMap = {};
        Object.entries(vmtaResults).forEach(([safeIp, data]) => {
            rdnsMap[safeIp] = (data.ptr || '').toLowerCase().trim();
        });

        const connection = await imap.connect(config);
        const results = {}; // { [ip]: { folder: 'INBOX'|'SPAM', returnPath: '...', headerRdns: '...', status: '...' } }
        const timeWindow = new Date(Date.now() - 4 * 60 * 60 * 1000);
        
        const boxes = ['INBOX', '[Gmail]/Spam'];

        for (const boxName of boxes) {
            try {
                await connection.openBox(boxName);
                
                const today = new Date();
                const searchCriteria = [['SINCE', today]];
                const fetchOptions = {
                    bodies: ['HEADER'],
                    markSeen: false
                };

                const messages = await connection.search(searchCriteria, fetchOptions);
                const sortedMessages = messages.sort((a, b) => b.attributes.uid - a.attributes.uid);

                for (const msg of sortedMessages) {
                    const headerPart = msg.parts.find(part => part.which === 'HEADER');
                    const msgDate = new Date(msg.attributes.date);

                    if (msgDate < timeWindow) break;

                    const headers = headerPart.body;
                    
                    // Case-insensitive header access
                    const headerKeys = Object.keys(headers);
                    const getHeader = (name) => {
                        const key = headerKeys.find(k => k.toLowerCase() === name.toLowerCase());
                        return (headers[key] || [])[0] || '';
                    };

                    const returnPath = getHeader('return-path').replace(/[<>]/g, '').trim();
                    const receivedHeaders = headers.received || [];
                    const receivedList = Array.isArray(receivedHeaders) ? receivedHeaders : [receivedHeaders];

                    for (const rh of receivedList) {
                        if (rh.includes('by mx.google.com')) {
                            // Enhanced regex to catch both hostname and IP
                            const match = rh.match(/from\s+([^\s\(\)]+)\s+\([^\)]*?\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]\)/i);
                            if (match) {
                                const headerRdns = match[1].toLowerCase().trim();
                                const ip = match[2];
                                
                                if (targetIps.length === 0 || targetIps.includes(ip)) {
                                    const folder = boxName.toLowerCase().includes('spam') ? 'SPAM' : 'INBOX';
                                    
                                    const safeIp = ip.replace(/\./g, '_');
                                    const stateRdns = (rdnsMap[safeIp] || '').toLowerCase().trim();
                                    const targetRdns = stateRdns || headerRdns;
                                    const rpFull = returnPath.toLowerCase().trim();
                                    const rpDomain = rpFull.includes('@') ? rpFull.split('@')[1] : rpFull;

                                    let statusVal = 'none';
                                    if (folder === 'INBOX') {
                                        statusVal = 'rdns';
                                    } else if (folder === 'SPAM') {
                                        statusVal = 'spam';
                                    }

                                    const priority = { 'rdns': 2, 'spam': 1, 'none': 0 };
                                    const existing = results[ip];
                                    let replace = false;
                                    if (!existing) {
                                        replace = true;
                                    } else {
                                        const existingStatus = existing.status || 'none';
                                        if (priority[statusVal] > priority[existingStatus]) {
                                            replace = true;
                                        }
                                    }

                                    if (replace) {
                                        results[ip] = {
                                            folder,
                                            returnPath: returnPath,
                                            headerRdns: headerRdns,
                                            status: statusVal
                                        };
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn(`Folder error (${boxName}):`, e.message);
            }
        }

        connection.end();
        return res.status(200).json({ success: true, results });

    } catch (err) {
        console.error('Gmail IP Status Sync Error:', err.message);
        return res.status(500).json({ error: 'Connection failed. Please check your App Password or IMAP settings.' });
    }
}
