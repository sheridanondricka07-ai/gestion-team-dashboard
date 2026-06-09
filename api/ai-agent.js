const DB_URL = "https://gestion-team-d-default-rtdb.firebaseio.com";

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
        const rpInventory = await getFirebaseData('state/rpInventory') || [];
        const ipDeliveryStatuses = await getFirebaseData('state/ipDeliveryStatuses') || {};
        const warmupData = await getFirebaseData('warmupData') || {};

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
            let ips = s.allIps || [];
            if (ips.length === 0 && s.ip) {
                ips = [s.ip];
            }
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
            return `- Name: ${s.name}, Main IP: ${s.ip || 'N/A'}, Status: ${s.status || 'active'}, Raw IPs: [${ips.join(', ')}], Detailed IPs: [${ipStatuses}]`;
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

        // Pre-compute server stats across ALL drops
        const serverStats = {};
        drops.forEach(d => {
            if (!d) return;
            const serverStr = d.servers || 'Unknown Server';
            // Split comma-separated server list
            const servList = serverStr.split(',').map(s => s.trim()).filter(Boolean);
            
            servList.forEach(sName => {
                if (!serverStats[sName]) {
                    serverStats[sName] = {
                        name: sName,
                        totalRev: 0,
                        totalClicks: 0,
                        totalOut: 0,
                        count: 0
                    };
                }
                serverStats[sName].totalRev += parseFloat(d.rev || 0);
                serverStats[sName].totalClicks += parseFloat(d.clicks || 0);
                serverStats[sName].totalOut += parseFloat(d.totalOut || 0);
                serverStats[sName].count += 1;
            });
        });

        const sortedServers = Object.values(serverStats).sort((a, b) => b.totalRev - a.totalRev);
        
        const topServersBreakdown = sortedServers.map((s, idx) => {
            const epc = s.totalClicks > 0 ? (s.totalRev / s.totalClicks).toFixed(2) : '0.00';
            const cpm = s.totalOut > 0 ? ((s.totalRev * 1000) / s.totalOut).toFixed(2) : '0.00';
            return `- Rank ${idx + 1}: Server "${s.name}" - Total Rev: $${s.totalRev.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Drops: ${s.count} | EPC: $${epc} | CPM: $${cpm}`;
        }).join('\n');

        const formattedDrops = drops.slice(-50).map(d => {
            if (!d) return null;
            return `- Date: ${d.date}, Mailer: ${d.mailerName}, Server: ${d.servers || 'N/A'}, Offer: ${d.offer}, OfferID: ${d.offerId || extractOfferId(d.offer)}, EPC: $${d.epc || 0}, CPM: $${d.cpm || 0}, Rev: $${d.rev || 0}`;
        }).filter(Boolean).join('\n');

        const formattedMailers = mailers.map(m => {
            if (!m) return null;
            return `- Name: ${m.name}, Role: ${m.role || 'mailer'}, MailerID: ${m.id}`;
        }).filter(Boolean).join('\n');

        // Pre-compute RP Inventory data for AI context
        let totalRPs = 0;
        let totalRPIntern = 0;
        let totalRPExtern = 0;
        let totalRPSent = 0;
        let totalRPNotSent = 0;
        let totalRPSpfOk = 0;
        let totalRPSpfFail = 0;
        const rpSpfTypeCounts = {}; // e.g. { "Include": 45, "Arecord": 12, "MxRecord": 3 }

        const formattedRPInventory = rpInventory.map(item => {
            if (!item) return null;
            totalRPs++;
            const rpType = (item.rpType || 'intern').toLowerCase();
            if (rpType === 'intern') totalRPIntern++;
            else totalRPExtern++;
            if (item.alreadySent) totalRPSent++;
            else totalRPNotSent++;
            if (item.spfStatus === 'OK') totalRPSpfOk++;
            else if (item.spfStatus && item.spfStatus !== 'OK') totalRPSpfFail++;
            const spfType = item.spfType || 'Include';
            rpSpfTypeCounts[spfType] = (rpSpfTypeCounts[spfType] || 0) + 1;
            return `- RP Domain: ${item.rpDomain || 'N/A'}, Domain Included: ${item.domainIncluded || 'N/A'}, Subdomain Included: ${item.subdomainIncluded || 'N/A'}, Type: ${spfType}, Server: ${item.srv || 'Unassigned'}, RP Type: ${item.rpType || 'intern'}, Sent: ${item.alreadySent ? 'Yes' : 'No'}, SPF Status: ${item.spfStatus || 'N/A'}`;
        }).filter(Boolean).join('\n');

        const rpSpfTypeBreakdown = Object.entries(rpSpfTypeCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => `- ${type}: ${count} RPs`)
            .join('\n');

        // Format IP Delivery Statuses for today
        const today = new Date().toISOString().split('T')[0];
        const ipStatusSummary = {};
        Object.entries(ipDeliveryStatuses).forEach(([safeIp, dates]) => {
            if (dates && dates[today]) {
                const status = dates[today];
                ipStatusSummary[status] = (ipStatusSummary[status] || 0) + 1;
            }
        });
        const ipStatusBreakdown = Object.entries(ipStatusSummary)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => `- ${status.toUpperCase()}: ${count} IPs`)
            .join('\n');

        // Process Warmup data
        const getRdns = (ip) => {
            if (!ip) return '';
            const safeIp = ip.replace(/\./g, '_');
            if (vmtaResults[safeIp] && vmtaResults[safeIp].ptr) {
                return vmtaResults[safeIp].ptr;
            }
            if (servers) {
                for (const s of servers) {
                    if (s && s.vmtaMap) {
                        const sKey = Object.keys(s.vmtaMap).find(k => k === safeIp);
                        if (sKey) return s.vmtaMap[sKey];
                    }
                }
            }
            return '';
        };

        const rawWarmupRecords = Object.values(warmupData);
        rawWarmupRecords.sort((a, b) => b.timestamp - a.timestamp);

        const warmupGrouped = {};
        rawWarmupRecords.forEach(r => {
            const cleanDomain = (r.domain || '').trim();
            const isRdnsPlaceholder = cleanDomain.toLowerCase() === '[rdns]' || cleanDomain.toLowerCase() === 'rdns';
            const resolvedDomain = (!cleanDomain || isRdnsPlaceholder) ? (getRdns(r.ip) || 'Unknown') : cleanDomain;
            const key = `${resolvedDomain}::${r.server}`;
            if (!warmupGrouped[key]) {
                warmupGrouped[key] = {
                    domain: resolvedDomain,
                    server: r.server,
                    ip: r.ip,
                    records: []
                };
            }
            warmupGrouped[key].records.push(r);
        });

        const warmupGroups = Object.values(warmupGrouped);

        const sentDomains = new Set();
        const sentIps = new Set();
        rpInventory.forEach(item => {
            if (item.alreadySent || item.srv === 'SENT') {
                if (item.rpDomain) sentDomains.add(item.rpDomain.trim().toLowerCase());
                if (item.rpIp) sentIps.add(item.rpIp.trim());
            }
        });

        const activeWarmupGroups = [];
        const archivedWarmupGroups = [];
        const inactiveWarmupGroups = [];
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

        warmupGroups.forEach(g => {
            g.records.sort((a, b) => b.timestamp - a.timestamp);
            const latestTimestamp = g.records[0] ? g.records[0].timestamp : 0;
            const d = g.domain ? g.domain.trim().toLowerCase() : '';
            const ipVal = g.ip ? g.ip.trim() : '';

            const isArchived = sentDomains.has(d) || sentIps.has(ipVal);
            const isInactive = !isArchived && (latestTimestamp < twentyFourHoursAgo);

            if (isArchived) archivedWarmupGroups.push(g);
            else if (isInactive) inactiveWarmupGroups.push(g);
            else activeWarmupGroups.push(g);
        });

        const milestones = [100, 300, 500, 1000, 2000, 5000, 10000, 15000, 20000, 25000, 30000];
        const milestoneTotals = {};
        milestones.forEach(m => milestoneTotals[m] = []);
        let learnedDomains = 0;

        const domainGroups = {};
        rawWarmupRecords.forEach(r => {
            const cleanDomain = (r.domain || '').trim();
            const isRdnsPlaceholder = cleanDomain.toLowerCase() === '[rdns]' || cleanDomain.toLowerCase() === 'rdns';
            const resolvedDomain = (!cleanDomain || isRdnsPlaceholder) ? getRdns(r.ip) : cleanDomain;
            if (!resolvedDomain || resolvedDomain === 'Unknown') return;
            if (!domainGroups[resolvedDomain]) domainGroups[resolvedDomain] = [];
            domainGroups[resolvedDomain].push(r);
        });

        Object.values(domainGroups).forEach(records => {
            records.sort((a, b) => a.timestamp - b.timestamp);
            if (records[0].outVal >= 500) return;

            let cumulative = 0;
            const reached = new Set();
            let contributed = false;

            records.forEach(r => {
                const out = r.outVal;
                milestones.forEach(m => {
                    if (out >= m && !reached.has(m)) {
                        reached.add(m);
                        milestoneTotals[m].push(cumulative);
                        contributed = true;
                    }
                });
                cumulative += out;
            });
            if (contributed) learnedDomains++;
        });

        const warmupAverages = {};
        milestones.forEach(m => {
            if (milestoneTotals[m].length > 0) {
                const sum = milestoneTotals[m].reduce((a, b) => a + b, 0);
                warmupAverages[m] = Math.round(sum / milestoneTotals[m].length);
            } else {
                warmupAverages[m] = null;
            }
        });

        const getWarmupRecommendation = (totalSent) => {
            let nextMilestone = null;
            let needed = 0;
            for (const m of milestones) {
                if (warmupAverages[m] !== null && totalSent < warmupAverages[m]) {
                    nextMilestone = m;
                    needed = warmupAverages[m] - totalSent;
                    break;
                }
            }
            if (nextMilestone) {
                return `Next: ${nextMilestone} emails/Drop (Needs ${needed.toLocaleString()} total sent)`;
            } else {
                return `Target: 30k+ emails/Drop (Scale freely)`;
            }
        };

        const formatWarmupGroup = (g, statusLabel) => {
            const records = g.records;
            const totalOutAllTime = records.reduce((sum, r) => sum + (r.outVal || 0), 0);
            const latest = records[0];
            const first = records[records.length - 1];
            
            const durationDays = first ? Math.max(1, Math.ceil((latest.timestamp - first.timestamp) / (24 * 60 * 60 * 1000))) : 0;
            const startDate = first ? new Date(first.timestamp).toLocaleDateString() : 'N/A';
            const dropsCount = records.length;
            const lastOut = latest ? latest.outVal : 0;
            const user = latest ? latest.user : 'Unknown';
            const rec = getWarmupRecommendation(totalOutAllTime);

            const latestClean = latest && latest.domain ? latest.domain.trim().toLowerCase() : '';
            const isRdns = latest ? (!latest.domain || latestClean === '[rdns]' || latestClean === 'rdns') : false;
            const typeLabel = isRdns ? ' (RDNS Hostname)' : ' (Custom Domain)';

            return `- Domain/IP: ${g.domain}${typeLabel}, Server: ${g.server}, IP: ${g.ip || 'N/A'}, Status: ${statusLabel}, Warmup Start Date: ${startDate}, Warmup Duration: ${durationDays} days, Warmup Drops Count: ${dropsCount}, Total Sent: ${totalOutAllTime.toLocaleString()}, Last Drop Size: ${lastOut.toLocaleString()} emails, Operator: ${user}, Recommendation: ${rec}`;
        };

        const activeWarmupSummary = activeWarmupGroups.map(g => formatWarmupGroup(g, 'Active')).join('\n');
        const inactiveWarmupSummary = inactiveWarmupGroups.map(g => formatWarmupGroup(g, 'Inactive')).join('\n');
        const archivedWarmupSummary = archivedWarmupGroups.map(g => formatWarmupGroup(g, 'Archived (Sent)')).join('\n');

        const milestoneAveragesStr = milestones.map(m => {
            const avg = warmupAverages[m];
            return `- Reach ${m} emails/Drop: ${avg !== null ? `${avg.toLocaleString()} total sent` : 'No data yet'}`;
        }).join('\n');

        // Construct System Instruction
        const systemPrompt = `You are "Gestion Team AI Agent", an intelligent assistant integrated into the Team Emailing Infrastructure Dashboard.
Your job is to analyze real-time infrastructure, server blacklists (Spamhaus), VMTA/PTR status, drop revenue performance, RP (Return Path) inventory, IP delivery statuses, and domain/IP warmup progress to answer questions, extract data, and generate insights.

SUMMARY STATISTICS (EXACT PRE-COMPUTED COUNTS — USE THESE, DO NOT RECOUNT):
------------------
- Total Registered Servers: ${totalServers}
- Total Registered IPs in Inventory: ${totalIps}
- Total IPs Currently Listed on Spamhaus: ${totalListedSpamhaus}
- Total IPs with PTR OK: ${totalVmtaOk}
- Total IPs with PTR Errors: ${totalVmtaErrors}
- Total IPs with Assigned VMTA: ${totalVmtaAssigned}
- Total IPs with Unassigned/Empty VMTA: ${totalVmtaUnassigned}
- Total RP Domains in Inventory: ${totalRPs}
- Total RP Intern: ${totalRPIntern}
- Total RP Extern: ${totalRPExtern}
- Total RP Already Sent: ${totalRPSent}
- Total RP Not Sent: ${totalRPNotSent}
- Total RP SPF OK: ${totalRPSpfOk}
- Total RP SPF Failing: ${totalRPSpfFail}
- Total Active Warmup Groups: ${activeWarmupGroups.length}
- Total Inactive Warmup Groups: ${inactiveWarmupGroups.length}
- Total Archived Warmup Groups: ${archivedWarmupGroups.length}

DOMAIN WARMUP INTELLIGENCE (LEARNED STRATEGY / SCHEMA):
------------------
Learned from ${learnedDomains} domains. Cumulative sent targets needed to scale drops safely:
${milestoneAveragesStr || 'No learned milestone data yet.'}

ACTIVE DOMAIN WARMUP GROUPS:
------------------
${activeWarmupSummary || 'No active warmup groups.'}

INACTIVE DOMAIN WARMUP GROUPS:
------------------
${inactiveWarmupSummary || 'No inactive warmup groups.'}

ARCHIVED DOMAIN WARMUP GROUPS:
------------------
${archivedWarmupSummary || 'No archived warmup groups.'}

RP SPF TYPE BREAKDOWN (PRE-COMPUTED — USE THESE EXACT NUMBERS):
------------------
${rpSpfTypeBreakdown || 'No RP SPF type data.'}

IP DELIVERY STATUS BREAKDOWN FOR TODAY (${today}) (PRE-COMPUTED):
------------------
${ipStatusBreakdown || 'No IP delivery statuses recorded for today.'}

VMTA TLD BREAKDOWN (PRE-COMPUTED — USE THESE EXACT NUMBERS):
------------------
${tldBreakdown || 'No VMTA TLD extensions detected.'}

VMTA DOMAIN BREAKDOWN (PRE-COMPUTED — USE THESE EXACT NUMBERS):
------------------
${domainBreakdown || 'No VMTA domains detected.'}

TOP PERFORMING OFFERS (PRE-COMPUTED BY REVENUE — USE THESE FOR TOP OFFERS / ANALYTICS):
------------------
${topOffersBreakdown || 'No top offer statistics computed.'}

TOP PERFORMING SERVERS (PRE-COMPUTED BY REVENUE — USE THESE FOR SERVER REVENUE / ANALYTICS):
------------------
${topServersBreakdown || 'No top server statistics computed.'}

CURRENT REAL-TIME CONTEXT DATA:
------------------
TODAY'S DATE/TIME: ${new Date().toLocaleString()}

MAILERS/TEAM MEMBERS:
${formattedMailers || 'No mailers registered.'}

SERVERS & IP INFRASTRUCTURE (WITH PTR, SPAMHAUS & VMTA MAPPING):
${formattedServers || 'No servers configured.'}

RP (RETURN PATH) INVENTORY — FULL DOMAIN/SUBDOMAIN/TYPE DATA:
${formattedRPInventory || 'No RP inventory data.'}

RECENT DROP REVENUE & PERFORMANCE DATA (Last 50 drops):
${formattedDrops || 'No recent drops recorded.'}
------------------

GUIDELINES:
1. Always base your analysis directly on the provided context data. When asked about counts, totals, or breakdowns, USE THE PRE-COMPUTED STATISTICS ABOVE. Do not try to recount from the raw data — use the exact numbers provided.
2. Format your response cleanly using HTML tags for maximum compatibility with the chat window (e.g. <b>, <i>, <ul>, <li>, <pre>, <code>, <br>). Do not use markdown headers (like #, ##) in the HTML output; use bold text or styled headers instead.
3. Be professional, direct, and actionable. Provide statistical summaries or warnings if you notice listed IPs or low-performing drops.
4. If the user asks about VMTA extensions, VMTA TLDs, VMTA domains, or domain breakdowns, reference the VMTA TLD BREAKDOWN and VMTA DOMAIN BREAKDOWN sections above.
5. If the user asks for the "top offer" or offer analytics, look at the TOP PERFORMING OFFERS section above. Explain the rank, name, ID, total revenue, drops, EPC, and CPM.
6. If the user asks for the "top server", "server revenue", or server performance analytics, look at the TOP PERFORMING SERVERS section above. Explain the rank, name, total revenue, drops, EPC, and CPM.
7. If the user asks about RP domains, subdomains, domain inclusion, SPF types (Include, Arecord, MxRecord, Mx), or which domains are included/configured for specific RPs, search the RP INVENTORY section above. Present results in a clear table format.
8. If the user asks about IP delivery statuses (RDNS, RP TEST, SPAM, DOWN, BOUNCE, PAUSED, Change DOM), reference the IP DELIVERY STATUS BREAKDOWN and the server infrastructure data.
9. You have FULL access to ALL data in the dashboard. Never say you cannot provide information about domains, subdomains, RPs, IPs, servers, or any other data. Search through all provided context sections to find the answer.
10. If the user asks to generate DNS records (e.g., for specific RPs, available/stock/unassigned RPs, or filtered RPs, using specified servers or all servers):
    a. Identify the target RPs ONLY from the "RP (RETURN PATH) INVENTORY" section. Do NOT use PTR domains, VMTA domains, or server domains as the target RPs.
    b. "Available", "stock", "unassigned", or "not affected to any server" RPs are those with "Server: Unassigned" (or empty server / blank server name).
    c. Filter target RPs by type if requested:
       - If user asks for "Arecord" type, only use RPs where Type/SpfType is "Arecord" or "Arecod" (case-insensitive).
       - If user asks for "Include" type, only use RPs where Type/SpfType is "Include" (case-insensitive).
    d. Identify the target servers from the "SERVERS & IP INFRASTRUCTURE" section and retrieve ALL of their unique IPs from the "Raw IPs" list of those servers (e.g., for s_wmn3_2159, retrieve all 5 IPs: 51.178.52.186, 51.255.149.79, 51.255.149.82, 51.255.149.85, 51.255.149.91).
    e. For each target RP, retrieve its "Domain Included" (fallback to the RP Domain itself if not set or "---") and "Subdomain Included" (fallback to empty string if not set or "---").
    f. For EACH target RP, you MUST list ALL retrieved IPs of the target server in its record (do NOT map them one-to-one or use only a single IP per RP).
    g. For Include SPF, generate the TXT record in this exact format:
       [domainIncluded],[subdomainIncluded],TXT,v=spf1 ip4:[ip1] ip4:[ip2] ... -all
       (Example: example.com,mail.example.com,TXT,v=spf1 ip4:1.2.3.4 ip4:5.6.7.8 -all)
    h. For Arecord SPF, generate the TXT record in this exact format:
       [domainIncluded],[subdomainIncluded],TXT,Arecords:[ip1];[ip2];...
       (Example: test.com,,TXT,Arecords:1.2.3.4;5.6.7.8)
    i. Present the generated records inside a copyable code block using HTML tags: <pre><code>[records]</code></pre>
    j. CRITICAL: Each line in the code block must start exactly with the domainIncluded. Do NOT prepend or prefix any server IPs, server names, or any other metadata to the record lines. Do not use brackets, quotes, or placeholders.
    k. Include limits/warnings in your response if applicable: if record type is Arecord and the number of IPs > 49, warn the user. If record type is Include and the number of IPs > 99, warn the user.
11. If the user asks about domain warmup progress, start date, duration of warmup, drops count, total sent, last drop size, or warmup strategy/recommendations, refer directly to the ACTIVE DOMAIN WARMUP GROUPS, INACTIVE DOMAIN WARMUP GROUPS, ARCHIVED DOMAIN WARMUP GROUPS, and DOMAIN WARMUP INTELLIGENCE sections above. Respond with details about start date, duration in days, and recommendations computed from historical data.`;

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
            
            let apiResponse;
            let retries = 4;
            let delay = 1500;
            let errData = {};

            for (let i = 0; i < retries; i++) {
                try {
                    apiResponse = await fetch(geminiUrl, {
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
                                maxOutputTokens: 8192,
                                thinkingConfig: {
                                    thinkingBudget: 0
                                }
                            }
                        })
                    });

                    if (apiResponse.ok) {
                        break; // Success! Exit retry loop
                    }

                    errData = await apiResponse.json().catch(() => ({}));
                    console.warn(`Gemini API attempt ${i + 1} failed:`, errData);
                    
                    // Stop retrying if it's a permanent error (like invalid API key)
                    if (apiResponse.status === 400 && errData.error?.message?.toLowerCase().includes('key')) {
                        break;
                    }
                } catch (e) {
                    console.error(`Gemini API attempt ${i + 1} threw error:`, e);
                    errData = { error: { message: e.message } };
                }

                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 1.5; // Exponential backoff
                }
            }

            if (!apiResponse || !apiResponse.ok) {
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
