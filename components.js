/**
 * Updated Rendering functions for the Team Management SPA
 */

export function renderLogin(app) {
    const container = document.getElementById('login-screen');
    container.innerHTML = `
        <div class="login-card">
            <div class="login-header">
                <i data-lucide="shield-check" style="width: 48px; height: 48px; color: var(--accent-primary); margin-bottom: 16px;"></i>
                <h1>Team Management</h1>
                <p>Sign in to your dashboard</p>
            </div>
            <form id="login-form">
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="email" placeholder="admin@team.com" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="password" placeholder="••••••••" required>
                </div>
                <button type="submit">Sign In</button>
            </form>
            <div style="margin-top: 24px; text-align: center; font-size: 0.8rem; color: var(--text-secondary);">
                <p>Demo Admin: admin@team.com / admin</p>
                <p>Demo Mailer: jaefar@team.com / pass</p>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        if (!app.login(email, password)) {
            alert('Invalid credentials');
        }
    });

    if (window.lucide) window.lucide.createIcons();
}

export function renderSidebar(app) {
    const sidebar = document.getElementById('sidebar');
    const { currentUser, currentView, mailers } = app.state;

    let mailerNavItems = mailers
        .filter(m => m.role === 'mailer')
        .map(m => `
            <div class="nav-item ${currentView === 'mailer-' + m.id ? 'active' : ''}" onclick="app.setView('mailer-${m.id}')">
                <i data-lucide="user"></i>
                <span>${m.name.split(' ')[0]}</span>
            </div>
        `).join('');

    sidebar.innerHTML = `
        <div class="sidebar-logo">
            <i data-lucide="send"></i>
            <span>EmailingPro</span>
        </div>
        
        <div class="nav-group">
            <div class="nav-label">Main</div>
            <div class="nav-item ${currentView === 'overview' ? 'active' : ''}" onclick="app.setView('overview')">
                <i data-lucide="layout-dashboard"></i>
                <span>All Dashboard</span>
            </div>
            ${currentUser.role === 'admin' ? `
            <div class="nav-item ${currentView === 'management' ? 'active' : ''}" onclick="app.setView('management')">
                <i data-lucide="settings"></i>
                <span>Management</span>
            </div>
            <div class="nav-item ${currentView === 'stock' ? 'active' : ''}" onclick="app.setView('stock')">
                <i data-lucide="archive"></i>
                <span>Stock Pool</span>
            </div>
            ` : ''}
        </div>

        <div class="nav-group">
            <div class="nav-label">Team Members</div>
            ${mailerNavItems}
        </div>

        <div style="margin-top: auto;">
            <div class="nav-item" onclick="app.logout()">
                <i data-lucide="log-out"></i>
                <span>Logout</span>
            </div>
        </div>
    `;
}

export function renderTopBar(app) {
    const topBar = document.getElementById('top-bar');
    const { currentUser, currentView } = app.state;
    
    let title = 'Dashboard';
    if (currentView === 'overview') title = 'All Mailers Overview';
    if (currentView === 'management') title = 'Resource Management';
    if (currentView === 'stock') title = 'Unassigned Stock';
    if (currentView.startsWith('mailer-')) {
        const mailerId = currentView.split('-')[1];
        const mailer = app.state.mailers.find(m => m.id === mailerId);
        title = `${mailer.name}'s Workspace`;
    }

    topBar.innerHTML = `
        <h2 style="font-size: 1.25rem; font-weight: 600;">${title}</h2>
        <div style="display: flex; align-items: center; gap: 12px;">
            ${currentUser.role === 'admin' ? `
                <button onclick="showAddRPModal()" style="width: auto; padding: 8px 16px; font-size: 0.8rem; background: var(--bg-tertiary); border: 1px solid var(--border-color);">+ RP</button>
                <button onclick="showAddServerModal()" style="width: auto; padding: 8px 16px; font-size: 0.8rem; background: var(--bg-tertiary); border: 1px solid var(--border-color);">+ Server</button>
            ` : ''}
            <div style="text-align: right; margin-left: 12px;">
                <div style="font-size: 0.875rem; font-weight: 600;">${currentUser.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">${currentUser.role.toUpperCase()}</div>
            </div>
            <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--accent-primary); display: flex; align-items: center; justify-content: center; font-weight: 700;">
                ${currentUser.name.charAt(0)}
            </div>
        </div>
    `;
}

