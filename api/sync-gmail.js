const imap = require('imap-simple');
const { simpleParser } = require('mailparser');

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
            authTimeout: 10000,
            tlsOptions: { rejectUnauthorized: false }
        }
    };

    try {
        const connection = await imap.connect(config);
        const boxes = ['INBOX', '[Gmail]/Spam'];
        const results = {};
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        for (const boxName of boxes) {
            try {
                await connection.openBox(boxName);
                
                // Fetch last 100 messages from each box to filter by time
                const searchCriteria = ['ALL'];
                const fetchOptions = {
                    bodies: ['HEADER'],
                    markSeen: false,
                    struct: true
                };

                const messages = await connection.search(searchCriteria, fetchOptions);
                
                for (const msg of messages.reverse().slice(0, 100)) {
                    const headerPart = msg.parts.find(part => part.which === 'HEADER');
                    const msgDate = new Date(msg.attributes.date);

                    if (msgDate < twoHoursAgo) continue;

                    const headers = headerPart.body;
                    const receivedHeaders = headers.received || [];
                    const receivedList = Array.isArray(receivedHeaders) ? receivedHeaders : [receivedHeaders];

                    for (const rh of receivedList) {
                        if (rh.includes('by mx.google.com')) {
                            const match = rh.match(/from\s+([^\s\(\)]+)\s+\([^\)]*?\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]\)/i);
                            if (match) {
                                const vmta = match[1];
                                const ip = match[2];
                                
                                // Only add if it's one of our target IPs
                                if (targetIps.length === 0 || targetIps.includes(ip)) {
                                    if (!results[ip]) {
                                        results[ip] = vmta;
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn(`Could not open box ${boxName}:`, e.message);
            }
        }

        connection.end();
        return res.status(200).json({ success: true, mappings: results });

    } catch (err) {
        console.error('Gmail Sync Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
