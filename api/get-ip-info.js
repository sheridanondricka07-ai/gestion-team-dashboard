// IP Provider & ASN Lookup using ipwho.is (HTTPS, no auth required)

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { ip } = req.body;

    if (!ip) {
        return res.status(400).json({ error: 'IP address is required' });
    }

    try {
        const response = await fetch(`https://ipwho.is/${ip}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Lookup failed');
        }

        const provider = data.connection?.isp || data.connection?.org || 'Unknown';
        const asn = data.connection?.asn
            ? `AS${data.connection.asn} ${data.connection.org || ''}`
            : 'Unknown';

        return res.status(200).json({ provider, asn });

    } catch (err) {
        console.error('IP Lookup Error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch IP information' });
    }
};
