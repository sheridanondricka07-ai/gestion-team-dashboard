const imap = require('imap-simple');
const { simpleParser } = require('mailparser');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { email, password, limit = 50 } = req.body;

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
        await connection.openBox('INBOX');

        const searchCriteria = ['ALL'];
        const fetchOptions = {
            bodies: ['HEADER', 'TEXT'],
            markSeen: false
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        const results = {};

        for (const msg of messages.reverse().slice(0, limit)) {
            const all = msg.parts.find(part => part.which === 'HEADER');
            const id = msg.attributes.uid;
            const headers = all.body;

            // Look for Received header that contains mx.google.com
            // Example: Received: from szg.iirmnwi.tw (crc-dans.filterorbit.com. [51.83.146.80]) by mx.google.com ...
            const receivedHeaders = headers.received || [];
            const receivedList = Array.isArray(receivedHeaders) ? receivedHeaders : [receivedHeaders];

            for (const rh of receivedList) {
                if (rh.includes('by mx.google.com')) {
                    // Regex to extract VMTA and IP
                    // Received: from szg.iirmnwi.tw (crc-dans.filterorbit.com. [51.83.146.80])
                    const match = rh.match(/from\s+([^\s\(\)]+)\s+\([^\)]*?\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]\)/i);
                    if (match) {
                        const vmta = match[1];
                        const ip = match[2];
                        if (!results[ip]) {
                            results[ip] = vmta;
                        }
                    }
                }
            }
        }

        connection.end();
        return res.status(200).json({ success: true, mappings: results });

    } catch (err) {
        console.error('Gmail Sync Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
