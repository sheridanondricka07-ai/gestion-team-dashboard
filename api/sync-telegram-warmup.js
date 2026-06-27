const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";
const BOT_TOKEN = "8827415405:AAH-sAnTE7rz_i4XSTFG6tjBX0g0BYPyn6E";
const UPGRADE_BOT_TOKEN = "8975320309:AAFQmIeTKMbxQMv4c8_UHSczUYYZ9mcJ8FA";
import { promises as dns } from 'dns';

function ipInCidr(ip, cidr) {
    const [range, bitsStr] = cidr.split('/');
    if (!bitsStr) {
        return ip === range;
    }
    const bits = parseInt(bitsStr, 10);
    if (isNaN(bits)) return ip === range;

    const ipParts = ip.split('.').map(Number);
    const rangeParts = range.split('.').map(Number);

    if (ipParts.length !== 4 || rangeParts.length !== 4) return false;

    const ipNum = ((ipParts[0] * 256 + ipParts[1]) * 256 + ipParts[2]) * 256 + ipParts[3];
    const rangeNum = ((rangeParts[0] * 256 + rangeParts[1]) * 256 + rangeParts[2]) * 256 + rangeParts[3];
    const mask = bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits));

    return (ipNum & mask) === (rangeNum & mask);
}

async function getSpfRecord(domain) {
    try {
        const records = await dns.resolveTxt(domain);
        const spfRecords = records
            .map(chunks => chunks.join(''))
            .filter(record => record.toLowerCase().startsWith('v=spf1'));
        if (spfRecords.length === 0) return null;
        return spfRecords[0];
    } catch (err) {
        return null;
    }
}

async function detectAndAddNewRp(domain, ip, serverName) {
    if (!domain || domain.toLowerCase() === '[rdns]' || domain.toLowerCase() === 'rdns') {
        return;
    }

    try {
        const rpInventory = await getFirebaseData('state/rpInventory') || [];
        const rps = await getFirebaseData('state/rps') || [];
        const servers = await getFirebaseData('state/servers') || [];

        const cleanDom = domain.toLowerCase().trim();
        
        // Check if already exists in rpInventory
        const exists = rpInventory.some(item => (item.rpDomain || '').toLowerCase().trim() === cleanDom);
        if (exists) return;

        // Determine RP Type (intern or extern) by checking SPF
        let rpType = 'extern';
        const spf = await getSpfRecord(cleanDom);
        if (spf) {
            const terms = spf.toLowerCase().split(/\s+/);
            let hasDirectIp = false;
            for (let term of terms) {
                if (['+', '-', '~', '?'].includes(term[0])) term = term.slice(1);
                if (term.startsWith('ip4:')) {
                    const cidr = term.substring(4);
                    if (ipInCidr(ip, cidr)) {
                        hasDirectIp = true;
                        break;
                    }
                }
            }
            if (hasDirectIp) {
                rpType = 'intern';
            }
        }

        // Add to rpInventory
        const nextId = rpInventory.reduce((max, item) => Math.max(max, parseInt(item.id, 10) || 0), 0) + 1;
        const newRpItem = {
            id: nextId,
            rpDomain: cleanDom,
            domainIncluded: cleanDom,
            subdomainIncluded: cleanDom,
            spfType: 'Include',
            srv: serverName,
            rpType: rpType,
            alreadySent: false,
            spfStatus: 'OK',
            spfCheckedAt: new Date().toISOString()
        };
        rpInventory.push(newRpItem);
        await putFirebaseData('state/rpInventory', rpInventory);

        // Add to rps
        const attachedServer = servers.find(s => s.name === serverName);
        const serverId = attachedServer ? attachedServer.id : null;
        const mailerId = attachedServer ? (attachedServer.mailerId || null) : null;
        const nextRpId = rps.reduce((max, r) => Math.max(max, parseInt(r.id, 10) || 0), 0) + 1;
        
        const newRpInRps = {
            id: nextRpId,
            domain: cleanDom,
            serverId: serverId,
            mailerId: mailerId,
            status: 'active'
        };
        rps.push(newRpInRps);
        await putFirebaseData('state/rps', rps);

        console.log(`Automatically added new RP domain ${cleanDom} (${rpType}) for server ${serverName}`);
    } catch (e) {
        console.error("Error in detectAndAddNewRp:", e);
    }
}

