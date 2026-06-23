const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../components.js');
let code = fs.readFileSync(filePath, 'utf8');

const searchStr1 = "    document.body.appendChild(overlay);\r\n    if (window.lucide) window.lucide.createIcons();\r\n};";
const searchStr2 = "    document.body.appendChild(overlay);\n    if (window.lucide) window.lucide.createIcons();\n};";

let idx = code.indexOf(searchStr1);
let len = searchStr1.length;
if (idx === -1) {
    idx = code.indexOf(searchStr2);
    len = searchStr2.length;
}

if (idx !== -1) {
    const fixedCode = code.substring(0, idx + len);
    
    // Now append the good window.queueManualCommands
    const codeToAppend = `

window.queueManualCommands = async () => {
    const statusDiv = document.getElementById('mc-status');
    const btn = document.querySelector('button[onclick="window.queueManualCommands()"]');
    
    const scope = document.getElementById('mc-target-scope').value;
    const targetsStr = document.getElementById('mc-targets').value;
    const field = document.getElementById('mc-field').value;
    const val = document.getElementById('mc-value').value;
    
    if (!targetsStr.trim() || (!val.trim() && scope !== 'custom')) {
        statusDiv.innerText = "Please provide targets and a new value.";
        statusDiv.style.color = "#ef4444";
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="lucide-loader"></i> Processing...';
    statusDiv.innerText = "Processing targets...";
    statusDiv.style.color = "var(--text-secondary)";
    
    const targets = targetsStr.split(/[\\n,]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
    const newQueueItems = {};
    let sendAtMs = Date.now() + 1000;
    
    // Build a map of domain/ip -> server to lookup if scope is domain
    const domainToServer = {};
    if (scope === 'domain') {
        const warmupData = window.app.state.warmupData || {};
        for (const [key, record] of Object.entries(warmupData)) {
            if (record.domain) domainToServer[record.domain.toLowerCase()] = record.server;
            if (record.ip) domainToServer[record.ip] = record.server;
        }
        // Also check server inventory mapping if not found in warmup
        if (window.app.state.servers) {
            window.app.state.servers.forEach(s => {
                if (s.allIps) {
                    s.allIps.forEach(ip => {
                        if (!domainToServer[ip]) domainToServer[ip] = s.name;
                    });
                }
            });
        }
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const t of targets) {
        let msg = "";
        let serverName = "";
        
        if (scope === 'server') {
            serverName = t;
            msg = \`update \${serverName} \${field} to \${val}\`;
        } else if (scope === 'domain') {
            serverName = domainToServer[t];
            if (!serverName) {
                failCount++;
                continue;
            }
            msg = \`update \${serverName} \${field} for \${t} to \${val}\`;
        } else if (scope === 'custom') {
            msg = t; // Treat each line as a raw command
            // Extract server name from raw command if possible to create a somewhat unique ID
            const match = msg.match(/update\\s+(sh_wmn3_\\d+|s_wmn3_\\d+)/i);
            serverName = match ? match[1] : 'custom';
        }
        
        const queueId = \`q_manual_\${Date.now()}_\${Math.floor(Math.random()*10000)}\`;
        newQueueItems[queueId] = {
            chat_id: "-5317343683",
            text: msg,
            sendAt: sendAtMs
        };
        sendAtMs += 7000; // Stagger by 7s
        successCount++;
    }
    
    if (successCount === 0) {
        statusDiv.innerText = \`Failed to queue: Could not match \${failCount} domains/IPs to servers.\`;
        statusDiv.style.color = "#ef4444";
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="zap" style="width: 16px;"></i> Queue Commands to Firebase';
        if (window.lucide) window.lucide.createIcons();
        return;
    }
    
    try {
        await window.db.ref('state/autoWarmupQueue').update(newQueueItems);
        statusDiv.innerText = \`Successfully queued \${successCount} commands! \${failCount > 0 ? \`(\${failCount} unmapped skipped)\` : ''}\`;
        statusDiv.style.color = "#10b981";
        document.getElementById('mc-targets').value = '';
    } catch (e) {
        console.error(e);
        statusDiv.innerText = "Error pushing to Firebase!";
        statusDiv.style.color = "#ef4444";
    }
    
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="zap" style="width: 16px;"></i> Queue Commands to Firebase';
    if (window.lucide) window.lucide.createIcons();
};
`;

    fs.writeFileSync(filePath, fixedCode + codeToAppend, 'utf8');
    console.log("Fixed components.js successfully by hard splitting with CRLF support!");
} else {
    console.log("Could not find the end of the file!");
}
