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
                { id: 'admin', name: 'Team Leader', email: 'admin@admin.com', password: 'admin', role: 'admin' },
                { id: '1', name: 'Moussa ADEMOU', email: 'moussa@test.com', password: 'password', role: 'mailer' },
                { id: '2', name: 'Jaefar LAAKEL HEMDANOU', email: 'jaefar@test.com', password: 'password', role: 'mailer' },
                { id: '3', name: 'Zaka LABRI LIKER', email: 'zaka@test.com', password: 'password', role: 'mailer' }
            ],
            servers: [],
            rps: []
        };
        this.init();
    }

    async addServer(serverData) {
        const ips = serverData.ips.split('\n').map(ip => ip.trim()).filter(ip => ip !== '');
        const mainIp = ips[0] || '0.0.0.0';
        const newServer = {
            id: 's' + Date.now(),
            name: serverData.name.trim(),
            ip: mainIp,
            allIps: ips,
            mailerId: null,
            status: 'stock'
        };
        this.state.servers.push(newServer);
        await this.saveState();
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

    async addMailer(mailerData) {
        const newMailer = {
            id: 'm' + Date.now(),
            name: mailerData.name.trim(),
            email: mailerData.email.trim().toLowerCase(),
            password: mailerData.password.trim(),
            role: 'mailer'
        };
        this.state.mailers.push(newMailer);
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
                        this.state = { ...this.state, ...cloudData, currentUser, dbConnected: true };
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
            document.body.innerHTML = `<div style="padding:40px; color:white; text-align:center;"><h2>Critical Error</h2><p>${err.message}</p></div>`;
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

    setView(viewName) { this.state.currentView = viewName; this.updateDashboard(); }
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
