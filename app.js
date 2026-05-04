import { renderLogin, renderSidebar, renderTopBar, renderView } from './components.js';

class TeamApp {
    constructor() {
        this.state = {
            currentUser: null,
            currentView: 'overview', // 'overview', 'management'
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

    addServer(serverData) {
        const ips = serverData.ips.split('\n').map(ip => ip.trim()).filter(ip => ip !== '');
        const mainIp = ips[0] || '0.0.0.0';
        
        const newServer = {
            id: 's' + Date.now(),
            name: serverData.name,
            ip: mainIp,
            allIps: ips,
            mailerId: null,
            status: 'stock'
        };
        this.state.servers.push(newServer);
        this.saveState();
        this.updateDashboard();
    }

    addRP(rpData) {
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
        this.saveState();
        this.updateDashboard();
    }

    updateRPIps(rpId, ips) {
        const rp = this.state.rps.find(r => r.id === rpId);
        if (rp) {
            rp.assignedIps = ips;
        }
        this.saveState();
        this.updateDashboard();
    }

    // Data Actions
    assignResource(type, resourceId, mailerId) {
        if (this.state.currentUser.role !== 'admin') return;

        if (type === 'rp') {
            const rp = this.state.rps.find(r => r.id === resourceId);
            if (rp) {
                rp.mailerId = mailerId;
                // If unassigning from mailer, also unassign from server
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
                // Cascade to RPs: if server moves to mailer/stock, its RPs follow
                this.state.rps.forEach(rp => {
                    if (rp.serverId === srv.id) {
                        rp.mailerId = mailerId;
                        // If server goes to stock, RPs go to stock (unlinked from server)
                        if (!mailerId) {
                            rp.serverId = null;
                            rp.assignedIps = [];
                            rp.status = 'stock';
                        }
                    }
                });
            }
        }
        this.saveState();
        this.updateDashboard();
    }

    assignRPtoServer(rpId, serverId) {
        const rp = this.state.rps.find(r => r.id === rpId);
        const srv = this.state.servers.find(s => s.id === serverId);
        if (rp) {
            rp.serverId = serverId;
            // RP inherits mailer from server
            rp.mailerId = srv ? srv.mailerId : null;
            if (!serverId) {
                rp.assignedIps = [];
                rp.status = 'stock';
            } else {
                rp.status = 'active';
            }
        }
        this.saveState();
        this.updateDashboard();
    }

    deleteServer(serverId) {
        // Move any RPs in this server back to stock
        this.state.rps.forEach(rp => {
            if (rp.serverId === serverId) {
                rp.serverId = null;
                rp.mailerId = null;
                rp.assignedIps = [];
                rp.status = 'stock';
            }
        });
        
        // Remove the server
        this.state.servers = this.state.servers.filter(s => s.id !== serverId);
        this.saveState();
        this.updateDashboard();
    }

    deleteRP(rpId) {
        this.state.rps = this.state.rps.filter(r => r.id !== rpId);
        this.saveState();
        this.updateDashboard();
    }

    unassignRP(rpId) {
        this.assignResource('rp', rpId, null);
    }

    unassignServer(serverId) {
        this.assignResource('srv', serverId, null);
    }

    init() {
        this.loadState();
        this.checkAuth();
        this.attachGlobalEvents();
    }

    loadState() {
        const savedState = localStorage.getItem('team_management_state');
        if (savedState) {
            const parsed = JSON.parse(savedState);
            this.state = { ...this.state, ...parsed };
        }
    }

    saveState() {
        localStorage.setItem('team_management_state', JSON.stringify(this.state));
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

    login(email, password) {
        const user = this.state.mailers.find(u => u.email === email && u.password === password);
        if (user) {
            this.state.currentUser = user;
            this.saveState();
            this.checkAuth();
            return true;
        }
        return false;
    }

    logout() {
        this.state.currentUser = null;
        this.state.currentView = 'overview';
        this.saveState();
        this.checkAuth();
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(`${screenName}-screen`).classList.remove('hidden');
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

    attachGlobalEvents() { }
}

// Initialize the app
window.app = new TeamApp();

// Global Helpers for click handlers
window.deleteRP = (id) => {
    if(confirm("Permanently delete this RP?")) window.app.deleteRP(id);
};
window.deleteServer = (id) => {
    if(confirm("Delete this server and move its RPs to stock?")) window.app.deleteServer(id);
};
window.unassignRP = (id) => window.app.unassignRP(id);
window.unassignServer = (id) => window.app.unassignServer(id);
window.showIPSelectionModal = (rpId) => {
    const rp = window.app.state.rps.find(r => r.id === rpId);
    if (!rp || !rp.serverId) return;
    const srv = window.app.state.servers.find(s => s.id === rp.serverId);
    if (!srv || !srv.allIps) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <h2 style="margin-bottom: 16px;">Assign IPs to ${rp.domain}</h2>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 16px;">Server: ${srv.name} (${srv.ip})</p>
            <div class="ip-selection-grid" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px;">
                ${srv.allIps.map(ip => `
                    <div class="ip-pill ${rp.assignedIps.includes(ip) ? 'selected' : ''}" 
                         data-ip="${ip}" 
                         onclick="this.classList.toggle('selected')">
                        ${ip}
                    </div>
                `).join('')}
            </div>
            <div style="display: flex; gap: 12px;">
                <button onclick="saveRPIps('${rpId}', this)" style="flex: 1;">Save Configuration</button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary);">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
};
