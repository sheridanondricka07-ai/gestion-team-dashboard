// Global scope - no imports needed as scripts load sequentially in index.html
// 1. Go to console.firebase.google.com
// 2. Create a project and add a Web App
// 3. Paste your config here:
const firebaseConfig = {
    apiKey: "AIzaSyBMyS1E2kYkAOfUMUVivaHlcxRUXiodrPA",
    authDomain: "gestion-team-c.firebaseapp.com",
    databaseURL: "https://gestion-team-c-default-rtdb.firebaseio.com",
    projectId: "gestion-team-c",
    storageBucket: "gestion-team-c.firebasestorage.app",
    messagingSenderId: "561570845581",
    appId: "1:561570845581:web:bf7262c514d2413e4b63c4",
    measurementId: "G-RPNVMR8GX8"
};

// Wait for all scripts to load before starting
window.onload = function() {
    try {
        if (typeof firebase !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
            console.log("Firebase detected, initializing...");
            firebase.initializeApp(firebaseConfig);
            window.db = firebase.database();
        }
    } catch (err) {
        console.warn("Firebase failed to initialize, continuing in local mode:", err);
    }
    
    // Start App regardless of Firebase status
    window.app = new TeamApp();
};

class TeamApp {
    constructor() {
        this.state = {
            currentUser: null,
            currentView: 'overview',
            dbConnected: false,
            mailers: [
                { id: 'admin', name: 'Mohamed Reda ZARYOUH', email: 'admin@admin.com', password: 'admin', role: 'admin', mailer_id: '2040' },
                { id: 'm1', name: 'Jaefar LAAKEL HEMDANOU', email: 'jaefar@test.com', password: 'password', role: 'mailer', mailer_id: '3134' },
                { id: 'm2', name: 'Salma EL KARTIT', email: 'salma@test.com', password: 'password', role: 'mailer', mailer_id: '3329' },
                { id: 'm3', name: 'Ayoub GHAILAN', email: 'ayoub@test.com', password: 'password', role: 'mailer', mailer_id: '3335' },
                { id: 'm4', name: 'Inssaf EL HAOUASS', email: 'inssaf@test.com', password: 'password', role: 'mailer', mailer_id: '2310' }
            ],
            servers: [],
            rps: [],
            tools: [],
            drops: [],
            historyServers: [],
            statuses: {},
            spamhaus: {},
            spamhausProgress: { status: 'idle', current: 0, total: 0 },
            spamhausHistory: null,
            dropSort: { key: 'timestamp', order: 'desc' },
            dropSearch: '',
            spamhausTab: 'grid',
            vmtaResults: {}
        };
        this.expandedServers = new Set();
        this.statusRange = 7;
        this.statusSearch = '';
        this.selectedFilterDate = new Date().toISOString().split('T')[0];
        this.init();
    }

    async init() {
        console.log("Initializing App...");
        await this.loadState();
        
        // 1. Run Alerts FIRST (so we notify before archiving/renewing)
        await this.checkUpcomingCancellations();

        // 2. Run Maintenance (Archive/Renew)
        await this.checkServerCancellations();
        
        this.updateDashboard();
    }

