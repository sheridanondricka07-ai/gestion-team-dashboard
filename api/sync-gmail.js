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
            authTimeout: 15000, // Increased timeout
            tlsOptions: { rejectUnauthorized: false }
        }
    };

    try {
        const connection = await imap.connect(config);
        const results = {};
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        
        // Gmail standard folder names
        const boxes = ['INBOX', '[Gmail]/Spam'];

        for (const boxName of boxes) {
            try {
                await connection.openBox(boxName);
                
                // Optimized Search: Only messages from today to avoid scanning thousands of emails
                const today = new Date();
                const searchCriteria = [['SINCE', today]];
                
                const fetchOptions = {
                    bodies: ['HEADER'],
                    markSeen: false
                };

                const messages = await connection.search(searchCriteria, fetchOptions);
                
                // Sort newest first and limit to 50 to prevent timeout
                const sortedMessages = messages.sort((a, b) => b.attributes.uid - a.attributes.uid).slice(0, 50);

                for (const msg of sortedMessages) {
                    const headerPart = msg.parts.find(part => part.which === 'HEADER');
                    const msgDate = new Date(msg.attributes.date);

                    // Skip emails older than 2 hours
                    if (msgDate < twoHoursAgo) continue;

                    const headers = headerPart.body;
                    const receivedHeaders = headers.received || [];
                    const receivedList = Array.isArray(receivedHeaders) ? receivedHeaders : [receivedHeaders];

                    for (const rh of receivedList) {
                        // Check if it's the specific header line we need
                        if (rh.includes('by mx.google.com')) {
                            const match = rh.match(/from\s+([^\s\(\)]+)\s+\([^\)]*?\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]\)/i);
                            if (match) {
                                const vmta = match[1];
                                const ip = match[2];
                                
                                // Only extract if the IP belongs to our production list
                                if (targetIps.length === 0 || targetIps.includes(ip)) {
                                    if (!results[ip]) results[ip] = vmta;
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
        return res.status(200).json({ success: true, mappings: results });

    } catch (err) {
        console.error('Gmail Sync Error:', err.message);
        return res.status(500).json({ error: 'Connection failed. Please check your App Password or IMAP settings.' });
    }
}
