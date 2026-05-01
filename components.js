/**
 * Rendering functions for the Team Management SPA
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
            <div style="text-align: right;">
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
            <h3 style="margin-bottom: 20px;">Live Warmup Activity</h3>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align: left; border-bottom: 1px solid var(--border-color); color: var(--text-secondary); font-size: 0.875rem;">
                            <th style="padding: 12px;">Mailer</th>
                            <th style="padding: 12px;">Assigned RPs</th>
                            <th style="padding: 12px;">Assigned Servers</th>
                            <th style="padding: 12px;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activeMailers.map(m => {
                            const mRps = rps.filter(r => r.mailerId === m.id);
                            const mSrvs = servers.filter(s => s.mailerId === m.id);
                            return `
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <td style="padding: 16px; font-weight: 500;">${m.name}</td>
                                    <td style="padding: 16px;">${mRps.length} domains</td>
                                    <td style="padding: 16px;">${mSrvs.length} servers</td>
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
    const stockRps = rps.filter(r => !r.mailerId);
    const stockSrvs = servers.filter(s => !s.mailerId);

    container.innerHTML = `
        <div class="resource-manager">
            <div class="stock-pool">
                <div class="pool-header">
                    <span>Unassigned Stock</span>
                    <span style="font-size: 0.8rem; opacity: 0.7;">${stockRps.length + stockSrvs.length} items</span>
                </div>
                <div class="pool-content drop-zone" id="pool-stock" data-mailer-id="null">
                    <div style="color: var(--text-secondary); font-size: 0.75rem; margin-bottom: 12px; text-transform: uppercase;">Domains (RPs)</div>
                    ${stockRps.map(rp => `
                        <div class="draggable-item" draggable="true" ondragstart="handleDragStart(event, 'rp', '${rp.id}')">
                            <div class="item-info">
                                <span class="item-domain">${rp.domain}</span>
                                <span class="item-meta">Domain Name</span>
                            </div>
                            <span class="badge badge-rp">RP</span>
                        </div>
                    `).join('')}
                    
                    <div style="color: var(--text-secondary); font-size: 0.75rem; margin: 20px 0 12px; text-transform: uppercase;">Servers</div>
                    ${stockSrvs.map(srv => `
                        <div class="draggable-item" draggable="true" ondragstart="handleDragStart(event, 'srv', '${srv.id}')">
                            <div class="item-info">
                                <span class="item-domain">${srv.name}</span>
                                <span class="item-meta">${srv.ip}</span>
                            </div>
                            <span class="badge badge-srv">SRV</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="mailer-grid">
                ${activeMailers.map(m => {
                    const mRps = rps.filter(r => r.mailerId === m.id);
                    const mSrvs = servers.filter(s => s.mailerId === m.id);
                    return `
                        <div class="mailer-card">
                            <div class="mailer-card-header">
                                <span style="font-weight: 600;">${m.name}</span>
                                <span style="font-size: 0.75rem; color: var(--text-secondary);">${mRps.length} RPs | ${mSrvs.length} Srvs</span>
                            </div>
                            <div class="drop-zone" id="pool-${m.id}" data-mailer-id="${m.id}">
                                ${mRps.map(rp => `
                                    <div class="draggable-item" draggable="true" ondragstart="handleDragStart(event, 'rp', '${rp.id}')">
                                        <div class="item-info">
                                            <span class="item-domain">${rp.domain}</span>
                                        </div>
                                        <span class="badge badge-rp">RP</span>
                                    </div>
                                `).join('')}
                                ${mSrvs.map(srv => `
                                    <div class="draggable-item" draggable="true" ondragstart="handleDragStart(event, 'srv', '${srv.id}')">
                                        <div class="item-info">
                                            <span class="item-domain">${srv.name}</span>
                                        </div>
                                        <span class="badge badge-srv">SRV</span>
                                    </div>
                                `).join('')}
                                ${mRps.length === 0 && mSrvs.length === 0 ? '<div style="text-align: center; color: var(--text-secondary); font-size: 0.8rem; margin-top: 20px;">Drag items here</div>' : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    setupDragAndDrop(app);
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
    const mRps = rps.filter(r => r.mailerId === mailerId);
    const mSrvs = servers.filter(s => s.mailerId === mailerId);
    
    const isOwner = currentUser.id === mailerId || currentUser.role === 'admin';

    container.innerHTML = `
        <div class="stats-grid">
            <div class="card">
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Active Domains</div>
                <div style="font-size: 1.5rem; font-weight: 700;">${mRps.length}</div>
            </div>
            <div class="card">
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Dedicated Servers</div>
                <div style="font-size: 1.5rem; font-weight: 700;">${mSrvs.length}</div>
            </div>
            <div class="card">
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Total IPs</div>
                <div style="font-size: 1.5rem; font-weight: 700;">${mSrvs.reduce((acc, s) => acc + s.ips.length, 0)}</div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>My Domains (RPs)</h3>
                    ${isOwner ? '<button style="width: auto; padding: 6px 12px; font-size: 0.8rem;">Add RP</button>' : ''}
                </div>
                ${mRps.map(rp => `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid var(--border-color);">
                        <div>
                            <div style="font-weight: 600;">${rp.domain}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">Status: ${rp.status}</div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <span class="badge" style="background: rgba(35, 134, 54, 0.2); color: #3fb950;">Warming</span>
                            ${isOwner ? '<i data-lucide="more-vertical" style="cursor: pointer; width: 16px;"></i>' : ''}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="card">
                <h3>My Servers</h3>
                <div style="margin-top: 20px;">
                    ${mSrvs.map(srv => `
                        <div style="padding: 16px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between;">
                                <div style="font-weight: 600;">${srv.name}</div>
                                <i data-lucide="server" style="width: 16px; color: var(--text-secondary);"></i>
                            </div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">${srv.ip}</div>
                            <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 4px;">
                                ${srv.ips.map(ip => `<span style="font-size: 0.65rem; background: var(--bg-secondary); padding: 2px 6px; border-radius: 4px;">${ip}</span>`).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    if (window.lucide) window.lucide.createIcons();
}

// Drag & Drop Logic
function setupDragAndDrop(app) {
    const zones = document.querySelectorAll('.drop-zone');
    
    zones.forEach(zone => {
        zone.addEventListener('dragover', e => {
            e.preventDefault();
            zone.classList.add('over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('over');
        });

        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('over');
            
            const type = e.dataTransfer.getData('type');
            const id = e.dataTransfer.getData('id');
            const mailerId = zone.dataset.mailerId === 'null' ? null : zone.dataset.mailerId;
            
            app.assignResource(type, id, mailerId);
        });
    });
}

window.handleDragStart = (e, type, id) => {
    e.dataTransfer.setData('type', type);
    e.dataTransfer.setData('id', id);
};
