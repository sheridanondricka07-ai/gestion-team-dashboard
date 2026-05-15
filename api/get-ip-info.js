// IP Provider & ASN Lookup - uses multiple fallback services

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { ip } = req.body;

    if (!ip) {
        return res.status(400).json({ error: 'IP address is required' });
    }

    // Try multiple services in order of reliability
    const services = [
        {
            name: 'ipinfo.io',
            url: `https://ipinfo.io/${ip}/json`,
            parse: (data) => ({
                provider: data.org ? data.org.replace(/^AS\d+\s*/, '') : 'Unknown',
                asn: data.org || 'Unknown'
            })
        },
        {
            name: 'ip-api.com',
            url: `http://ip-api.com/json/${ip}?fields=status,isp,as,org`,
            parse: (data) => ({
                provider: data.isp || data.org || 'Unknown',
                asn: data.as || 'Unknown'
            })
        }
    ];

    for (const service of services) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(service.url, {
                signal: controller.signal,
                headers: { 'User-Agent': 'GestionTeam/1.0' }
            });
            clearTimeout(timeout);

            if (!response.ok) continue;

            const data = await response.json();

            // ip-api returns status field
            if (data.status && data.status === 'fail') continue;

            const result = service.parse(data);
            if (result.provider && result.provider !== 'Unknown') {
                return res.status(200).json(result);
            }
        } catch (err) {
            console.warn(`${service.name} failed:`, err.message);
            continue;
        }
    }

    return res.status(500).json({ error: 'All lookup services failed' });
};