    async checkServerCancellations() {
        const todayStr = new Date().toISOString().split('T')[0];
        const today = new Date(todayStr);
        let needsSave = false;

        const serversToKeep = [];
        const historyToAdd = this.state.historyServers || [];

        for (const srv of this.state.servers) {
            if (!srv.cancelDate || srv.cancelDate === '---') {
                serversToKeep.push(srv);
                continue;
            }

            const cDate = new Date(srv.cancelDate);
            
            // Check if date has arrived or passed
            if (cDate <= today) {
                if (srv.markedForCancel) {
                    // ARCHIVE: Move to history
                    console.log(`Archiving canceled server: ${srv.name}`);
                    
                    // Calculate Lifetime Revenue for this server from drops
                    let totalRev = 0;
                    this.state.drops.forEach(drop => {
                        const srvStat = (drop.serverStats || []).find(st => st.srv === srv.name);
                        if (srvStat) {
                            totalRev += parseFloat(drop.rev || 0);
                        }
                    });

                    historyToAdd.push({
                        ...srv,
                        canceledAt: todayStr,
                        revenue: totalRev.toFixed(2),
                        originalId: srv.id
                    });
                    needsSave = true;
                } else {
                    // RENEW: Add +1 month
                    console.log(`Auto-renewing server date: ${srv.name}`);
                    const newDate = new Date(cDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    srv.cancelDate = newDate.toISOString().split('T')[0];
                    serversToKeep.push(srv);
                    needsSave = true;
                }
            } else {
                serversToKeep.push(srv);
            }
        }

        if (needsSave) {
            this.state.servers = serversToKeep;
            this.state.historyServers = historyToAdd;
            await this.saveState();
        }

        // Run Proactive Alerts for upcoming dates
        await this.checkUpcomingCancellations();
    }

    async checkUpcomingCancellations() {
        const todayStr = new Date().toISOString().split('T')[0];
        const today = new Date(todayStr);
        let needsSave = false;

        for (const srv of this.state.servers) {
            if (!srv.cancelDate || srv.cancelDate === '---') continue;

            const cDate = new Date(srv.cancelDate);
            const diffTime = cDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Initialize notification tracking if not present
            if (!srv.notified) srv.notified = {};

            // Check milestones: 3 days or less (including overdue/negative days)
            if (diffDays <= 3) {
                // Determine milestone label: 'late' for negative, or 'Xd' for positive/zero
                const milestone = diffDays < 0 ? 'late' : `${diffDays}d`;
                console.log(`Checking milestone ${milestone} for ${srv.name}. Already notified: ${srv.notified[milestone]}`);
                
                if (!srv.notified[milestone]) {
                    const status = srv.markedForCancel ? "🔴 DECLARED TO CANCEL" : "⚠️ NOT DECLARED (Will Auto-Renew)";
                    const timeLabel = diffDays < 0 ? `LATE BY ${Math.abs(diffDays)} DAY(S) 🚨` : `${diffDays} Day(s)`;
                    
                    const message = `🔔 *Server Cancellation Alert*\n\n` +
                                    `🖥 *Server:* ${srv.name}\n` +
                                    `⏳ *Status:* ${timeLabel}\n` +
                                    `📅 *Date:* ${srv.cancelDate}\n` +
                                    `📝 *Action:* ${status}`;
                    
                    await this.sendTelegramNotification(message);
                    srv.notified[milestone] = true;
                    needsSave = true;
                }
            } else {
                // If we are far from the date, reset notifications so they can trigger again next month if needed
                if (diffDays > 5 && Object.keys(srv.notified).length > 0) {
                    srv.notified = {};
                    needsSave = true;
                }
            }
        }

        if (needsSave) await this.saveState();
    }

    async sendTelegramNotification(message) {
        const token = "8888454016:AAH04qHHycwZTnXoRFlvRBwQ2yEwPaYVdwQ";
        const chatId = "-4933333573";
        const url = `https://api.telegram.org/bot${token}/sendMessage`;

        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
            console.log("Telegram notification sent!");
        } catch (err) {
            console.error("Failed to send Telegram notification:", err);
        }
    }

