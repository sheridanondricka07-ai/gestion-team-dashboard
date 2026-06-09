// IP Provider & ASN Lookup - Multi-Service Fallback
// AND Website Footer Extractor
// Uses global fetch (Node 18+)

module.exports = async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // --- FOOTER EXTRACTOR (GET method) ---
    if (req.method === 'GET' && req.query.url) {
        try {
            const { url } = req.query;
            let targetUrl = url.trim();
            if (!/^https?:\/\//i.test(targetUrl)) {
                targetUrl = 'https://' + targetUrl;
            }

            const response = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
                },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                return res.status(response.status).json({ error: `Failed to fetch website. HTTP Status: ${response.status}` });
            }

            const html = await response.text();

            // 1. Try matching <footer> tag
            let footerHtml = '';
            let type = 'tag';
            let footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
            
            // 2. Try matching div with class/id containing "footer"
            if (!footerMatch) {
                footerMatch = html.match(/<div[^>]*class=["'][^"']*\bfooter\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
                          || html.match(/<div[^>]*id=["'][^"']*\bfooter\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
                type = 'div';
            }

            if (footerMatch) {
                footerHtml = footerMatch[0];
            } else {
                // 3. Fallback: body content or generic div
                const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                const bodyContent = bodyMatch ? bodyMatch[1] : html;
                const cleanBody = cleanHtml(bodyContent);
                const fallbackText = cleanBody.substring(Math.max(0, cleanBody.length - 800));
                footerHtml = '<div>' + fallbackText + '</div>';
                type = 'fallback';
            }

            const cleanText = cleanHtml(footerHtml);

            return res.status(200).json({
                source: targetUrl,
                type: type,
                html: footerHtml,
                text: cleanText
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: err.message || 'Internal server error' });
        }
    }

    // --- IP PROVIDER & ASN LOOKUP (POST method) ---
    if (req.method === 'POST') {
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
    }

    return res.status(405).send('Method Not Allowed');
};

function cleanHtml(html) {
    // Remove script and style tags
    let clean = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
    clean = clean.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '');
    // Replace html tags with spaces/newlines
    clean = clean.replace(/<[^>]+>/g, ' ');
    // Decode basic entities
    clean = clean.replace(/&nbsp;/g, ' ')
                 .replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/&copy;/g, '©');
    // Normalize spaces
    clean = clean.replace(/\s+/g, ' ').trim();
    return clean;
}
