import { renderLogin, renderSidebar, renderTopBar, renderView } from './components.js';

class TeamApp {
    constructor() {
        this.state = {
            currentUser: null,
            currentView: 'overview',
            mailers: [
                { id: '1', name: 'Jaefar LAAKEL HEMDANOU', role: 'mailer', email: 'jaefar@team.com', password: 'pass' },
                { id: '2', name: 'Ayoub SABER', role: 'mailer', email: 'ayoub.s@team.com', password: 'pass' },
                { id: '3', name: 'Inssaf EL HAOUASS', role: 'mailer', email: 'inssaf@team.com', password: 'pass' },
                { id: '4', name: 'Ayoub GHAILAN', role: 'mailer', email: 'ayoub.g@team.com', password: 'pass' },
                { id: '5', name: 'Salma EL KARTIT', role: 'mailer', email: 'salma@team.com', password: 'pass' },
                { id: 'admin', name: 'Team Leader', role: 'admin', email: 'admin@team.com', password: 'admin' }
            ],
            rps: [
                { id: 'rp1', domain: 'marketing-pro.com', mailerId: '1', serverId: 'srv1', assignedIps: ['1.1.1.1'], status: 'active' },
                { id: 'rp2', domain: 'service-outreach.net', mailerId: '1', serverId: 'srv1', assignedIps: ['1.1.1.2'], status: 'active' },
                { id: 'rp3', domain: 'business-leads.io', mailerId: '2', serverId: 'srv2', assignedIps: ['2.2.2.1'], status: 'warming' },
                { id: 'rp4', domain: 'global-connect.com', mailerId: null, serverId: null, assignedIps: [], status: 'stock' },
                { id: 'rp5', domain: 'prime-sender.org', mailerId: null, serverId: null, assignedIps: [], status: 'stock' },
                { id: 'rp6', domain: 'elite-mail.com', mailerId: '3', serverId: null, assignedIps: [], status: 'active' },
            ],
            servers: [
                { id: 'srv1', name: 'SRV-NYC-01', ip: '192.168.1.10', ips: ['1.1.1.1', '1.1.1.2', '1.1.1.3'], mailerId: '1' },
                { id: 'srv2', name: 'SRV-LDN-05', ip: '10.0.0.45', ips: ['2.2.2.1', '2.2.2.2'], mailerId: '2' },
                { id: 'srv3', name: 'SRV-FRA-02', ip: '172.16.0.12', ips: ['3.3.3.1'], mailerId: null },
            ]
        };

        this.init();
    }

    addServer(name, ips) {
        const ipList = ips.split('\n').map(i => i.trim()).filter(i => i !== '');
        const newServer = {
            id: 'srv' + Date.now(),
            name,
            ip: ipList[0] || 'No IP',
            ips: ipList,
            mailerId: null
        };
        this.state.servers.push(newServer);
        this.saveState();
        this.updateDashboard();
    }

    addRP(domain) {
        const newRP = {
            id: 'rp' + Date.now(),
            domain,
            mailerId: null,
            serverId: null,
            assignedIps: [],
            status: 'stock'
        };
        this.state.rps.push(newRP);
        this.saveState();
        this.updateDashboard();
    }

    assignRPtoServer(rpId, serverId) {
        const rp = this.state.rps.find(r => r.id === rpId);
        const srv = this.state.servers.find(s => s.id === serverId);
        if (rp) {
            rp.serverId = serverId;
            rp.mailerId = srv ? srv.mailerId : null;
            if (!srv) rp.assignedIps = [];
        }
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

    deleteServer(serverId) {
        if (!confirm("Are you sure you want to delete this server? All linked RPs will be moved back to the stock pool.")) return;
        
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
        // Initialize Lucide icons after rendering
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    setView(viewName) {
        this.state.currentView = viewName;
        this.updateDashboard();
    }

    // Data Actions
    assignResource(type, resourceId, mailerId) {
        if (this.state.currentUser.role !== 'admin') return;

        if (type === 'rp') {
            const rp = this.state.rps.find(r => r.id === resourceId);
            if (rp) {
                rp.mailerId = mailerId;
                rp.status = mailerId ? 'active' : 'stock';
            }
        } else if (type === 'srv') {
            const srv = this.state.servers.find(s => s.id === resourceId);
            if (srv) {
                srv.mailerId = mailerId;
                // Cascade: when server goes to stock, all its RPs go to stock too
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

    deleteRP(rpId) {
        if (!confirm("Are you sure you want to permanently delete this RP?")) return;
        
        this.state.rps = this.state.rps.filter(r => r.id !== rpId);
        this.saveState();
        this.updateDashboard();
    }

    unassignRP(rpId) {
        const rp = this.state.rps.find(r => r.id === rpId);
        if (rp) {
            rp.mailerId = null;
            rp.serverId = null;
            rp.assignedIps = [];
            rp.status = 'stock';
        }
        this.saveState();
        this.updateDashboard();
    }

    unassignServer(serverId) {
        const srv = this.state.servers.find(s => s.id === serverId);
        if (srv) {
            srv.mailerId = null;
            // Move all RPs in this server back to stock
            this.state.rps.forEach(rp => {
                if (rp.serverId === srv.id) {
                    rp.mailerId = null;
                    rp.serverId = null;
                    rp.assignedIps = [];
                    rp.status = 'stock';
                }
            });
        }
        this.saveState();
        this.updateDashboard();
    }

    attachGlobalEvents() {
        // Handle drag and drop global events if needed
    }
}

// Initialize the app
window.app = new TeamApp();

// Global Helpers for click handlers
window.deleteRP = (id) => window.app.deleteRP(id);
window.deleteServer = (id) => window.app.deleteServer(id);
window.unassignRP = (id) => window.app.unassignRP(id);
window.unassignServer = (id) => window.app.unassignServer(id);
