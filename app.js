import { renderLogin, renderSidebar, renderTopBar, renderView } from './components.js';

class TeamApp {
    constructor() {
        this.state = {
            currentUser: null,
            currentView: 'overview', // 'overview', 'management', 'team'
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

    addMailer(mailerData) {
        const newMailer = {
            id: 'm' + Date.now(),
            name: mailerData.name,
            email: mailerData.email,
            password: mailerData.password,
            role: 'mailer'
        };
        this.state.mailers.push(newMailer);
        this.saveState();
        this.updateDashboard();
    }

    deleteMailer(mailerId) {
        if (mailerId === 'admin') return; // Cannot delete admin
        
        this.showConfirm("Are you sure you want to remove this mailer? All their assigned servers and RPs will be moved back to stock.", () => {
            // Unassign all servers from this mailer
            this.state.servers.forEach(s => {
                if (s.mailerId === mailerId) s.mailerId = null;
            });
            // Unassign all RPs from this mailer
            this.state.rps.forEach(rp => {
                if (rp.mailerId === mailerId) {
                    rp.mailerId = null;
                    rp.serverId = null;
                    rp.assignedIps = [];
                    rp.status = 'stock';
                }
            });
            
            this.state.mailers = this.state.mailers.filter(m => m.id !== mailerId);
            this.saveState();
            this.updateDashboard();
        });
    }

    updateRPIps(rpId, ips) {
        const rp = this.state.rps.find(r => r.id === rpId);
        if (rp) {
            rp.assignedIps = ips;
        }
        this.saveState();
        this.updateDashboard();
    }

    assignResource(type, resourceId, mailerId) {
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
        this.saveState();
        this.updateDashboard();
    }

    assignRPtoServer(rpId, serverId) {
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
        this.saveState();
        this.updateDashboard();
    }

    deleteServer(serverId) {
        this.showConfirm("Are you sure you want to delete this server? All linked RPs will be moved back to stock.", () => {
            this.state.rps.forEach(rp => {
                if (rp.serverId === serverId) {
                    rp.serverId = null;
                    rp.mailerId = null;
                    rp.assignedIps = [];
                    rp.status = 'stock';
                }
            });
            this.state.servers = this.state.servers.filter(s => s.id !== serverId);
            this.saveState();
            this.updateDashboard();
        });
    }

    deleteRP(rpId) {
        this.showConfirm("Are you sure you want to permanently delete this RP?", () => {
            this.state.rps = this.state.rps.filter(r => r.id !== rpId);
            this.saveState();
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

        document.getElementById('confirm-yes').onclick = () => {
            onConfirm();
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

    init() {
        this.loadState();
        this.checkAuth();
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
}

// Initialize the app
window.app = new TeamApp();

// Global Helpers
window.deleteRP = (id) => window.app.deleteRP(id);
window.deleteServer = (id) => window.app.deleteServer(id);
window.deleteMailer = (id) => window.app.deleteMailer(id);
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
