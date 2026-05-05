import { renderLogin, renderSidebar, renderTopBar, renderView } from './components.js';

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
            servers: [
                { id: 's1', name: 'SRV-NYC-01', ip: '192.168.1.1', mailerId: '1', status: 'active' },
                { id: 's2', name: 'SRV-LON-05', ip: '10.0.0.45', mailerId: '2', status: 'active' }
            ],
            rps: [
                { id: 'rp1', domain: 'elite-mail.com', serverId: 's2', mailerId: '2', status: 'active', assignedIps: [] },
                { id: 'rp2', domain: 'vercel-test.com', serverId: 's2', mailerId: '2', status: 'active', assignedIps: [] },
                { id: 'rp3', domain: 'service-outreach.net', serverId: null, mailerId: null, status: 'stock', assignedIps: [] }
            ]
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
        this.updateDashboard();
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
        this.updateDashboard();
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
        this.updateDashboard();
    }

    async deleteMailer(mailerId) {
        if (mailerId === 'admin') return;
        
        this.showConfirm("Are you sure you want to remove this mailer? All their assigned servers and RPs will be moved back to stock.", async () => {
            this.state.servers.forEach(s => {
                if (s.mailerId === mailerId) s.mailerId = null;
            });
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
            this.updateDashboard();
        });
    }

    async updateRPIps(rpId, ips) {
        const rp = this.state.rps.find(r => r.id === rpId);
        if (rp) {
            rp.assignedIps = ips;
        }
        await this.saveState();
        this.updateDashboard();
    }

    async assignResource(type, resourceId, mailerId) {
        if (this.state.currentUser.role !== 'admin') return;

        if (type === 'rp') {
            const rp = this.state.rps.find(r => r.id === resourceId);
            if (rp) {
                rp.mailerId = mailerId;
                if (!mailerId) {
                    rp.serverId = null;
                    rp.assignedIps = [];
                    rp.status = 'stock';
                } else {
                    rp.status = 'active';
                }
            }
        } else if (type === 'srv') {
            const srv = this.state.servers.find(s => s.id === resourceId);
            if (srv) {
                srv.mailerId = mailerId;
                this.state.rps.forEach(rp => {
                    if (rp.serverId === srv.id) {
                        rp.mailerId = mailerId;
                        if (!mailerId) {
                            rp.serverId = null;
                            rp.assignedIps = [];
                            rp.status = 'stock';
                        }
                    }
                });
            }
        }
        await this.saveState();
        this.updateDashboard();
    }

    async assignRPtoServer(rpId, serverId) {
        const rp = this.state.rps.find(r => r.id === rpId);
        const srv = this.state.servers.find(s => s.id === serverId);
        if (rp) {
            rp.serverId = serverId;
            rp.mailerId = srv ? srv.mailerId : null;
            if (!serverId) {
                rp.assignedIps = [];
                rp.status = 'stock';
            } else {
                rp.status = 'active';
            }
        }
        await this.saveState();
        this.updateDashboard();
    }

    async deleteServer(serverId) {
        this.showConfirm("Are you sure you want to delete this server? All linked RPs will be moved back to stock.", async () => {
            this.state.rps.forEach(rp => {
                if (rp.serverId === serverId) {
                    rp.serverId = null;
                    rp.mailerId = null;
                    rp.assignedIps = [];
                    rp.status = 'stock';
                }
            });
            this.state.servers = this.state.servers.filter(s => s.id !== serverId);
            await this.saveState();
            this.updateDashboard();
        });
    }

    async deleteRP(rpId) {
        this.showConfirm("Are you sure you want to permanently delete this RP?", async () => {
            this.state.rps = this.state.rps.filter(r => r.id !== rpId);
            await this.saveState();
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

        document.getElementById('confirm-yes').onclick = async () => {
            await onConfirm();
            overlay.remove();
        };
        document.getElementById('confirm-no').onclick = () => overlay.remove();
    }

    unassignRP(rpId) {
        this.assignResource('rp', rpId, null);
    }

    unassignServer(serverId) {
        this.assignResource('srv', serverId, null);
    }

    async init() {
        await this.loadState();
        this.checkAuth();
        setInterval(() => this.loadState(true), 15000); // Poll every 15s
    }

    async loadState(isBackground = false) {
        try {
            const response = await fetch('/api/state');
            if (response.ok) {
                const cloudState = await response.json();
                this.state.dbConnected = true;
                if (cloudState && cloudState.mailers) {
                    const currentUser = this.state.currentUser;
                    this.state = { ...this.state, ...cloudState, currentUser, dbConnected: true };
                    if (isBackground && this.state.currentUser) this.updateDashboard();
                }
            } else {
                this.state.dbConnected = false;
            }
        } catch (e) {
            this.state.dbConnected = false;
        }
        if (!this.state.currentUser) renderLogin(this);
    }

    async saveState() {
        try {
            const stateToSave = { ...this.state };
            delete stateToSave.currentUser;
            delete stateToSave.dbConnected;

            const res = await fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stateToSave)
            });
            this.state.dbConnected = res.ok;
        } catch (e) {
            this.state.dbConnected = false;
        }
    }

    async resetApp() {
        if(confirm("This will clear the SHARED database. Are you sure?")) {
            this.state = {
                currentUser: this.state.currentUser,
                currentView: 'overview',
                mailers: [{ id: 'admin', name: 'Team Leader', email: 'admin@admin.com', password: 'admin', role: 'admin' }],
                servers: [],
                rps: []
            };
            await this.saveState();
            window.location.reload();
        }
    }

    checkAuth() {
        if (!this.state.currentUser) {
            this.showScreen('login');
            renderLogin(this);
        } else {
            this.showScreen('dashboard');
            this.updateDashboard();
        }
    }

    async login(email, password) {
        const cleanEmail = email.trim().toLowerCase();
        const cleanPass = password.trim();
        
        await this.loadState(true);
        
        const user = this.state.mailers.find(u => 
            u.email.trim().toLowerCase() === cleanEmail && 
            u.password.trim() === cleanPass
        );
        
        if (user) {
            this.state.currentUser = user;
            this.checkAuth();
            return true;
        }
        return false;
    }

    logout() {
        this.state.currentUser = null;
        this.state.currentView = 'overview';
        this.checkAuth();
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        const screen = document.getElementById(`${screenName}-screen`);
        if (screen) screen.classList.remove('hidden');
    }

    updateDashboard() {
        renderSidebar(this);
        renderTopBar(this);
        renderView(this);
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    setView(viewName) {
        this.state.currentView = viewName;
        this.updateDashboard();
    }
}

window.app = new TeamApp();

// Helpers
window.deleteRP = (id) => window.app.deleteRP(id);
window.deleteServer = (id) => window.app.deleteServer(id);
window.deleteMailer = (id) => window.app.deleteMailer(id);
window.unassignRP = (id) => window.app.unassignRP(id);
window.unassignServer = (id) => window.app.unassignServer(id);
window.resetApp = () => window.app.resetApp();
window.saveRPIps = (rpId, btn) => window.app.updateRPIps(rpId, Array.from(btn.closest('.modal').querySelectorAll('.ip-pill.selected')).map(el => el.dataset.ip)).then(() => btn.closest('.modal-overlay').remove());
