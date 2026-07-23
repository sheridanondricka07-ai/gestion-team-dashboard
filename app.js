// Global scope - no imports needed as scripts load sequentially in index.html
// 1. Go to console.firebase.google.com
// 2. Create a project and add a Web App
// 3. Paste your config here:
const firebaseConfig = {
    apiKey: "AIzaSyAmlb9zRzuMKvKVv6lPnKFJo7l4utjCO_c",
    authDomain: "gestion-team-e.firebaseapp.com",
    databaseURL: "https://gestion-team-c-01-default-rtdb.firebaseio.com",
    projectId: "gestion-team-e",
    storageBucket: "gestion-team-e.firebasestorage.app",
    messagingSenderId: "581748244383",
    appId: "1:581748244383:web:59651051c0a234fb8347aa"
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
            vmtaResults: {},
            warmupData: {},
            autoUpgradeEnabled: true
        };
        this.expandedServers = new Set();
        this.statusRange = 7;
        this.statusSearch = '';
        this.selectedFilterDate = new Date().toISOString().split('T')[0];
        this.hasCheckedCancellations = false;
        this._isSaving = false;

        const savedUser = localStorage.getItem('logged_in_user');
        if (savedUser) {
            try {
                this.state.currentUser = JSON.parse(savedUser);
            } catch(e) {}
        }

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
            await this.saveNode('servers');
            await this.saveNode('historyServers');
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

        if (needsSave) await this.saveNode('servers');
    }

    async sendTelegramNotification(message) {
        const token = "8888454016:AAH04qHHycwZTnXoRFlvRBwQ2yEwPaYVdwQ";
        const chatId = "-1003735130681";
        const url = `https://api.telegram.org/bot${token}/sendMessage`;

        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    message_thread_id: 6,
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
            await this.saveNode('servers');
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
            await this.saveNode('servers');
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
                    await this.saveNode('vmtaResults');
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
            await this.saveNode('rps');
            await this.saveNode('rpInventory');
            this.updateDashboard();
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
        await this.saveNode('mailers');
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
            await this.saveNode('servers');
            await this.saveNode('rps');
            await this.saveNode('rpInventory');
            await this.saveNode('mailers');
            this.updateDashboard();
        });
    }

    async updateRPIps(rpId, ips) {
        const rp = this.state.rps.find(r => r.id === rpId);
        if (rp) rp.assignedIps = ips;
        await this.saveNode('rps');
        await this.saveNode('rpInventory');
        this.updateDashboard();
    }

    async updateMailer(id, updates) {
        const index = this.state.mailers.findIndex(m => m.id === id);
        if (index !== -1) {
            this.state.mailers[index] = { ...this.state.mailers[index], ...updates };
            await this.saveNode('mailers');
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
        await this.saveNode('drops');
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
            await this.saveNode('drops');
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
            await this.saveNode('drops');
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
        await this.saveNode('rps');
        await this.saveNode('rpInventory');
        await this.saveNode('servers');
        this.updateDashboard();
    }

    checkRpServerConflict(rpDomain, targetServerName, domainIncluded = null) {
        if (!targetServerName || targetServerName === '' || targetServerName === 'SENT') {
            return null; // No conflict if setting to None or SENT
        }
        
        const cleanRpDomain = (rpDomain || '').trim().toLowerCase();
        if (!cleanRpDomain) return null;

        // If domainIncluded is not provided, look it up in inventory
        let domInc = domainIncluded;
        if (!domInc) {
            const currentItem = (this.state.rpInventory || []).find(item => 
                (item.rpDomain || '').trim().toLowerCase() === cleanRpDomain
            );
            if (currentItem) domInc = currentItem.domainIncluded;
        }

        if (!domInc) return null;
        domInc = domInc.trim().toLowerCase();
        if (!domInc || domInc === '---') return null;

        // Find any other RP in inventory with the same domainIncluded
        const conflict = (this.state.rpInventory || []).find(item =>
            (item.rpDomain || '').trim().toLowerCase() !== cleanRpDomain &&
            item.domainIncluded &&
            item.domainIncluded.trim().toLowerCase() === domInc &&
            item.srv &&
            item.srv !== '' &&
            item.srv !== 'SENT' &&
            item.srv.trim().toLowerCase() !== targetServerName.trim().toLowerCase()
        );

        return conflict || null;
    }

    showConflictModal(rpDomain, targetServer, conflict) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '10000';
        overlay.innerHTML = `
            <div class="modal" style="max-width: 480px; text-align: center; padding: 32px;">
                <div style="background: rgba(239, 68, 68, 0.1); color: var(--error); width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i data-lucide="alert-triangle" style="width: 32px; height: 32px;"></i>
                </div>
                <h2 style="margin: 0 0 12px; color: var(--text-primary);">Domain Conflict Detected</h2>
                <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px;">
                    Cannot assign RP <b style="color: var(--text-primary);">${rpDomain}</b> to server <b style="color: var(--error);">${targetServer}</b>.
                    <br><br>
                    The included domain <b style="color: var(--accent-primary);">${conflict.domainIncluded}</b> is already used by RP 
                    <b style="color: var(--text-primary);">${conflict.rpDomain}</b> which is assigned to server 
                    <b style="color: var(--error);">${conflict.srv}</b>.
                </p>
                <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; margin-bottom: 24px; font-size: 0.85rem; color: var(--text-secondary); text-align: left;">
                    <b>⚠️ Why?</b> Two RPs sharing the same included domain should not be on different servers to avoid SPF conflicts.
                </div>
                <button onclick="this.closest('.modal-overlay').remove()" class="btn-primary" style="width: 100%;">Understood</button>
            </div>
        `;
        document.body.appendChild(overlay);
        if (window.lucide) window.lucide.createIcons();
    }

    async assignRPtoServer(rpId, serverId) {
        const rp = this.state.rps.find(r => r.id === rpId);
        const srv = this.state.servers.find(s => s.id === serverId);
        
        if (rp && srv) {
            const conflict = this.checkRpServerConflict(rp.domain, srv.name);
            if (conflict) {
                this.showConflictModal(rp.domain, srv.name, conflict);
                this.updateDashboard();
                return;
            }
        }

        if (rp) {
            rp.serverId = serverId;
            rp.mailerId = srv ? srv.mailerId : null;
            if (!serverId) { rp.assignedIps = []; rp.status = 'stock'; }
            else { rp.status = 'active'; }
        }
        await this.saveNode('rps');
        await this.saveNode('rpInventory');
        this.updateDashboard();
    }

    async deleteServer(serverId) {
        this.showConfirm("Delete server and return RPs to stock?", async () => {
            this.state.rps.forEach(rp => {
                if (rp.serverId === serverId) { rp.serverId = null; rp.mailerId = null; rp.assignedIps = []; rp.status = 'stock'; }
            });
            this.state.servers = this.state.servers.filter(s => s.id !== serverId);
            await this.saveNode('rps');
            await this.saveNode('rpInventory');
            await this.saveNode('servers');
            this.updateDashboard();
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
            await this.saveNode('rps');
            await this.saveNode('rpInventory');
            this.updateDashboard();
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

                // 1. Fetch initial state once
                window.db.ref('state').once('value', (snapshot) => {
                    console.log("Initial state data received from Firebase");
                    const cloudData = snapshot.val();
                    if (cloudData) {
                        this.mergeCloudData(cloudData);
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

                // 2. Set up real-time progress listeners (lightweight nodes)
                window.db.ref('state/spamhausProgress').on('value', (snapshot) => {
                    const progress = snapshot.val();
                    if (progress) {
                        this.state.spamhausProgress = progress;
                        if (progress.status === 'running') {
                            const bar = document.querySelector('#spamhaus-progress .progress-bar');
                            const text = document.querySelector('#spamhaus-progress-text');
                            const container = document.getElementById('spamhaus-progress');
                            if (bar && progress.total > 0) {
                                const pct = Math.round((progress.current / progress.total) * 100);
                                bar.style.width = pct + '%';
                                if (text) text.textContent = `${pct}% (${progress.current}/${progress.total})`;
                                if (container) container.classList.add('progress-active');
                            }
                        } else {
                            const container = document.getElementById('spamhaus-progress');
                            if (container) container.classList.remove('progress-active');
                            this.updateDashboard();
                        }
                    }
                });

                window.db.ref('state/rpSpfProgress').on('value', (snapshot) => {
                    const progress = snapshot.val();
                    if (progress) {
                        this.state.rpSpfProgress = progress;
                        if (progress.status === 'running') {
                            const bar = document.querySelector('#rp-spf-progress-container .progress-bar');
                            const text = document.querySelector('#rp-spf-progress-text');
                            if (bar && progress.total > 0) {
                                const pct = Math.round((progress.current / progress.total) * 100);
                                bar.style.width = pct + '%';
                                if (text) text.textContent = `${pct}% (${progress.current}/${progress.total})`;
                            }
                        } else {
                            this.updateDashboard();
                        }
                    }
                });

                window.db.ref('state/rpAutoDetectProgress').on('value', (snapshot) => {
                    const progress = snapshot.val();
                    if (progress) {
                        this.state.rpAutoDetectProgress = progress;
                        this.updateDashboard();
                    }
                });

                window.db.ref('state/autoUpgradeEnabled').on('value', (snapshot) => {
                    const enabled = snapshot.val();
                    if (enabled !== null) {
                        this.state.autoUpgradeEnabled = enabled;
                        const el = document.getElementById('auto-upgrade-toggle');
                        if (el) el.checked = enabled;
                    }
                });

                window.db.ref('state/activeSessions').on('value', (snapshot) => {
                    const activeSessions = snapshot.val();
                    this.state.activeSessions = activeSessions || {};
                    if (this.state.currentView === 'team') {
                        this.updateDashboard();
                    }
                });

                // 3. Periodic silent background sync every 60 minutes (conserves bandwidth)
                setInterval(() => {
                    if (this.state.dbConnected && !this.state.syncing && !document.hidden) {
                        console.log("Background periodic syncing...");
                        window.db.ref('state').once('value').then(snapshot => {
                            const cloudData = snapshot.val();
                            if (cloudData) {
                                this.mergeCloudData(cloudData);
                                this.state.lastSynced = new Date().toLocaleTimeString();
                                this.updateDashboard();
                            }
                        }).catch(err => console.error("Silent background sync failed:", err));
                    }
                }, 3600000); // 60 minutes

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

    mergeCloudData(cloudData) {
        if (!cloudData) return;
        let currentUser = this.state.currentUser;
        if (currentUser && cloudData.mailers) {
            const freshUser = cloudData.mailers.find(m => m && m.id === currentUser.id);
            if (freshUser) {
                currentUser = freshUser;
                localStorage.setItem('logged_in_user', JSON.stringify(freshUser));
            }
        }
        const currentView = this.state.currentView; // Preserve local view
        const warmupData = this.state.warmupData; // Preserve local warmupData
        const spamhausHistory = this.state.spamhausHistory; // Preserve local spamhausHistory
        
        // Preserve local UI filters during Firebase sync
        const rpFilterServer = this.state.rpFilterServer || ['all'];
        const rpFilterSpfType = this.state.rpFilterSpfType || 'all';
        const rpFilterRpType = this.state.rpFilterRpType || 'all';
        const rpFilterSent = this.state.rpFilterSent || 'all';
        const rpFilterSpfStatus = this.state.rpFilterSpfStatus || 'all';
        const rpSearch = typeof this.state.rpSearch !== 'undefined' ? this.state.rpSearch : '';
        const rpFilterServerDropdownOpen = !!this.state.rpFilterServerDropdownOpen;
        const searchQuery = typeof this.state.searchQuery !== 'undefined' ? this.state.searchQuery : '';
        
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
            rpFilterServerDropdownOpen,
            searchQuery,
            warmupData: warmupData || this.state.warmupData || {},
            spamhausHistory: spamhausHistory || this.state.spamhausHistory || null
        };
        // SAFETY: Firebase may return null for these — always ensure safe defaults
        if (!this.state.servers) this.state.servers = [];
        if (!this.state.mailers) this.state.mailers = [];
        if (!this.state.drops) this.state.drops = [];
        if (!this.state.historyServers) this.state.historyServers = [];
        if (!this.state.tools) this.state.tools = [];
        if (!this.state.rps) this.state.rps = [];
        if (!this.state.rpInventory) this.state.rpInventory = [];
        if (!this.state.warmupData) this.state.warmupData = {};

        if (!this.state.spamhausProgress) this.state.spamhausProgress = { status: 'idle', current: 0, total: 0 };
        if (!this.state.rpSpfProgress) this.state.rpSpfProgress = { status: 'idle', current: 0, total: 0 };
        if (!this.state.spamhaus) this.state.spamhaus = {};
        
        // Patch missing Mailer IDs for known team members
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
                    }
                    if (typeof d.servers === 'undefined') {
                        const matched = this.detectServers(d.ips);
                        d.servers = (matched && matched.length > 0) ? matched : ['N/A'];
                    }
                    if (d.offer && typeof d.offerId === 'undefined') {
                        const oid = this.extractOfferId(d.offer);
                        d.offerId = oid || 'N/A';
                    }
                }
            });
        }
        
        this.syncRpsAndInventory();
        this.updateDashboard();
        this.checkAuth();
    }

    async syncData() {
        if (!this.state.dbConnected) return;
        console.log("Manually syncing data from Firebase...");
        this.state.syncing = true;
        this.updateDashboard();
        try {
            const snapshot = await window.db.ref('state').once('value');
            const cloudData = snapshot.val();
            if (cloudData) {
                this.mergeCloudData(cloudData);
                this.state.lastSynced = new Date().toLocaleTimeString();
            }
        } catch (e) {
            console.error("Sync error:", e);
        } finally {
            this.state.syncing = false;
            this.updateDashboard();
        }
    }

    async saveNode(nodeName) {
        if (this.state.dbConnected) {
            try {
                this.syncRpsAndInventory();
                const val = this.state[nodeName];
                if (val !== undefined) {
                    await window.db.ref(`state/${nodeName}`).set(val);
                }
            } catch (e) {
                console.error(`Error saving node ${nodeName}:`, e);
            }
        } else {
            await this.saveState();
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
                delete toSave.warmupData;
                delete toSave.spamhausHistory;
                delete toSave.rpFilterServer;
                delete toSave.rpFilterSpfType;
                delete toSave.rpFilterRpType;
                delete toSave.rpFilterSent;
                delete toSave.rpFilterSpfStatus;
                delete toSave.rpSearch;
                delete toSave.rpFilterServerDropdownOpen;
                delete toSave.searchQuery;
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
                delete toSave.searchQuery;
                localStorage.setItem('team_management_state', JSON.stringify(toSave));
                this.updateDashboard();
            }
        } finally {
            this._isSaving = false;
        }
    }

    async setDropSort(key) {
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
        if (this.state.dbConnected) await this.saveNode('dropSort');
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
        if (!this.state.currentUser) { 
            const savedUser = localStorage.getItem('logged_in_user');
            if (savedUser) {
                try {
                    this.state.currentUser = JSON.parse(savedUser);
                } catch(e) {}
            }
        }

        if (!this.state.currentUser) { 
            this.showScreen('login'); 
            renderLogin(this); 
            if (this.sessionInterval) {
                clearInterval(this.sessionInterval);
                this.sessionInterval = null;
            }
        } else { 
            this.showScreen('dashboard'); 
            this.updateDashboard(); 
            this.startSessionHeartbeat();
        }
    }

    startSessionHeartbeat() {
        if (this.sessionInterval) clearInterval(this.sessionInterval);
        if (!this.state.dbConnected || !this.state.currentUser) return;

        let sessionId = localStorage.getItem('active_session_id');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            localStorage.setItem('active_session_id', sessionId);
        }

        const updateHeartbeat = () => {
            if (!this.state.currentUser) return;
            const ref = window.db.ref(`state/activeSessions/${this.state.currentUser.id}/${sessionId}`);
            ref.set({
                lastActive: Date.now(),
                device: navigator.userAgent.replace(/[\.#\$\[\]]/g, '')
            });
        };

        // Run immediately
        updateHeartbeat();

        // Repeat every 10 seconds
        this.sessionInterval = setInterval(updateHeartbeat, 10000);
    }

    login(email, password) {
        const cleanEmail = email.trim().toLowerCase();
        const cleanPass = password.trim();
        const user = this.state.mailers.find(u => u.email.trim().toLowerCase() === cleanEmail && u.password.trim() === cleanPass);
        if (user) {
            this.state.currentUser = user; 
            localStorage.setItem('logged_in_user', JSON.stringify(user));
            const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            localStorage.setItem('active_session_id', sessionId);
            
            if (this.state.dbConnected) {
                window.db.ref(`state/activeSessions/${user.id}/${sessionId}`).set({
                    lastActive: Date.now(),
                    device: navigator.userAgent.replace(/[\.#\$\[\]]/g, '')
                });
            }

            this.checkAuth(); 
            return true; 
        }
        return false;
    }

    logout() { 
        if (this.state.currentUser && this.state.dbConnected) {
            const sessionId = localStorage.getItem('active_session_id');
            if (sessionId) {
                window.db.ref(`state/activeSessions/${this.state.currentUser.id}/${sessionId}`).remove();
            }
        }
        localStorage.removeItem('logged_in_user');
        localStorage.removeItem('active_session_id');
        if (this.sessionInterval) {
            clearInterval(this.sessionInterval);
            this.sessionInterval = null;
        }
        this.state.currentUser = null; 
        this.state.currentView = 'overview'; 
        this.checkAuth(); 
    }
    
    toggleServerExpand(serverId) {
        if (this.expandedServers.has(serverId)) {
            this.expandedServers.delete(serverId);
        } else {
            this.expandedServers.add(serverId);
        }
        this.updateDashboard();
    }

    toggleHideUnlinkedRps() {
        this.hideUnlinkedRps = !this.hideUnlinkedRps;
        this.updateDashboard();
    }

    toggleHideUnassignedServers() {
        this.hideUnassignedServers = !this.hideUnassignedServers;
        this.updateDashboard();
    }

    async addTool(tool) {
        tool.id = 'tool_' + Date.now();
        this.state.tools.push(tool);
        await this.saveNode('tools');
    }

    async deleteTool(id) {
        this.state.tools = this.state.tools.filter(t => t.id !== id);
        await this.saveNode('tools');
    }

    async updateProfile(userData) {
        const userIndex = this.state.mailers.findIndex(m => m.id === this.state.currentUser.id);
        if (userIndex !== -1) {
            this.state.mailers[userIndex] = { ...this.state.mailers[userIndex], ...userData };
            this.state.currentUser = this.state.mailers[userIndex];
            await this.saveNode('mailers');
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

        // Save active form inputs before re-rendering view
        const container = document.getElementById('view-container');
        const savedValues = {};
        if (container) {
            const inputs = container.querySelectorAll('textarea, input[type="text"], input[type="password"], select');
            inputs.forEach(el => {
                if (el.id) {
                    savedValues[el.id] = el.value;
                }
            });
        }

        renderSidebar(this);
        renderTopBar(this);
        renderView(this);

        // Restore values
        if (container) {
            for (const id in savedValues) {
                const el = document.getElementById(id);
                if (el) {
                    el.value = savedValues[id];
                }
            }

            // Restore visual HTML iframe preview if output code exists
            const outputVal = savedValues['email-enhancer-output'];
            const frame = document.getElementById('email-enhancer-preview-iframe');
            if (frame && outputVal) {
                try {
                    const doc = frame.contentDocument || frame.contentWindow.document;
                    doc.open();
                    doc.write(outputVal);
                    doc.close();
                } catch(e) {}
            }
        }

        // If in AI enhancer, refresh key inputs
        if (this.state.currentView === 'ai-agent') {
            window.updateAiKeyFieldUI();
        }

        if (window.lucide) window.lucide.createIcons();
    }

    setView(viewName) { 
        this.state.currentView = viewName; 
        window._hasFetchedWarmupThisSession = false;
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
            if (this.state.dbConnected) {
                await window.db.ref(`state/statuses/${safeIp}/${date}`).set(status);
            } else {
                await this.saveState();
            }
        } catch(e) {
            console.error("Firebase save error:", e);
        }
    }

    async bulkUpdateIPStatuses(ips, status, date) {
        if (!this.state.statuses) this.state.statuses = {};
        const updates = {};
        ips.forEach(ip => {
            const trimmedIp = ip.trim();
            if (!trimmedIp) return;
            const safeIp = trimmedIp.replace(/\./g, '_');
            if (!this.state.statuses[safeIp]) this.state.statuses[safeIp] = {};
            this.state.statuses[safeIp][date] = status;
            updates[`statuses/${safeIp}/${date}`] = status;
        });
        
        try {
            if (this.state.dbConnected) {
                await window.db.ref('state').update(updates);
            } else {
                await this.saveState();
            }
        } catch(e) {
            console.error("Firebase save error:", e);
            throw e;
        }
    }

    async batchUpdateIPStatuses(updates, statusId) {
        if (!this.state.statuses) this.state.statuses = {};
        const dbUpdates = {};
        updates.forEach(({ ip, date }) => {
            const safeIp = ip.replace(/\./g, '_');
            if (!this.state.statuses[safeIp]) this.state.statuses[safeIp] = {};
            this.state.statuses[safeIp][date] = statusId;
            dbUpdates[`statuses/${safeIp}/${date}`] = statusId;
        });
        
        try {
            if (this.state.dbConnected) {
                await window.db.ref('state').update(dbUpdates);
            } else {
                await this.saveState();
            }
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

        // 0. Deduplicate RPs by domain
        if (this.state.rps.length > 0) {
            const seen = new Map();
            let duplicatesRemoved = false;
            
            this.state.rps.forEach(rp => {
                if (!rp || !rp.domain) return;
                const domain = rp.domain.trim().toLowerCase();
                if (seen.has(domain)) {
                    const existing = seen.get(domain);
                    if (!existing.serverId && rp.serverId) {
                        seen.set(domain, rp);
                    }
                    duplicatesRemoved = true;
                } else {
                    seen.set(domain, rp);
                }
            });
            
            if (duplicatesRemoved) {
                this.state.rps = Array.from(seen.values());
                console.log("Deduplicated RPs list in state (local only).");
            }
        }

        // 0b. Deduplicate rpInventory by domain
        if (this.state.rpInventory.length > 0) {
            const seen = new Map();
            let duplicatesRemoved = false;
            this.state.rpInventory.forEach(item => {
                if (!item || !item.rpDomain) return;
                const domain = item.rpDomain.trim().toLowerCase();
                if (seen.has(domain)) {
                    duplicatesRemoved = true;
                } else {
                    seen.set(domain, item);
                }
            });
            if (duplicatesRemoved) {
                this.state.rpInventory = Array.from(seen.values());
                console.log("Deduplicated rpInventory list in state (local only).");
            }
        }

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

        // 4. Auto-detect server mailer assignments from warmupData
        if (this.state.warmupData && Object.keys(this.state.warmupData).length > 0) {
            const serverToUser = {};
            const serverToTime = {};
            
            Object.values(this.state.warmupData).forEach(record => {
                if (record && record.server && record.user && record.timestamp) {
                    const srvName = record.server.trim();
                    const userName = record.user.trim().toLowerCase();
                    const ts = record.timestamp;
                    
                    if (!serverToTime[srvName] || ts > serverToTime[srvName]) {
                        serverToTime[srvName] = ts;
                        serverToUser[srvName] = userName;
                    }
                }
            });
            
            const userToMailerMap = {
                'h.nfissi': 'm1778074450399',  // Houssam Nfissi
                'h.ghazali': 'm_1780418291424', // Hiba Ghazzali
                'a.zegaf': 'm_1780417772662',    // Aya Zeggaf
                'i.mjotti': 'm_1780418364251',   // Imane Mjoti
                'reda': 'm_1781528343216',        // Reda
                'm.zaryouh': 'm_1781528343216',   // Reda (m.zaryouh)
                'i.boustani': 'm_1778003745570'  // Ismail BOUSTANI
            };
            
            this.state.servers.forEach(srv => {
                const detectedUser = serverToUser[srv.name];
                if (detectedUser && userToMailerMap[detectedUser]) {
                    const targetMailerId = userToMailerMap[detectedUser];
                    if (srv.mailerId !== targetMailerId) {
                        console.log(`Auto-assigning server ${srv.name} to mailer ID ${targetMailerId} (User: ${detectedUser})`);
                        srv.mailerId = targetMailerId;
                        stateChanged = true;
                    }
                }
            });
        }

        // 5. Keep RPs mailerId in sync with their server's mailerId
        this.state.rps.forEach(rp => {
            if (rp.serverId) {
                const srv = (this.state.servers || []).find(s => s.id === rp.serverId);
                if (srv && rp.mailerId !== srv.mailerId) {
                    rp.mailerId = srv.mailerId;
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

        if (data.srv && data.domainIncluded) {
            const conflict = this.checkRpServerConflict(domain, data.srv, data.domainIncluded);
            if (conflict) {
                this.showConflictModal(domain, data.srv, conflict);
                return;
            }
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
        await this.saveNode('rps');
        await this.saveNode('rpInventory');
        this.updateDashboard();
    }

    async deleteRPInventoryItem(id) {
        if (!this.state.rpInventory) return;
        const item = this.state.rpInventory.find(it => it.id === id);
        if (item) {
            const domain = (item.rpDomain || '').trim().toLowerCase();
            this.state.rps = (this.state.rps || []).filter(rp => (rp.domain || '').trim().toLowerCase() !== domain);
        }
        this.state.rpInventory = this.state.rpInventory.filter(item => item.id !== id);
        await this.saveNode('rps');
        await this.saveNode('rpInventory');
        this.updateDashboard();
    }

    async updateRPInventoryItem(id, updates) {
        if (!this.state.rpInventory) return;
        const idx = this.state.rpInventory.findIndex(item => item.id === id);
        if (idx !== -1) {
            this.state.rpInventory[idx] = { ...this.state.rpInventory[idx], ...updates };
            await this.saveNode('rps');
            await this.saveNode('rpInventory');
            this.updateDashboard();
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

            if (data.srv && data.domainIncluded) {
                const conflict = this.checkRpServerConflict(domain, data.srv, data.domainIncluded);
                if (conflict) {
                    alerts.push(`• "${domain}" (Conflict: domain included "${data.domainIncluded}" is already used on server "${conflict.srv}")`);
                    return;
                }
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
            await this.saveNode('rps');
            await this.saveNode('rpInventory');
            this.updateDashboard();
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
        await this.saveNode('rps');
        await this.saveNode('rpInventory');
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

window.toggleAutoUpgrade = async (checked) => {
    window.app.state.autoUpgradeEnabled = checked;
    if (window.db) {
        try {
            await window.db.ref('state/autoUpgradeEnabled').set(checked);
        } catch (e) {
            console.error("Failed to save autoUpgradeEnabled to Firebase:", e);
        }
    }
    window.app.updateDashboard();
};
