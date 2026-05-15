// IP Provider & ASN Lookup - Multi-Service Fallback
// Uses global fetch (Node 18+)

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP address is required' });

    console.log(`Lookup requested for: ${ip}`);

    const services = [
        {
            name: 'freeipapi.com',
            url: `https://freeipapi.com/api/json/${ip}`,
            parse: (d) => ({
                provider: d.attribution?.includes('IP-API') ? 'Unknown' : (d.cityName ? `${d.isp || d.org || d.asName}` : d.isp || d.org),
                asn: d.asn ? `AS${d.asn}` : ''
            })
        },
        {
            name: 'ip-api.com',
            url: `https://demo.ip-api.com/json/${ip}?fields=status,message,isp,as,org`,
            parse: (d) => ({
                provider: d.isp || d.org,
                asn: d.as
            })
        },
        {
            name: 'ipwho.is',
            url: `https://ipwho.is/${ip}`,
            parse: (d) => ({
                provider: d.connection?.isp || d.connection?.org,
                asn: d.connection?.asn ? `AS${d.connection.asn}` : ''
            })
        }
    ];

    for (const service of services) {
        try {
            console.log(`Trying ${service.name}...`);
            const response = await fetch(service.url, { 
                headers: { 'User-Agent': 'GestionTeam-Bot/1.0' },
                signal: AbortSignal.timeout(5000) 
            });

            if (!response.ok) continue;
            
            const data = await response.json();
            const result = service.parse(data);

            if (result.provider && result.provider !== 'Unknown') {
                console.log(`Success with ${service.name}`);
                return res.status(200).json(result);
            }
        } catch (e) {
            console.warn(`${service.name} failed: ${e.message}`);
        }
    }

    return res.status(500).json({ error: 'All lookup providers failed or were rate-limited' });
};
