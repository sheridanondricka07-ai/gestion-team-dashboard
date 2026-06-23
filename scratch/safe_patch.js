const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../components.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add Tab
const tabSearch = `Archived (Sent) <span style="background: \${app.state.warmupActiveTab === 'archived' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)'}; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; margin-left: 6px;">\${totalArchived}</span>
                </div>
            </div>`;

const tabReplace = `Archived (Sent) <span style="background: \${app.state.warmupActiveTab === 'archived' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)'}; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; margin-left: 6px;">\${totalArchived}</span>
                </div>
                <div onclick="window.app.state.warmupActiveTab = 'remote'; window.app.updateDashboard();" style="padding: 10px 16px; cursor: pointer; font-weight: 600; font-size: 0.85rem; border-bottom: 2px solid \${app.state.warmupActiveTab === 'remote' ? 'var(--accent-primary)' : 'transparent'}; color: \${app.state.warmupActiveTab === 'remote' ? 'var(--accent-primary)' : 'var(--text-secondary)'}; transition: all 0.2s; display: flex; align-items: center; gap: 6px;">
                    <i data-lucide="terminal" style="width: 14px; height: 14px;"></i> Remote Controller
                </div>
            </div>`;

if (!code.includes(tabSearch)) {
    console.log("Error: Tab Search String not found");
} else {
    code = code.replace(tabSearch, tabReplace);
    console.log("Tab added.");
}

// 2. Add wrapper start
const uiSearch = `            <!-- Filters -->`;
const uiReplace = `            \${app.state.warmupActiveTab === 'remote' ? \`
            <div class="card" style="padding: 24px; max-width: 800px; margin: 0 auto; margin-bottom: 24px; text-align: left;">
                <h3 style="margin-bottom: 16px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="terminal" style="width: 18px;"></i> Dispatch Remote Commands
                </h3>
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 24px;">
                    Queue custom commands straight to Firebase. Your team's Pale Moon scripts will fetch and execute these automatically.
                </p>
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary);">Target Scope</label>
                        <select id="mc-target-scope" style="padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary);">
                            <option value="server">Server(s) - e.g. s_wmn3_2204</option>
                            <option value="domain">Domain(s) / IP(s) - e.g. durmorel.store</option>
                            <option value="custom">Raw Command (Advanced)</option>
                        </select>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary);">Targets (Paste multiple, separated by newlines or commas)</label>
                        <textarea id="mc-targets" rows="5" style="padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-family: monospace;" placeholder="s_wmn3_2204\\ns_wmn3_2249"></textarea>
                    </div>
                    <div style="display: flex; gap: 16px;">
                        <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
                            <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary);">Field to Edit</label>
                            <select id="mc-field" style="padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary);">
                                <option value="wait_time">wait_time</option>
                                <option value="send_size">send_size</option>
                                <option value="test_after">test_after</option>
                                <option value="random">random</option>
                            </select>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
                            <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary);">New Value</label>
                            <input type="text" id="mc-value" style="padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary);" placeholder="e.g. 600" />
                        </div>
                    </div>
                    <button onclick="window.queueManualCommands()" class="btn-primary" style="margin-top: 8px; padding: 12px; font-weight: 600; display: flex; justify-content: center; align-items: center; gap: 8px;">
                        <i data-lucide="zap" style="width: 16px;"></i> Queue Commands to Firebase
                    </button>
                    <div id="mc-status" style="margin-top: 8px; font-size: 0.85rem; font-weight: 500; text-align: center;"></div>
                </div>
            </div>
            \` : \`
            <!-- Filters -->`;

if (!code.includes(uiSearch)) {
    console.log("Error: UI Search String not found");
} else {
    code = code.replace(uiSearch, uiReplace);
    console.log("UI added.");
}

// 3. Add wrapper end
const endSearch = `                              \${filteredGroups.length === 0 ? '<tr><td colspan="9" style="padding: 60px; text-align: center; color: var(--text-secondary); font-size:0.8rem;">No warmup data found. Fetch from Telegram or paste logs above.</td></tr>' : ''}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      \`;
  }`;

const endReplace = `                              \${filteredGroups.length === 0 ? '<tr><td colspan="9" style="padding: 60px; text-align: center; color: var(--text-secondary); font-size:0.8rem;">No warmup data found. Fetch from Telegram or paste logs above.</td></tr>' : ''}
                          </tbody>
                      </table>
                  </div>
              </div>
              \`}
          </div>
      \`;
  }`;

if (!code.includes(endSearch)) {
    console.log("Error: End Search String not found");
} else {
    code = code.replace(endSearch, endReplace);
    console.log("End wrapped.");
}

fs.writeFileSync(filePath, code, 'utf8');

// 4. Append window.queueManualCommands
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

fs.appendFileSync(filePath, codeToAppend, 'utf8');
console.log("Appended window.queueManualCommands.");
