const fs = require('fs');
const path = require('path');

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

    // --- HEADER EXTRACTOR (GET method) ---
    if (req.method === 'GET') {
        try {
            let domainsList = [];
            try {
                const filePath = path.join(process.cwd(), 'domains.txt');
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    domainsList = content.split('\n').map(d => d.trim()).filter(Boolean);
                }
            } catch (e) {
                console.error('Failed to read domains.txt:', e);
            }

            if (domainsList.length === 0) {
                domainsList = [
                    'wikipedia.org', 'github.com', 'reddit.com', 'stackoverflow.com', 
                    'medium.com', 'npmjs.com', 'wordpress.org', 'vimeo.com', 'tumblr.com', 
                    'imdb.com', 'archive.org', 'w3schools.com', 'mozilla.org', 'git-scm.com', 
                    'lipsum.com', 'sourceforge.net', 'kickstarter.com', 'ted.com', 
                    'nationalgeographic.com', 'bbc.com', 'nytimes.com', 'cnn.com', 
                    'theguardian.com', 'forbes.com', 'bloomberg.com'
                ];
            }

            let targetUrl = '';
            let html = '';
            let type = 'tag';
            let headerHtml = '';
            let cleanText = '';
            let success = false;
            let attempts = 0;
            const maxAttempts = 6;
            
            const requestedUrl = req.query.url;

            while (!success && attempts < maxAttempts) {
                attempts++;
                let currentDomain = '';

                if (requestedUrl && attempts === 1) {
                    currentDomain = requestedUrl.trim();
                } else {
                    currentDomain = domainsList[Math.floor(Math.random() * domainsList.length)];
                }

                targetUrl = currentDomain;
                if (!/^https?:\/\//i.test(targetUrl)) {
                    targetUrl = 'https://' + targetUrl;
                }

                try {
                    const response = await fetch(targetUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
                        },
                        signal: AbortSignal.timeout(6000)
                    });

                    if (!response.ok) continue;

                    html = await response.text();

                    // Try matching <header> tag
                    let headerMatch = html.match(/<header[^>]*>([\s\S]*?)<\/header>/i);
                    type = 'tag';

                    if (!headerMatch) {
                        headerMatch = html.match(/<div[^>]*class=["'][^"']*\b(?:header|navbar|topbar)\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
                                  || html.match(/<div[^>]*id=["'][^"']*\b(?:header|navbar|topbar)\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
                        type = 'div';
                    }

                    if (headerMatch) {
                        headerHtml = headerMatch[0];
                    } else {
                        // Fallback: body content or generic div (first 800 chars)
                        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                        const bodyContent = bodyMatch ? bodyMatch[1] : html;
                        const cleanBody = cleanHtml(bodyContent);
                        const fallbackText = cleanBody.substring(0, Math.min(cleanBody.length, 800));
                        headerHtml = '<div>' + fallbackText + '</div>';
                        type = 'fallback';
                    }

                    // Remove script tags from HTML output as requested
                    headerHtml = headerHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

                    cleanText = cleanHtml(headerHtml);
                    
                    if (cleanText.length > 5) {
                        success = true;
                    }
                } catch (e) {
                    console.log(`Attempt ${attempts} failed for ${currentDomain}: ${e.message}`);
                }
            }

            if (!success) {
                return res.status(500).json({ error: 'Failed to extract a valid header after multiple random website attempts.' });
            }

            return res.status(200).json({
                source: targetUrl.replace(/^https?:\/\//i, ''),
                type: type,
                html: headerHtml,
                text: cleanText
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: err.message || 'Internal server error' });
        }
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