    async addServer(serverData) {
        const lines = serverData.ips.split('\n').map(l => l.trim()).filter(l => l !== '');
        const serverName = serverData.name.trim();
        
        const ips = [];
        const vmtaMap = {};

        lines.forEach(line => {
            const parts = line.split(/\s+/);
            const ip = parts[0];
            const hostname = parts[1] || '';
            if (ip) {
                ips.push(ip);
                if (hostname) {
                    const safeIp = ip.replace(/\./g, '_');
                    vmtaMap[safeIp] = hostname;
                }
            }
        });

        const existingServer = this.state.servers.find(s => s.name === serverName);
        
        if (existingServer) {
            // Server exists, merge new IPs and mappings
            const currentIps = existingServer.allIps || [];
            const currentVmtaMap = existingServer.vmtaMap || {};
            
            ips.forEach(ip => {
                if (!currentIps.includes(ip)) currentIps.push(ip);
                const safeIp = ip.replace(/\./g, '_');
                if (vmtaMap[safeIp]) currentVmtaMap[safeIp] = vmtaMap[safeIp];
            });

            // Update existing server fields
            existingServer.allIps = currentIps;
            existingServer.vmtaMap = currentVmtaMap;
            
            // Update inventory fields if provided
            if (serverData.mainIp) existingServer.mainIp = serverData.mainIp;
            if (serverData.ipClass) existingServer.ipClass = serverData.ipClass;
            if (serverData.entity) existingServer.entity = serverData.entity;
            if (serverData.group) existingServer.group = serverData.group;
            if (serverData.enteredDate) existingServer.enteredDate = serverData.enteredDate;
            if (serverData.provider) existingServer.provider = serverData.provider;
            if (serverData.asn) existingServer.asn = serverData.asn;
            if (serverData.cancelNoticeDate) existingServer.cancelNoticeDate = serverData.cancelNoticeDate;
            if (serverData.reqAt) existingServer.reqAt = serverData.reqAt;
            if (serverData.cancelDate) existingServer.cancelDate = serverData.cancelDate;

            if ((!existingServer.ip || existingServer.ip === '0.0.0.0') && (serverData.mainIp || ips[0])) {
                existingServer.ip = serverData.mainIp || ips[0];
            }
            await this.saveState();
        } else {
            // Create new server
            const newServer = {
                id: 'srv_' + Date.now(),
                name: serverName,
                ip: serverData.mainIp || (ips[0] || '0.0.0.0'),
                allIps: ips,
                vmtaMap: vmtaMap,
                mailerId: null,
                status: 'stock',
                // Inventory Fields
                mainIp: serverData.mainIp || '',
                ipClass: serverData.ipClass || '',
                entity: serverData.entity || '',
                group: serverData.group || '',
                enteredDate: serverData.enteredDate || '',
                provider: serverData.provider || '',
                asn: serverData.asn || '',
                cancelNoticeDate: serverData.cancelNoticeDate || '',
                reqAt: serverData.reqAt || '',
                cancelDate: serverData.cancelDate || ''
            };
            this.state.servers.push(newServer);
            await this.saveState();
        }
    }

    async addRP(rpData) {
        const domains = rpData.domain.split('\n').map(d => d.trim()).filter(d => d !== '');
        domains.forEach(domain => {
            const newRP = {
                id: 'rp' + Math.random().toString(36).substr(2, 9),
                domain: domain,
                serverId: null,
                mailerId: null,
                status: 'stock',
                assignedIps: []
            };
            this.state.rps.push(newRP);
        });
        await this.saveState();
    }

    async addMailer(data) {
        const mailer = {
            id: 'm_' + Date.now(),
            name: data.name,
            email: data.email,
            password: data.password,
            role: data.role || 'mailer',
            mailer_id: data.mailer_id || 'N/A'
        };
        this.state.mailers.push(mailer);
        await this.saveState();
    }

    async deleteMailer(mailerId) {
        if (mailerId === 'admin') return;
        this.showConfirm("Remove mailer and return resources to stock?", async () => {
            this.state.servers.forEach(s => { if (s.mailerId === mailerId) s.mailerId = null; });
            this.state.rps.forEach(rp => {
                if (rp.mailerId === mailerId) {
                    rp.mailerId = null;
                    rp.serverId = null;
                    rp.assignedIps = [];
                    rp.status = 'stock';
                }
            });
            this.state.mailers = this.state.mailers.filter(m => m.id !== mailerId);
            await this.saveState();
        });
    }

    async updateRPIps(rpId, ips) {
        const rp = this.state.rps.find(r => r.id === rpId);
        if (rp) rp.assignedIps = ips;
        await this.saveState();
    }

    async updateMailer(id, updates) {
        const index = this.state.mailers.findIndex(m => m.id === id);
        if (index !== -1) {
            this.state.mailers[index] = { ...this.state.mailers[index], ...updates };
            await this.saveState();
        }
    }

    detectServers(ipString) {
        if (!ipString || ipString === '---') return 'Unknown Server';
        const dropIps = ipString.split(/[\s,]+/).filter(ip => ip.trim());
        const detected = [];
        if (this.state.servers) {
            this.state.servers.forEach(srv => {
                const srvIps = (srv.allIps || []);
                if (dropIps.some(ip => srvIps.includes(ip))) detected.push(srv.name);
            });
        }
        return detected.length > 0 ? detected.join(', ') : 'Unknown Server';
    }