async function getFirebaseData(path) {
    try {
        const resp = await fetch(`${DB_URL}/${path}.json`, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' }, cache: 'no-store' });
        return await resp.json();
    } catch (e) {
        return null;
    }
}

async function saveFirebaseData(path, data) {
    try {
        await fetch(`${DB_URL}/${path}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return true;
    } catch (e) {
        console.error("Firebase write error:", e);
        return false;
    }
}

async function putFirebaseData(path, data) {
    try {
        await fetch(`${DB_URL}/${path}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return true;
    } catch (e) {
        console.error("Firebase put error:", e);
        return false;
    }
}

async function putFirebaseDataConditional(path, data, etag) {
    try {
        const resp = await fetch(`${DB_URL}/${path}.json`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'if-match': etag
            },
            body: JSON.stringify(data)
        });
        return resp.status === 200;
    } catch (e) {
        console.error("Firebase conditional put error:", e);
        return false;
    }
}

function formatWarmupReport(server, ip, domain, action, beforeSend, afterSend, userName, reason) {
    const emoji = action === "Upgrade" ? "🚀 <b>Warmup Upgrade</b>" : "📉 <b>Warmup Downgrade</b>";
    return emoji + "\n\n🖥 Server: <b>" + (server || "N/A") + "</b>\n👤 User: <b>" + (userName || "Unknown") + "</b>\n📌 IP: <code>" + (ip || "N/A") + "</code>\n🌐 Domain: <b>" + (domain || "N/A") + "</b>\n📈 Send Size: <code>" + beforeSend + "</code> ➡️ <b>" + afterSend + "</b>\n\n💬 Reason: " + reason;
}


