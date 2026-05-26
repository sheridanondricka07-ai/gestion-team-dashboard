const DB_URL = "https://gestion-team-c-default-rtdb.firebaseio.com";

function extractOfferId(offerStr) {
    if (!offerStr) return '';
    const cleanStr = offerStr.trim();
    const parenMatch = cleanStr.match(/^\((\d+)\)/);
    if (parenMatch) return parenMatch[1];
    const prefixMatch = cleanStr.match(/^(\d+)\s*(?:\||\s|$)/);
    if (prefixMatch) return prefixMatch[1];
    const fallbackMatch = cleanStr.match(/\b(\d{4,6})\b/);
    if (fallbackMatch) return fallbackMatch[1];
    return '';
}

async function getFirebaseData(path) {
    try {
        const resp = await fetch(`${DB_URL}/${path}.json`);
        return await resp.json();
    } catch (e) {
        console.error('Firebase REST Error:', e);
        return null;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { message, history } = req.body || {};

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // 1. Fetch AI config for the API Key
        const aiConfig = await getFirebaseData('state/aiConfig') || {};
        const apiKey = aiConfig.geminiApiKey;

        // 2. Fetch current application state for context
        const servers = await getFirebaseData('state/servers') || [];
        const drops = await getFirebaseData('state/drops') || [];
        const mailers = await getFirebaseData('state/mailers') || [];
        const spamhaus = await getFirebaseData('state/spamhaus') || {};
        const vmtaResults = await getFirebaseData('state/vmtaResults') || {};

        // 3. Calculate exact inventory counts & stats in code to avoid LLM counting hallucinations
        let totalServers = 0;
        let totalIps = 0;
        let totalListedSpamhaus = 0;
        let totalVmtaOk = 0;
        let totalVmtaErrors = 0;

        // Track VMTA extension (TLD) breakdown from actual VMTA domains (not PTR)
        const vmtaTldCounts = {};       // e.g. { ".com": 15, ".pw": 8, ".uk": 4 }
        const vmtaDomainCounts = {};    // e.g. { "fbcw.tw": 1, "feth.pw": 1 }
        let totalVmtaAssigned = 0;
        let totalVmtaUnassigned = 0;

        const formattedServers = servers.map(s => {
            if (!s) return null;
            totalServers++;
            const ips = s.allIps || [];
            const vmtaMap = s.vmtaMap || {};
            const ipStatuses = ips.map(ip => {
                totalIps++;
                const safeIp = ip.replace(/\./g, '_');
                const sh = spamhaus[safeIp] || { status: 'clean' };
                const vm = vmtaResults[safeIp] || { status: 'OK', ptr: 'N/A' };
                const vmtaDomain = vmtaMap[safeIp] || null;
                
                if (sh.status === 'listed') totalListedSpamhaus++;
                if (vm.status !== 'OK') {
                    totalVmtaErrors++;
                } else {
                    totalVmtaOk++;
                }

                // Extract VMTA TLD and domain from actual VMTA column data
                if (vmtaDomain && vmtaDomain !== '---') {
                    totalVmtaAssigned++;
                    const parts = vmtaDomain.split('.');
                    if (parts.length >= 2) {
                        // TLD breakdown (e.g. ".com", ".pw", ".uk", ".tw")
                        const tld = '.' + parts[parts.length - 1];
                        vmtaTldCounts[tld] = (vmtaTldCounts[tld] || 0) + 1;
                        
                        // Domain breakdown (e.g. "fbcw.tw", "feth.pw")
                        const domain = parts.slice(-2).join('.');
                        vmtaDomainCounts[domain] = (vmtaDomainCounts[domain] || 0) + 1;
                    }
                } else {
                    totalVmtaUnassigned++;
                }

                const ptr = vm.ptr || 'N/A';
                return `${ip} (VMTA: ${vmtaDomain || 'N/A'}, PTR: ${ptr}, Spamhaus: ${sh.status === 'listed' ? `LISTED on ${sh.list}` : 'clean'})`;
            }).join(', ');
            return `- Name: ${s.name}, Main IP: ${s.ip || 'N/A'}, Status: ${s.status || 'active'}, IPs: [${ipStatuses}]`;
        }).filter(Boolean).join('\n');

        // Build VMTA TLD breakdown string
        const tldBreakdown = Object.entries(vmtaTldCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([tld, count]) => `- ${tld}: ${count} IPs`)
            .join('\n');

        // Build VMTA domain breakdown string (top 30)
        const domainBreakdown = Object.entries(vmtaDomainCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30)
            .map(([domain, count]) => `- ${domain}: ${count} IPs`)
            .join('\n');

        // Pre-compute offer stats across ALL drops
        const offerStats = {};
        drops.forEach(d => {
            if (!d || !d.offer) return;
            const offerStr = d.offer;
            const oId = d.offerId || extractOfferId(offerStr);
            const key = oId || offerStr;
            
            if (!offerStats[key]) {
                offerStats[key] = {
                    id: oId || 'N/A',
                    name: offerStr,
                    totalRev: 0,
                    totalClicks: 0,
                    totalOut: 0,
                    count: 0
                };
            }
            
            offerStats[key].totalRev += parseFloat(d.rev || 0);
            offerStats[key].totalClicks += parseFloat(d.clicks || 0);
            offerStats[key].totalOut += parseFloat(d.totalOut || 0);
            offerStats[key].count += 1;
            
            // Keep the cleanest name (with ID or longest name)
            if (offerStr.length > offerStats[key].name.length) {
                offerStats[key].name = offerStr;
            }
        });

        const sortedOffers = Object.values(offerStats).sort((a, b) => b.totalRev - a.totalRev);
        
        const topOffersBreakdown = sortedOffers.slice(0, 20).map((o, idx) => {
            const epc = o.totalClicks > 0 ? (o.totalRev / o.totalClicks).toFixed(2) : '0.00';
            const cpm = o.totalOut > 0 ? ((o.totalRev * 1000) / o.totalOut).toFixed(2) : '0.00';
            return `- Rank ${idx + 1}: [ID: ${o.id}] "${o.name}" - Total Rev: $${o.totalRev.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Drops: ${o.count} | EPC: $${epc} | CPM: $${cpm}`;
        }).join('\n');

        const formattedDrops = drops.slice(-50).map(d => {
            if (!d) return null;
            return `- Date: ${d.date}, Mailer: ${d.mailerName}, Offer: ${d.offer}, OfferID: ${d.offerId || extractOfferId(d.offer)}, EPC: $${d.epc || 0}, CPM: $${d.cpm || 0}, Rev: $${d.rev || 0}`;
        }).filter(Boolean).join('\n');

        const formattedMailers = mailers.map(m => {
            if (!m) return null;
            return `- Name: ${m.name}, Role: ${m.role || 'mailer'}, MailerID: ${m.id}`;
        }).filter(Boolean).join('\n');

        // Construct System Instruction
        const systemPrompt = `You are "Gestion Team AI Agent", an intelligent assistant integrated into the Team Emailing Infrastructure Dashboard.
Your job is to analyze real-time infrastructure, server blacklists (Spamhaus), VMTA/PTR status, and drop revenue performance to answer questions, extract data, and generate insights.

SUMMARY STATISTICS (EXACT PRE-COMPUTED COUNTS — USE THESE, DO NOT RECOUNT):
------------------
- Total Registered Servers: ${totalServers}
- Total Registered IPs in Inventory: ${totalIps}
- Total IPs Currently Listed on Spamhaus: ${totalListedSpamhaus}
- Total IPs with PTR OK: ${totalVmtaOk}
- Total IPs with PTR Errors: ${totalVmtaErrors}
- Total IPs with Assigned VMTA: ${totalVmtaAssigned}
- Total IPs with Unassigned/Empty VMTA: ${totalVmtaUnassigned}

VMTA TLD BREAKDOWN (PRE-COMPUTED — USE THESE EXACT NUMBERS):
------------------
${tldBreakdown || 'No VMTA TLD extensions detected.'}

VMTA DOMAIN BREAKDOWN (PRE-COMPUTED — USE THESE EXACT NUMBERS):
------------------
${domainBreakdown || 'No VMTA domains detected.'}

TOP PERFORMING OFFERS (PRE-COMPUTED BY REVENUE — USE THESE FOR TOP OFFERS / ANALYTICS):
------------------
${topOffersBreakdown || 'No top offer statistics computed.'}

CURRENT REAL-TIME CONTEXT DATA:
------------------
TODAY'S DATE/TIME: ${new Date().toLocaleString()}

MAILERS/TEAM MEMBERS:
${formattedMailers || 'No mailers registered.'}

SERVERS & IP INFRASTRUCTURE (WITH PTR, SPAMHAUS & VMTA MAPPING):
${formattedServers || 'No servers configured.'}

RECENT DROP REVENUE & PERFORMANCE DATA (Last 50 drops):
${formattedDrops || 'No recent drops recorded.'}
------------------

GUIDELINES:
1. Always base your analysis directly on the provided context data. When asked about counts, totals, or breakdowns, USE THE PRE-COMPUTED STATISTICS ABOVE. Do not try to recount from the raw data — use the exact numbers provided.
2. Format your response cleanly using HTML tags for maximum compatibility with the chat window (e.g. <b>, <i>, <ul>, <li>, <pre>, <code>, <br>). Do not use markdown headers (like #, ##) in the HTML output; use bold text or styled headers instead.
3. Be professional, direct, and actionable. Provide statistical summaries or warnings if you notice listed IPs or low-performing drops.
4. If the user asks about VMTA extensions, VMTA TLDs, VMTA domains, or domain breakdowns, reference the VMTA TLD BREAKDOWN and VMTA DOMAIN BREAKDOWN sections above.
5. If the user asks for the "top offer" or offer analytics, look at the TOP PERFORMING OFFERS section above. Explain the rank, name, ID, total revenue, drops, EPC, and CPM.
6. If the user asks you to perform a task outside of analyzing/extracting this data, guide them back to server administration or performance analytics.`;

        let responseText = '';

        if (apiKey) {
            // --- USE GEMINI API ---
            const contents = [];
            
            // Add chat history if present
            if (Array.isArray(history)) {
                history.slice(-10).forEach(h => {
                    contents.push({
                        role: h.role === 'user' ? 'user' : 'model',
                        parts: [{ text: h.text }]
                    });
                });
            }

            // Add latest user prompt
            contents.push({
                role: 'user',
                parts: [{ text: message }]
            });

            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

            const apiResponse = await fetch(geminiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: contents,
                    systemInstruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 2500
                    }
                })
            });

            if (!apiResponse.ok) {
                const errData = await apiResponse.json().catch(() => ({}));
                console.error('Gemini API Error:', errData);
                return res.status(200).json({
                    response: `⚠️ <b>Error communicating with Gemini API.</b><br>Please verify that your API key is correct and valid. Developer message: <i>${errData.error?.message || 'Unknown error'}</i>`
                });
            }

            const data = await apiResponse.json();
            responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I was unable to generate a response. Please try again.";
        } else {
            // --- USE FREE POLLINATIONS.AI API (DeepSeek R1 — powerful reasoning model) ---
            const messages = [
                { role: 'system', content: systemPrompt }
            ];

            if (Array.isArray(history)) {
                history.slice(-10).forEach(h => {
                    messages.push({
                        role: h.role === 'user' ? 'user' : 'assistant',
                        content: h.text
                    });
                });
            }

            messages.push({
                role: 'user',
                content: message
            });

            try {
                const pollinationsUrl = 'https://text.pollinations.ai/openai';
                const apiResponse = await fetch(pollinationsUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'deepseek-r1',
                        messages: messages
                    })
                });

                if (!apiResponse.ok) {
                    throw new Error(`HTTP error! status: ${apiResponse.status}`);
                }

                const data = await apiResponse.json();
                let text = data.choices?.[0]?.message?.content || "I was unable to generate a response. Please try again.";
                
                // DeepSeek R1 sometimes includes <think>...</think> reasoning blocks — strip them for clean output
                text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                
                responseText = text;
            } catch (err) {
                console.warn('Pollinations POST failed, falling back to GET...', err);
                
                // Construct compact prompt for GET request to avoid URL limit issues
                let combinedPrompt = `System Instructions:\n${systemPrompt.slice(0, 2000)}\n\n`;
                if (Array.isArray(history)) {
                    history.slice(-4).forEach(h => {
                        combinedPrompt += `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}\n`;
                    });
                }
                combinedPrompt += `User: ${message}`;

                const getUrl = `https://text.pollinations.ai/${encodeURIComponent(combinedPrompt.slice(0, 4000))}?model=deepseek-r1`;
                const getResponse = await fetch(getUrl);
                if (!getResponse.ok) {
                    return res.status(200).json({
                        response: `⚠️ <b>Error:</b> The free AI service is currently overloaded. Please add a free Gemini API Key in settings to get direct dedicated access.`
                    });
                }
                let fallbackText = await getResponse.text();
                fallbackText = fallbackText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                responseText = fallbackText;
            }
        }

        return res.status(200).json({ response: responseText });

    } catch (error) {
        console.error('Critical AI Agent Error:', error);
        return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
    }
}
