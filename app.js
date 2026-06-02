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
            rpInventory: [],
            historyServers: [],
            statuses: {},
            spamhaus: {},
            spamhausProgress: { status: 'idle', current: 0, total: 0 },
            rpSpfProgress: { status: 'idle', current: 0, total: 0 },
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
        this.hasCheckedCancellations = false;
        this._isSaving = false;
        this.init();
    }

    async runMaintenanceEngine() {
        console.log("Running Maintenance Engine...");
        // 1. Run Alerts FIRST (so we notify before archiving/renewing)
        await this.checkUpcomingCancellations();
        // 2. Run Maintenance (Archive/Renew)
        await this.checkServerCancellations();
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
                                    `🖥 *Server:* \`${srv.name}\`\n` +
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
            else if (!existingServer.mainIp && ips[0]) existingServer.mainIp = ips[0];

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
                mainIp: serverData.mainIp || (ips[0] || ''),
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
            this.updateDashboard();
        }

        // Trigger automated RDNS check for the newly added/updated server's IPs
        if (ips.length > 0) {
            fetch('/api/check-vmta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ips })
            })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('API failed');
            })
            .then(async (data) => {
                if (data.results) {
                    this.state.vmtaResults = { ...this.state.vmtaResults, ...data.results };
                    await this.saveState();
                    this.updateDashboard();
                }
            })
            .catch(err => console.error('Automated RDNS Check failed:', err));
        }
    }

    async addRP(rpData) {
        const domains = rpData.domain.split('\n').map(d => d.trim()).filter(d => d !== '');
        const alerts = [];
        const added = [];

        domains.forEach(domain => {
            const cleanDomain = domain.toLowerCase();
            const existingRp = (this.state.rps || []).find(r => (r.domain || '').trim().toLowerCase() === cleanDomain);
            const existingInv = (this.state.rpInventory || []).find(item => (item.rpDomain || '').trim().toLowerCase() === cleanDomain);
            
            if (existingRp || existingInv) {
                let affectedServer = '';
                if (existingRp && existingRp.serverId) {
                    const srv = (this.state.servers || []).find(s => s.id === existingRp.serverId);
                    if (srv) affectedServer = srv.name;
                }
                if (!affectedServer && existingInv && existingInv.srv) {
                    affectedServer = existingInv.srv;
                }

                if (affectedServer) {
                    alerts.push(`• "${domain}" is already affected to Server: ${affectedServer}`);
                } else {
                    alerts.push(`• "${domain}" is already added (in stock)`);
                }
                return;
            }

            const newRP = {
                id: 'rp' + Math.random().toString(36).substr(2, 9),
                domain: domain,
                serverId: null,
                mailerId: null,
                status: 'stock',
                assignedIps: []
            };
            this.state.rps.push(newRP);
            added.push(domain);
        });

        if (alerts.length > 0) {
            alert(`Duplicate RP Notice:\n\n${alerts.join('\n')}`);
        }

        if (added.length > 0) {
            await this.saveState();
        }
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
        this.updateDashboard();
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
        const dropIps = ipString.split(/[\s,|]+/).filter(ip => ip.trim());
        const detected = [];
        if (this.state.servers) {
            this.state.servers.forEach(srv => {
                const srvIps = (srv.allIps || []);
                if (dropIps.some(ip => srvIps.includes(ip))) detected.push(srv.name);
            });
        }
        return detected.length > 0 ? detected.join(', ') : 'Unknown Server';
    }

    extractOfferId(offerStr) {
        if (!offerStr) return '';
        const cleanStr = offerStr.trim();
        // 1. Check for digits in parentheses at start, e.g. (9654)
        const parenMatch = cleanStr.match(/^\((\d+)\)/);
        if (parenMatch) return parenMatch[1];

        // 2. Check for starting digits followed by space, pipe, or other non-digit separator, e.g. 17008 | or 32953
        const prefixMatch = cleanStr.match(/^(\d+)\s*(?:\||\s|$)/);
        if (prefixMatch) return prefixMatch[1];

        // 3. Fallback: search for any sequence of 4-6 digits in the string
        const fallbackMatch = cleanStr.match(/\b(\d{4,6})\b/);
        if (fallbackMatch) return fallbackMatch[1];

        return '';
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
            offerId: this.extractOfferId(dropData.offer),
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

            const offer = updates.offer !== undefined ? updates.offer : current.offer;

            this.state.drops[index] = { 
                ...current, 
                ...updates,
                offerId: this.extractOfferId(offer),
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
            const rp = this.state.rps.find(r => r.id === rpId);
            if (rp) {
                const domain = (rp.domain || '').trim().toLowerCase();
                this.state.rpInventory = (this.state.rpInventory || []).filter(item => (item.rpDomain || '').trim().toLowerCase() !== domain);
            }
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

                        // Check if only rpSpfProgress changed — if so, update bar without full re-render
                        const oldSpfProgress = JSON.stringify(this.state.rpSpfProgress || {});
                        const newSpfProgress = JSON.stringify(cloudData.rpSpfProgress || {});
                        const spfProgressChanged = oldSpfProgress !== newSpfProgress;
                        
                        // Preserve local UI filters during Firebase sync
                        const rpFilterServer = this.state.rpFilterServer || ['all'];
                        const rpFilterSpfType = this.state.rpFilterSpfType || 'all';
                        const rpFilterRpType = this.state.rpFilterRpType || 'all';
                        const rpFilterSent = this.state.rpFilterSent || 'all';
                        const rpFilterSpfStatus = this.state.rpFilterSpfStatus || 'all';
                        const rpSearch = typeof this.state.rpSearch !== 'undefined' ? this.state.rpSearch : '';
                        const rpFilterServerDropdownOpen = !!this.state.rpFilterServerDropdownOpen;
                        
                        this.state = { 
                            ...this.state, 
                            ...cloudData, 
                            currentUser, 
                            currentView, 
                            dbConnected: true,
                            rpFilterServer,
                            rpFilterSpfType,
                            rpFilterRpType,
                            rpFilterSent,
                            rpFilterSpfStatus,
                            rpSearch,
                            rpFilterServerDropdownOpen
                        };
                        // SAFETY: Firebase may return null for these — always ensure safe defaults
                        if (!this.state.servers) this.state.servers = [];
                        if (!this.state.mailers) this.state.mailers = [];
                        if (!this.state.drops) this.state.drops = [];
                        if (!this.state.historyServers) this.state.historyServers = [];
                        if (!this.state.tools) this.state.tools = [];
                        if (!this.state.rps) this.state.rps = [];
                        if (!this.state.rpInventory) this.state.rpInventory = [];

                        if (!this.state.spamhausProgress) this.state.spamhausProgress = { status: 'idle', current: 0, total: 0 };
                        if (!this.state.rpSpfProgress) this.state.rpSpfProgress = { status: 'idle', current: 0, total: 0 };
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
                                if (m) {
                                    const cleanName = (m.name || '').trim();
                                    if (knownIds[cleanName] && (!m.mailer_id || m.mailer_id === 'N/A')) {
                                        m.mailer_id = knownIds[cleanName];
                                        patched = true;
                                    }
                                }
                            });
                        }
                        
                        // Also patch existing drops that show "N/A" or lack offerId
                        if (this.state.drops && Array.isArray(this.state.drops)) {
                            this.state.drops.forEach(d => {
                                if (d) {
                                    const cleanName = (d.mailerName || '').trim();
                                    if (knownIds[cleanName] && (!d.mailerId || d.mailerId === 'N/A')) {
                                        d.mailerId = knownIds[cleanName];
                                        patched = true;
                                    }
                                    if (typeof d.servers === 'undefined') {
                                        const matched = this.detectServers(d.ips);
                                        d.servers = (matched && matched.length > 0) ? matched : ['N/A'];
                                        patched = true;
                                    }
                                    if (d.offer && typeof d.offerId === 'undefined') {
                                        const oid = this.extractOfferId(d.offer);
                                        d.offerId = oid || 'N/A';
                                        patched = true;
                                    }
                                }
                            });
                        }
                        
                        const synced = this.syncRpsAndInventory();
                        if (patched || synced) {
                            console.log("Auto-patched or synced RPs. Saving back to Firebase (one-time)...");
                            // Use a debounce flag to prevent re-triggering on the subsequent .on('value') callback
                            if (!this._patchSaveScheduled) {
                                this._patchSaveScheduled = true;
                                setTimeout(async () => {
                                    await this.saveState();
                                    this._patchSaveScheduled = false;
                                }, 500);
                            }
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

                        // If SPF check is running and only progress changed, update the SPF progress bar
                        if (spfProgressChanged && cloudData.rpSpfProgress && cloudData.rpSpfProgress.status === 'running') {
                            const bar = document.querySelector('#rp-spf-progress-container .progress-bar');
                            const text = document.querySelector('#rp-spf-progress-text');
                            if (bar && cloudData.rpSpfProgress.total > 0) {
                                const pct = Math.round((cloudData.rpSpfProgress.current / cloudData.rpSpfProgress.total) * 100);
                                bar.style.width = pct + '%';
                                if (text) text.textContent = `${pct}% (${cloudData.rpSpfProgress.current}/${cloudData.rpSpfProgress.total})`;
                                return; // Skip full re-render
                            }
                        }
                        
                        this.updateDashboard();
                        if (!this.state.currentUser && !document.getElementById('login-form')) renderLogin(this);

                        if (!this.hasCheckedCancellations) {
                            this.hasCheckedCancellations = true;
                            this.runMaintenanceEngine();
                        }
                    } else {
                        console.log("Database is empty. Using defaults.");
                        this.checkAuth();
                    }
                }, (error) => {
                    console.error("Firebase Read Error:", error);
                    this.state.dbConnected = false;
                    this.loadLocalState();
                    if (!this.hasCheckedCancellations) {
                        this.hasCheckedCancellations = true;
                        this.runMaintenanceEngine();
                    }
                    this.checkAuth();
                });
            } else {
                console.warn("No Database Connection. Falling back to Local Storage.");
                this.state.dbConnected = false;
                this.loadLocalState();
                if (!this.hasCheckedCancellations) {
                    this.hasCheckedCancellations = true;
                    this.runMaintenanceEngine();
                }
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
        if (this._isSaving) {
            console.log("saveState: skipped (already saving)");
            return;
        }
        this._isSaving = true;
        try {
            this.syncRpsAndInventory();
            if (this.state.dbConnected) {
                const toSave = { ...this.state };
                delete toSave.currentUser;
                delete toSave.dbConnected;
                delete toSave.rpFilterServer;
                delete toSave.rpFilterSpfType;
                delete toSave.rpFilterRpType;
                delete toSave.rpFilterSent;
                delete toSave.rpFilterSpfStatus;
                delete toSave.rpSearch;
                delete toSave.rpFilterServerDropdownOpen;
                await window.db.ref('state').set(toSave);
            } else {
                const toSave = { ...this.state };
                delete toSave.rpFilterServer;
                delete toSave.rpFilterSpfType;
                delete toSave.rpFilterRpType;
                delete toSave.rpFilterSent;
                delete toSave.rpFilterSpfStatus;
                delete toSave.rpSearch;
                delete toSave.rpFilterServerDropdownOpen;
                localStorage.setItem('team_management_state', JSON.stringify(toSave));
                this.updateDashboard();
            }
        } finally {
            this._isSaving = false;
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
    autoResolveRPServer(rpDomain) {
        if (!rpDomain) return '';
        const clean = rpDomain.trim().toLowerCase();
        // 1. Search in active RPs state
        const foundRp = (this.state.rps || []).find(r => (r.domain || '').trim().toLowerCase() === clean);
        if (foundRp && foundRp.serverId) {
            const foundSrv = (this.state.servers || []).find(s => s.id === foundRp.serverId);
            if (foundSrv) return foundSrv.name;
        }
        // 2. Search in drops history
        const foundDrop = (this.state.drops || []).find(d => (d.returnPath || '').trim().toLowerCase() === clean);
        if (foundDrop && foundDrop.servers && foundDrop.servers !== '---') {
            return foundDrop.servers;
        }
        return '';
    }

    autoResolveRPAreadySent(rpDomain) {
        if (!rpDomain) return false;
        const clean = rpDomain.trim().toLowerCase();
        
        // 1. Direct match on returnPath in drops
        const directMatch = (this.state.drops || []).some(d => {
            const rp = (d.returnPath || '').trim().toLowerCase();
            return rp === clean || rp.includes(clean) || clean.includes(rp);
        });
        if (directMatch) return true;

        // 2. IP/Server-based match: Find if the RP is attached to a server, and that server (or its IPs) has sent a drop
        const rp = (this.state.rps || []).find(r => (r.domain || '').trim().toLowerCase() === clean);
        if (rp && rp.serverId) {
            const srv = (this.state.servers || []).find(s => s.id === rp.serverId);
            if (srv) {
                const srvIps = srv.allIps || [];
                const srvName = srv.name.toLowerCase();
                const serverSent = (this.state.drops || []).some(d => {
                    const dSrvs = (d.servers || '').toLowerCase();
                    if (dSrvs.includes(srvName)) return true;
                    
                    const dIps = (d.ips || '').split(/[\s,\n]+/).map(ip => ip.trim()).filter(Boolean);
                    return srvIps.some(ip => dIps.includes(ip));
                });
                if (serverSent) return true;
            }
        }
        return false;
    }

    syncRpsAndInventory() {
        if (!this.state.rps) this.state.rps = [];
        if (!this.state.rpInventory) this.state.rpInventory = [];

        let stateChanged = false;

        // 1. Ensure all RPs in state.rps exist in state.rpInventory
        this.state.rps.forEach(rp => {
            const domain = (rp.domain || '').trim().toLowerCase();
            if (!domain) return;
            const existsInInv = this.state.rpInventory.some(item => (item.rpDomain || '').trim().toLowerCase() === domain);
            if (!existsInInv) {
                let srvName = '';
                if (rp.serverId) {
                    const srv = (this.state.servers || []).find(s => s.id === rp.serverId);
                    if (srv) srvName = srv.name;
                }
                this.state.rpInventory.push({
                    id: 'rpi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    rpDomain: rp.domain,
                    domainIncluded: '',
                    subdomainIncluded: '',
                    srv: srvName,
                    spfType: 'Include',
                    rpType: 'intern',
                    alreadySent: false
                });
                stateChanged = true;
            }
        });

        // 2. Ensure all RPs in state.rpInventory exist in state.rps
        this.state.rpInventory.forEach(item => {
            const domain = (item.rpDomain || '').trim().toLowerCase();
            if (!domain) return;
            const existsInRps = this.state.rps.some(rp => (rp.domain || '').trim().toLowerCase() === domain);
            if (!existsInRps) {
                let serverId = null;
                let mailerId = null;
                if (item.srv) {
                    const srv = (this.state.servers || []).find(s => s.name === item.srv);
                    if (srv) {
                        serverId = srv.id;
                        mailerId = srv.mailerId;
                    }
                }
                this.state.rps.push({
                    id: 'rp' + Math.random().toString(36).substr(2, 9),
                    domain: item.rpDomain,
                    serverId: serverId,
                    mailerId: mailerId,
                    status: serverId ? 'active' : 'stock',
                    assignedIps: []
                });
                stateChanged = true;
            }
        });

        // 3. Keep server assignments in sync
        this.state.rps.forEach(rp => {
            const domain = (rp.domain || '').trim().toLowerCase();
            if (!domain) return;
            const invItem = this.state.rpInventory.find(item => (item.rpDomain || '').trim().toLowerCase() === domain);
            if (invItem) {
                let srvName = '';
                if (rp.serverId) {
                    const srv = (this.state.servers || []).find(s => s.id === rp.serverId);
                    if (srv) srvName = srv.name;
                }
                
                if ((invItem.srv || '') !== srvName) {
                    invItem.srv = srvName;
                    stateChanged = true;
                }
            }
        });

        return stateChanged;
    }

    getProcessedRPInventory() {
        const inventory = this.state.rpInventory || [];
        return inventory.map(item => {
            const resolvedSrv = item.srv || this.autoResolveRPServer(item.rpDomain) || '';
            const resolvedSent = item.alreadySent || this.autoResolveRPAreadySent(item.rpDomain) || false;
            return {
                ...item,
                srv: resolvedSrv,
                alreadySent: resolvedSent
            };
        });
    }

    async addRPInventoryItem(data) {
        if (!this.state.rpInventory) this.state.rpInventory = [];
        const domain = (data.rpDomain || '').trim();
        const cleanDomain = domain.toLowerCase();
        
        const existingRp = (this.state.rps || []).find(r => (r.domain || '').trim().toLowerCase() === cleanDomain);
        const existingInv = (this.state.rpInventory || []).find(item => (item.rpDomain || '').trim().toLowerCase() === cleanDomain);
        
        if (existingRp || existingInv) {
            let affectedServer = '';
            if (existingRp && existingRp.serverId) {
                const srv = (this.state.servers || []).find(s => s.id === existingRp.serverId);
                if (srv) affectedServer = srv.name;
            }
            if (!affectedServer && existingInv && existingInv.srv) {
                affectedServer = existingInv.srv;
            }

            if (affectedServer) {
                alert(`The RP "${domain}" is already added and affected to Server: ${affectedServer}`);
            } else {
                alert(`The RP "${domain}" is already added.`);
            }
            return;
        }

        const item = {
            id: 'rpi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            rpDomain: domain,
            domainIncluded: (data.domainIncluded || '').trim(),
            subdomainIncluded: (data.subdomainIncluded || '').trim(),
            srv: (data.srv || '').trim(),
            spfType: (data.spfType || 'Include').trim(),
            rpType: (data.rpType || 'intern').trim(),
            alreadySent: !!data.alreadySent
        };
        this.state.rpInventory.push(item);
        await this.saveState();
    }

    async deleteRPInventoryItem(id) {
        if (!this.state.rpInventory) return;
        const item = this.state.rpInventory.find(it => it.id === id);
        if (item) {
            const domain = (item.rpDomain || '').trim().toLowerCase();
            this.state.rps = (this.state.rps || []).filter(rp => (rp.domain || '').trim().toLowerCase() !== domain);
        }
        this.state.rpInventory = this.state.rpInventory.filter(item => item.id !== id);
        await this.saveState();
    }

    async updateRPInventoryItem(id, updates) {
        if (!this.state.rpInventory) return;
        const idx = this.state.rpInventory.findIndex(item => item.id === id);
        if (idx !== -1) {
            this.state.rpInventory[idx] = { ...this.state.rpInventory[idx], ...updates };
            await this.saveState();
        }
    }

    async bulkImportRPInventory(items) {
        if (!this.state.rpInventory) this.state.rpInventory = [];
        const alerts = [];
        let addedCount = 0;

        items.forEach(data => {
            const domain = (data.rpDomain || '').trim();
            const cleanDomain = domain.toLowerCase();
            
            const existingRp = (this.state.rps || []).find(r => (r.domain || '').trim().toLowerCase() === cleanDomain);
            const existingInv = (this.state.rpInventory || []).find(item => (item.rpDomain || '').trim().toLowerCase() === cleanDomain);
            
            if (existingRp || existingInv) {
                let affectedServer = '';
                if (existingRp && existingRp.serverId) {
                    const srv = (this.state.servers || []).find(s => s.id === existingRp.serverId);
                    if (srv) affectedServer = srv.name;
                }
                if (!affectedServer && existingInv && existingInv.srv) {
                    affectedServer = existingInv.srv;
                }

                if (affectedServer) {
                    alerts.push(`• "${domain}" (Affected to Server: ${affectedServer})`);
                } else {
                    alerts.push(`• "${domain}" (Already added / in stock)`);
                }
                return;
            }

            const item = {
                id: 'rpi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                rpDomain: domain,
                domainIncluded: (data.domainIncluded || '').trim(),
                subdomainIncluded: (data.subdomainIncluded || '').trim(),
                srv: (data.srv || '').trim(),
                spfType: (data.spfType || 'Include').trim(),
                rpType: (data.rpType || 'intern').trim(),
                alreadySent: !!data.alreadySent
            };
            this.state.rpInventory.push(item);
            addedCount++;
        });

        if (addedCount > 0) {
            await this.saveState();
        }

        if (alerts.length > 0) {
            alert(`Bulk Import Notice: Imported ${addedCount} RPs.\nSkipped the following duplicate RPs:\n\n${alerts.join('\n')}`);
        } else if (addedCount > 0) {
            alert(`Import complete! Successfully imported ${addedCount} RPs.`);
        }
    }

    async triggerRPSpfCheck() {
        if (this.state.currentUser.role !== 'admin') {
            alert('Only administrator can run the SPF check.');
            return;
        }

        this.state.rpSpfChecking = true;
        this.updateDashboard();

        try {
            const response = await fetch('/api/check-rp-spf');
            const data = await response.json();
            
            if (data && data.success) {
                if (data.results && this.state.rpInventory) {
                    data.results.forEach(res => {
                        const idx = this.state.rpInventory.findIndex(item => item.id === res.id);
                        if (idx !== -1) {
                            this.state.rpInventory[idx].spfStatus = res.spfStatus;
                            this.state.rpInventory[idx].spfStatusDetail = res.spfStatusDetail;
                            this.state.rpInventory[idx].spfCheckedAt = res.spfCheckedAt;
                        }
                    });
                }
                alert(`SPF check completed!\nTotal: ${data.summary.total} checked.\nOK: ${data.summary.ok}\nErrors: ${data.summary.error}`);
            } else {
                alert('SPF check failed: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('SPF Check Error:', err);
            alert('Failed to trigger SPF check: ' + err.message);
        } finally {
            this.state.rpSpfChecking = false;
            this.updateDashboard();
        }
    }

    async autoDetectSingleRP(rpId) {
        const item = (this.state.rpInventory || []).find(i => i.id === rpId);
        if (!item || !item.rpDomain) return null;
        try {
            const resp = await fetch('/api/extract-spf-info?domain=' + encodeURIComponent(item.rpDomain));
            const data = await resp.json();
            if (data && data.success && data.found) {
                item.domainIncluded = data.domainIncluded || '';
                item.subdomainIncluded = data.subdomainIncluded || '';
                if (data.server) item.srv = data.server;
                if (data.spfType) item.spfType = data.spfType;
                if (data.rpType) item.rpType = data.rpType;
                return data;
            }
            return data;
        } catch (e) {
            console.error('Auto-detect error for', item.rpDomain, e);
            return null;
        }
    }

    async bulkAutoDetectRPSpf() {
        const items = (this.state.rpInventory || []).filter(i =>
            i.rpDomain && (!i.domainIncluded || i.domainIncluded === '---' || i.domainIncluded === '')
        );
        if (items.length === 0) {
            alert('All RPs already have Domain Included filled.');
            return;
        }
        this.state.rpAutoDetecting = true;
        this.state.rpAutoDetectProgress = { current: 0, total: items.length };
        this.updateDashboard();

        let filled = 0;
        const batchSize = 5;
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            await Promise.all(batch.map(async (item) => {
                try {
                    const resp = await fetch('/api/extract-spf-info?domain=' + encodeURIComponent(item.rpDomain));
                    const data = await resp.json();
                    if (data && data.success && data.found) {
                        item.domainIncluded = data.domainIncluded || '';
                        item.subdomainIncluded = data.subdomainIncluded || '';
                        if (data.server) item.srv = data.server;
                        if (data.spfType) item.spfType = data.spfType;
                        if (data.rpType) item.rpType = data.rpType;
                        filled++;
                    }
                } catch (e) {
                    console.error('Bulk detect error:', item.rpDomain, e);
                }
            }));
            this.state.rpAutoDetectProgress.current = Math.min(i + batchSize, items.length);
            this.updateDashboard();
        }

        this.state.rpAutoDetecting = false;
        this.saveState();
        this.updateDashboard();
        alert(`Auto-detect complete!\n${filled} of ${items.length} RPs filled.`);
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
window.deleteRPInventoryItem = (id) => window.app.deleteRPInventoryItem(id);
window.updateRPInventoryItem = (id, updates) => window.app.updateRPInventoryItem(id, updates);