async function processAutoWarmup(allData, newRecords) {
const STRATEGY = {
    '100': { drops: 7, next: 200 },
    '200': { drops: 7, next: 300 },
    '300': { drops: 2, next: 500 },
    '500': { drops: 13, next: 1000 },
    '1000': { drops: 7, next: 2000 },
    '2000': { drops: 9, next: 4000 },
    '4000': { drops: 7, next: 7000 },
    '7000': { drops: 7, next: 10000 },
    '10000': { drops: 5, next: 15000 },
    '15000-19000': { drops: 25, next: 21000 },
    '21000': { drops: 2, next: 27000 },
    '27000': { drops: 3, next: 50000 },
    '50000': { drops: 1, next: 50000 }
};

function getLevelBand(val) {
    if (val >= 15000 && val <= 19000) return '15000-19000';
    // Find the closest STRATEGY level that is <= val
    const levels = [100, 200, 300, 500, 1000, 2000, 4000, 7000, 10000, 21000, 27000, 50000];
    let best = null;
    for (const lvl of levels) {
        if (val >= lvl) best = lvl;
    }
    return best ? best.toString() : val.toString();
}

    try {
        const autoNotifiedState = await getFirebaseData('state/autoWarmupNotified') || {};
        const warmupStats = await getFirebaseData('state/warmupStats') || {};
        let statsUpdated = false;
        const queueState = await getFirebaseData('state/autoWarmupQueue') || {};
        
        const updatedKeys = new Set();
        if (newRecords) {
            Object.values(newRecords).forEach(r => {
                if (!r.domain && !r.ip && !r.server) return;
                const key = `${r.domain || ''}_${r.server || ''}_${r.ip || ''}`;
                updatedKeys.add(key);
            });
        }

        let newNotified = false;
        let newQueueItems = {};

        // 1. Pruning logic removed to prevent data loss when fetching limited dataset

        // 2. Check for stopped warmups (> 6 hours since last drop, but < 24 hours to avoid ancient targets)
        const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

        const servers = await getFirebaseData('state/servers') || [];
        const absoluteLatest = {};

        Object.values(allData).forEach(r => {
            if (!r.domain && !r.ip && !r.server) return;
            
            // Resolve actual server and domain names to get the correct safeKey
            let actualServer = r.server || 'Unknown';
            let actualDomain = r.domain || 'N/A';
            
            if (actualServer.includes('.') || (!actualServer.startsWith('sh_') && !actualServer.startsWith('s_'))) {
                actualDomain = actualServer;
                actualServer = 'Unknown';
            }
            
            if ((actualServer === 'Unknown' || !actualServer) && r.ip) {
                const srv = servers.find(s => {
                    const ips = [...(s.allIps || [])];
                    if (s.ip) ips.push(s.ip);
                    if (s.mainIp) ips.push(s.mainIp);
                    return ips.map(x => (x || '').trim()).includes(r.ip.trim());
                });
                if (srv) {
                    actualServer = srv.name;
                }
            }

            const cleanActualDomain = (actualDomain || '').toLowerCase().trim();
            const isRdns = !actualDomain || cleanActualDomain === '[rdns]' || cleanActualDomain === 'rdns' || cleanActualDomain === 'n/a';
            const cleanDomain = isRdns ? (r.ip || 'unknown') : (actualDomain || r.ip || 'unknown');
            const safeDomain = cleanDomain.replace(/[\.\#\$\[\]\/]/g, '_');
            const safeIp = (r.ip || 'unknown').replace(/[\.\:\/]/g, '_');
            const safeKey = `${safeDomain}_${actualServer}_${safeIp}`;

            // Group by resolved safeKey so old/swapped keys and correct keys of the same target don't compete
            if (!absoluteLatest[safeKey] || r.timestamp > absoluteLatest[safeKey].timestamp) {
                absoluteLatest[safeKey] = {
                    ...r,
                    actualServer,
                    actualDomain,
                    cleanDomain,
                    safeDomain,
                    stoppedNotifKey: `${safeKey}_stopped`
                };
            }
        });

        for (const safeKey in absoluteLatest) {
            const latestDrop = absoluteLatest[safeKey];
            const stoppedNotifKey = latestDrop.stoppedNotifKey;

            if (latestDrop.timestamp && latestDrop.timestamp > sixHoursAgo) {
                if (autoNotifiedState[stoppedNotifKey]) {
                    delete autoNotifiedState[stoppedNotifKey];
                    await fetch(`${DB_URL}/state/autoWarmupNotified/${stoppedNotifKey}.json`, { method: 'DELETE' }).catch(e => console.error(e));
                }
            } else if (latestDrop.timestamp && latestDrop.timestamp <= sixHoursAgo && latestDrop.timestamp > twentyFourHoursAgo) {
                if (!autoNotifiedState[stoppedNotifKey]) {
                    // Try to write the key atomically only if it doesn't exist
                    const acquired = await putFirebaseDataConditional(`state/autoWarmupNotified/${stoppedNotifKey}`, true, 'null_etag');
                    if (acquired) {
                        autoNotifiedState[stoppedNotifKey] = true;

                        const notifToken = UPGRADE_BOT_TOKEN;
                        const notifChatId = "-5317343683";

                        const text = `⚠️ <b>Warmup Stopped Alert!</b>\n\n` +
                                     `🖥 Server: <b>${latestDrop.actualServer || 'Unknown'}</b>\n` +
                                     `👤 User: <b>${latestDrop.user || 'Unknown'}</b>\n` +
                                     `📌 IP: <code>${latestDrop.ip || 'Unknown'}</code>\n` +
                                     `🌐 Domain: <b>${latestDrop.actualDomain || 'N/A'}</b>\n\n` +
                                     `❌ <i>No drops recorded in the last 6 hours (last drop was ${new Date(latestDrop.timestamp).toLocaleString()}). Please check if stopped.</i>`;

                        fetch(`https://api.telegram.org/bot${notifToken}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: notifChatId,
                                text: text,
                                parse_mode: 'HTML'
                            })
                        }).catch(e => console.error("Failed to send stopped alert:", e));
                    }
                }
            }
        }

        const grouped = {};
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        
        Object.values(allData).forEach(r => {
            if (!r.domain && !r.ip && !r.server) return;
            // Pre-filter: Only check drops from the last 24 hours
            if (r.timestamp && r.timestamp < cutoff) return;

            const key = `${r.domain || ''}_${r.server || ''}_${r.ip || ''}`;
            if (!grouped[key]) grouped[key] = { ...r, records: [] };
            
            // Update stats
            const cleanDomainName = (r.domain || r.ip || 'unknown').replace(/[\.\#\$\[\]\/]/g, '_');
            const safeIp = (r.ip || 'unknown').replace(/[\.\:\/]/g, '_');
            const statKey = `${cleanDomainName}_${r.server}_${safeIp}`;
            
              if (!warmupStats[statKey]) {
                  warmupStats[statKey] = { firstDropTimestamp: r.timestamp, totalDrops: 0 };
                  statsUpdated = true;
              }
              if (!warmupStats[statKey].processedMessages) {
                  warmupStats[statKey].processedMessages = {};
                  statsUpdated = true;
              }
              if (!warmupStats[statKey].processedMessages[r.messageId]) {
                  warmupStats[statKey].processedMessages[r.messageId] = r.timestamp || Date.now();
                  warmupStats[statKey].totalDrops = (warmupStats[statKey].totalDrops || 0) + 1;
                  statsUpdated = true;
                  
                  // Prune old processed messages (older than 48 hours) to keep Firebase size small
                  const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
                  for (const [mId, ts] of Object.entries(warmupStats[statKey].processedMessages)) {
                      if (ts < fortyEightHoursAgo) {
                          delete warmupStats[statKey].processedMessages[mId];
                      }
                  }
                  
                  // Streak Logic for Upgrades
                  const inVal = parseInt(r.inVal, 10) || 0;
                  const outVal = parseInt(r.outVal, 10) || 0;
                  const isSuccess = inVal > 0 && outVal >= Math.floor(inVal * 0.95);
                  
                  const band = getLevelBand(inVal);
                  
                  if (!warmupStats[statKey].currentBand || warmupStats[statKey].currentBand !== band) {
                      warmupStats[statKey].currentBand = band;
                      warmupStats[statKey].streak = 0; // Reset streak on band change
                  }
                  
                  if (isSuccess) {
                      warmupStats[statKey].streak = (warmupStats[statKey].streak || 0) + 1;
                  }
              }
            
            const isDuplicate = grouped[key].records.some(ex => 
                ex.ip === r.ip &&
                ex.outVal === r.outVal && 
                Math.abs(ex.timestamp - r.timestamp) < 5 * 60 * 1000
            );
            
            if (!isDuplicate) {
                grouped[key].records.push(r);
            }
        });

        // Find the maximum sendAt currently in the queue to schedule after it
        let maxSendAt = Date.now() - 5000;
        Object.values(queueState).forEach(item => {
            if (item && item.sendAt > maxSendAt) {
                maxSendAt = item.sendAt;
            }
        });

        for (const key in grouped) {
            if (newRecords && !updatedKeys.has(key)) continue;
            
            const g = grouped[key];
            

             g.records.sort((a, b) => b.timestamp - a.timestamp);
             if (g.records.length < 3) continue;



            // STRATEGY LOGIC UPGRADE
            let success = false;
            let nextTarget = 0;
            const latestVal = parseInt(g.records[0].inVal, 10) || 0;
            
            const cleanDomainStr = (g.domain || g.ip || 'unknown').replace(/[\.\#\$\[\]\/]/g, '_');
            const safeIpStr = (g.ip || 'unknown').replace(/[\.\:\/]/g, '_');
            const statKey = `${cleanDomainStr}_${g.server}_${safeIpStr}`;
            
            if (warmupStats[statKey]) {
                const band = warmupStats[statKey].currentBand;
                const streak = warmupStats[statKey].streak || 0;
                const strat = STRATEGY[band];
                
                if (strat && streak >= strat.drops) {
                    success = true;
                    nextTarget = strat.next;
                }
            }

             if (success) {
                 // Check if there was a downgrade and enforce a 3-drop cooldown before upgrading again
                 const cleanGDomain = (g.domain || '').toLowerCase().trim();
                 const isRdns = !g.domain || cleanGDomain === '[rdns]' || cleanGDomain === 'rdns' || cleanGDomain === 'n/a';
                 const cleanDomainName = isRdns ? (g.ip || 'unknown') : (g.domain || g.ip || 'unknown');
                 const safeDomainName = cleanDomainName.replace(/[\.\#\$\[\]\/]/g, '_');
                 const safeIp = (g.ip || 'unknown').replace(/[\.\:\/]/g, '_');
                 const downPrefix = `${safeDomainName}_${g.server}_${safeIp}_down_`;
                 
                 let latestDowngradeTime = 0;
                 Object.keys(autoNotifiedState).forEach(k => {
                     if (k.startsWith(downPrefix)) {
                         const val = autoNotifiedState[k];
                         const t = typeof val === 'number' ? val : 0;
                         if (t > latestDowngradeTime) {
                             latestDowngradeTime = t;
                         }
                     }
                 });

                 if (latestDowngradeTime > 0) {
                     const dropsAfter = g.records.filter(r => r.timestamp > latestDowngradeTime).length;
                     if (dropsAfter < 3) {
                         console.log(`Cooldown active for ${cleanDomainName} on server ${g.server}: only ${dropsAfter} drops since downgrade (need 3). Skipping upgrade check.`);
                         continue; // Cooldown: must drop at least 3 drops after downgrade before upgrade is evaluated
                     }
                 }

                 
                 
                 const cleanDomain = cleanDomainName;
                 const safeDomain = safeDomainName;
                 const safeKey = `${safeDomain}_${g.server}_${safeIp}_${nextTarget}`;

                // Auto-detect and register domain in RPs inventory if it's a new custom domain
                if (!isRdns && g.domain) {
                    await detectAndAddNewRp(g.domain, g.ip, g.server);
                }

                if (!autoNotifiedState[safeKey]) {
                    warmupStats[statKey].streak = 0; // Reset streak so it doesn't fire multiple times
                          statsUpdated = true;
                          const acquired = await putFirebaseDataConditional(`state/autoWarmupNotified/${safeKey}`, true, 'null_etag');
                    if (acquired) {
                        autoNotifiedState[safeKey] = true;
                        const currentServer = servers.find(s => s && s.name === g.server);
                        const isRP = currentServer && currentServer.warmupType === "RP";

                        // Queue first message (send_size)
                        const msg1 = `update ${g.server} send_size for ${cleanDomain} to ${nextTarget}`;
                        const queueId1 = "q_" + safeKey + "_send_size";
                        
                        newQueueItems[queueId1] = {
                            chat_id: "-5317343683",
                            text: msg1,
                            sendAt: Date.now()
                        };

                        // Queue second message (test_after)
                        const testAfterVal = Math.round((nextTarget / 2) + 3);
                        const msg2 = `update ${g.server} test_after for ${cleanDomain} to ${testAfterVal}`;
                        const queueId2 = "q_" + safeKey + "_test_after";
                        
                        newQueueItems[queueId2] = {
                            chat_id: "-5317343683",
                            text: msg2,
                            sendAt: maxSendAt
                        };

                        // Send notification report
                        const userName = g.records && g.records[0] ? g.records[0].user : "Unknown";
                        const reportText = formatWarmupReport(g.server, g.ip, cleanDomain, "Upgrade", latestVal, nextTarget, userName, "Strategy Target Reached! (Streak: " + warmupStats[statKey].streak + " drops)");
                        
                        fetch(`https://api.telegram.org/bot${UPGRADE_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: "-5317343683", text: reportText, parse_mode: "HTML" }) }).catch(e => console.error(e));
                    }
                }
            } else {
                // If not success, check if last 2 drops failed (OUT < 0.95 * IN or IN <= 0) and occurred within 24 hours
                let shouldDowngrade = false;
                if (g.records.length >= 2) {
                    let bothFailed = true;
                    for (let i = 0; i < 2; i++) {
                        const r = g.records[i];
                        if (!r.timestamp || r.timestamp < cutoff) {
                            bothFailed = false;
                            break;
                        }
                        const inVal = parseInt(r.inVal, 10) || 0;
                        const outVal = parseInt(r.outVal, 10) || 0;
                        if (inVal > 0 && outVal >= inVal * 0.95) {
                            bothFailed = false;
                            break;
                        }
                    }
                    if (bothFailed) {
                        shouldDowngrade = true;
                    }
                }

                if (shouldDowngrade) {
                    const latestVal = parseInt(g.records[0].inVal, 10) || 0;
                    const ORDERED_TARGETS = [50, 100, 200, 300, 500, 1000, 2000, 4000, 7000, 10000, 15000, 19000, 21000, 27000, 50000];
                      const currentIdx = ORDERED_TARGETS.indexOf(latestVal);
                      let prevTarget = latestVal;
                      if (currentIdx > 0) {
                          prevTarget = ORDERED_TARGETS[currentIdx - 1];
                      } else if (currentIdx === -1) {
                          const found = [...ORDERED_TARGETS].reverse().find(l => l < latestVal);
                          prevTarget = found || ORDERED_TARGETS[0];
                      }

                    if (prevTarget < latestVal) {
                        const cleanGDomain = (g.domain || '').toLowerCase().trim();
                        const isRdns = !g.domain || cleanGDomain === '[rdns]' || cleanGDomain === 'rdns' || cleanGDomain === 'n/a';
                        const cleanDomain = isRdns ? (g.ip || 'unknown') : (g.domain || g.ip || 'unknown');
                        const safeDomain = cleanDomain.replace(/[\.\#\$\[\]\/]/g, '_');
                        const safeIp = (g.ip || 'unknown').replace(/[\.\:\/]/g, '_');
                        const safeKey = `${safeDomain}_${g.server}_${safeIp}_down_${prevTarget}`;

                        if (!autoNotifiedState[safeKey]) {
                            warmupStats[statKey].streak = 0; // Reset streak so it doesn't fire multiple times
                          statsUpdated = true;
                          const acquired = await putFirebaseDataConditional(`state/autoWarmupNotified/${safeKey}`, Date.now(), 'null_etag');
                            if (acquired) {
                                autoNotifiedState[safeKey] = Date.now();
                                const currentServer = servers.find(s => s && s.name === g.server);
                                const isRP = currentServer && currentServer.warmupType === "RP";

                                // Queue first message (send_size downgrade)
                                const msg1 = `update ${g.server} send_size for ${cleanDomain} to ${prevTarget}`;
                                const queueId1 = "q_" + safeKey + "_send_size";
                                
                                newQueueItems[queueId1] = {
                                    chat_id: "-5317343683",
                                    text: msg1,
                                    sendAt: Date.now()
                                };

                                // Queue second message (test_after downgrade)
                                const testAfterVal = Math.round((prevTarget / 2) + 3);
                                const msg2 = `update ${g.server} test_after for ${cleanDomain} to ${testAfterVal}`;
                                const queueId2 = "q_" + safeKey + "_test_after";
                                
                                newQueueItems[queueId2] = {
                                    chat_id: "-5317343683",
                                    text: msg2,
                                    sendAt: maxSendAt
                                };

                                 // Send notification report
                                 const userName = g.records && g.records[0] ? g.records[0].user : "Unknown";
                                 const reportText = formatWarmupReport(g.server, g.ip, cleanDomain, "Downgrade", latestVal, prevTarget, userName, "Last 2 drops failed (OUT < 95% of IN or IN <= 0).");
                                 
                                 fetch(`https://api.telegram.org/bot${UPGRADE_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: "-5317343683", text: reportText, parse_mode: "HTML" }) }).catch(e => console.error(e));
                            }
                        }
                    }
                }
            }
        }

        if (statsUpdated) {
              await fetch(`${DB_URL}/state/warmupStats.json`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(warmupStats)
              });
          }
          if (Object.keys(newQueueItems).length > 0) {
            await saveFirebaseData('state/autoWarmupQueue', newQueueItems);
        }
    } catch (e) {
        console.error("Error in processAutoWarmup:", e);
    }
}

function parseMessage(text, timestamp) {
    if (!text || !text.includes('Server Deployment Summary')) return null;
    
    const lines = text.split('\n').map(l => l.trim());
    
    // 1. User
    let user = 'Unknown';
    const userLine = lines.find(l => l.includes('User:'));
    if (userLine) {
        user = userLine.split('User:')[1].trim();
    }
    
    // 2. IP Address
    let ip = '';
    const ipLine = lines.find(l => l.includes('【IP】:'));
    if (ipLine) {
        ip = ipLine.split('【IP】:')[1].trim();
    }
    
    // 3. Server name, IN, OUT, Domain
    let server = '';
    let inVal = 0;
    let outVal = 0;
    let domain = '';
    
    const summaryIdx = lines.findIndex(l => l.includes('Server Deployment Summary'));
    const ipIdx = lines.findIndex(l => l.includes('【IP】:'));
    
    if (summaryIdx !== -1 && ipIdx !== -1) {
        const sublines = lines.slice(summaryIdx + 1, ipIdx).map(l => l.trim()).filter(l => l !== '' && !l.startsWith('---'));
        
        if (sublines.length >= 2) {
            const serverLine = sublines[1];  // e.g. "s_wmn3_2233 1510 1510" or "sh_wmn3_6 7013 7012"
            
            const serverParts = serverLine.split(/\s+/);
            if (serverParts.length >= 3) {
                server = serverParts[0];
                inVal = parseInt(serverParts[1], 10) || 0;
                outVal = parseInt(serverParts[2], 10) || 0;
            } else if (serverParts.length >= 1) {
                server = serverParts[0];
                // Try parsing values from the previous line if it has numbers
                const volumesLine = sublines[0]; // e.g. "1510 (IN) 1510 (OUT)"
                const matches = volumesLine.match(/(\d+)\s*\(IN\)\s*(\d+)\s*\(OUT\)/i);
                if (matches) {
                    inVal = parseInt(matches[1], 10) || 0;
                    outVal = parseInt(matches[2], 10) || 0;
                }
            }
            
            if (sublines.length >= 3) {
                domain = sublines[2]; // e.g. "lodoguide.com"
            }
        }
    }
    
    if (!server && !ip) return null;
    if (inVal === 0 && outVal === 0) return null;
    return {
        user,
        server,
        inVal,
        outVal,
        domain,
        ip,
        timestamp
    };
}

async function parseRequestBody(req) {
    if (req.body) return req.body;
    const buffers = [];
    for await (const chunk of req) {
        buffers.push(chunk);
    }
    const rawBody = Buffer.concat(buffers).toString('utf8');
    if (!rawBody) return null;
    try {
        return JSON.parse(rawBody);
    } catch (e) {
        return null;
    }
}

export default async function handler(req, res) {
    try {
        let results = [];
        let isTelegramWebhook = false;
        
        if (req.method === 'POST') {
            // Webhook mode: a single update object is sent in the body
            const update = await parseRequestBody(req);
            if (update && update.update_id) {
                results = [update];
                isTelegramWebhook = true;
                
                // Write debug log of raw payload
                  try {
                    const msg = update.message || update.edited_message || update.channel_post;
                    const logEntry = {
                        timestamp: Date.now(),
                        update_id: update.update_id,
                        chat_id: msg && msg.chat ? msg.chat.id : null,
                        chat_title: msg && msg.chat ? msg.chat.title : null,
                        from: msg && msg.from ? (msg.from.username || msg.from.first_name) : null,
                        text: msg ? msg.text : null,
                        raw: JSON.stringify(update)
                    };
                    await fetch(`${DB_URL}/warmupRawLogs/${update.update_id}.json`, {
                        method: 'PUT',
                        body: JSON.stringify(logEntry),
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (e) {
                    console.error("Failed to write raw debug log:", e);
                }
            } else if (update && update.text) {
                // Direct POST of message text from external script
                const fakeMessageId = "ext_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
                results = [{
                    update_id: Date.now(),
                    message: {
                        message_id: fakeMessageId,
                        date: Math.floor(Date.now() / 1000),
                        chat: { id: "-1002633168986", type: "supergroup" },
                        text: update.text
                    }
                }];
            }
        } else {
            // Polling mode: Fetch updates from Telegram Bot API
            const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;
            const tgResp = await fetch(tgUrl);
            const tgData = await tgResp.json();
            
            if (tgData.ok) {
                results = tgData.result || [];
            } else {
                console.warn('Telegram API getUpdates returned error:', tgData.description);
                // Return empty results instead of crashing if getUpdates is disabled by webhook
                results = [];
            }
        }
        
        const newRecords = {};
        let addedCount = 0;
        
        results.forEach(update => {
            const msg = update.message || update.edited_message || update.channel_post;
            if (msg && msg.text) {
                const chatId = msg.chat ? String(msg.chat.id) : "";
                const isTargetGroup = chatId === "-1002633168986" || chatId === "-1003727758817" || chatId === "-5317343683";
                const isPrivate = msg.chat && msg.chat.type === "private";
                
                if (!isTargetGroup && !isPrivate) {
                    return;
                }

                const messageId = msg.message_id;
                const timestamp = msg.date * 1000; // Telegram date is in Unix seconds
                const parsed = parseMessage(msg.text, timestamp);
                if (parsed) {
                    parsed.messageId = messageId;
                    newRecords[messageId] = parsed;
                    addedCount++;
                }
            }
        });
        
        if (addedCount > 0) {
            await saveFirebaseData('warmupData', newRecords);
        }
        
        if (isTelegramWebhook) {
            // Webhook ONLY saves data to prevent bandwidth exhaustion. 
            // The heavy upgrade evaluation will be done by the 5-minute cron job.
            return res.status(200).json({ 
                success: true, 
                addedCount 
            });
        }

        // Fetch recent warmupData from Firebase if needed (when not in webhook mode)
        let allData = {};
        try {
            // Fetch only the last 1000 records to save bandwidth (~97% reduction)
            const resp = await fetch(`${DB_URL}/warmupData.json?orderBy="$key"&limitToLast=1000`, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' }, cache: 'no-store' });
            allData = await resp.json() || {};
        } catch (err) {
            // Fallback to fetching all if query fails
            allData = await getFirebaseData('warmupData') || {};
        }

        // Run the auto target upgrade checks (always process, passing newRecords if added)
        await processAutoWarmup(allData, addedCount > 0 ? newRecords : null);

        if (addedCount > 0) {
            if (!isTelegramWebhook) {
                try {
                    const notifiedState = await getFirebaseData('state/warmupNotified') || {};
                    let newNotified = false;
                    
                    const grouped = {};
                    Object.values(allData).forEach(r => {
                        if (!r.domain && !r.ip && !r.server) return;
                        const key = `${r.domain || ''}_${r.server || ''}_${r.ip || ''}`;
                        if (!grouped[key]) grouped[key] = { ...r, records: [] };
            
            // Update stats
            const cleanDomainName = (r.domain || r.ip || 'unknown').replace(/[\.\#\$\[\]\/]/g, '_');
            const safeIp = (r.ip || 'unknown').replace(/[\.\:\/]/g, '_');
            const statKey = `${cleanDomainName}_${r.server}_${safeIp}`;
            
            if (!warmupStats[statKey]) {
                warmupStats[statKey] = { firstDropTimestamp: r.timestamp, totalDrops: 0 };
            }
            if (newRecords && newRecords[r.messageId]) {
                  warmupStats[statKey].totalDrops++;
                  statsUpdated = true;
                  
                  // Streak Logic for Upgrades
                  const inVal = parseInt(r.inVal, 10) || 0;
                  const outVal = parseInt(r.outVal, 10) || 0;
                  const isSuccess = inVal > 0 && outVal >= Math.floor(inVal * 0.95);
                  
                  const band = getLevelBand(inVal);
                  
                  if (!warmupStats[statKey].currentBand || warmupStats[statKey].currentBand !== band) {
                      warmupStats[statKey].currentBand = band;
                      warmupStats[statKey].streak = 0; // Reset streak on band change
                  }
                  
                  if (isSuccess) {
                      warmupStats[statKey].streak++;
                  } else {
                      // If fail, we don't reset streak immediately here because the 2-drop downgrade logic 
                      // handles changing the target. If target changes, streak resets automatically above.
                  }
              }
            
            const isDuplicate = grouped[key].records.some(ex => 
                ex.ip === r.ip &&
                ex.outVal === r.outVal && 
                Math.abs(ex.timestamp - r.timestamp) < 5 * 60 * 1000
            );
            
            if (!isDuplicate) {
                grouped[key].records.push(r);
            }
                    });
                    
                    const getRepOut = (drops) => {
                        const nonZeros = drops.filter(v => v > 0);
                        if (nonZeros.length === 0) return 0;
                        if (nonZeros.length === 1) return nonZeros[0];
                        nonZeros.sort((a, b) => b - a);
                        for (let i = 0; i < nonZeros.length; i++) {
                            for (let j = i + 1; j < nonZeros.length; j++) {
                                const maxVal = Math.max(nonZeros[i], nonZeros[j]);
                                const minVal = Math.min(nonZeros[i], nonZeros[j]);
                                if (maxVal > 0 && (maxVal - minVal) / maxVal <= 0.3) return maxVal;
                            }
                        }
                        return nonZeros[0];
                    };
                    
                    const notifToken = UPGRADE_BOT_TOKEN;
                    const notifChatId = "-5317343683";
                    
                    for (const key in grouped) {
                        const g = grouped[key];
                        g.records.sort((a, b) => b.timestamp - a.timestamp);
                        const allOuts = g.records.map(r => r.outVal);
                        const repOut = getRepOut(allOuts);
                        
                        const safeDomain = (g.domain || g.ip || g.server || 'unknown').replace(/[\.\#\$\[\]\/]/g, '_');
                        const safeIp = (g.ip || 'unknown').replace(/[\.\:\/]/g, '_');
                        const reachedKey = `${safeDomain}_${g.server}_${safeIp}_reached`;
                        
                        if (repOut > 25900 && !autoNotifiedState[reachedKey]) {
                            const acquired = await putFirebaseDataConditional(`state/autoWarmupNotified/${reachedKey}`, true, 'null_etag');
                            if (acquired) {
                                autoNotifiedState[reachedKey] = true;
                                const text = `🎯 <b>Warmup Target Reached!</b>\n\n` + 
                                             `🌐 Domain: <b>${g.domain || 'N/A'}</b>\n` +
                                             `📌 IP: <code>${g.ip || 'Unknown'}</code>\n` + 
                                             `🖥 Server: ${g.server || 'Unknown'}\n` + 
                                             `📊 Rep Out: <b>${repOut}</b>\n\n` + 
                                             `<i>Target (>25900) achieved.</i>`;
                                             
                                fetch(`https://api.telegram.org/bot${notifToken}/sendMessage`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        chat_id: notifChatId,
                                        text: text,
                                        parse_mode: 'HTML'
                                    })
                                }).catch(e => console.error(e));
                            }
                        }
                    }
                } catch (err) {
                    console.error("Error during notification check:", err);
                }
            }
        }
        
        if (isTelegramWebhook) {
            return res.status(200).json({ 
                success: true, 
                addedCount 
            });
        }
        
        return res.status(200).json({ 
            success: true, 
            addedCount, 
            totalCount: Object.keys(allData).length,
            records: Object.values(allData)
        });
    } catch (e) {
        console.error("Error in sync-telegram-warmup:", e);
        return res.status(500).json({ error: e.message });
    }
}

export const config = {
    api: {
        bodyParser: false,
    },
};