    async addDrop(dropData) {
        const now = new Date();
        const rev = parseFloat(dropData.rev) || 0;
        const clicks = parseFloat(dropData.clicks) || 0;
        
        // Automatic Calculations
        const cpm = dropData.totalOut > 0 ? (rev * 1000) / dropData.totalOut : 0;
        const epc = clicks > 0 ? rev / clicks : 0;

        const drop = {
            id: 'drop_' + Date.now(),
            entity: dropData.entity || 'WMN3',
            offer: dropData.offer,
            date: now.toISOString(),
            displayDate: now.toLocaleString(),
            deployIds: dropData.deployIds,
            ips: dropData.ips || '---',
            profile: dropData.profile || 'N/A',
            testAfter: dropData.testAfter || '0%',
            returnPath: dropData.returnPath || 'N/A',
            serverStats: window._tempProcessedStats ? window._tempProcessedStats.breakdown : null, 
            totalIn: window._tempProcessedStats ? window._tempProcessedStats.totalIn : 0,
            totalOut: window._tempProcessedStats ? window._tempProcessedStats.totalOut : 0,
            mailerId: this.state.currentUser.mailer_id || 'N/A',
            mailerName: this.state.currentUser.name,
            clicks: clicks,
            epc: epc,
            cpm: cpm,
            rev: rev,
            servers: this.detectServers(dropData.ips),
            timestamp: now.getTime()
        };
        this.state.drops.push(drop);
        await this.saveState();
        await this.sendDropToTelegram(drop, 'NEW DROP');
    }

    async updateDrop(dropId, updates) {
        const index = this.state.drops.findIndex(d => d.id === dropId);
        if (index !== -1) {
            const current = this.state.drops[index];
            const totalOut = updates.totalOut !== undefined ? updates.totalOut : current.totalOut;
            const rev = parseFloat(updates.rev !== undefined ? updates.rev : current.rev) || 0;
            const clicks = parseFloat(updates.clicks !== undefined ? updates.clicks : (current.clicks || 0)) || 0;
            
            // Automatic Calculations
            const cpm = totalOut > 0 ? (rev * 1000) / totalOut : 0;
            const epc = clicks > 0 ? rev / clicks : 0;

            this.state.drops[index] = { 
                ...current, 
                ...updates,
                totalOut, rev, clicks, cpm, epc,
                servers: updates.ips ? this.detectServers(updates.ips) : current.servers
            };
            await this.saveState();
            await this.sendDropToTelegram(this.state.drops[index], 'EDITED DROP');
        }
    }

