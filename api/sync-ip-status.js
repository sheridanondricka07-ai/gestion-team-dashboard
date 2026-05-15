const imap = require('imap-simple');

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
        const connection = await imap.connect(config);
        const results = {}; // { [ip]: { folder: 'INBOX'|'SPAM', returnPath: '...' } }
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        
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
                const sortedMessages = messages.sort((a, b) => b.attributes.uid - a.attributes.uid).slice(0, 500);

                for (const msg of sortedMessages) {
                    const headerPart = msg.parts.find(part => part.which === 'HEADER');
                    const msgDate = new Date(msg.attributes.date);

                    if (msgDate < twoHoursAgo) continue;

                    const headers = headerPart.body;
                    const returnPath = (headers['return-path'] || [])[0] || '';
                    const receivedHeaders = headers.received || [];
                    const receivedList = Array.isArray(receivedHeaders) ? receivedHeaders : [receivedHeaders];

                    for (const rh of receivedList) {
                        if (rh.includes('by mx.google.com')) {
                            const match = rh.match(/from\s+([^\s\(\)]+)\s+\([^\)]*?\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]\)/i);
                            if (match) {
                                const ip = match[2];
                                
                                if (targetIps.length === 0 || targetIps.includes(ip)) {
                                    // Status priority: INBOX data is collected if not already present
                                    // If same IP found in multiple emails, we keep the one from INBOX if available
                                    const folder = boxName === 'INBOX' ? 'INBOX' : 'SPAM';
                                    
                                    if (!results[ip] || (results[ip].folder === 'SPAM' && folder === 'INBOX')) {
                                        results[ip] = {
                                            folder,
                                            returnPath: returnPath.replace(/[<>]/g, '').trim()
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
