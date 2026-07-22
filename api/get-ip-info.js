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

    // --- FOOTER, HEADER & TEXT EXTRACTOR (GET method) ---
    if (req.method === 'GET') {
        try {
            const targetElement = req.query.target;
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

            if (targetElement === 'text') {
                const count = Math.min(Math.max(parseInt(req.query.count) || 1, 1), 50);
                const extractedTexts = [];
                const sources = [];
                let attempts = 0;
                const maxAttempts = 30;
                let buildingText = '';

                while (extractedTexts.length < count && attempts < maxAttempts) {
                    attempts++;
                    const currentDomain = domainsList[Math.floor(Math.random() * domainsList.length)];
                    let targetUrl = currentDomain;
                    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'https://' + targetUrl;

                    try {
                        const response = await fetch(targetUrl, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
                            },
                            signal: AbortSignal.timeout(6000)
                        });

                        if (!response.ok) continue;
                        const htmlText = await response.text();
                        const blocks = extractParagraphsFromHtml(htmlText);

                        for (const block of blocks) {
                            if (countWords(block) >= 200) {
                                if (extractedTexts.length < count) {
                                    extractedTexts.push(block);
                                }
                            } else {
                                buildingText = buildingText ? (buildingText + ' ' + block) : block;
                                if (countWords(buildingText) >= 200) {
                                    if (extractedTexts.length < count) {
                                        extractedTexts.push(buildingText);
                                        buildingText = '';
                                    }
                                }
                            }
                        }

                        if (blocks.length > 0 && !sources.includes(currentDomain)) {
                            sources.push(currentDomain);
                        }
                    } catch (e) {
                        console.log(`Attempt ${attempts} failed for ${currentDomain}: ${e.message}`);
                    }
                }

                if (buildingText && countWords(buildingText) >= 150 && extractedTexts.length < count) {
                    extractedTexts.push(buildingText);
                }

                if (extractedTexts.length === 0) {
                    return res.status(500).json({ error: 'Failed to extract text blocks of at least 200 words.' });
                }

                return res.status(200).json({
                    source: sources.join(', '),
                    count: extractedTexts.length,
                    text: extractedTexts.join(';\n\n')
                });
            }

            let targetUrl = '';
            let html = '';
            let type = 'tag';
            let extractedHtml = '';
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

                    if (targetElement === 'header') {
                        let headerMatch = html.match(/<header[^>]*>([\s\S]*?)<\/header>/i);
                        type = 'tag';

                        if (!headerMatch) {
                            headerMatch = html.match(/<div[^>]*class=["'][^"']*\b(?:header|navbar|topbar)\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
                                      || html.match(/<div[^>]*id=["'][^"']*\b(?:header|navbar|topbar)\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
                            type = 'div';
                        }

                        if (headerMatch) {
                            extractedHtml = headerMatch[0];
                        } else {
                            const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                            const bodyContent = bodyMatch ? bodyMatch[1] : html;
                            const cleanBody = cleanHtml(bodyContent);
                            const fallbackText = cleanBody.substring(0, Math.min(cleanBody.length, 800));
                            extractedHtml = '<div>' + fallbackText + '</div>';
                            type = 'fallback';
                        }
                        // Remove script tags from HTML output as requested
                        extractedHtml = extractedHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
                    } else {
                        let footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
                        type = 'tag';

                        if (!footerMatch) {
                            footerMatch = html.match(/<div[^>]*class=["'][^"']*\bfooter\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
                                      || html.match(/<div[^>]*id=["'][^"']*\bfooter\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
                            type = 'div';
                        }

                        if (footerMatch) {
                            extractedHtml = footerMatch[0];
                        } else {
                            const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                            const bodyContent = bodyMatch ? bodyMatch[1] : html;
                            const cleanBody = cleanHtml(bodyContent);
                            const fallbackText = cleanBody.substring(Math.max(0, cleanBody.length - 800));
                            extractedHtml = '<div>' + fallbackText + '</div>';
                            type = 'fallback';
                        }
                    }

                    cleanText = cleanHtml(extractedHtml);
                    
                    if (cleanText.length > 5) {
                        success = true;
                    }
                } catch (e) {
                    console.log(`Attempt ${attempts} failed for ${currentDomain}: ${e.message}`);
                }
            }

            if (!success) {
                return res.status(500).json({ error: `Failed to extract a valid ${targetElement} after multiple random website attempts.` });
            }

            return res.status(200).json({
                source: targetUrl.replace(/^https?:\/\//i, ''),
                type: type,
                html: extractedHtml,
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

function countWords(str) {
    if (!str) return 0;
    return str.trim().split(/\s+/).filter(Boolean).length;
}

function extractParagraphsFromHtml(html) {
    let clean = html
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
        .replace(/<head[^>]*>([\s\S]*?)<\/head>/gi, '')
        .replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, '')
        .replace(/<header[^>]*>([\s\S]*?)<\/header>/gi, '')
        .replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, '')
        .replace(/<svg[^>]*>([\s\S]*?)<\/svg>/gi, '');

    const pMatches = clean.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    const rawParagraphs = [];

    for (const match of pMatches) {
        const text = cleanHtml(match);
        if (text.length >= 30 && !/cookie|privacy policy|all rights reserved|javascript/i.test(text)) {
            rawParagraphs.push(text);
        }
    }

    if (rawParagraphs.length === 0) {
        const fullClean = cleanHtml(clean);
        const sentences = fullClean.split(/(?<=[.!?])\s+/);
        for (const s of sentences) {
            if (s.trim().length >= 20) rawParagraphs.push(s.trim());
        }
    }

    const blocks = [];
    let currentBlock = '';

    for (const p of rawParagraphs) {
        currentBlock = currentBlock ? (currentBlock + ' ' + p) : p;
        if (countWords(currentBlock) >= 200) {
            blocks.push(currentBlock.trim());
            currentBlock = '';
        }
    }

    if (currentBlock && countWords(currentBlock) >= 150) {
        blocks.push(currentBlock.trim());
    }

    return blocks;
}
