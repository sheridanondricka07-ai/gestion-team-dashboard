const DB_URL = "https://gestion-team-c-default-rtdb.firebaseio.com";

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

        // 3. Format context data for the model to minimize token usage while remaining descriptive
        const formattedServers = servers.map(s => {
            if (!s) return null;
            const ips = s.allIps || [];
            const ipStatuses = ips.map(ip => {
                const sh = spamhaus[ip.replace(/\./g, '_')] || { status: 'clean' };
                const vm = vmtaResults[ip.replace(/\./g, '_')] || { status: 'OK', ptr: 'N/A' };
                return `${ip} (Spamhaus: ${sh.status === 'listed' ? `LISTED on ${sh.list}` : 'clean'}, VMTA/PTR: ${vm.status})`;
            }).join(', ');
            return `- Name: ${s.name}, Main IP: ${s.ip || 'N/A'}, Status: ${s.status || 'active'}, IPs: [${ipStatuses}]`;
        }).filter(Boolean).join('\n');

        const formattedDrops = drops.slice(-50).map(d => {
            if (!d) return null;
            return `- Date: ${d.date}, Mailer: ${d.mailerName}, Offer: ${d.offer}, EPC: $${d.epc || 0}, CPM: $${d.cpm || 0}, Rev: $${d.rev || 0}`;
        }).filter(Boolean).join('\n');

        const formattedMailers = mailers.map(m => {
            if (!m) return null;
            return `- Name: ${m.name}, Role: ${m.role || 'mailer'}, MailerID: ${m.id}`;
        }).filter(Boolean).join('\n');

        // Construct System Instruction
        const systemPrompt = `You are "Gestion Team AI Agent", an intelligent assistant integrated into the Team Emailing Infrastructure Dashboard.
Your job is to analyze real-time infrastructure, server blacklists (Spamhaus), VMTA/PTR status, and drop revenue performance to answer questions, extract data, and generate insights.

CURRENT REAL-TIME CONTEXT DATA:
------------------
TODAY'S DATE/TIME: ${new Date().toLocaleString()}

MAILERS/TEAM MEMBERS:
${formattedMailers || 'No mailers registered.'}

SERVERS & IP INFRASTRUCTURE (WITH SPAMHAUS & PTR STATUS):
${formattedServers || 'No servers configured.'}

RECENT DROP REVENUE & PERFORMANCE DATA (Last 50 drops):
${formattedDrops || 'No recent drops recorded.'}
------------------

GUIDELINES:
1. Always base your analysis directly on the provided context data. If asked about a server, IP, mailer, or drop, cross-reference it with the context.
2. Format your response cleanly using HTML tags for maximum compatibility with the chat window (e.g. <b>, <i>, <ul>, <li>, <pre>, <code>, <br>). Do not use markdown headers (like #, ##) in the HTML output; use bold text or styled headers instead.
3. Be professional, direct, and actionable. Provide statistical summaries or warnings if you notice listed IPs or low-performing drops.
4. If the user asks you to perform a task outside of analyzing/extracting this data, guide them back to server administration or performance analytics.`;

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

            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
                        maxOutputTokens: 1500
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
            // --- USE FREE KEYLESS POLLINATIONS.AI API ---
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
                        model: 'openai',
                        messages: messages
                    })
                });

                if (!apiResponse.ok) {
                    throw new Error(`HTTP error! status: ${apiResponse.status}`);
                }

                const data = await apiResponse.json();
                responseText = data.choices?.[0]?.message?.content || "I was unable to generate a response. Please try again.";
            } catch (err) {
                console.warn('Pollinations POST failed, falling back to GET...', err);
                
                // Construct compact prompt for GET request to avoid URL limit issues
                let combinedPrompt = `System Instructions:\n${systemPrompt.slice(0, 1000)}\n\n`;
                if (Array.isArray(history)) {
                    history.slice(-4).forEach(h => {
                        combinedPrompt += `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}\n`;
                    });
                }
                combinedPrompt += `User: ${message}`;

                const getUrl = `https://text.pollinations.ai/${encodeURIComponent(combinedPrompt.slice(0, 3000))}?model=openai`;
                const getResponse = await fetch(getUrl);
                if (!getResponse.ok) {
                    return res.status(200).json({
                        response: `⚠️ <b>Error:</b> The free keyless AI service is currently overloaded. Please add a free Gemini API Key in settings to get direct dedicated access.`
                    });
                }
                responseText = await getResponse.text();
            }
        }

        return res.status(200).json({ response: responseText });

    } catch (error) {
        console.error('Critical AI Agent Error:', error);
        return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
    }
}
