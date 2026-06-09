const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: 'URL query parameter is required' });
        }

        // Add protocol if missing
        let targetUrl = url.trim();
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl;
        }

        // Fetch HTML with a timeout of 10 seconds
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        let response;
        try {
            response = await fetch(targetUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
                }
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            return res.status(response.status).json({ error: `Failed to fetch website. HTTP Status: ${response.status}` });
        }

        const html = await response.text();

        // 1. Try matching <footer> tag
        const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
        if (footerMatch) {
            return res.status(200).json({ 
                source: targetUrl, 
                type: 'tag', 
                html: footerMatch[0], 
                text: cleanHtml(footerMatch[1]) 
            });
        }

        // 2. Try matching div with class/id containing "footer"
        const divMatch = html.match(/<div[^>]*class=["'][^"']*\bfooter\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
                      || html.match(/<div[^>]*id=["'][^"']*\bfooter\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
        if (divMatch) {
            return res.status(200).json({ 
                source: targetUrl, 
                type: 'div', 
                html: divMatch[0], 
                text: cleanHtml(divMatch[1]) 
            });
        }

        // 3. Fallback: extract last 1000 chars of body or a portion of text
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
            const bodyContent = bodyMatch[1];
            const cleanBody = cleanHtml(bodyContent);
            const fallbackText = cleanBody.substring(Math.max(0, cleanBody.length - 800));
            return res.status(200).json({ 
                source: targetUrl, 
                type: 'fallback', 
                html: '<div>' + fallbackText + '</div>', 
                text: fallbackText 
            });
        }

        return res.status(404).json({ error: 'Could not extract footer from page structure.' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
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