    async sendDropToTelegram(drop, type) {
        const token = "8773719558:AAH-VYZZ0E7F092n1ywBsHts3UOWPxlB9Z0";
        const chatId = "-5184683836";
        
        const serverDisplay = drop.servers || this.detectServers(drop.ips);

        const formatNum = (num) => num.toLocaleString('en-US').replace(/,/g, ' ');
        const message = `🚀 <b>${type}</b>\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>Mailer:</b> ${drop.mailerName} (ID: ${drop.mailerId})   <b>Entity:</b> ${drop.entity}\n` +
            `🏷️ <b>Offer:</b> ${drop.offer}\n` +
            `🆔 <b>Deploys:</b> ${drop.deployIds}\n` +
            `🌐 <b>Server:</b> ${serverDisplay}   • <b>IP(s):</b> ${drop.ips}\n\n` +
            `📑 <b>Details:</b>\n` +
            `• <b>DATA Profil:</b> ${drop.profile}  • <b>Inbox Rate:</b> ${drop.testAfter} INBOX\n` +
            `• <b>Return Path:</b> ${drop.returnPath}\n\n` +
            `📊 <b>Performance:</b>\n` +
            `• <b>SENT (IN):</b> ${formatNum(drop.totalIn)}   <b>(OUT):</b> ${formatNum(drop.totalOut)}\n` +
            `• <b>Clicks:</b> ${drop.clicks.toLocaleString()}  • <b>EPC:</b> $${Number(drop.epc.toFixed(2))}  • <b>CPM:</b> $${Number(drop.cpm.toFixed(2))}\n` +
            `• 💰 <b>REV: $${drop.rev.toLocaleString('fr-FR', {minimumFractionDigits: 2})}</b>\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `📅 <i>${drop.displayDate}</i>`;

        try {
            const url = `https://api.telegram.org/bot${token}/sendMessage`;
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
        } catch (err) {
            console.error("Telegram notification failed:", err);
        }
    }

    async deleteDrop(dropId) {
        this.showConfirm("Permanently delete this drop record?", async () => {
            this.state.drops = this.state.drops.filter(d => d.id !== dropId);
            await this.saveState();
        });
    }

    async assignResource(type, resourceId, mailerId) {
        if (this.state.currentUser.role !== 'admin') return;
        if (type === 'rp') {
            const rp = this.state.rps.find(r => r.id === resourceId);
            if (rp) {
                rp.mailerId = mailerId;
                if (!mailerId) { rp.serverId = null; rp.assignedIps = []; rp.status = 'stock'; }
                else { rp.status = 'active'; }
            }
        } else if (type === 'srv') {
            const srv = this.state.servers.find(s => s.id === resourceId);
            if (srv) {
                srv.mailerId = mailerId;
                this.state.rps.forEach(rp => {
                    if (rp.serverId === srv.id) {
                        rp.mailerId = mailerId;
                        if (!mailerId) { rp.serverId = null; rp.assignedIps = []; rp.status = 'stock'; }
                    }
                });
            }
        }
        await this.saveState();
    }

    async assignRPtoServer(rpId, serverId) {
        const rp = this.state.rps.find(r => r.id === rpId);
        const srv = this.state.servers.find(s => s.id === serverId);
        if (rp) {
            rp.serverId = serverId;
            rp.mailerId = srv ? srv.mailerId : null;
            if (!serverId) { rp.assignedIps = []; rp.status = 'stock'; }
            else { rp.status = 'active'; }
        }
        await this.saveState();
    }

    async deleteServer(serverId) {
        this.showConfirm("Delete server and return RPs to stock?", async () => {
            this.state.rps.forEach(rp => {
                if (rp.serverId === serverId) { rp.serverId = null; rp.mailerId = null; rp.assignedIps = []; rp.status = 'stock'; }
            });
            this.state.servers = this.state.servers.filter(s => s.id !== serverId);
            await this.saveState();
        });
    }

    async deleteRP(rpId) {
        this.showConfirm("Permanently delete this RP?", async () => {
            this.state.rps = this.state.rps.filter(r => r.id !== rpId);
            await this.saveState();
        });
    }

    showConfirm(message, onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal" style="max-width: 400px; text-align: center;">
                <div style="margin-bottom: 24px; color: var(--error);">
                    <i data-lucide="alert-triangle" style="width: 48px; height: 48px; margin-bottom: 16px;"></i>
                    <h2 style="color: var(--text-primary);">Confirm Action</h2>
                </div>
                <p style="margin-bottom: 32px; color: var(--text-secondary); line-height: 1.6;">${message}</p>
                <div style="display: flex; gap: 12px;">
                    <button id="confirm-yes" style="flex: 1; background: var(--error);">Yes, Continue</button>
                    <button id="confirm-no" style="flex: 1; background: var(--bg-tertiary);">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        if (window.lucide) window.lucide.createIcons();
        document.getElementById('confirm-yes').onclick = async () => { await onConfirm(); overlay.remove(); };
        document.getElementById('confirm-no').onclick = () => overlay.remove();
    }

    unassignRP(rpId) { this.assignResource('rp', rpId, null); }
    unassignServer(serverId) { this.assignResource('srv', serverId, null); }

    async init() {
        console.log("App Initializing...");
        try {
            if (typeof window.db !== 'undefined') {
                console.log("Connecting to Firebase Database...");
                this.state.dbConnected = true;
                window.db.ref('state').on('value', (snapshot) => {
                    console.log("Data received from Firebase");
                    const cloudData = snapshot.val();
                    if (cloudData) {
                        const currentUser = this.state.currentUser;
                        const currentView = this.state.currentView; // Preserve local view
                        
                        // Check if only spamhausProgress changed — if so, update bar without full re-render
                        const oldProgress = JSON.stringify(this.state.spamhausProgress || {});
                        const newProgress = JSON.stringify(cloudData.spamhausProgress || {});
                        const progressChanged = oldProgress !== newProgress;
                        
                        this.state = { ...this.state, ...cloudData, currentUser, currentView, dbConnected: true };
                        // SAFETY: Firebase may return null for these — always ensure safe defaults
                        if (!this.state.spamhausProgress) this.state.spamhausProgress = { status: 'idle', current: 0, total: 0 };
                        if (!this.state.spamhaus) this.state.spamhaus = {};
                        
                        // Patch missing Mailer IDs for known team members
                        let patched = false;
                        const knownIds = {
                            'Jaefar LAAKEL HEMDANOU': '3134',
                            'Salma EL KARTIT': '3329',
                            'Ayoub GHAILAN': '3335',
                            'Inssaf EL HAOUASS': '2310'
                        };
                        
                        if (this.state.mailers) {
                            this.state.mailers.forEach(m => {
                                const cleanName = (m.name || '').trim();
                                if (knownIds[cleanName] && (!m.mailer_id || m.mailer_id === 'N/A')) {
                                    m.mailer_id = knownIds[cleanName];
                                    patched = true;
                                }
                            });
                        }
                        
                        // Also patch existing drops that show "N/A"
                        if (this.state.drops && Array.isArray(this.state.drops)) {
                            this.state.drops.forEach(d => {
                                const cleanName = (d.mailerName || '').trim();
                                if (knownIds[cleanName] && (!d.mailerId || d.mailerId === 'N/A')) {
                                    d.mailerId = knownIds[cleanName];
                                    patched = true;
                                }
                                if (!d.servers) {
                                    d.servers = this.detectServers(d.ips);
                                    patched = true;
                                }
                            });
                        }
                        
                        if (patched) {
                            console.log("Auto-patched missing Mailer IDs in mailers and drops. Saving back to Firebase...");
                            this.saveState();
                        }
                        
                        // If scan is running and only progress changed, just update the bar
                        if (progressChanged && cloudData.spamhausProgress && cloudData.spamhausProgress.status === 'running') {
                            const bar = document.querySelector('#spamhaus-progress .progress-bar');
                            const text = document.querySelector('#spamhaus-progress-text');
                            const container = document.getElementById('spamhaus-progress');
                            if (bar && cloudData.spamhausProgress.total > 0) {
                                const pct = Math.round((cloudData.spamhausProgress.current / cloudData.spamhausProgress.total) * 100);
                                bar.style.width = pct + '%';
                                if (text) text.textContent = `${pct}% (${cloudData.spamhausProgress.current}/${cloudData.spamhausProgress.total})`;
                                if (container) container.classList.add('progress-active');
                                return; // Skip full re-render
                            }
                        }
                        
                        this.updateDashboard();
                        if (!this.state.currentUser) renderLogin(this);
                    } else {
                        console.log("Database is empty. Using defaults.");
                        this.checkAuth();
                    }
                }, (error) => {
                    console.error("Firebase Read Error:", error);
                    this.state.dbConnected = false;
                    this.loadLocalState();
                    this.checkAuth();
                });
            } else {
                console.warn("No Database Connection. Falling back to Local Storage.");
                this.state.dbConnected = false;
                this.loadLocalState();
                this.checkAuth();
            }
        } catch (err) {
            console.error("Critical App Error:", err);
            document.body.innerHTML = `<div style="padding:40px; color:var(--text-primary); text-align:center;"><h2>Critical Error</h2><p>${err.message}</p></div>`;
        }
    }

    loadLocalState() {
        const saved = localStorage.getItem('team_management_state');
        if (saved) this.state = { ...this.state, ...JSON.parse(saved) };
    }

    async saveState() {
        if (this.state.dbConnected) {
            const toSave = { ...this.state };
            delete toSave.currentUser;
            delete toSave.dbConnected;
            await window.db.ref('state').set(toSave);
        } else {
            localStorage.setItem('team_management_state', JSON.stringify(this.state));
            this.updateDashboard();
        }
    }

    setDropSort(key) {
        if (this.state.dropSort.key === key) {
            if (this.state.dropSort.order === 'desc') {
                this.state.dropSort.order = 'asc';
            } else {
                // Third click - back to default
                this.state.dropSort = { key: 'timestamp', order: 'desc' };
            }
        } else {
            // First click on new column - always Descending (bigger to smaller)
            this.state.dropSort.key = key;
            this.state.dropSort.order = 'desc';
        }
        this.updateDashboard();
        if (this.state.dbConnected) this.saveState();
    }

    async resetApp() {
        if(confirm("Clear shared database?")) {
            const newState = { mailers: [{ id: 'admin', name: 'Team Leader', email: 'admin@admin.com', password: 'admin', role: 'admin' }], servers: [], rps: [] };
            if (this.state.dbConnected) await window.db.ref('state').set(newState);
            else { this.state = { ...this.state, ...newState }; this.saveState(); }
            window.location.reload();
        }
    }

    checkAuth() {
        if (!this.state.currentUser) { this.showScreen('login'); renderLogin(this); }
        else { this.showScreen('dashboard'); this.updateDashboard(); }
    }

    async login(email, password) {
        const cleanEmail = email.trim().toLowerCase();
        const cleanPass = password.trim();
        const user = this.state.mailers.find(u => u.email.trim().toLowerCase() === cleanEmail && u.password.trim() === cleanPass);
        if (user) { this.state.currentUser = user; this.checkAuth(); return true; }
        return false;
    }

    logout() { this.state.currentUser = null; this.state.currentView = 'overview'; this.checkAuth(); }
    
    toggleServerExpand(serverId) {
        if (this.expandedServers.has(serverId)) {
            this.expandedServers.delete(serverId);
        } else {
            this.expandedServers.add(serverId);
        }
        this.updateDashboard();
    }

    async addTool(tool) {
        tool.id = 'tool_' + Date.now();
        this.state.tools.push(tool);
        await this.saveState();
    }

    async deleteTool(id) {
        this.state.tools = this.state.tools.filter(t => t.id !== id);
        await this.saveState();
    }

    async updateProfile(userData) {
        const userIndex = this.state.mailers.findIndex(m => m.id === this.state.currentUser.id);
        if (userIndex !== -1) {
            this.state.mailers[userIndex] = { ...this.state.mailers[userIndex], ...userData };
            this.state.currentUser = this.state.mailers[userIndex];
            await this.saveState();
            this.updateDashboard();
        }
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        const screen = document.getElementById(`${screenName}-screen`);
        if (screen) screen.classList.remove('hidden');
    }

    updateDashboard() {
        if (!this.state.currentUser) return;
        renderSidebar(this);
        renderTopBar(this);
        renderView(this);
        if (window.lucide) window.lucide.createIcons();
    }

    setView(viewName) { 
        this.state.currentView = viewName; 
        // Reset sorting to default when changing views
        this.state.dropSort = { key: 'timestamp', order: 'desc' };
        this.updateDashboard(); 
    }

    async updateIPStatus(ip, date, status) {
        if (!this.state.statuses) this.state.statuses = {};
        const safeIp = ip.replace(/\./g, '_');
        if (!this.state.statuses[safeIp]) this.state.statuses[safeIp] = {};
        this.state.statuses[safeIp][date] = status;
        
        try {
            await this.saveState();
        } catch(e) {
            console.error("Firebase save error:", e);
        }
    }

    async bulkUpdateIPStatuses(ips, status, date) {
        if (!this.state.statuses) this.state.statuses = {};
        ips.forEach(ip => {
            const trimmedIp = ip.trim();
            if (!trimmedIp) return;
            const safeIp = trimmedIp.replace(/\./g, '_');
            if (!this.state.statuses[safeIp]) this.state.statuses[safeIp] = {};
            this.state.statuses[safeIp][date] = status;
        });
        
        try {
            await this.saveState();
        } catch(e) {
            console.error("Firebase save error:", e);
            throw e;
        }
    }

    async batchUpdateIPStatuses(updates, statusId) {
        if (!this.state.statuses) this.state.statuses = {};
        
        updates.forEach(({ ip, date }) => {
            const safeIp = ip.replace(/\./g, '_');
            if (!this.state.statuses[safeIp]) this.state.statuses[safeIp] = {};
            this.state.statuses[safeIp][date] = statusId;
        });
        
        try {
            await this.saveState();
        } catch(e) {
            console.error("Firebase save error:", e);
            throw e;
        }
    }
}

// App is instantiated in window.onload at the top of the file

// Helpers
window.deleteRP = (id) => window.app.deleteRP(id);
window.deleteServer = (id) => window.app.deleteServer(id);
window.deleteMailer = (id) => window.app.deleteMailer(id);
window.unassignRP = (id) => window.app.unassignRP(id);
window.unassignServer = (id) => window.app.unassignServer(id);
window.resetApp = () => window.app.resetApp();
window.saveRPIps = (rpId, btn) => window.app.updateRPIps(rpId, Array.from(btn.closest('.modal').querySelectorAll('.ip-pill.selected')).map(el => el.dataset.ip)).then(() => btn.closest('.modal-overlay').remove());
