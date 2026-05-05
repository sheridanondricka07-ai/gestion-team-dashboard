function renderLogin(app) {
    const container = document.getElementById('login-screen');
    container.innerHTML = `
        <div class="login-card">
            <div class="login-header">
                <h1>Emailing Pro</h1>
                <p>Management Dashboard</p>
            </div>
            <form id="login-form">
                <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 20px; font-size: 0.75rem; color: ${app.state.dbConnected ? 'var(--accent-primary)' : 'var(--error)'};">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${app.state.dbConnected ? 'var(--accent-primary)' : 'var(--error)'}; box-shadow: 0 0 10px ${app.state.dbConnected ? 'var(--accent-primary)' : 'var(--error)'};"></span>
                    ${app.state.dbConnected ? 'Firebase Live Sync Active' : 'Firebase Offline (Local Mode)'}
                </div>
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="login-email" placeholder="admin@admin.com" required autocomplete="email">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="login-password" placeholder="••••••••" required autocomplete="current-password">
                </div>
                <button type="submit" id="login-btn">Sign In</button>
            </form>
            <div style="margin-top: 24px; text-align: center;">
                <a href="#" onclick="event.preventDefault(); resetApp();" style="color: var(--text-secondary); font-size: 0.75rem; text-decoration: none; opacity: 0.6;">System Reset</a>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = document.getElementById('login-btn');
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();
        
        btn.innerText = 'Verifying...';
        btn.disabled = true;

        // Small timeout to allow UI update and prevent double submission
        setTimeout(() => {
            if (!app.login(email, password)) {
                alert('Invalid credentials. Please check your email and password.');
                btn.innerText = 'Sign In';
                btn.disabled = false;
            }
        }, 300);
    });
}

function renderSidebar(app) {
    const container = document.getElementById('sidebar');
    const view = app.state.currentView;
    const role = app.state.currentUser.role;

    container.innerHTML = `
        <div class="sidebar-logo">
            <i data-lucide="shield-check"></i>
            <span>TeamDash</span>
        </div>
        <div class="nav-group">
            <div class="nav-label">Main</div>
            <div class="nav-item ${view === 'overview' ? 'active' : ''}" onclick="app.setView('overview')">
                <i data-lucide="layout-dashboard"></i>
                <span>Overview</span>
            </div>
            ${role === 'admin' ? `
                <div class="nav-item ${view === 'management' ? 'active' : ''}" onclick="app.setView('management')">
                    <i data-lucide="settings"></i>
                    <span>Management</span>
                </div>
                <div class="nav-item ${view === 'team' ? 'active' : ''}" onclick="app.setView('team')">
                    <i data-lucide="users"></i>
                    <span>Team</span>
                </div>
            ` : ''}
            <div class="nav-item ${view === 'tools' ? 'active' : ''}" onclick="app.setView('tools')">
                <i data-lucide="wrench"></i>
                <span>Tools</span>
            </div>
        </div>
        <div style="margin-top: auto;">
            <div class="nav-item" onclick="app.logout()">
                <i data-lucide="log-out"></i>
                <span>Logout</span>
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

function renderTopBar(app) {
    const container = document.getElementById('top-bar');
    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: var(--spacing-md);">
            <h2 style="font-size: 1.1rem; font-weight: 600;">${app.state.currentView.charAt(0).toUpperCase() + app.state.currentView.slice(1)}</h2>
        </div>
        <div style="display: flex; align-items: center; gap: var(--spacing-md);">
            ${app.state.currentUser.role === 'admin' && app.state.currentView === 'management' ? `
                <button onclick="showAddServerModal()" style="padding: 6px 12px; font-size: 0.8rem; width: auto; background: var(--bg-tertiary); border: 1px solid var(--border-color);">+ Server</button>
                <button onclick="showAddRPModal()" style="padding: 6px 12px; font-size: 0.8rem; width: auto;">+ RP</button>
            ` : ''}
            ${app.state.currentUser.role === 'admin' && app.state.currentView === 'team' ? `
                <button onclick="showAddMailerModal()" style="padding: 6px 12px; font-size: 0.8rem; width: auto;">+ Mailer</button>
            ` : ''}
            ${app.state.currentUser.role === 'admin' && app.state.currentView === 'tools' ? `
                <button onclick="showAddToolModal()" style="padding: 6px 12px; font-size: 0.8rem; width: auto;">+ Tool</button>
            ` : ''}
            <div style="text-align: right;">
                <div style="font-size: 0.85rem; font-weight: 600;">${app.state.currentUser.name}</div>
                <div style="font-size: 0.7rem; color: var(--text-secondary);">${app.state.currentUser.role.toUpperCase()}</div>
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

function renderView(app) {
    const container = document.getElementById('view-container');
    const view = app.state.currentView;

    if (view === 'overview') {
        renderOverview(app, container);
    } else if (view === 'management') {
        renderManagement(app, container);
    } else if (view === 'team') {
        renderTeamManagement(app, container);
    } else if (view === 'tools') {
        renderTools(app, container);
    }
}

function renderTools(app, container) {
    const { tools } = app.state;
    const role = app.state.currentUser.role;

    container.innerHTML = `
        <div style="padding: 24px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
                ${(tools || []).map(tool => `
                    <div class="card" style="padding: 20px; position: relative; display: flex; flex-direction: column; gap: 12px; transition: transform 0.2s; cursor: default;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="width: 42px; height: 42px; border-radius: 10px; background: rgba(59,130,246,0.1); display: flex; align-items: center; justify-content: center; color: var(--accent-primary);">
                                <i data-lucide="external-link" style="width: 20px;"></i>
                            </div>
                            ${role === 'admin' ? `
                                <button onclick="deleteTool('${tool.id}')" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px;">
                                    <i data-lucide="trash-2" style="width: 14px;"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div>
                            <h3 style="font-size: 1rem; margin-bottom: 4px;">${tool.name}</h3>
                            <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">${tool.description || 'No description provided'}</p>
                        </div>
                        <a href="${tool.url}" target="_blank" style="margin-top: 8px; background: var(--accent-primary); color: white; text-decoration: none; padding: 8px; border-radius: 6px; text-align: center; font-size: 0.85rem; font-weight: 500;">Open Tool</a>
                    </div>
                `).join('')}
                ${(!tools || tools.length === 0) ? `
                    <div style="grid-column: 1/-1; text-align: center; padding: 60px; background: var(--bg-secondary); border-radius: 12px; border: 1px dashed var(--border-color);">
                        <i data-lucide="wrench" style="width: 48px; height: 48px; color: var(--text-secondary); margin-bottom: 16px; opacity: 0.3;"></i>
                        <h3 style="color: var(--text-secondary);">No tools added yet</h3>
                        ${role === 'admin' ? '<p style="color: var(--text-secondary); font-size: 0.9rem;">Click the "+ Tool" button to add your first web tool.</p>' : ''}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

function renderOverview(app, container) {
    const { rps, servers, currentUser } = app.state;
    
    // Filter by mailer if not admin
    const myServers = currentUser.role === 'admin' ? servers : servers.filter(s => s.mailerId === currentUser.id);
    const myRps = currentUser.role === 'admin' ? rps : rps.filter(r => r.mailerId === currentUser.id);

    container.innerHTML = `
        <div class="stats-grid">
            <div class="card stat-card">
                <div class="stat-icon" style="background: rgba(59, 130, 246, 0.1); color: var(--accent-primary);">
                    <i data-lucide="server"></i>
                </div>
                <div class="stat-info">
                    <h3>Total Servers</h3>
                    <p>${myServers.length}</p>
                </div>
            </div>
            <div class="card stat-card">
                <div class="stat-icon" style="background: rgba(168, 85, 247, 0.1); color: #a855f7;">
                    <i data-lucide="globe"></i>
                </div>
                <div class="stat-info">
                    <h3>Active RPs</h3>
                    <p>${myRps.filter(r => r.status === 'active').length}</p>
                </div>
            </div>
            <div class="card stat-card">
                <div class="stat-icon" style="background: rgba(34, 197, 94, 0.1); color: #22c55e;">
                    <i data-lucide="check-circle"></i>
                </div>
                <div class="stat-info">
                    <h3>Stock RPs</h3>
                    <p>${rps.filter(r => r.status === 'stock').length}</p>
                </div>
            </div>
        </div>

        <div class="card">
            <h3 style="margin-bottom: 16px;">My Infrastructure</h3>
            <div class="infrastructure-list">
                ${myServers.map(srv => {
                    const srvRps = rps.filter(r => r.serverId === srv.id);
                    const isCollapsed = app.collapsedServers.has(srv.id);
                    return `
                        <div class="server-container" style="background: var(--bg-secondary); margin-bottom: 12px; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;">
                            <div class="server-header" onclick="app.toggleServerCollapse('${srv.id}')" style="padding: 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03);">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <i data-lucide="chevron-${isCollapsed ? 'right' : 'down'}" style="width: 16px; color: var(--text-secondary);"></i>
                                    <span style="font-weight: 600;">${srv.name} (${srv.ip})</span>
                                </div>
                                <span class="badge badge-srv">${srvRps.length} RPs</span>
                            </div>
                            <div class="rp-list" style="padding: 12px; display: ${isCollapsed ? 'none' : 'grid'}; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">
                                ${srvRps.map(rp => `
                                    <div class="rp-item" style="background: var(--bg-tertiary); margin-bottom: 0;">
                                        <div style="flex: 1;">
                                            <div style="font-weight: 500;">${rp.domain}</div>
                                            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
                                                ${(rp.assignedIps || []).map(ip => `
                                                    <span style="font-size: 0.6rem; background: var(--bg-primary); padding: 1px 4px; border-radius: 4px; color: var(--accent-primary); border: 1px solid var(--accent-primary);">${ip}</span>
                                                `).join('')}
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                                ${srvRps.length === 0 ? '<span style="color: var(--text-secondary); font-size: 0.8rem;">No RPs assigned</span>' : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
                ${myServers.length === 0 ? '<div style="text-align: center; color: var(--text-secondary); padding: 40px;">No servers assigned yet.</div>' : ''}
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

function renderManagement(app, container) {
    const { rps, servers, mailers } = app.state;
    const activeMailers = mailers.filter(m => m.role === 'mailer');
    const query = (app.state.searchQuery || '').toLowerCase();
    
    const stockRps = rps.filter(r => !r.serverId && !r.mailerId && r.domain.toLowerCase().includes(query));
    const stockSrvs = servers.filter(s => !s.mailerId && (s.name.toLowerCase().includes(query) || s.ip.includes(query)));

    container.innerHTML = `
        <div class="resource-manager">
            <div class="stock-pool">
                <div class="pool-header">
                    <span>Stock Pool</span>
                    <i data-lucide="database" style="width: 14px;"></i>
                </div>
                <div style="padding: 12px; border-bottom: 1px solid var(--border-color);">
                    <div style="position: relative;">
                        <i data-lucide="search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 14px; color: var(--text-secondary);"></i>
                        <input type="text" id="pool-search" placeholder="Search domains/IPs..." value="${app.state.searchQuery || ''}" 
                               style="width: 100%; padding: 8px 12px 8px 32px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.8rem; color: white;">
                    </div>
                </div>
                <div class="pool-content">
                    <div style="color: var(--text-secondary); font-size: 0.7rem; margin-bottom: 8px; text-transform: uppercase;">Unlinked RPs</div>
                    <div class="drop-zone" data-type="stock-rp" style="min-height: 80px; border: 1px dashed var(--border-color); border-radius: 8px; margin-bottom: 12px;">
                        ${stockRps.map(rp => `
                            <div class="draggable-item" draggable="true" ondragstart="handleDragStart(event, 'rp', '${rp.id}')">
                                <span style="flex: 1; font-weight: 500;">${rp.domain}</span>
                                <span class="action-icon delete" onclick="event.stopPropagation(); deleteRP('${rp.id}')" title="Delete RP">
                                    <i data-lucide="trash-2" style="width: 14px; color: var(--error);"></i>
                                </span>
                                <span class="badge badge-rp" style="margin-left: 8px;">RP</span>
                            </div>
                        `).join('')}
                    </div>

                    <div style="color: var(--text-secondary); font-size: 0.7rem; margin: 16px 0 8px; text-transform: uppercase;">Unassigned Servers</div>
                    <div class="drop-zone" data-type="stock-srv" style="min-height: 80px; border: 1px dashed var(--border-color); border-radius: 8px;">
                        ${stockSrvs.map(srv => `
                            <div class="draggable-item" draggable="true" ondragstart="handleDragStart(event, 'srv', '${srv.id}')">
                                <span style="flex: 1; font-weight: 500;">${srv.name}</span>
                                <span class="action-icon delete" onclick="event.stopPropagation(); deleteServer('${srv.id}')" title="Delete Server">
                                    <i data-lucide="trash-2" style="width: 14px; color: var(--error);"></i>
                                </span>
                                <span class="badge badge-srv" style="margin-left: 8px;">SRV</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="mailer-grid">
                ${activeMailers.map(m => {
                    const mSrvs = servers.filter(s => s.mailerId === m.id);
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
                                    const isCollapsed = app.collapsedServers.has(srv.id);
                                    return `
                                        <div class="server-container draggable-item" draggable="true" ondragstart="handleDragStart(event, 'srv', '${srv.id}')" style="display: block; padding: 0; margin-bottom: 8px; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;">
                                            <div class="server-header" onclick="app.toggleServerCollapse('${srv.id}')" style="cursor: pointer; background: rgba(255,255,255,0.03);">
                                                <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                                                    <i data-lucide="chevron-${isCollapsed ? 'right' : 'down'}" style="width: 14px; color: var(--text-secondary);"></i>
                                                    <span style="font-weight: 600; font-size: 0.85rem;">${srv.name} (${srv.ip})</span>
                                                </div>
                                                <div style="display: flex; gap: 4px; align-items: center;" onclick="event.stopPropagation()">
                                                    <span class="action-icon" onclick="unassignServer('${srv.id}')" title="Return to Stock">
                                                        <i data-lucide="archive" style="width: 14px; color: var(--text-secondary);"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <div class="rp-list drop-zone" data-type="server" data-id="${srv.id}" style="min-height: 30px; display: ${isCollapsed ? 'none' : 'block'};">
                                                ${srvRps.map(rp => `
                                                    <div class="rp-item draggable-item" draggable="true" ondragstart="handleDragStart(event, 'rp', '${rp.id}')">
                                                        <div style="flex: 1;">
                                                            <div style="font-weight: 500;">${rp.domain}</div>
                                                            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
                                                                ${(rp.assignedIps || []).map(ip => `
                                                                    <span style="font-size: 0.6rem; background: var(--bg-primary); padding: 1px 4px; border-radius: 4px; color: var(--accent-primary); border: 1px solid var(--accent-primary);">${ip}</span>
                                                                `).join('')}
                                                                ${(!rp.assignedIps || rp.assignedIps.length === 0) ? '<span style="font-size: 0.6rem; color: var(--text-secondary);">No IPs assigned</span>' : ''}
                                                            </div>
                                                        </div>
                                                        <div style="display: flex; gap: 4px; align-items: center;">
                                                            <span class="action-icon" onclick="event.stopPropagation(); showIPSelectionModal('${rp.id}')" title="Config IPs">
                                                                <i data-lucide="edit-3" style="width: 12px;"></i>
                                                            </span>
                                                            <span class="action-icon" onclick="event.stopPropagation(); unassignRP('${rp.id}')" title="Return to Stock">
                                                                <i data-lucide="archive" style="width: 12px; color: var(--text-secondary);"></i>
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
                                            <span style="flex: 1; font-weight: 500;">${rp.domain}</span>
                                            <span class="action-icon" onclick="event.stopPropagation(); unassignRP('${rp.id}')" title="Return to Stock">
                                                <i data-lucide="archive" style="width: 14px; color: var(--text-secondary);"></i>
                                            </span>
                                            <span class="badge badge-rp" style="margin-left: 8px;">Unlinked</span>
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
    
    const searchInput = document.getElementById('pool-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            app.state.searchQuery = e.target.value;
            // No saveState needed for search query as it's local UI state
            renderManagement(app, container);
        });
        searchInput.focus();
        // Set cursor to end
        const val = searchInput.value;
        searchInput.value = '';
        searchInput.value = val;
    }

    if (window.lucide) window.lucide.createIcons();
}

function renderTeamManagement(app, container) {
    const { mailers, servers, rps } = app.state;
    const teamMembers = mailers.filter(m => m.role === 'mailer');

    container.innerHTML = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 style="font-size: 1.25rem;">Team Management</h3>
                <span style="color: var(--text-secondary); font-size: 0.85rem;">${teamMembers.length} Mailers Active</span>
            </div>
            
            <div class="team-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
                ${teamMembers.map(member => {
                    const memberSrvs = servers.filter(s => s.mailerId === member.id);
                    const memberRps = rps.filter(r => r.mailerId === member.id);
                    return `
                        <div class="card" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); position: relative;">
                            <div style="position: absolute; top: 12px; right: 12px;">
                                <span class="action-icon delete" onclick="deleteMailer('${member.id}')" title="Remove Mailer">
                                    <i data-lucide="user-x" style="width: 16px; color: var(--error);"></i>
                                </span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                                <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--accent-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem;">
                                    ${member.name.charAt(0)}
                                </div>
                                <div>
                                    <div style="font-weight: 600;">${member.name}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${member.email}</div>
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <div style="background: var(--bg-secondary); padding: 8px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase;">Servers</div>
                                    <div style="font-weight: 700; font-size: 1.1rem;">${memberSrvs.length}</div>
                                </div>
                                <div style="background: var(--bg-secondary); padding: 8px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase;">RPs</div>
                                    <div style="font-weight: 700; font-size: 1.1rem;">${memberRps.length}</div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
                ${teamMembers.length === 0 ? '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No team members found.</div>' : ''}
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

window.showAddMailerModal = () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <h2 style="margin-bottom: 16px;">Add New Mailer</h2>
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="m-name" placeholder="John Doe" autocomplete="off">
            </div>
            <div class="form-group">
                <label>Email Address</label>
                <input type="email" id="m-email" placeholder="john@example.com" autocomplete="off">
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="text" id="m-pass" placeholder="Password" autocomplete="off">
            </div>
            <p style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 16px;">Note: Password is visible during creation for accuracy.</p>
            <div style="display: flex; gap: 12px;">
                <button onclick="saveMailer(this)" style="flex: 1;">Create Account</button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary);">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
};

window.saveMailer = async (btn) => {
    const name = document.getElementById('m-name').value;
    const email = document.getElementById('m-email').value;
    const password = document.getElementById('m-pass').value;
    if (name && email && password) {
        btn.innerText = 'Creating...';
        btn.disabled = true;
        await window.app.addMailer({ name, email, password });
        btn.closest('.modal-overlay').remove();
    }
};

window.showAddServerModal = () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <h2 style="margin-bottom: 16px;">Add New Server</h2>
            <div class="form-group">
                <label>Server Name</label>
                <input type="text" id="srv-name" placeholder="SRV-NYC-01">
            </div>
            <div class="form-group">
                <label>IP Addresses (One per line)</label>
                <textarea id="srv-ips" placeholder="192.168.1.1\n192.168.1.2" style="width:100%; height:100px; background:var(--bg-tertiary); border:1px solid var(--border-color); color:white; border-radius:8px; padding:12px; font-family:monospace;"></textarea>
            </div>
            <div style="display: flex; gap: 12px;">
                <button onclick="saveServer(this)" style="flex: 1;">Create Server</button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary);">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
};

window.saveServer = async (btn) => {
    const name = document.getElementById('srv-name').value;
    const ips = document.getElementById('srv-ips').value;
    if (name && ips) {
        btn.innerText = 'Saving...';
        btn.disabled = true;
        await window.app.addServer({ name, ips });
        btn.closest('.modal-overlay').remove();
    }
};

window.showAddRPModal = () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <h2 style="margin-bottom: 16px;">Add New RPs</h2>
            <div class="form-group">
                <label>Domains (One per line)</label>
                <textarea id="rp-domains" placeholder="domain1.com\ndomain2.com" style="width:100%; height:150px; background:var(--bg-tertiary); border:1px solid var(--border-color); color:white; border-radius:8px; padding:12px; font-family:monospace;"></textarea>
            </div>
            <div style="display: flex; gap: 12px;">
                <button onclick="saveRP(this)" style="flex: 1;">Add Domains</button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary);">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
};

window.saveRP = async (btn) => {
    const domain = document.getElementById('rp-domains').value;
    if (domain) {
        btn.innerText = 'Adding...';
        btn.disabled = true;
        await window.app.addRP({ domain });
        btn.closest('.modal-overlay').remove();
    }
};

window.saveRPIps = (rpId, btn) => {
    const selectedIps = Array.from(btn.closest('.modal').querySelectorAll('.ip-pill.selected')).map(el => el.dataset.ip);
    window.app.updateRPIps(rpId, selectedIps);
    btn.closest('.modal-overlay').remove();
};

window.showIPSelectionModal = (rpId) => {
    const rp = window.app.state.rps.find(r => r.id === rpId);
    const srv = window.app.state.servers.find(s => s.id === rp.serverId);
    if (!srv) {
        alert("This RP is not linked to a server. Assign it to a server first!");
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal" style="max-width: 500px;">
            <h2 style="margin-bottom: 8px;">Configure IP Assignments</h2>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 20px;">Select IPs from ${srv.name} to assign to ${rp.domain}</p>
            
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px;">
                ${srv.allIps.map(ip => {
                    const isSelected = (rp.assignedIps || []).includes(ip);
                    return `
                        <div class="ip-pill ${isSelected ? 'selected' : ''}" 
                             data-ip="${ip}" 
                             onclick="this.classList.toggle('selected')"
                             style="cursor: pointer; padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border-color); font-family: monospace; font-size: 0.85rem; transition: all 0.2s;">
                            ${ip}
                        </div>
                    `;
                }).join('')}
            </div>

            <div style="display: flex; gap: 12px;">
                <button onclick="saveRPIps('${rpId}', this)" style="flex: 1;">Save Changes</button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary);">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
};

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
                app.assignResource(type, id, zoneId);
            } else if (zoneType === 'server') {
                if (type === 'rp') {
                    app.assignRPtoServer(id, zoneId);
                }
            } else if (zoneType === 'stock-rp' && type === 'rp') {
                app.unassignRP(id);
            } else if (zoneType === 'stock-srv' && type === 'srv') {
                app.unassignServer(id);
            }
        });
    });
}

window.handleDragStart = (e, type, id) => {
    e.dataTransfer.setData('type', type);
    e.dataTransfer.setData('id', id);
};

window.showAddToolModal = () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <h2 style="margin-bottom: 16px;">Add Web Tool</h2>
            <div class="form-group">
                <label>Tool Name</label>
                <input type="text" id="tool-name" placeholder="E.g. DNS Checker">
            </div>
            <div class="form-group">
                <label>Tool URL</label>
                <input type="url" id="tool-url" placeholder="https://example.com">
            </div>
            <div class="form-group">
                <label>Description (Optional)</label>
                <textarea id="tool-desc" style="width:100%; height:80px; background:var(--bg-tertiary); border:1px solid var(--border-color); color:white; border-radius:8px; padding:12px;"></textarea>
            </div>
            <div style="display: flex; gap: 12px;">
                <button onclick="saveTool(this)" style="flex: 1;">Add to Dashboard</button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary);">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
};

window.saveTool = async (btn) => {
    const name = document.getElementById('tool-name').value;
    const url = document.getElementById('tool-url').value;
    const description = document.getElementById('tool-desc').value;
    if (name && url) {
        btn.innerText = 'Adding...';
        btn.disabled = true;
        await window.app.addTool({ name, url, description });
        btn.closest('.modal-overlay').remove();
    }
};

window.deleteTool = async (id) => {
    if (confirm("Are you sure you want to remove this tool link?")) {
        await window.app.deleteTool(id);
    }
};
