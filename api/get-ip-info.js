import fetch from 'node-fetch';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { ip } = req.body;

    if (!ip) {
        return res.status(400).json({ error: 'IP address is required' });
    }

    try {
        // Switched to ipwho.is which supports HTTPS and is free for basic usage
        const response = await fetch(`https://ipwho.is/${ip}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Lookup failed');
        }

        return res.status(200).json({
            provider: data.connection?.isp || data.org || 'Unknown',
            asn: data.connection?.asn ? `AS${data.connection.asn} ${data.connection.org || ''}` : 'Unknown'
        });

    } catch (err) {
        console.error('IP Lookup Error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch IP information' });
    }
}
