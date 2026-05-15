import fetch from 'node-fetch';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { ip } = req.body;

    if (!ip) {
        return res.status(400).json({ error: 'IP address is required' });
    }

    try {
        // Using ip-api.com (Free tier: 45 req/min)
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,isp,as,org`);
        const data = await response.json();

        if (data.status === 'fail') {
            throw new Error(data.message || 'Lookup failed');
        }

        return res.status(200).json({
            provider: data.isp || data.org || 'Unknown',
            asn: data.as || 'Unknown'
        });

    } catch (err) {
        console.error('IP Lookup Error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch IP information' });
    }
}