export function renderView(app) {
    const container = document.getElementById('view-container');
    const { currentView } = app.state;

    if (currentView === 'overview') {
        renderOverview(app, container);
    } else if (currentView === 'management') {
        renderManagement(app, container);
    } else if (currentView === 'stock') {
        renderStock(app, container);
    } else if (currentView.startsWith('mailer-')) {
        const mailerId = currentView.split('-')[1];
        renderMailerView(app, container, mailerId);
    }
}

function renderOverview(app, container) {
    const { rps, servers, mailers } = app.state;
    const activeMailers = mailers.filter(m => m.role === 'mailer');
    
    container.innerHTML = `
        <div class="stats-grid">
            <div class="card stat-card">
                <div class="stat-icon" style="background: rgba(59, 130, 246, 0.1); color: var(--accent-primary);">
                    <i data-lucide="globe"></i>
                </div>
                <div class="stat-info">
                    <h3>Total RPs</h3>
                    <p>${rps.length}</p>
                </div>
            </div>
            <div class="card stat-card">
                <div class="stat-icon" style="background: rgba(168, 85, 247, 0.1); color: #a855f7;">
                    <i data-lucide="server"></i>
                </div>
                <div class="stat-info">
                    <h3>Total Servers</h3>
                    <p>${servers.length}</p>
                </div>
            </div>
            <div class="card stat-card">
                <div class="stat-icon" style="background: rgba(34, 197, 94, 0.1); color: #22c55e;">
                    <i data-lucide="users"></i>
                </div>
                <div class="stat-info">
                    <h3>Team Size</h3>
                    <p>${activeMailers.length}</p>
                </div>
            </div>
        </div>

        <div class="card">
            <h3 style="margin-bottom: 20px;">Team Overview</h3>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align: left; border-bottom: 1px solid var(--border-color); color: var(--text-secondary); font-size: 0.875rem;">
                            <th style="padding: 12px;">Mailer</th>
                            <th style="padding: 12px;">Assigned Servers</th>
                            <th style="padding: 12px;">Assigned RPs</th>
                            <th style="padding: 12px;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activeMailers.map(m => {
                            const mSrvs = servers.filter(s => s.mailerId === m.id);
                            const mRps = rps.filter(r => r.mailerId === m.id);
                            return `
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <td style="padding: 16px; font-weight: 500;">${m.name}</td>
                                    <td style="padding: 16px;">${mSrvs.length} servers</td>
                                    <td style="padding: 16px;">${mRps.length} RPs</td>
                                    <td style="padding: 16px;">
                                        <span class="badge" style="background: rgba(34, 197, 94, 0.1); color: #22c55e;">Active</span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderManagement(app, container) {
    const { rps, servers, mailers } = app.state;
    const activeMailers = mailers.filter(m => m.role === 'mailer');
    const stockRps = rps.filter(r => !r.serverId && !r.mailerId);
    const stockSrvs = servers.filter(s => !s.mailerId);

    container.innerHTML = `
        <div class="resource-manager">
            <div class="stock-pool">
                <div class="pool-header">
                    <span>Stock Pool</span>
                    <i data-lucide="database" style="width: 14px;"></i>
                </div>
                <div class="pool-content">
                    <div style="color: var(--text-secondary); font-size: 0.7rem; margin-bottom: 8px; text-transform: uppercase;">Unlinked RPs</div>
                    <div class="drop-zone" data-type="stock-rp" style="min-height: 50px;">
                        ${stockRps.map(rp => `
                            <div class="draggable-item" draggable="true" ondragstart="handleDragStart(event, 'rp', '${rp.id}')">
                                <span style="flex: 1;">${rp.domain}</span>
                                <span onclick="event.stopPropagation(); app.deleteRP('${rp.id}')" style="cursor: pointer; margin-right: 8px;">
                                    <i data-lucide="trash-2" style="width: 12px; color: var(--error);"></i>
                                </span>
                                <span class="badge badge-rp">RP</span>
                            </div>
                        `).join('')}
                    </div>

                    <div style="color: var(--text-secondary); font-size: 0.7rem; margin: 16px 0 8px; text-transform: uppercase;">Unassigned Servers</div>
                    <div class="drop-zone" data-type="stock-srv" style="min-height: 50px;">
                        ${stockSrvs.map(srv => `
                            <div class="draggable-item" draggable="true" ondragstart="handleDragStart(event, 'srv', '${srv.id}')">
                                <span style="flex: 1;">${srv.name}</span>
                                <span onclick="event.stopPropagation(); app.deleteServer('${srv.id}')" style="cursor: pointer; margin-right: 8px;">
                                    <i data-lucide="trash-2" style="width: 12px; color: var(--error);"></i>
                                </span>
                                <span class="badge badge-srv">SRV</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="mailer-grid">
                ${activeMailers.map(m => {
                    const mSrvs = servers.filter(s => s.mailerId === m.id);
                    // RPs assigned directly to mailer but not to a server (if any)
                    const mStandaloneRps = rps.filter(r => r.mailerId === m.id && !r.serverId);
                    
                    return `
                        <div class="mailer-card">
                            <div class="mailer-card-header">
                                <span style="font-weight: 600;">${m.name}</span>
                                <span style="font-size: 0.7rem; color: var(--text-secondary);">${mSrvs.length} Servers</span>
                            </div>
                            <div class="drop-zone" data-type="mailer" data-id="${m.id}" style="min-height: 100px;">
                                ${mSrvs.map(srv => {
                                    const srvRps = rps.filter(r => r.serverId === srv.id);
                                    return `
                                        <div class="server-container draggable-item" draggable="true" ondragstart="handleDragStart(event, 'srv', '${srv.id}')">
                                            <div class="server-header">
                                                <span style="flex: 1;">${srv.name} (${srv.ip})</span>
                                                <div style="display: flex; gap: 8px; align-items: center;">
                                                    <span onclick="event.stopPropagation(); app.unassignServer('${srv.id}')" style="cursor: pointer;" title="Return to Stock">
                                                        <i data-lucide="archive" style="width: 12px; color: var(--text-secondary);"></i>
                                                    </span>
                                                    <span onclick="event.stopPropagation(); app.deleteServer('${srv.id}')" style="cursor: pointer;" title="Delete Server">
                                                        <i data-lucide="trash-2" style="width: 12px; color: var(--error);"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <div class="rp-list drop-zone" data-type="server" data-id="${srv.id}" style="min-height: 30px;">
                                                ${srvRps.map(rp => `
                                                    <div class="rp-item draggable-item" draggable="true" ondragstart="handleDragStart(event, 'rp', '${rp.id}')">
                                                        <span style="flex: 1;">${rp.domain}</span>
                                                        <div style="display: flex; gap: 4px; align-items: center;">
                                                            <span style="font-size: 0.6rem; opacity: 0.7;">${rp.assignedIps.length} IPs</span>
                                                            <span onclick="event.stopPropagation(); showIPSelectionModal('${rp.id}')" style="cursor: pointer;">
                                                                <i data-lucide="edit-3" style="width: 10px;"></i>
                                                            </span>
                                                            <span onclick="event.stopPropagation(); app.unassignRP('${rp.id}')" style="cursor: pointer;" title="Return to Stock">
                                                                <i data-lucide="archive" style="width: 10px; color: var(--text-secondary);"></i>
                                                            </span>
                                                            <span onclick="event.stopPropagation(); app.deleteRP('${rp.id}')" style="cursor: pointer;" title="Delete RP">
                                                                <i data-lucide="trash-2" style="width: 10px; color: var(--error);"></i>
                                                            </span>
                                                        </div>
                                                    </div>
                                                `).join('')}
                                                ${srvRps.length === 0 ? '<div style="font-size: 0.65rem; color: var(--text-secondary); text-align: center;">Drop RP here</div>' : ''}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                                
                                ${mStandaloneRps.length > 0 ? `
                                    <div style="color: var(--text-secondary); font-size: 0.65rem; margin-top: 8px;">Standalone RPs:</div>
                                    ${mStandaloneRps.map(rp => `
                                        <div class="draggable-item" draggable="true" ondragstart="handleDragStart(event, 'rp', '${rp.id}')">
                                            <span style="flex: 1;">${rp.domain}</span>
                                            <span onclick="event.stopPropagation(); app.unassignRP('${rp.id}')" style="cursor: pointer;" title="Return to Stock">
                                                <i data-lucide="archive" style="width: 12px; color: var(--text-secondary);"></i>
                                            </span>
                                            <span onclick="event.stopPropagation(); app.deleteRP('${rp.id}')" style="cursor: pointer; margin-right: 8px;" title="Delete RP">
                                                <i data-lucide="trash-2" style="width: 12px; color: var(--error);"></i>
                                            </span>
                                            <span class="badge badge-rp">Unlinked</span>
                                        </div>
                                    `).join('')}
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    setupDragAndDrop(app);
    if (window.lucide) window.lucide.createIcons();
}

function renderStock(app, container) {
    const { rps, servers } = app.state;
    const stockRps = rps.filter(r => !r.mailerId);
    const stockSrvs = servers.filter(s => !s.mailerId);

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div class="card">
                <h3>Available Domains (RPs)</h3>
                <div style="margin-top: 20px;">
                    ${stockRps.map(rp => `
                        <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 8px;">
                            <span>${rp.domain}</span>
                            <span class="badge badge-rp">Available</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="card">
                <h3>Available Servers</h3>
                <div style="margin-top: 20px;">
                    ${stockSrvs.map(srv => `
                        <div style="padding: 12px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 8px;">
                            <div style="font-weight: 600;">${srv.name}</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">${srv.ip} • ${srv.ips.length} IPs</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderMailerView(app, container, mailerId) {
    const { rps, servers, mailers, currentUser } = app.state;
    const mailer = mailers.find(m => m.id === mailerId);
    const mSrvs = servers.filter(s => s.mailerId === mailerId);
    
    const isOwner = currentUser.id === mailerId || currentUser.role === 'admin';

    container.innerHTML = `
        <div class="stats-grid">
            <div class="card">
                <div style="font-size: 0.875rem; color: var(--text-secondary);">My Servers</div>
                <div style="font-size: 1.5rem; font-weight: 700;">${mSrvs.length}</div>
            </div>
            <div class="card">
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Total RPs</div>
                <div style="font-size: 1.5rem; font-weight: 700;">${rps.filter(r => r.mailerId === mailerId).length}</div>
            </div>
        </div>

        <div class="mailer-grid" style="grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));">
            ${mSrvs.map(srv => {
                const srvRps = rps.filter(r => r.serverId === srv.id);
                return `
                    <div class="card" style="padding: 0; overflow: hidden;">
                        <div style="padding: 16px; background: var(--bg-tertiary); display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 700; font-size: 1.1rem;">${srv.name}</div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary);">${srv.ip}</div>
                            </div>
                            <i data-lucide="server" style="color: var(--accent-primary);"></i>
                        </div>
                        <div style="padding: 16px;">
                            <h4 style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 12px;">Hosted RPs</h4>
                            ${srvRps.map(rp => `
                                <div style="padding: 12px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span style="font-weight: 600;">${rp.domain}</span>
                                        <span class="badge" style="background: rgba(35, 134, 54, 0.2); color: #3fb950;">${rp.status}</span>
                                    </div>
                                    <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px;">
                                        ${rp.assignedIps.length > 0 ? rp.assignedIps.map(ip => `
                                            <span style="font-size: 0.65rem; background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px;">${ip}</span>
                                        `).join('') : '<span style="font-size: 0.65rem; color: var(--error);">No IPs assigned</span>'}
                                    </div>
                                    ${isOwner ? `
                                        <div style="margin-top: 12px; text-align: right;">
                                            <button onclick="showIPSelectionModal('${rp.id}')" style="width: auto; padding: 4px 8px; font-size: 0.7rem;">Config IPs</button>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                            ${srvRps.length === 0 ? '<div style="text-align: center; color: var(--text-secondary); font-size: 0.8rem;">No RPs linked to this server</div>' : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    if (window.lucide) window.lucide.createIcons();
}

// Modals
window.showAddServerModal = () => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <h2 style="margin-bottom: 20px;">Add New Server</h2>
            <div class="form-group">
                <label>Server Name</label>
                <input type="text" id="srv-name" placeholder="SRV-NYC-01">
            </div>
            <div class="form-group">
                <label>IP Addresses (one per line)</label>
                <textarea id="srv-ips" rows="6" style="width: 100%; padding: 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); font-family: monospace;" placeholder="1.1.1.1&#10;2.2.2.2&#10;3.3.3.3"></textarea>
            </div>
            <div style="display: flex; gap: 12px;">
                <button onclick="this.closest('.modal-overlay').remove()" style="background: var(--bg-tertiary);">Cancel</button>
                <button onclick="submitServer(this)">Add Server</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.submitServer = (btn) => {
    const name = document.getElementById('srv-name').value;
    const ips = document.getElementById('srv-ips').value;
    if (name && ips) {
        window.app.addServer(name, ips);
        btn.closest('.modal-overlay').remove();
    }
};

window.showAddRPModal = () => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <h2 style="margin-bottom: 20px;">Add New RP (Domain)</h2>
            <div class="form-group">
                <label>Domain Name</label>
                <input type="text" id="rp-domain" placeholder="example.com">
            </div>
            <div style="display: flex; gap: 12px;">
                <button onclick="this.closest('.modal-overlay').remove()" style="background: var(--bg-tertiary);">Cancel</button>
                <button onclick="submitRP(this)">Add RP</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.submitRP = (btn) => {
    const domain = document.getElementById('rp-domain').value;
    if (domain) {
        window.app.addRP(domain);
        btn.closest('.modal-overlay').remove();
    }
};

window.showIPSelectionModal = (rpId) => {
    const rp = window.app.state.rps.find(r => r.id === rpId);
    if (!rp || !rp.serverId) {
        alert("Please link this RP to a server first.");
        return;
    }
    const srv = window.app.state.servers.find(s => s.id === rp.serverId);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <h2 style="margin-bottom: 8px;">Config IPs for ${rp.domain}</h2>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 20px;">Server: ${srv.name}</p>
            
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px;">
                ${srv.ips.map(ip => `
                    <div class="ip-pill ${rp.assignedIps.includes(ip) ? 'selected' : ''}" onclick="this.classList.toggle('selected')" data-ip="${ip}">
                        ${ip}
                    </div>
                `).join('')}
            </div>

            <div style="display: flex; gap: 12px;">
                <button onclick="this.closest('.modal-overlay').remove()" style="background: var(--bg-tertiary);">Cancel</button>
                <button onclick="saveRPIps('${rpId}', this)">Save Changes</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.saveRPIps = (rpId, btn) => {
    const selectedIps = Array.from(btn.closest('.modal').querySelectorAll('.ip-pill.selected')).map(el => el.dataset.ip);
    window.app.updateRPIps(rpId, selectedIps);
    btn.closest('.modal-overlay').remove();
};

// Drag & Drop Logic
function setupDragAndDrop(app) {
    const zones = document.querySelectorAll('.drop-zone');
    
    zones.forEach(zone => {
        zone.addEventListener('dragover', e => {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.add('over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('over');
        });

        zone.addEventListener('drop', e => {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.remove('over');
            
            const type = e.dataTransfer.getData('type');
            const id = e.dataTransfer.getData('id');
            const zoneType = zone.dataset.type;
            const zoneId = zone.dataset.id;
            
            if (zoneType === 'mailer') {
                if (type === 'srv') {
                    // Assign server to mailer
                    const srv = app.state.servers.find(s => s.id === id);
                    if (srv) {
                        srv.mailerId = zoneId;
                        // All RPs in this server also belong to this mailer
                        app.state.rps.forEach(r => {
                            if (r.serverId === srv.id) r.mailerId = zoneId;
                        });
                    }
                } else if (type === 'rp') {
                    // Assign RP to mailer (standalone)
                    const rp = app.state.rps.find(r => r.id === id);
                    if (rp) {
                        rp.mailerId = zoneId;
                        rp.serverId = null; // Remove from server if moved to mailer root
                        rp.assignedIps = [];
                    }
                }
            } else if (zoneType === 'server') {
                if (type === 'rp') {
                    // Assign RP to server
                    app.assignRPtoServer(id, zoneId);
                }
            } else if (zoneType === 'stock-rp' && type === 'rp') {
                const rp = app.state.rps.find(r => r.id === id);
                if (rp) {
                    rp.mailerId = null;
                    rp.serverId = null;
                    rp.assignedIps = [];
                }
            } else if (zoneType === 'stock-srv' && type === 'srv') {
                const srv = app.state.servers.find(s => s.id === id);
                if (srv) {
                    srv.mailerId = null;
                    // RPs remain in the server but lose mailerId
                    app.state.rps.forEach(r => {
                        if (r.serverId === srv.id) r.mailerId = null;
                    });
                }
            }
            
            app.saveState();
            app.updateDashboard();
        });
    });
}

window.handleDragStart = (e, type, id) => {
    e.dataTransfer.setData('type', type);
    e.dataTransfer.setData('id', id);
};
