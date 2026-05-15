function renderLogin(app) {
    const container = document.getElementById('login-screen');
    container.innerHTML = `
        <div class="login-card">
            <div class="login-header" style="display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 24px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                    <img src="logo.png" alt="GestiQ" style="height: 48px; width: 48px; object-fit: contain;" onerror="this.outerHTML='<i data-lucide=\\'shield-check\\' style=\\'color: var(--accent-primary); width: 40px; height: 40px;\\'></i>'; if(window.lucide) window.lucide.createIcons();">
                    <h1 style="font-size: 2.25rem; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(135deg, var(--text-primary), var(--accent-primary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">GestiQ</h1>
                </div>
                <p style="margin: 0; color: var(--text-secondary);">Dashboard Access</p>
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
        <div class="sidebar-logo" style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
            <img src="logo.png" alt="GestiQ" style="height: 32px; width: 32px; object-fit: contain;" onerror="this.outerHTML='<i data-lucide=\\'shield-check\\' style=\\'color: var(--accent-primary);\\'></i>'; if(window.lucide) window.lucide.createIcons();">
            <span style="font-size: 1.5rem; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(135deg, var(--text-primary), var(--accent-primary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">GestiQ</span>
        </div>
        <div class="nav-group">
            <div class="nav-label">Main</div>
            <div class="nav-item ${view === 'overview' ? 'active' : ''}" onclick="app.setView('overview')">
                <i data-lucide="layout-dashboard"></i>
                <span>Overview</span>
            </div>
            <div class="nav-item ${view === 'management' ? 'active' : ''}" onclick="app.setView('management')">
                <i data-lucide="settings"></i>
                <span>Management</span>
            </div>
            ${role === 'admin' ? `
                <div class="nav-item ${view === 'team' ? 'active' : ''}" onclick="app.setView('team')">
                    <i data-lucide="users"></i>
                    <span>Team</span>
                </div>
            ` : ''}
            <div class="nav-item ${view === 'tools' ? 'active' : ''}" onclick="app.setView('tools')">
                <i data-lucide="wrench"></i>
                <span>Tools</span>
            </div>
            <div class="nav-item ${view === 'status' ? 'active' : ''}" onclick="app.setView('status')">
                <i data-lucide="shield-alert"></i>
                <span>IP Status</span>
            </div>
            <div class="nav-item ${view === 'drops' ? 'active' : ''}" onclick="app.setView('drops')">
                <i data-lucide="line-chart"></i>
                <span>Drop Details</span>
            </div>
            <div class="nav-item ${view === 'spamhaus' ? 'active' : ''}" onclick="app.setView('spamhaus')">
                <i data-lucide="search-check"></i>
                <span>Spamhaus</span>
            </div>
        </div>
        <div style="margin-top: auto;">
            <div style="padding: 12px; font-size: 0.7rem; color: var(--text-secondary); text-align: center; border-top: 1px solid var(--border-color); margin-bottom: 8px; opacity: 0.5;">
                by Med Reda ZARYOUH
            </div>
            <div class="nav-item" onclick="toggleTheme()">
                <i data-lucide="${document.body.classList.contains('light-theme') ? 'moon' : 'sun'}"></i>
                <span>${document.body.classList.contains('light-theme') ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
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
            <h2 style="font-size: 1.1rem; font-weight: 600;">${app.state.currentView === 'drops' ? 'Drop Details' : (app.state.currentView.charAt(0).toUpperCase() + app.state.currentView.slice(1))}</h2>
        </div>
        <div style="display: flex; align-items: center; gap: var(--spacing-md);">
            ${app.state.currentUser.role === 'admin' && app.state.currentView === 'management' ? `
                <button onclick="showAddServerModal()" style="padding: 6px 12px; font-size: 0.8rem; width: auto; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary);">+ Server</button>
                <button onclick="showAddRPModal()" style="padding: 6px 12px; font-size: 0.8rem; width: auto;">+ RP</button>
            ` : ''}
            ${app.state.currentUser.role === 'admin' && app.state.currentView === 'team' ? `
                <button onclick="showAddMailerModal()" style="padding: 6px 12px; font-size: 0.8rem; width: auto;">+ Mailer</button>
            ` : ''}
            ${app.state.currentUser.role === 'admin' && app.state.currentView === 'tools' ? `
                <button onclick="showAddToolModal()" style="padding: 6px 12px; font-size: 0.8rem; width: auto;">+ Tool</button>
            ` : ''}
            ${app.state.currentView === 'drops' ? `
                <button onclick="showAddDropModal()" style="padding: 6px 12px; font-size: 0.8rem; width: auto; background: var(--success); border: none;">+ New Drop</button>
            ` : ''}
            <div style="text-align: right; cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: background 0.2s;" onclick="showProfileModal()" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                <div style="font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                    ${app.state.currentUser.name}
                    <i data-lucide="chevron-down" style="width: 12px; color: var(--text-secondary);"></i>
                </div>
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
    } else if (view === 'status') {
        renderStatus(app, container);
    } else if (view === 'drops') {
        renderDropDetails(app, container);
    } else if (view === 'spamhaus') {
        renderSpamhaus(app, container);
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
                        <div style="flex: 1;">
                            <h3 style="font-size: 1rem; margin-bottom: 4px;">${tool.name}</h3>
                            <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">${tool.description || 'No description provided'}</p>
                        </div>
                        <a href="${tool.url}" target="_blank" style="margin-top: auto; background: var(--accent-primary); color: white; text-decoration: none; padding: 8px; border-radius: 6px; text-align: center; font-size: 0.85rem; font-weight: 500;">Open Tool</a>
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
    const { rps, servers, currentUser, drops, mailers } = app.state;
    const isAdmin = currentUser.role === 'admin';
    
    // Filter infra by mailer if not admin
    const myServers = isAdmin ? servers : servers.filter(s => s.mailerId === currentUser.id);
    const myRps = isAdmin ? rps : rps.filter(r => r.mailerId === currentUser.id);

    // Revenue Analytics
    const now = new Date();
    const todayStr = now.toLocaleDateString();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString();

    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const myDrops = isAdmin ? (drops || []) : (drops || []).filter(d => d.mailerName === currentUser.name);

    const stats = myDrops.reduce((acc, d) => {
        const dDate = new Date(d.timestamp);
        const dDateStr = dDate.toLocaleDateString();
        const dMonth = dDate.getMonth();
        const dYear = dDate.getFullYear();

        if (dDateStr === todayStr) acc.today += d.rev || 0;
        if (dDateStr === yesterdayStr) acc.yesterday += d.rev || 0;
        if (dMonth === thisMonth && dYear === thisYear) acc.thisMonth += d.rev || 0;
        if (dMonth === lastMonth && dYear === lastMonthYear) acc.lastMonth += d.rev || 0;
        acc.total += d.rev || 0;
        return acc;
    }, { today: 0, yesterday: 0, thisMonth: 0, lastMonth: 0, total: 0 });

    // Mailer Leaderboard (Current Month)
    const leaderboard = isAdmin ? (mailers || []).filter(m => m.role === 'mailer').map(m => {
        const rev = (drops || []).filter(d => d.mailerName === m.name && new Date(d.timestamp).getMonth() === thisMonth).reduce((sum, d) => sum + (d.rev || 0), 0);
        return { name: m.name, rev };
    }).sort((a, b) => b.rev - a.rev) : [];

    container.innerHTML = `
        <div style="padding: 0 0 24px 0;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700;">Revenue Performance</h2>
                <span style="font-size: 0.8rem; color: var(--text-secondary);">Last updated: ${now.toLocaleTimeString()}</span>
            </div>
            
            <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 24px;">
                <div class="card stat-card" style="border-left: 4px solid var(--success); background: linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, transparent 100%);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h3 style="font-size: 0.75rem; color: var(--text-secondary); margin: 0; text-transform: uppercase;">Today</h3>
                            <p style="font-size: 1.5rem; font-weight: 700; margin: 8px 0 0; color: var(--success);">$${stats.today.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                        </div>
                        <div style="font-size: 0.75rem; color: ${stats.today >= stats.yesterday ? 'var(--success)' : 'var(--error)'}; display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                            <i data-lucide="trending-${stats.today >= stats.yesterday ? 'up' : 'down'}" style="width: 12px;"></i>
                            ${stats.yesterday > 0 ? (((stats.today - stats.yesterday) / stats.yesterday) * 100).toFixed(0) + '%' : '--'}
                        </div>
                    </div>
                </div>
                <div class="card stat-card" style="border-left: 4px solid var(--accent-primary);">
                    <h3 style="font-size: 0.75rem; color: var(--text-secondary); margin: 0; text-transform: uppercase;">This Month</h3>
                    <p style="font-size: 1.5rem; font-weight: 700; margin: 8px 0 0; color: var(--accent-primary);">$${stats.thisMonth.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <div class="card stat-card" style="border-left: 4px solid #8b5cf6;">
                    <h3 style="font-size: 0.75rem; color: var(--text-secondary); margin: 0; text-transform: uppercase;">Last Month</h3>
                    <p style="font-size: 1.5rem; font-weight: 700; margin: 8px 0 0;">$${stats.lastMonth.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <div class="card stat-card" style="border-left: 4px solid #f59e0b;">
                    <h3 style="font-size: 0.75rem; color: var(--text-secondary); margin: 0; text-transform: uppercase;">Total Revenue</h3>
                    <p style="font-size: 1.5rem; font-weight: 700; margin: 8px 0 0;">$${stats.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: ${isAdmin ? '2fr 1fr' : '1fr'}; gap: 24px;">
                <div class="card" style="padding: 20px;">
                    <h3 style="margin: 0 0 20px 0; font-size: 1rem; display: flex; align-items: center; gap: 10px;">
                        <i data-lucide="bar-chart-3" style="width: 18px; color: var(--accent-primary);"></i>
                        Revenue Highlights
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-tertiary); border-radius: 8px;">
                            <span style="font-size: 0.85rem; color: var(--text-secondary);">Yesterday's Total</span>
                            <span style="font-weight: 600;">$${stats.yesterday.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-tertiary); border-radius: 8px;">
                            <span style="font-size: 0.85rem; color: var(--text-secondary);">Monthly Growth</span>
                            <span style="font-weight: 600; color: ${stats.thisMonth >= stats.lastMonth ? 'var(--success)' : 'var(--error)'};">
                                ${stats.lastMonth > 0 ? (((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100).toFixed(1) + '%' : 'New Month'}
                            </span>
                        </div>
                    </div>
                </div>

                ${isAdmin ? `
                <div class="card" style="padding: 20px;">
                    <h3 style="margin: 0 0 20px 0; font-size: 1rem; display: flex; align-items: center; gap: 10px;">
                        <i data-lucide="trophy" style="width: 18px; color: #f59e0b;"></i>
                        Top Mailers (Month)
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${leaderboard.slice(0, 3).map((m, i) => `
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="width: 20px; height: 20px; border-radius: 50%; background: ${i === 0 ? '#f59e0b' : (i === 1 ? '#94a3b8' : '#b45309')}; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700;">${i + 1}</span>
                                    <span style="font-size: 0.85rem;">${m.name}</span>
                                </div>
                                <span style="font-weight: 600; font-size: 0.85rem;">$${m.rev.toLocaleString()}</span>
                            </div>
                        `).join('')}
                        ${leaderboard.length === 0 ? '<p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem;">No data yet this month</p>' : ''}
                    </div>
                </div>
                ` : ''}
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin: 32px 0 16px;">
            <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700;">Infrastructure Stats</h2>
        </div>
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="margin: 0;">My Infrastructure</h3>
                <button onclick="copyAllLinkedRps(this)" style="padding: 6px 12px; font-size: 0.75rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); width: auto;">
                    <i data-lucide="copy" style="width: 12px; margin-right: 6px;"></i>
                    Copy All Linked RPs
                </button>
            </div>
            <div class="infrastructure-list">
                ${myServers.map(srv => {
                    const srvRps = rps.filter(r => r.serverId === srv.id);
                    const isExpanded = app.expandedServers.has(srv.id);
                    return `
                        <div class="server-container" style="background: var(--bg-secondary); margin-bottom: 12px; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;">
                            <div class="server-header" onclick="app.toggleServerExpand('${srv.id}')" style="padding: 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03);">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <i data-lucide="chevron-${isExpanded ? 'down' : 'right'}" style="width: 16px; color: var(--text-secondary);"></i>
                                    <span style="font-weight: 600;">${srv.name} <span style="color: var(--text-secondary); font-weight: 400; font-size: 0.85rem;">(${srvRps.length} RPs)</span></span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span class="action-icon" onclick="event.stopPropagation(); copyServerRps('${srv.id}', this)" title="Copy all RPs in this server">
                                        <i data-lucide="copy" style="width: 14px; color: var(--text-secondary);"></i>
                                    </span>
                                    <span class="badge badge-srv">${srvRps.length} RPs</span>
                                </div>
                            </div>
                            <div class="rp-list" style="padding: 12px; display: ${isExpanded ? 'grid' : 'none'}; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">
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
    const { rps, servers, mailers, currentUser } = app.state;
    const role = currentUser.role;
    const isAdmin = role === 'admin';
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
                <div style="padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; gap: 8px;">
                    <div style="position: relative; flex: 1;">
                        <i data-lucide="search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 14px; color: var(--text-secondary);"></i>
                        <input type="text" id="pool-search" placeholder="Search domains/IPs..." value="${app.state.searchQuery || ''}" 
                               style="width: 100%; padding: 8px 12px 8px 32px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.8rem; color: var(--text-primary);">
                    </div>
                    ${isAdmin ? `
                        <button onclick="showGmailSyncModal()" style="width: auto; padding: 0 10px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 6px; color: var(--accent-primary);" title="Sync VMTA from Gmail">
                            <i data-lucide="mail"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="pool-content">
                    <div style="color: var(--text-secondary); font-size: 0.7rem; margin-bottom: 8px; text-transform: uppercase;">Unlinked RPs</div>
                    <div class="drop-zone" data-type="stock-rp" style="min-height: 80px; border: 1px dashed var(--border-color); border-radius: 8px; margin-bottom: 12px;">
                        ${stockRps.map(rp => `
                            <div class="draggable-item" ${isAdmin ? 'draggable="true" ondragstart="handleDragStart(event, \'rp\', \'' + rp.id + '\')"' : ''}>
                                <span style="flex: 1; font-weight: 500;">${rp.domain}</span>
                                ${isAdmin ? `
                                    <span class="action-icon delete" onclick="event.stopPropagation(); deleteRP('${rp.id}')" title="Delete RP">
                                        <i data-lucide="trash-2" style="width: 14px; color: var(--error);"></i>
                                    </span>
                                ` : ''}
                                <span class="badge badge-rp" style="margin-left: 8px;">RP</span>
                            </div>
                        `).join('')}
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin: 16px 0 8px;">
                        <div style="color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase;">Unassigned Servers</div>
                        <span class="action-icon" onclick="copyUnassignedServerIps(this)" title="Copy all unassigned IPs">
                            <i data-lucide="copy" style="width: 12px; color: var(--text-secondary);"></i>
                        </span>
                    </div>
                    <div class="drop-zone" data-type="stock-srv" style="min-height: 80px; border: 1px dashed var(--border-color); border-radius: 8px;">
                        ${stockSrvs.map(srv => `
                            <div class="draggable-item" ${isAdmin ? 'draggable="true" ondragstart="handleDragStart(event, \'srv\', \'' + srv.id + '\')"' : ''}>
                                <span style="flex: 1; font-weight: 500;">${srv.name}</span>
                                ${isAdmin ? `
                                    <span class="action-icon delete" onclick="event.stopPropagation(); deleteServer('${srv.id}')" title="Delete Server">
                                        <i data-lucide="trash-2" style="width: 14px; color: var(--error);"></i>
                                    </span>
                                ` : ''}
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
                                    const isExpanded = app.expandedServers.has(srv.id);
                                    return `
                                        <div class="server-container draggable-item" ${isAdmin ? 'draggable="true" ondragstart="handleDragStart(event, \'srv\', \'' + srv.id + '\')"' : ''} style="display: block; padding: 0; margin-bottom: 8px; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;">
                                            <div class="server-header" onclick="app.toggleServerExpand('${srv.id}')" style="cursor: pointer; background: rgba(255,255,255,0.03);">
                                                <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                                                    <i data-lucide="chevron-${isExpanded ? 'down' : 'right'}" style="width: 14px; color: var(--text-secondary);"></i>
                                                    <span style="font-weight: 600; font-size: 0.85rem;">${srv.name} <span style="color: var(--text-secondary); font-weight: 400; font-size: 0.75rem;">(${srvRps.length} RPs)</span></span>
                                                </div>
                                                <div style="display: flex; gap: 4px; align-items: center;" onclick="event.stopPropagation()">
                                                    <span class="action-icon" onclick="copyServerRps('${srv.id}', this)" title="Copy all RPs in this server">
                                                        <i data-lucide="copy" style="width: 14px; color: var(--text-secondary);"></i>
                                                    </span>
                                                    ${isAdmin ? `
                                                        <span class="action-icon" onclick="unassignServer('${srv.id}')" title="Return to Stock">
                                                            <i data-lucide="archive" style="width: 14px; color: var(--text-secondary);"></i>
                                                        </span>
                                                    ` : ''}
                                                </div>
                                            </div>
                                            <div class="rp-list drop-zone" data-type="server" data-id="${srv.id}" style="min-height: 30px; display: ${isExpanded ? 'block' : 'none'};">
                                                ${srvRps.map(rp => `
                                                    <div class="rp-item draggable-item" ${isAdmin ? 'draggable="true" ondragstart="handleDragStart(event, \'rp\', \'' + rp.id + '\')"' : ''}>
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
                                                            ${isAdmin ? `
                                                                <span class="action-icon" onclick="event.stopPropagation(); showIPSelectionModal('${rp.id}')" title="Config IPs">
                                                                    <i data-lucide="edit-3" style="width: 12px;"></i>
                                                                </span>
                                                                <span class="action-icon" onclick="event.stopPropagation(); unassignRP('${rp.id}')" title="Return to Stock">
                                                                    <i data-lucide="archive" style="width: 12px; color: var(--text-secondary);"></i>
                                                                </span>
                                                            ` : ''}
                                                        </div>
                                                    </div>
                                                `).join('')}
                                                ${srvRps.length === 0 && isAdmin ? '<div style="font-size: 0.65rem; color: var(--text-secondary); text-align: center;">Drop RP here</div>' : ''}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                                
                                ${mStandaloneRps.length > 0 ? `
                                    <div style="color: var(--text-secondary); font-size: 0.65rem; margin-top: 8px;">Standalone RPs:</div>
                                    ${mStandaloneRps.map(rp => `
                                        <div class="draggable-item" ${isAdmin ? 'draggable="true" ondragstart="handleDragStart(event, \'rp\', \'' + rp.id + '\')"' : ''}>
                                            <span style="flex: 1; font-weight: 500;">${rp.domain}</span>
                                            ${isAdmin ? `
                                                <span class="action-icon" onclick="event.stopPropagation(); unassignRP('${rp.id}')" title="Return to Stock">
                                                    <i data-lucide="archive" style="width: 14px; color: var(--text-secondary);"></i>
                                                </span>
                                            ` : ''}
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

    if (isAdmin) {
        setupDragAndDrop(app);
    }
    
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
                        <div class="card" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); position: relative;">
                            <div style="position: absolute; top: 12px; right: 12px; display: flex; gap: 8px;">
                                <span class="action-icon" onclick="showEditMailerModal('${member.id}')" title="Edit Mailer">
                                     <i data-lucide="edit-3" style="width: 16px; color: var(--accent-primary);"></i>
                                 </span>
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
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
                                <div style="background: var(--bg-secondary); padding: 8px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase;">Mailer ID</div>
                                    <div style="font-weight: 700; font-size: 1.1rem; color: var(--accent-primary);">${member.mailer_id || 'N/A'}</div>
                                </div>
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
            <div class="form-group">
                <label>Mailer ID (External)</label>
                <input type="text" id="m-mailer-id" placeholder="e.g. 3329" autocomplete="off">
            </div>
            <div class="form-group">
                <label>Account Type</label>
                <select id="m-role">
                    <option value="mailer">Standard Mailer</option>
                    <option value="admin">Administrator</option>
                </select>
            </div>
            <p style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 16px;">Note: Password is visible during creation for accuracy.</p>
            <div style="display: flex; gap: 12px;">
                <button onclick="saveMailer(this)" style="flex: 1;">Create Account</button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary); color: var(--text-primary);">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
};

window.saveMailer = async (btn) => {
    const name = document.getElementById('m-name').value;
    const email = document.getElementById('m-email').value;
    const password = document.getElementById('m-pass').value;
    const role = document.getElementById('m-role').value;
    const mailer_id = document.getElementById('m-mailer-id').value;
    if (name && email && password) {
        btn.innerText = 'Creating...';
        btn.disabled = true;
        await window.app.addMailer({ name, email, password, role, mailer_id });
        btn.closest('.modal-overlay').remove();
    }
};

window.showEditMailerModal = (id) => {
    const member = window.app.state.mailers.find(m => m.id === id);
    if (!member) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <h2 style="margin-bottom: 16px;">Edit Mailer Info</h2>
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="edit-m-name" value="${member.name}">
            </div>
            <div class="form-group">
                <label>Email Address</label>
                <input type="email" id="edit-m-email" value="${member.email}">
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="text" id="edit-m-pass" value="${member.password}">
            </div>
            <div class="form-group">
                <label>Mailer ID (External)</label>
                <input type="text" id="edit-m-mailer-id" value="${member.mailer_id || ''}">
            </div>
            <div style="display: flex; gap: 12px; margin-top: 24px;">
                <button onclick="saveEditMailer('${member.id}', this)" style="flex: 1;">Save Changes</button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary); color: var(--text-primary);">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
};

window.saveEditMailer = async (id, btn) => {
    const name = document.getElementById('edit-m-name').value;
    const email = document.getElementById('edit-m-email').value;
    const password = document.getElementById('edit-m-pass').value;
    const mailer_id = document.getElementById('edit-m-mailer-id').value;

    if (name && email && password) {
        btn.innerText = 'Saving...';
        btn.disabled = true;
        await window.app.updateMailer(id, { name, email, password, mailer_id });
        btn.closest('.modal-overlay').remove();
    }
};

window.deleteMailer = async (id) => {
    if (confirm("Are you sure you want to remove this mailer?")) {
        await window.app.deleteMailer(id);
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
                <input type="text" id="srv-name" placeholder="SRV-NYC-01" style="width:100%; padding:10px; background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); border-radius:8px;">
            </div>
            <div class="form-group">
                <label>Server IPs (One per line)</label>
                <textarea id="srv-ips" placeholder="173.44.157.34 waaunq.feth.pw&#10;173.44.157.35 tznh.yfivpi.com" style="width:100%; height:120px; background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); border-radius:8px; padding:12px; font-family:monospace;"></textarea>
                <p style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px;">Format: <code>IP [Optional VMTA Hostname]</code></p>
            </div>
            <div style="display: flex; gap: 12px;">
                <button onclick="saveServer(this)" style="flex: 1;">Create Server</button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary); color: var(--text-primary);">Cancel</button>
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
                <textarea id="rp-domains" placeholder="domain1.com\ndomain2.com" style="width:100%; height:150px; background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); border-radius:8px; padding:12px; font-family:monospace;"></textarea>
            </div>
            <div style="display: flex; gap: 12px;">
                <button onclick="saveRP(this)" style="flex: 1;">Add Domains</button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary); color: var(--text-primary);">Cancel</button>
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
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary); color: var(--text-primary);">Cancel</button>
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

// Theme toggle
window.toggleTheme = () => {
    document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
    if (window.app) window.app.updateDashboard();
};

// Restore saved theme on load
(function() {
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-theme');
    }
})();

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
                <textarea id="tool-desc" style="width:100%; height:80px; background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); border-radius:8px; padding:12px;"></textarea>
            </div>
            <div style="display: flex; gap: 12px;">
                <button onclick="saveTool(this)" style="flex: 1;">Add to Dashboard</button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary); color: var(--text-primary);">Cancel</button>
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

window.showProfileModal = () => {
    const user = window.app.state.currentUser;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <h2 style="margin-bottom: 8px;">Account Settings</h2>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 20px;">Update your login credentials and profile info.</p>
            
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="p-name" value="${user.name}">
            </div>
            <div class="form-group">
                <label>Email (Login)</label>
                <input type="email" id="p-email" value="${user.email}">
            </div>
            <div class="form-group">
                <label>New Password</label>
                <input type="text" id="p-pass" value="${user.password}">
            </div>
            <div class="form-group">
                <label>Mailer ID</label>
                <input type="text" id="p-mailer-id" value="${user.mailer_id || ''}" placeholder="e.g. 3329">
            </div>
            
            <div style="display: flex; gap: 12px; margin-top: 24px;">
                <button onclick="saveProfile(this)" style="flex: 1;">Save Changes</button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary); color: var(--text-primary);">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
};

window.saveProfile = async (btn) => {
    const name = document.getElementById('p-name').value;
    const email = document.getElementById('p-email').value;
    const password = document.getElementById('p-pass').value;
    const mailer_id = document.getElementById('p-mailer-id').value;
    
    if (name && email && password) {
        btn.innerText = 'Saving...';
        btn.disabled = true;
        await window.app.updateProfile({ name, email, password, mailer_id });
        btn.closest('.modal-overlay').remove();
    }
};

window.copyServerRps = (serverId, el) => {
    const rps = window.app.state.rps.filter(r => r.serverId === serverId).map(r => r.domain);
    if (rps.length === 0) return;
    
    navigator.clipboard.writeText(rps.join('\n')).then(() => {
        const originalHtml = el.innerHTML;
        el.innerHTML = '<i data-lucide="check" style="width: 14px; color: var(--success);"></i>';
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
            el.innerHTML = originalHtml;
            if (window.lucide) window.lucide.createIcons();
        }, 2000);
    });
};

window.copyAllLinkedRps = (btn) => {
    const rps = window.app.state.rps.filter(r => r.serverId).map(r => r.domain);
    if (rps.length === 0) return;

    navigator.clipboard.writeText(rps.join('\n')).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="check" style="width: 12px; margin-right: 6px;"></i> Copied!';
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
            btn.innerHTML = originalText;
            if (window.lucide) window.lucide.createIcons();
        }, 2000);
    });
};

const STATUS_TYPES = [
    { id: 'none', label: 'None', color: 'transparent' },
    { id: 'rp_test', label: 'RP TEST', color: '#22c55e' },
    { id: 'spam', label: 'SPAM', color: '#ef4444' },
    { id: 'paused', label: 'PAUSED', color: '#3b82f6' },
    { id: 'change_dom', label: 'Change DOM', color: '#eab308' },
    { id: 'rdns', label: 'RDNS', color: '#166534' },
    { id: 'down', label: 'DOWN', color: '#f97316' },
    { id: 'bounce', label: 'BOUNCE', color: '#f97316' }
];

window.isDraggingCells = false;
window.selectedCellsMap = new Map();

window.startCellDrag = (e, ip, date, el) => {
    if (e.button !== 0) return; // Only left click
    window.isDraggingCells = true;
    
    const key = `${ip}|${date}`;
    // If the cell is already selected, don't clear the selection (they are likely clicking to open the menu)
    if (!window.selectedCellsMap.has(key)) {
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            window.clearCellSelection();
        }
        window.selectCell(ip, date, el);
    }
};

window.enterCellDrag = (e, ip, date, el) => {
    if (window.isDraggingCells) {
        window.selectCell(ip, date, el);
    }
};

window.stopCellDrag = () => {
    window.isDraggingCells = false;
};

document.addEventListener('mouseup', window.stopCellDrag);

window.selectCell = (ip, date, el) => {
    const key = `${ip}|${date}`;
    if (!window.selectedCellsMap.has(key)) {
        window.selectedCellsMap.set(key, { ip, date, el });
        el.style.boxShadow = 'inset 0 0 0 2px var(--accent-primary)';
    }
};

window.clearCellSelection = () => {
    window.selectedCellsMap.forEach(cell => {
        cell.el.style.boxShadow = 'none';
    });
    window.selectedCellsMap.clear();
};

function renderStatus(app, container) {
    let scrollPosTop = 0;
    let scrollPosLeft = 0;
    const scrollContainer = container.querySelector('#status-scroll-container');
    if (scrollContainer) {
        scrollPosTop = scrollContainer.scrollTop;
        scrollPosLeft = scrollContainer.scrollLeft;
    }

    const { servers, statuses } = app.state;
    const range = app.statusRange || 7;
    const query = (app.statusSearch || '').toLowerCase();
    
    const days = [];
    for (let i = 0; i < range; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }

    const filteredServers = servers.map((srv, srvIdx) => {
        const srvMatches = srv.name.toLowerCase().includes(query);
        const filteredIps = (srv.allIps || []).filter(ip => {
            const matchesQuery = ip.includes(query) || srvMatches;
            
            let matchesStatus = true;
            if (app.statusFilters && app.statusFilters.length > 0) {
                matchesStatus = false;
                const safeIp = ip.replace(/\./g, '_');
                const filterDate = app.selectedFilterDate;
                let sid = (statuses && statuses[safeIp] && statuses[safeIp][filterDate]) || 'none';
                if (sid === 'down' || sid === 'bounce') sid = 'down_bounce';
                if (app.statusFilters.includes(sid)) {
                    matchesStatus = true;
                }
            }
            
            return matchesQuery && matchesStatus;
        });
        
        if (filteredIps.length > 0) {
            return { ...srv, filteredIps };
        }
        return null;
    }).filter(s => s !== null);

    const totalServers = servers.length;
    const totalIps = servers.reduce((acc, s) => acc + (s.allIps || []).length, 0);

    const dailyStats = days.map(day => {
        const counts = {};
        STATUS_TYPES.forEach(s => { if (s.id !== 'none') counts[s.id] = 0; });
        servers.forEach(srv => {
            (srv.allIps || []).forEach(ip => {
                const safeIp = ip.replace(/\./g, '_');
                const sid = (statuses && statuses[safeIp] && statuses[safeIp][day]) || 'none';
                if (sid !== 'none' && counts[sid] !== undefined) counts[sid]++;
            });
        });
        return counts;
    });

    container.innerHTML = `
        <div class="status-view-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 16px;">
                <div style="display: flex; gap: 12px; align-items: center; flex: 1;">
                    <div style="position: relative; width: 300px;">
                        <i data-lucide="search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 14px; color: var(--text-secondary);"></i>
                        <input type="text" id="status-search" placeholder="Search Server or IP..." value="${app.statusSearch}" 
                               style="width: 100%; padding: 8px 12px 8px 32px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.8rem; color: var(--text-primary);">
                    </div>
                    <select onchange="window.app.statusRange = parseInt(this.value); window.app.updateDashboard();" 
                            style="width: auto; padding: 8px; font-size: 0.8rem; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 6px;">
                        <option value="7" ${range === 7 ? 'selected' : ''}>Week (7 Days)</option>
                        <option value="30" ${range === 30 ? 'selected' : ''}>Month (30 Days)</option>
                        <option value="60" ${range === 60 ? 'selected' : ''}>2 Months (60 Days)</option>
                    </select>
                    <div style="display: flex; align-items: center; gap: 8px; background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 4px 8px; border-radius: 6px;">
                        <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">Filter Date:</span>
                        <input type="date" value="${app.selectedFilterDate}" 
                               onchange="window.app.selectedFilterDate = this.value; window.app.updateDashboard();"
                               style="background: transparent; border: none; color: var(--text-primary); font-size: 0.8rem; font-family: inherit; outline: none; cursor: pointer;">
                    </div>
                </div>
                <button onclick="showBulkUpdateModal()" style="width: auto; padding: 8px 16px; font-size: 0.8rem; display: flex; align-items: center; gap: 8px; background: var(--accent-primary); border-radius: 6px;">
                    <i data-lucide="list-checks" style="width: 16px;"></i>
                    Bulk Update Status
                </button>
            </div>

            <div class="status-legend card" style="margin-bottom: 20px; display: flex; gap: 12px; flex-wrap: wrap; padding: 12px; background: var(--bg-secondary); border: 1px solid var(--border-color); align-items: center;">
                <div style="font-size: 0.8rem; font-weight: 600; margin-right: 8px; color: var(--text-secondary);">Filter by Status:</div>
                ${STATUS_TYPES.filter(s => s.id !== 'none' && s.id !== 'bounce').map(s => {
                    const isDown = s.id === 'down';
                    const sId = isDown ? 'down_bounce' : s.id;
                    const label = isDown ? 'DOWN + BOUNCE' : s.label;
                    const isActive = !(app.statusFilters && app.statusFilters.length > 0) || app.statusFilters.includes(sId);
                    
                    return `
                    <div onclick="window.toggleStatusFilter('${sId}')" style="display: flex; align-items: center; gap: 6px; font-size: 0.7rem; font-weight: 600; cursor: pointer; padding: 6px 10px; border-radius: 6px; background: ${isActive ? 'var(--bg-tertiary)' : 'transparent'}; opacity: ${isActive ? '1' : '0.5'}; border: 1px solid ${isActive ? 'var(--border-color)' : 'transparent'}; transition: all 0.2s;">
                        <span style="width: 14px; height: 14px; background: ${s.color}; border-radius: 3px; border: 1px solid rgba(0,0,0,0.1);"></span>
                        <span>${label}</span>
                    </div>
                    `;
                }).join('')}
                ${(app.statusFilters && app.statusFilters.length > 0) ? `
                    <div onclick="window.app.statusFilters = []; window.app.updateDashboard();" style="display: flex; align-items: center; font-size: 0.75rem; color: var(--accent-primary); font-weight: 600; cursor: pointer; padding: 4px 8px; margin-left: auto;">
                        <i data-lucide="x" style="width: 14px; margin-right: 4px;"></i> Clear Filters
                    </div>
                ` : ''}
            </div>

            <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--border-color); background: var(--bg-secondary);">
                <div id="status-scroll-container" style="overflow: auto; max-height: calc(100vh - 250px);">
                    <table class="status-table" style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
                        <thead style="position: sticky; top: 0; z-index: 10; background: var(--bg-tertiary);">
                            ${STATUS_TYPES.filter(s => s.id !== 'none' && s.id !== 'bounce').map(s => {
                                const isDown = s.id === 'down';
                                const rowLabel = isDown ? 'DOWN + BOUNCE' : s.label;
                                return `
                                <tr style="font-size: 0.65rem;">
                                    <th colspan="2" style="padding: 4px 12px; text-align: right; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color); color: ${s.color}; font-weight: 700; border-right: 1px solid var(--border-color); position: sticky; left: 0; z-index: 11;">${rowLabel}</th>
                                    ${days.map((day, dIdx) => {
                                        const count = isDown ? (dailyStats[dIdx]['down'] + dailyStats[dIdx]['bounce']) : (dailyStats[dIdx][s.id] || 0);
                                        return `<th style="padding: 4px; text-align: center; background: ${s.color}; color: white; border-bottom: 1px solid var(--border-color); border-right: 1px solid var(--border-color); font-weight: 800;">${count}</th>`;
                                    }).join('')}
                                </tr>
                                `;
                            }).join('')}
                            <tr>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border-color); border-right: 1px solid var(--border-color); position: sticky; left: 0; z-index: 11; background: var(--bg-tertiary); min-width: 120px;">
                                    <div style="display: flex; align-items: center; justify-content: space-between;">
                                        <span>Server (${totalServers})</span>
                                        <div data-ips="${filteredServers.map(s => s.name).join(',')}" onclick="window.copyIPsFromAttr(this)" style="cursor: pointer; padding: 4px; border-radius: 4px; display: flex;" title="Copy all shown Servers" onmouseover="this.style.background='var(--bg-primary)'" onmouseout="this.style.background='transparent'">
                                            <i data-lucide="copy" style="width: 14px; color: var(--text-secondary);"></i>
                                        </div>
                                    </div>
                                </th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border-color); border-right: 1px solid var(--border-color); position: sticky; left: 120px; z-index: 11; background: var(--bg-tertiary); width: 140px;">
                                    <div style="display: flex; align-items: center; justify-content: space-between;">
                                        <span>IP Address (${totalIps})</span>
                                        <div data-ips="${filteredServers.map(s => s.filteredIps).flat().join(',')}" onclick="window.copyIPsFromAttr(this)" style="cursor: pointer; padding: 4px; border-radius: 4px; display: flex;" title="Copy all shown IPs" onmouseover="this.style.background='var(--bg-primary)'" onmouseout="this.style.background='transparent'">
                                            <i data-lucide="copy" style="width: 14px; color: var(--text-secondary);"></i>
                                        </div>
                                    </div>
                                </th>
                                ${days.map(d => {
                                    const [y, m, day] = d.split('-');
                                    const isSelected = d === app.selectedFilterDate;
                                    return `<th style="padding: 12px; text-align: center; border-bottom: 2px solid var(--border-color); min-width: 80px; font-weight: 700; border-right: 1px solid var(--border-color); ${isSelected ? 'background: var(--bg-primary); border-top: 2px solid var(--accent-primary);' : ''}"> ${day}/${m}</th>`;
                                }).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredServers.map((srv, srvIdx) => {
                                const srvIps = srv.filteredIps || [];
                                const rowBg = srvIdx % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)';
                                return srvIps.map((ip, idx) => {
                                    const isLastRow = idx === srvIps.length - 1;
                                    const borderBottom = isLastRow ? '3px solid var(--border-color)' : '1px solid var(--border-color)';
                                    
                                    return `
                                    <tr style="border-bottom: ${borderBottom};">
                                        ${idx === 0 ? `<td rowspan="${srvIps.length}" style="padding: 12px; font-weight: 700; border-right: 1px solid var(--border-color); position: sticky; left: 0; background: ${rowBg}; z-index: 4; vertical-align: top; border-bottom: 3px solid var(--border-color);">${srv.name}</td>` : ''}
                                        <td style="padding: 12px; font-family: monospace; border-right: 1px solid var(--border-color); position: sticky; left: 120px; background: ${rowBg}; z-index: 4; border-bottom: ${borderBottom};">
                                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                                                <span>${ip}</span>
                                                ${(() => {
                                                    const safeIp = ip.replace(/\./g, '_');
                                                    const sh = app.state.spamhaus && app.state.spamhaus[safeIp];
                                                    if (!sh) return '';
                                                    if (sh.status === 'listed') {
                                                        return `<span class="badge badge-sbl" style="font-size: 0.55rem; padding: 1px 4px;">${sh.list || 'LISTED'}</span>`;
                                                    }
                                                    return `<span class="badge badge-clean" style="font-size: 0.55rem; padding: 1px 4px;">CLEAN</span>`;
                                                })()}
                                            </div>
                                        </td>
                                        ${days.map(date => {
                                            const safeIp = ip.replace(/\./g, '_');
                                            const currentStatusId = (statuses && statuses[safeIp] && statuses[safeIp][date]) || 'none';
                                            const currentStatus = STATUS_TYPES.find(s => s.id === currentStatusId) || STATUS_TYPES[0];
                                            const isSelected = date === app.selectedFilterDate;
                                            return `
                                                <td class="status-cell" 
                                                    style="background: ${currentStatus.id === 'none' ? (isSelected ? 'rgba(255,255,255,0.02)' : 'transparent') : currentStatus.color}; text-align: center; cursor: cell; transition: opacity 0.2s; color: ${currentStatus.id === 'none' ? 'var(--text-secondary)' : 'white'}; font-weight: 600; font-size: 0.65rem; border-right: 1px solid var(--border-color); border-bottom: ${borderBottom}; height: 40px; user-select: none; ${isSelected ? 'outline: 1px inset rgba(59, 130, 246, 0.2); outline-offset: -1px;' : ''}" 
                                                    onclick="openStatusMenu(event, '${ip}', '${date}', this)"
                                                    onmousedown="startCellDrag(event, '${ip}', '${date}', this)"
                                                    onmouseenter="enterCellDrag(event, '${ip}', '${date}', this)"
                                                    onmouseover="this.style.opacity='0.8'"
                                                    onmouseout="this.style.opacity='1'"
                                                    title="Click and drag to select cells, click to choose status">
                                                    ${currentStatus.id !== 'none' ? currentStatus.label : ''}
                                                </td>
                                            `;
                                        }).join('')}
                                    </tr>
                                    `;
                                }).join('');
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    const newScrollContainer = container.querySelector('#status-scroll-container');
    if (newScrollContainer) {
        newScrollContainer.scrollTop = scrollPosTop;
        newScrollContainer.scrollLeft = scrollPosLeft;
    }

    const searchInput = document.getElementById('status-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            app.statusSearch = e.target.value;
            renderStatus(app, container);
        });
        searchInput.focus();
        const val = searchInput.value;
        searchInput.value = '';
        searchInput.value = val;
    }

    if (window.lucide) window.lucide.createIcons();
}

window.showBulkUpdateModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal" style="max-width: 500px;">
            <h2 style="margin-bottom: 16px;">Bulk Status Update</h2>
            <div class="form-group">
                <label>Target Status</label>
                <select id="bulk-status" style="width: 100%; padding: 10px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); color: var(--text-primary); border-radius: 8px;">
                    ${STATUS_TYPES.map(s => `<option value="${s.id}">${s.label}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Date</label>
                <input type="date" id="bulk-date" value="${today}" style="width: 100%; padding: 10px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); color: var(--text-primary); border-radius: 8px;">
            </div>
            <div class="form-group">
                <label>IP Addresses (One per line)</label>
                <textarea id="bulk-ips" placeholder="46.105.41.176\n50.2.185.122" style="width: 100%; height: 200px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 0.85rem;"></textarea>
            </div>
            <div style="display: flex; gap: 12px; margin-top: 24px;">
                <button onclick="saveBulkStatus(this)" style="flex: 1; background: var(--accent-primary);">Apply Status Update</button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary); color: var(--text-primary);">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
};

window.saveBulkStatus = async (btn) => {
    const ips = document.getElementById('bulk-ips').value.split('\n').map(ip => ip.trim()).filter(ip => ip !== '');
    const status = document.getElementById('bulk-status').value;
    const date = document.getElementById('bulk-date').value;
    
    if (ips.length > 0 && status && date) {
        btn.innerText = 'Updating...';
        btn.disabled = true;
        try {
            await window.app.bulkUpdateIPStatuses(ips, status, date);
            btn.closest('.modal-overlay').remove();
            window.app.updateDashboard();
        } catch (e) {
            alert("Error saving to database. This is usually due to invalid characters. Error: " + e.message);
            btn.innerText = 'Apply Status Update';
            btn.disabled = false;
        }
    } else {
        alert("Please fill in all fields and provide at least one IP.");
    }
};

window.cycleStatus = (ip, date, el) => {
    const safeIp = ip.replace(/\./g, '_');
    const currentStatusId = (window.app.state.statuses && window.app.state.statuses[safeIp] && window.app.state.statuses[safeIp][date]) || 'none';
    const currentIndex = STATUS_TYPES.findIndex(s => s.id === currentStatusId);
    const nextIndex = (currentIndex + 1) % STATUS_TYPES.length;
    const nextStatus = STATUS_TYPES[nextIndex];

    el.style.background = nextStatus.id === 'none' ? 'transparent' : nextStatus.color;
    el.style.color = nextStatus.id === 'none' ? 'var(--text-secondary)' : 'white';
    el.innerText = nextStatus.id !== 'none' ? nextStatus.label : '';
    el.title = nextStatus.label;
    
    window.app.updateIPStatus(ip, date, nextStatus.id);
};

window.toggleStatusFilter = (sId) => {
    if (!window.app.statusFilters) window.app.statusFilters = [];
    const idx = window.app.statusFilters.indexOf(sId);
    if (idx === -1) {
        window.app.statusFilters.push(sId);
    } else {
        window.app.statusFilters.splice(idx, 1);
    }
    window.app.updateDashboard();
};

window.openStatusMenu = (e, ip, date, el) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If clicked cell is not in selection, select only this cell
    const key = `${ip}|${date}`;
    if (!window.selectedCellsMap.has(key)) {
        window.clearCellSelection();
        window.selectCell(ip, date, el);
    }
    
    const existing = document.getElementById('status-context-menu');
    if (existing) existing.remove();
    
    const menu = document.createElement('div');
    menu.id = 'status-context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.style.background = 'var(--bg-secondary)';
    menu.style.border = '1px solid var(--border-color)';
    menu.style.borderRadius = '8px';
    menu.style.padding = '8px';
    menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    menu.style.zIndex = '1000';
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';
    menu.style.gap = '4px';
    
    STATUS_TYPES.forEach(s => {
        const item = document.createElement('div');
        item.style.padding = '8px 12px';
        item.style.borderRadius = '4px';
        item.style.cursor = 'pointer';
        item.style.fontSize = '0.75rem';
        item.style.fontWeight = '600';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '8px';
        item.innerHTML = `
            <span style="width: 14px; height: 14px; border-radius: 3px; background: ${s.color}; border: 1px solid rgba(0,0,0,0.1)"></span>
            <span style="color: var(--text-primary)">${s.label}</span>
        `;
        
        item.onmouseover = () => item.style.background = 'var(--bg-tertiary)';
        item.onmouseout = () => item.style.background = 'transparent';
        item.onclick = async () => {
            const updates = Array.from(window.selectedCellsMap.values());
            
            // Visual feedback instantly
            updates.forEach(cell => {
                cell.el.style.background = s.id === 'none' ? 'transparent' : s.color;
                cell.el.style.color = s.id === 'none' ? 'var(--text-secondary)' : 'white';
                cell.el.innerText = s.id !== 'none' ? s.label : '';
                cell.el.title = s.label;
            });
            
            menu.remove();
            
            try {
                await window.app.batchUpdateIPStatuses(updates, s.id);
            } catch (err) {
                console.error("Batch save error:", err);
                alert("Error saving statuses to database.");
            }
            
            window.clearCellSelection();
        };
        menu.appendChild(item);
    });
    
    const closeListener = (evt) => {
        if (!menu.contains(evt.target)) {
            menu.remove();
            document.removeEventListener('click', closeListener);
            document.removeEventListener('contextmenu', closeListener);
            window.clearCellSelection();
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeListener);
        document.addEventListener('contextmenu', closeListener);
    }, 0);
    
    document.body.appendChild(menu);
    
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = `${window.innerWidth - rect.width - 10}px`;
    if (rect.bottom > window.innerHeight) menu.style.top = `${window.innerHeight - rect.height - 10}px`;
};

window.copyIPsFromAttr = (el) => {
    const attr = el.getAttribute('data-ips');
    if (!attr) return;
    const ips = attr.split(',').join('\n');
    navigator.clipboard.writeText(ips).then(() => {
        const originalHTML = el.innerHTML;
        el.innerHTML = '<i data-lucide="check" style="width: 14px; color: var(--accent-primary);"></i>';
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
            el.innerHTML = originalHTML;
            if (window.lucide) window.lucide.createIcons();
        }, 1500);
    });
};

window.copyUnassignedServerIps = (el) => {
    const names = window.app.state.servers.filter(s => !s.mailerId).map(s => s.name);
    if (names.length === 0) return;

    navigator.clipboard.writeText(names.join('\n')).then(() => {
        const originalHtml = el.innerHTML;
        el.innerHTML = '<i data-lucide="check" style="width: 12px; color: var(--success);"></i>';
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
            el.innerHTML = originalHtml;
            if (window.lucide) window.lucide.createIcons();
        }, 2000);
    });
};

function renderSpamhaus(app, container) {
    const { servers, spamhausHistory } = app.state;
    
    // Get available dates from history and sort them
    const historyDates = Object.keys(spamhausHistory || {}).sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    
    // Default to the latest history date or today
    if (!app.selectedSpamhausDate) {
        app.selectedSpamhausDate = historyDates[0] || today;
    }

    const selectedDate = app.selectedSpamhausDate;
    const historyData = (spamhausHistory && spamhausHistory[selectedDate]) || { results: {}, summary: { total: 0, listed: 0, clean: 0 } };
    const results = historyData.results || {};
    const summary = historyData.summary || { total: 0, listed: 0, clean: 0 };
    
    const spamhausProgress = app.state.spamhausProgress || { status: 'idle', current: 0, total: 0 };
    const isRunning = spamhausProgress && spamhausProgress.status === 'scanning';
    
    container.innerHTML = `
        <div style="padding: 24px;">
            <!-- Tab Selector -->
            <div style="display: flex; gap: 4px; background: var(--bg-tertiary); padding: 4px; border-radius: 12px; margin-bottom: 24px; width: fit-content; border: 1px solid var(--border-color);">
                <button onclick="app.state.spamhausTab = 'grid'; app.updateDashboard();" style="padding: 8px 20px; border-radius: 8px; font-size: 0.85rem; border: none; background: ${app.state.spamhausTab === 'grid' ? 'var(--accent-primary)' : 'transparent'}; color: ${app.state.spamhausTab === 'grid' ? '#fff' : 'var(--text-secondary)'}; cursor: pointer; transition: all 0.2s;">
                    Historical Blacklist
                </button>
                <button onclick="app.state.spamhausTab = 'unified'; app.updateDashboard();" style="padding: 8px 20px; border-radius: 8px; font-size: 0.85rem; border: none; background: ${app.state.spamhausTab === 'unified' ? 'var(--accent-primary)' : 'transparent'}; color: ${app.state.spamhausTab === 'unified' ? '#fff' : 'var(--text-secondary)'}; cursor: pointer; transition: all 0.2s;">
                    Infrastructure Check (RDNS/VMTA)
                </button>
            </div>

            ${app.state.spamhausTab === 'grid' ? `
                <!-- Historical Blacklist Section (Existing) -->
                <!-- ... existing code stays the same ... -->
            ` : ''}

            ${app.state.spamhausTab === 'unified' ? `
                <!-- Unified Infrastructure Section -->
                <div class="card" style="padding: 0; overflow: hidden;">
                    <div style="padding: 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02);">
                        <div>
                            <h3 style="margin: 0; font-size: 1.1rem;">Infrastructure Check</h3>
                            <p style="margin: 4px 0 0; font-size: 0.8rem; color: var(--text-secondary);">Verify PTR records and Sync VMTA mappings from Gmail.</p>
                        </div>
                        <div style="display: flex; gap: 12px;">
                            <button onclick="triggerVMTACheck(this)" class="btn-primary" style="width: auto; padding: 8px 16px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; background: #3B82F6; border: none;">
                                <i data-lucide="zap" style="width: 14px;"></i> Check RDNS
                            </button>
                            <button onclick="showGmailSyncModal()" class="btn-primary" style="width: auto; padding: 8px 16px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; background: #EA4335; border: none;">
                                <i data-lucide="mail" style="width: 14px;"></i> Sync VMTA from Gmail
                            </button>
                        </div>
                    </div>
                    <div style="overflow-x: auto; background: var(--bg-secondary);">
                        <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.85rem;">
                            <thead>
                                <tr style="text-align: left; background: var(--bg-tertiary);">
                                    <th style="padding: 16px 12px; width: 180px;">Server</th>
                                    <th style="padding: 16px 12px; width: 150px;">IP Address</th>
                                    <th style="padding: 16px 12px;">Reverse DNS (PTR)</th>
                                    <th style="padding: 16px 12px;">VMTA</th>
                                    <th style="padding: 16px 12px; width: 100px; text-align: center;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${servers.map((s, sIdx) => {
                                    const sIps = s.allIps || [];
                                    const vmtaMap = s.vmtaMap || {};
                                    return sIps.map((ip, ipIdx) => {
                                        const safeIp = ip.replace(/\./g, '_');
                                        const ptrData = app.state.vmtaResults[safeIp] || { ptr: '---', status: '---' };
                                        const vmta = vmtaMap[safeIp] || '---';
                                        
                                        const isFirstInServer = ipIdx === 0 && sIdx !== 0;
                                        const thickBorder = isFirstInServer ? 'border-top: 3px solid rgba(255,255,255,0.15);' : '';
                                        
                                        return `
                                            <tr style="border-bottom: 1px solid var(--border-color); vertical-align: middle;">
                                                ${ipIdx === 0 ? `
                                                    <td rowspan="${sIps.length}" style="padding: 16px 12px; border-right: 1px solid var(--border-color); background: rgba(255,255,255,0.01); font-weight: 700; color: var(--accent-primary); border-bottom: 1px solid var(--border-color); ${thickBorder}">
                                                        ${s.name}
                                                    </td>
                                                ` : ''}
                                                <td style="padding: 12px; font-family: monospace; border-right: 1px solid var(--border-color); ${thickBorder}">${ip}</td>
                                                <td style="padding: 12px; font-family: monospace; color: var(--text-secondary); ${thickBorder}">${ptrData.ptr}</td>
                                                <td style="padding: 12px; font-family: monospace; color: var(--accent-primary); ${thickBorder}">${vmta}</td>
                                                <td style="padding: 12px; text-align: center; ${thickBorder}">
                                                    <span style="color: ${ptrData.status === 'OK' ? 'var(--success)' : (ptrData.status === '---' ? 'var(--text-secondary)' : 'var(--error)')}; font-weight: 700; font-size: 0.7rem;">
                                                        ${ptrData.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('');
                                }).join('')}
                                ${servers.length === 0 ? '<tr><td colspan="5" style="padding: 40px; text-align: center; color: var(--text-secondary);">No servers found.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

window.setSpamhausDate = (date) => {
    window.app.selectedSpamhausDate = date;
    window.app.updateDashboard();
};

window.renderDropDetails = (app, container) => {
    const { drops, currentUser } = app.state;
    const isAdmin = currentUser.role === 'admin';
    
    // Filter drops if not admin
    let myDrops = isAdmin ? (drops || []) : (drops || []).filter(d => d.mailerName === currentUser.name);

    // Apply Search Filter
    const search = (app.state.dropSearch || '').toLowerCase().trim();
    if (search) {
        myDrops = myDrops.filter(d => {
            const dateStr = (d.displayDate || '').toLowerCase();
            const mailerStr = (d.mailerName || '').toLowerCase();
            const offerStr = (d.offer || '').toLowerCase();
            return dateStr.includes(search) || mailerStr.includes(search) || offerStr.includes(search);
        });
    }
    
    // Sort drops based on state
    const { key, order } = app.state.dropSort || { key: 'timestamp', order: 'desc' };
    const sortedDrops = [...myDrops].sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        
        // Handle special cases
        if (key === 'displayDate') { valA = a.timestamp; valB = b.timestamp; }
        
        if (typeof valA === 'string') {
            return order === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }
        return order === 'desc' ? (valB || 0) - (valA || 0) : (valA || 0) - (valB || 0);
    });

    // Analytics calculations
    const stats = myDrops.reduce((acc, d) => {
        acc.rev += d.rev || 0;
        acc.sent += d.totalOut || 0;
        acc.epc += d.epc || 0;
        acc.cpm += d.cpm || 0;
        return acc;
    }, { rev: 0, sent: 0, epc: 0, cpm: 0 });

    const avgEpc = myDrops.length > 0 ? Number((stats.epc / myDrops.length).toFixed(2)) : '0';
    const avgCpm = myDrops.length > 0 ? Number((stats.cpm / myDrops.length).toFixed(2)) : '0';

    container.innerHTML = `
        <div style="padding: 24px;">
            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px;">
                <div class="card stat-card" style="padding: 20px; border-left: 4px solid var(--success);">
                    <h3 style="font-size: 0.75rem; color: var(--text-secondary); margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Total Revenue</h3>
                    <p style="font-size: 1.5rem; font-weight: 700; margin: 8px 0 0; color: var(--success);">$${stats.rev.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <div class="card stat-card" style="padding: 20px; border-left: 4px solid var(--accent-primary);">
                    <h3 style="font-size: 0.75rem; color: var(--text-secondary); margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Total Sent</h3>
                    <p style="font-size: 1.5rem; font-weight: 700; margin: 8px 0 0;">${stats.sent.toLocaleString()}</p>
                </div>
                <div class="card stat-card" style="padding: 20px; border-left: 4px solid #f59e0b;">
                    <h3 style="font-size: 0.75rem; color: var(--text-secondary); margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Average EPC</h3>
                    <p style="font-size: 1.5rem; font-weight: 700; margin: 8px 0 0;">$${avgEpc}</p>
                </div>
                <div class="card stat-card" style="padding: 20px; border-left: 4px solid #8b5cf6;">
                    <h3 style="font-size: 0.75rem; color: var(--text-secondary); margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Average CPM</h3>
                    <p style="font-size: 1.5rem; font-weight: 700; margin: 8px 0 0;">$${avgCpm}</p>
                </div>
            </div>

            <div class="card" style="padding: 0; overflow: hidden;">
                <div style="padding: 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); flex-wrap: wrap; gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <h3 style="margin: 0; font-size: 1.1rem;">Drop History</h3>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${myDrops.length} records found</div>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <div style="position: relative; width: 250px;">
                            <i data-lucide="search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 14px; color: var(--text-secondary);"></i>
                            <input type="text" id="drop-history-search" placeholder="Search mailer, offer or date..." 
                                value="${app.state.dropSearch || ''}"
                                style="padding: 8px 12px 8px 32px; font-size: 0.85rem; width: 100%; border-radius: 8px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary);">
                        </div>
                        <button onclick="showAddDropModal()" class="btn-primary" style="width: auto; padding: 8px 16px; font-size: 0.85rem;">+ New Drop</button>
                    </div>
                </div>
                <div style="overflow-x: auto; background: var(--bg-secondary);">
                    <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.85rem; min-width: 1400px; table-layout: fixed;">
                        <thead>
                            <tr style="text-align: left; background: var(--bg-tertiary); position: sticky; top: 0; z-index: 5;">
                                <th style="padding: 16px 12px; cursor: pointer; width: 140px;" onclick="app.setDropSort('timestamp')">
                                    Date & Time ${key === 'timestamp' ? `<i data-lucide="chevron-${order === 'desc' ? 'down' : 'up'}" style="width: 14px; vertical-align: middle;"></i>` : ''}
                                </th>
                                ${isAdmin ? `<th style="padding: 16px 12px; cursor: pointer; width: 160px;" onclick="app.setDropSort('mailerName')">Mailer ${key === 'mailerName' ? `<i data-lucide="chevron-${order === 'desc' ? 'down' : 'up'}" style="width: 14px; vertical-align: middle;"></i>` : ''}</th>` : ''}
                                <th style="padding: 16px 12px; cursor: pointer; width: 300px;" onclick="app.setDropSort('offer')">Offer ${key === 'offer' ? `<i data-lucide="chevron-${order === 'desc' ? 'down' : 'up'}" style="width: 14px; vertical-align: middle;"></i>` : ''}</th>
                                <th style="padding: 16px 12px; cursor: pointer; width: 120px;" onclick="app.setDropSort('deployIds')">Deploys ${key === 'deployIds' ? `<i data-lucide="chevron-${order === 'desc' ? 'down' : 'up'}" style="width: 14px; vertical-align: middle;"></i>` : ''}</th>
                                <th style="padding: 16px 12px; width: 160px;">Details</th>
                                <th style="padding: 16px 12px; cursor: pointer; width: 160px;" onclick="app.setDropSort('servers')">Server(s) ${key === 'servers' ? `<i data-lucide="chevron-${order === 'desc' ? 'down' : 'up'}" style="width: 14px; vertical-align: middle;"></i>` : ''}</th>
                                <th style="padding: 16px 12px; width: 150px;">IP(s)</th>
                                <th style="padding: 16px 12px; cursor: pointer; width: 100px;" onclick="app.setDropSort('totalOut')">Sent ${key === 'totalOut' ? `<i data-lucide="chevron-${order === 'desc' ? 'down' : 'up'}" style="width: 14px; vertical-align: middle;"></i>` : ''}</th>
                                <th style="padding: 16px 12px; cursor: pointer; width: 80px;" onclick="app.setDropSort('clicks')">Clicks ${key === 'clicks' ? `<i data-lucide="chevron-${order === 'desc' ? 'down' : 'up'}" style="width: 14px; vertical-align: middle;"></i>` : ''}</th>
                                <th style="padding: 16px 12px; cursor: pointer; width: 90px;" onclick="app.setDropSort('epc')">EPC ${key === 'epc' ? `<i data-lucide="chevron-${order === 'desc' ? 'down' : 'up'}" style="width: 14px; vertical-align: middle;"></i>` : ''}</th>
                                <th style="padding: 16px 12px; cursor: pointer; width: 90px;" onclick="app.setDropSort('cpm')">CPM ${key === 'cpm' ? `<i data-lucide="chevron-${order === 'desc' ? 'down' : 'up'}" style="width: 14px; vertical-align: middle;"></i>` : ''}</th>
                                <th style="padding: 16px 12px; cursor: pointer; width: 120px;" onclick="app.setDropSort('rev')">Revenue ${key === 'rev' ? `<i data-lucide="chevron-${order === 'desc' ? 'down' : 'up'}" style="width: 14px; vertical-align: middle;"></i>` : ''}</th>
                                <th style="padding: 16px 12px; text-align: right; width: 80px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedDrops.map((d, idx) => `
                                <tr style="border-bottom: 1px solid var(--border-color); vertical-align: top; background: ${idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'}; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='${idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'}'">
                                    <td style="padding: 16px 12px; white-space: nowrap;">
                                        <div style="font-weight: 600; color: var(--text-primary);">${d.displayDate ? d.displayDate.split(',')[0] : '---'}</div>
                                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">${d.displayDate ? (d.displayDate.split(',')[1] || '') : ''}</div>
                                    </td>
                                    ${isAdmin ? `
                                    <td style="padding: 16px 12px;">
                                        <div style="background: rgba(59, 130, 246, 0.1); padding: 8px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.2);">
                                            <div style="color: var(--accent-primary); font-weight: 700; font-size: 0.75rem;">ID: ${ (() => {
                                                if (d.mailerId && d.mailerId !== 'N/A') return d.mailerId;
                                                const searchName = (d.mailerName || '').trim().toLowerCase();
                                                const found = (app.state.mailers || []).find(m => (m.name || '').trim().toLowerCase() === searchName);
                                                return found ? found.mailer_id : 'N/A';
                                            })() }</div>
                                            <div style="font-size: 0.8rem; margin-top: 2px; color: var(--text-primary);">${d.mailerName}</div>
                                        </div>
                                    </td>` : ''}
                                    <td style="padding: 16px 12px;">
                                        <div style="font-weight: 600; line-height: 1.4; color: var(--text-primary);">${d.offer || '---'}</div>
                                    </td>
                                    <td style="padding: 16px 12px;">
                                        <div style="font-family: monospace; font-size: 0.75rem; background: var(--bg-tertiary); padding: 4px 8px; border-radius: 4px; display: inline-block;">${d.deployIds || '---'}</div>
                                    </td>
                                    <td style="padding: 16px 12px;">
                                        <div style="font-size: 0.75rem; color: var(--text-secondary);">DATA Profil: <span style="color: var(--text-primary);">${d.profile || 'N/A'}</span></div>
                                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 6px;">Inbox: <span style="color: ${d.testAfter === '100%' ? 'var(--success)' : 'var(--accent-primary)'}; font-weight: 700;">${d.testAfter || '0%'} INBOX</span></div>
                                    </td>
                                    <td style="padding: 16px 12px;">
                                        <div style="font-weight: 600; color: var(--accent-primary); background: rgba(59, 130, 246, 0.05); padding: 4px 8px; border-radius: 4px; display: inline-block;">${d.servers || '---'}</div>
                                    </td>
                                    <td style="padding: 16px 12px;">
                                        <code style="background: var(--bg-tertiary); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; color: var(--text-primary); display: block; overflow: hidden; text-overflow: ellipsis;">${d.ips || '---'}</code>
                                    </td>
                                    <td style="padding: 16px 12px; font-weight: 600;">${(d.totalOut || 0).toLocaleString()}</td>
                                    <td style="padding: 16px 12px;">${(d.clicks || 0).toLocaleString()}</td>
                                    <td style="padding: 16px 12px;">$${Number((d.epc || 0).toFixed(2))}</td>
                                    <td style="padding: 16px 12px;">$${Number((d.cpm || 0).toFixed(2))}</td>
                                    <td style="padding: 16px 12px; font-weight: 800; color: var(--success); font-size: 0.9rem;">$${(d.rev || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    <td style="padding: 16px 12px; text-align: right;">
                                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                                            <button onclick="showEditDropModal('${d.id}')" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-secondary); cursor: pointer; padding: 6px; border-radius: 6px; width: auto;"><i data-lucide="edit-3" style="width: 14px;"></i></button>
                                            <button onclick="app.deleteDrop('${d.id}')" style="background: rgba(218, 54, 51, 0.1); border: 1px solid rgba(218, 54, 51, 0.2); color: var(--error); cursor: pointer; padding: 6px; border-radius: 6px; width: auto;"><i data-lucide="trash-2" style="width: 14px;"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                            ${sortedDrops.length === 0 ? `<tr><td colspan="${isAdmin ? 11 : 10}" style="padding: 60px; text-align: center; color: var(--text-secondary);">No drop records yet. Click "+ New Drop" to begin tracking.</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    const searchInput = document.getElementById('drop-history-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            app.state.dropSearch = e.target.value;
            renderView(app);
            // Re-focus search input
            const sInput = document.getElementById('drop-history-search');
            if (sInput) {
                sInput.focus();
                const val = sInput.value;
                sInput.value = '';
                sInput.value = val;
            }
        });
    }

    if (window.lucide) window.lucide.createIcons();
};

window.showAddDropModal = () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '10000';
    overlay.innerHTML = `
        <div class="modal" style="max-width: 800px;">
            <h2 style="margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
                <i data-lucide="plus-circle" style="color: var(--success);"></i>
                Add New Drop Record
            </h2>
            <form id="add-drop-form">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                    <!-- Column 1 -->
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <div class="form-group">
                            <label>Entity</label>
                            <input type="text" id="drop-entity" value="WMN3" required>
                        </div>
                        <div class="form-group">
                            <label>Offer Name</label>
                            <input type="text" id="drop-offer" placeholder="e.g. Finance_Offer" required>
                        </div>
                        <div class="form-group">
                            <label>Deploy ID(s)</label>
                            <input type="text" id="drop-deploys" placeholder="e.g. 1024, 1025" required>
                        </div>
                        <div class="form-group">
                            <label>IP(s) (One per line)</label>
                            <textarea id="drop-ips" placeholder="Paste IPs here..." style="width: 100%; height: 120px; padding: 10px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; font-family: monospace; font-size: 0.75rem;"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Return Path</label>
                            <input type="text" id="drop-return-path" placeholder="e.g. bounce@domain.com">
                        </div>
                    </div>

                    <!-- Column 2 -->
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <div class="form-group">
                            <label>DATA Profil</label>
                            <input type="text" id="drop-profile" placeholder="DATA Profil Name" required>
                        </div>
                        <div class="form-group">
                            <label>Inbox Rate (%)</label>
                            <select id="drop-test-after" style="width: 100%; padding: 10px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px;">
                                <option value="0%">0%</option>
                                <option value="25%">25%</option>
                                <option value="50%">50%</option>
                                <option value="75%">75%</option>
                                <option value="85%">85%</option>
                                <option value="100%">100%</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Paste Raw Server Stats (Calculates Sent)</label>
                            <textarea id="drop-raw-stats" placeholder="Paste logs here..." style="width: 100%; height: 120px; padding: 10px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; font-family: monospace; font-size: 0.75rem;"></textarea>
                            <p style="font-size: 0.65rem; color: var(--text-secondary); margin-top: 4px;">App will auto-calculate SENT (IN) and SENT (OUT).</p>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label>Clicks</label>
                                <input type="number" id="drop-clicks" step="1" required>
                            </div>
                            <div class="form-group">
                                <label>Revenue ($)</label>
                                <input type="number" id="drop-rev" step="0.01" required>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button type="submit" style="flex: 2; background: var(--success); border: none;">Save Drop Details</button>
                    <button type="button" onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary); color: var(--text-primary);">Cancel</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    window._tempProcessedStats = null;
    const rawStatsArea = document.getElementById('drop-raw-stats');

    rawStatsArea.oninput = () => {
        const text = rawStatsArea.value;
        const lines = text.split('\n');
        let totalIn = 0;
        let totalOut = 0;
        const breakdown = [];
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.includes('(IN)') || trimmed.includes('(OUT)')) return; 
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 3) {
                const srvName = parts[0];
                const inVal = parseInt(parts[1]);
                const outVal = parseInt(parts[2]);
                if (!isNaN(inVal)) totalIn += inVal;
                if (!isNaN(outVal)) totalOut += outVal;
                if (!isNaN(outVal)) breakdown.push({ srv: srvName, in: inVal, out: outVal });
            }
        });
        window._tempProcessedStats = { breakdown, totalIn, totalOut };
        rawStatsArea.style.borderColor = totalOut > 0 ? 'var(--success)' : 'var(--border-color)';
    };

    document.getElementById('add-drop-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            entity: document.getElementById('drop-entity').value,
            offer: document.getElementById('drop-offer').value,
            deployIds: document.getElementById('drop-deploys').value,
            ips: document.getElementById('drop-ips').value,
            profile: document.getElementById('drop-profile').value,
            testAfter: document.getElementById('drop-test-after').value,
            returnPath: document.getElementById('drop-return-path').value,
            totalIn: window._tempProcessedStats ? window._tempProcessedStats.totalIn : 0,
            totalOut: window._tempProcessedStats ? window._tempProcessedStats.totalOut : 0,
            clicks: document.getElementById('drop-clicks').value,
            rev: document.getElementById('drop-rev').value,
            serverStats: window._tempProcessedStats ? window._tempProcessedStats.breakdown : null
        };
        await window.app.addDrop(data);
        overlay.remove();
        window.app.updateDashboard();
    };
};

window.showEditDropModal = (dropId) => {
    const drop = window.app.state.drops.find(d => d.id === dropId);
    if (!drop) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '10000';
    overlay.innerHTML = `
        <div class="modal" style="max-width: 800px;">
            <h2 style="margin-bottom: 20px;">Edit Drop Record</h2>
            <form id="edit-drop-form">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                    <!-- Column 1 -->
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <div class="form-group">
                            <label>Entity</label>
                            <input type="text" id="edit-drop-entity" value="${drop.entity || 'WMN3'}">
                        </div>
                        <div class="form-group">
                            <label>Offer Name</label>
                            <input type="text" id="edit-drop-offer" value="${drop.offer || ''}">
                        </div>
                        <div class="form-group">
                            <label>Deploy ID(s)</label>
                            <input type="text" id="edit-drop-deploys" value="${drop.deployIds || ''}">
                        </div>
                        <div class="form-group">
                            <label>IP(s) (One per line)</label>
                            <textarea id="edit-drop-ips" style="width: 100%; height: 120px; padding: 10px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; font-family: monospace; font-size: 0.75rem;">${drop.ips || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Return Path</label>
                            <input type="text" id="edit-drop-return-path" value="${drop.returnPath || ''}">
                        </div>
                    </div>

                    <!-- Column 2 -->
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <div class="form-group">
                            <label>DATA Profil</label>
                            <input type="text" id="edit-drop-profile" value="${drop.profile || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Inbox Rate (%)</label>
                            <select id="edit-drop-test-after" style="width: 100%; padding: 10px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px;">
                                ${['0%', '25%', '50%', '75%', '85%', '100%'].map(opt => `<option value="${opt}" ${drop.testAfter === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Paste Raw Server Stats (Calculates Sent)</label>
                            <textarea id="edit-drop-raw-stats" placeholder="Paste logs here..." style="width: 100%; height: 120px; padding: 10px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; font-family: monospace; font-size: 0.75rem;"></textarea>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label>Clicks</label>
                                <input type="number" id="edit-drop-clicks" value="${drop.clicks || 0}">
                            </div>
                            <div class="form-group">
                                <label>Revenue ($)</label>
                                <input type="number" id="edit-drop-rev" step="0.01" value="${drop.rev || 0}">
                            </div>
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button type="submit" style="flex: 2; background: var(--accent-primary); border: none;">Update Record</button>
                    <button type="button" onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary); color: var(--text-primary);">Cancel</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    window._tempProcessedStats = { breakdown: drop.serverStats, totalIn: drop.totalIn, totalOut: drop.totalOut };
    const rawStatsArea = document.getElementById('edit-drop-raw-stats');

    rawStatsArea.oninput = () => {
        const text = rawStatsArea.value;
        const lines = text.split('\n');
        let totalIn = 0;
        let totalOut = 0;
        const breakdown = [];
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.includes('(IN)') || trimmed.includes('(OUT)')) return;
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 3) {
                const srvName = parts[0];
                const inVal = parseInt(parts[1]);
                const outVal = parseInt(parts[2]);
                if (!isNaN(inVal)) totalIn += inVal;
                if (!isNaN(outVal)) totalOut += outVal;
                if (!isNaN(outVal)) breakdown.push({ srv: srvName, in: inVal, out: outVal });
            }
        });
        window._tempProcessedStats = { breakdown, totalIn, totalOut };
        rawStatsArea.style.borderColor = totalOut > 0 ? 'var(--success)' : 'var(--border-color)';
    };

    document.getElementById('edit-drop-form').onsubmit = async (e) => {
        e.preventDefault();
        const updates = {
            entity: document.getElementById('edit-drop-entity').value,
            offer: document.getElementById('edit-drop-offer').value,
            deployIds: document.getElementById('edit-drop-deploys').value,
            ips: document.getElementById('edit-drop-ips').value,
            profile: document.getElementById('edit-drop-profile').value,
            testAfter: document.getElementById('edit-drop-test-after').value,
            returnPath: document.getElementById('edit-drop-return-path').value,
            totalIn: window._tempProcessedStats ? window._tempProcessedStats.totalIn : (drop.totalIn || 0),
            totalOut: window._tempProcessedStats ? window._tempProcessedStats.totalOut : (drop.totalOut || 0),
            clicks: document.getElementById('edit-drop-clicks').value,
            rev: document.getElementById('edit-drop-rev').value,
            serverStats: window._tempProcessedStats ? window._tempProcessedStats.breakdown : drop.serverStats
        };
        await window.app.updateDrop(dropId, updates);
        overlay.remove();
        window.app.updateDashboard();
    };
};

window.saveDqsKey = async (btn) => {
    const input = document.getElementById('dqs-key-input');
    const key = input.value.trim();
    const originalText = btn.innerText;
    btn.innerText = 'Saving...';
    btn.disabled = true;
    
    try {
        await window.db.ref('state/spamhausDqsKey').set(key);
        btn.innerText = 'Saved!';
        btn.style.background = 'var(--success)';
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = 'var(--accent-primary)';
            btn.disabled = false;
        }, 2000);
    } catch (e) {
        alert('Error saving key: ' + e.message);
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

window.triggerManualSpamhausCheck = (btn) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '10000';
    overlay.innerHTML = `
        <div class="modal" style="max-width: 500px; text-align: center; padding: 32px;">
            <div style="background: rgba(59, 130, 246, 0.1); color: var(--accent-primary); width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
                <i data-lucide="info" style="width: 32px;"></i>
            </div>
            <h2 style="margin: 0 0 12px 0;">Automated Scanning Active</h2>
            <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 24px;">
                Your Spamhaus scanner is now fully automated. It runs every day at <strong>09:00 AM (Moroccan Time)</strong> for 100% accuracy.
            </p>
            <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: left; font-size: 0.85rem;">
                <div style="font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">Need an instant refresh?</div>
                <div style="color: var(--text-secondary); font-family: monospace; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">python check_spamhaus_local.py</div>
                <p style="margin: 8px 0 0; font-size: 0.75rem;">Run this command in your project folder to update the dashboard immediately.</p>
            </div>
            <button onclick="this.closest('.modal-overlay').remove()" class="btn-primary" style="width: 100%;">Got it!</button>
        </div>
    `;
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
};

window.copySpamhausIps = (type) => {
    const app = window.app;
    const history = app.state.spamhausHistory || {};
    const today = new Date().toISOString().split('T')[0];
    const data = history[today] || { results: {} };
    const results = data.results || {};
    
    const ips = [];
    app.state.servers.forEach(s => {
        (s.allIps || []).forEach(ip => {
            const safeIp = ip.replace(/\./g, '_');
            const res = results[safeIp];
            if (type === 'clean') {
                // If it's CLEAN or we have no record (assume clean/pending if not in listed results)
                if (res && res.status === 'clean') ips.push(ip);
                else if (!res) ips.push(ip); 
            } else {
                if (res && res.status === 'listed') ips.push(ip);
            }
        });
    });

    if (ips.length === 0) {
        alert(`No ${type} IPs found for today.`);
        return;
    }

    navigator.clipboard.writeText(ips.join('\n')).then(() => {
        alert(`${ips.length} ${type} IPs copied to clipboard!`);
    });
};

window.triggerVMTACheck = async (btn) => {
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="refresh-cw" class="spin" style="width: 14px;"></i> Checking...';
    btn.disabled = true;
    
    const app = window.app;
    const ips = [];
    app.state.servers.forEach(s => (s.allIps || []).forEach(ip => ips.push(ip)));
    
    if (ips.length === 0) {
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
    }

    try {
        const response = await fetch('/api/check-vmta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ips })
        });
        
        if (!response.ok) throw new Error('API request failed');
        
        const data = await response.json();
        if (data.results) {
            app.state.vmtaResults = { ...app.state.vmtaResults, ...data.results };
            await app.saveState();
        }

        if (data.telegram) {
            try {
                const telObj = typeof data.telegram === 'string' ? JSON.parse(data.telegram) : data.telegram;
                if (!telObj.ok) {
                    console.warn('Telegram Notification Failed:', telObj.description || telObj.error);
                }
            } catch (e) {
                console.error('Error parsing telegram response:', e);
            }
        }
    } catch (err) {
        console.error('VMTA Check Error:', err);
        alert('VMTA Check failed: ' + err.message);
    } finally {
        app.updateDashboard();
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

window.showGmailSyncModal = () => {
    const app = window.app;
    const gmail = app.state.gmail || { email: '', password: '' };
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal" style="width: 450px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(234, 67, 53, 0.1); display: flex; align-items: center; justify-content: center; color: #EA4335;">
                    <i data-lucide="mail" style="width: 24px;"></i>
                </div>
                <div>
                    <h2 style="margin: 0; font-size: 1.25rem;">Gmail VMTA Sync</h2>
                    <p style="margin: 4px 0 0; font-size: 0.8rem; color: var(--text-secondary);">Scanning Inbox & Spam (Last 2 Hours).</p>
                </div>
            </div>

            <div class="form-group">
                <label>Gmail Address</label>
                <input type="email" id="gmail-email" value="${gmail.email}" placeholder="yourname@gmail.com" style="width:100%; padding:10px; background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); border-radius:8px;">
            </div>
            <div class="form-group">
                <label>App Password</label>
                <input type="password" id="gmail-password" value="${gmail.password}" placeholder="•••• •••• •••• ••••" style="width:100%; padding:10px; background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); border-radius:8px;">
                <p style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 6px;">
                    <i data-lucide="info" style="width: 10px; display: inline-block; margin-right: 2px;"></i>
                    Use a <a href="https://myaccount.google.com/apppasswords" target="_blank" style="color: var(--accent-primary);">Google App Password</a>.
                </p>
            </div>

            <div id="sync-progress-container" style="display: none; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 6px;">
                    <span id="sync-status-text">Ready</span>
                    <span id="sync-percent">0%</span>
                </div>
                <div style="width: 100%; height: 6px; background: var(--bg-tertiary); border-radius: 10px; overflow: hidden; border: 1px solid var(--border-color);">
                    <div id="sync-progress-bar" style="width: 0%; height: 100%; background: #EA4335; transition: width 0.3s ease;"></div>
                </div>
            </div>

            <div id="sync-results" style="margin-top: 16px; display: none; max-height: 200px; overflow-y: auto; background: var(--bg-tertiary); border-radius: 8px; border: 1px solid var(--border-color); padding: 12px;">
                <h4 style="font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 8px 0; text-transform: uppercase;">Found Mappings</h4>
                <div id="mappings-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 24px;">
                <button id="start-sync-btn" onclick="runGmailSync(this)" style="flex: 2; background: #EA4335; border: none;">Start Sync</button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary); color: var(--text-primary);">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
};

window.runGmailSync = async (btn) => {
    const email = document.getElementById('gmail-email').value.trim();
    const password = document.getElementById('gmail-password').value.trim();
    
    if (!email || !password) {
        alert('Please enter both Gmail address and App Password.');
        return;
    }

    const originalText = btn.innerText;
    btn.innerText = 'Scanning...';
    btn.disabled = true;

    // Show progress bar
    const progressContainer = document.getElementById('sync-progress-container');
    const progressBar = document.getElementById('sync-progress-bar');
    const statusText = document.getElementById('sync-status-text');
    const percentText = document.getElementById('sync-percent');
    
    progressContainer.style.display = 'block';
    
    const setProgress = (percent, text) => {
        progressBar.style.width = percent + '%';
        percentText.innerText = percent + '%';
        statusText.innerText = text;
    };

    setProgress(20, 'Connecting to Gmail...');

    // Get all current production IPs
    const targetIps = [];
    window.app.state.servers.forEach(srv => {
        (srv.allIps || []).forEach(ip => {
            if (!targetIps.includes(ip)) targetIps.push(ip);
        });
    });

    // Simulate progress while waiting for backend
    let currentProgress = 20;
    const interval = setInterval(() => {
        if (currentProgress < 85) {
            currentProgress += Math.random() * 5;
            let label = 'Scanning folders...';
            if (currentProgress > 50) label = 'Extracting mappings...';
            setProgress(Math.floor(currentProgress), label);
        }
    }, 800);

    try {
        const response = await fetch('/api/sync-gmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, targetIps })
        });

        const data = await response.json();
        clearInterval(interval);
        
        if (data.error) throw new Error(data.error);

        setProgress(100, 'Scan Complete!');

        const mappings = data.mappings || {};
        const count = Object.keys(mappings).length;

        if (count === 0) {
            alert('No IP-to-VMTA mappings found in recent emails.');
            btn.innerText = originalText;
            btn.disabled = false;
            return;
        }

        // Show results preview
        const resultsDiv = document.getElementById('sync-results');
        const listDiv = document.getElementById('mappings-list');
        resultsDiv.style.display = 'block';
        listDiv.innerHTML = '';
        
        Object.entries(mappings).forEach(([ip, vmta]) => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; font-size: 0.8rem; padding: 4px 8px; background: rgba(255,255,255,0.03); border-radius: 4px;';
            item.innerHTML = `<span>${ip}</span><span style="color: var(--accent-primary); font-weight: 600;">${vmta}</span>`;
            listDiv.appendChild(item);
        });

        // Automatically Apply and Track Changes
        btn.innerText = 'Applying...';
        
        let updateCount = 0;
        let changeSummary = [];

        window.app.state.servers.forEach(srv => {
            if (!srv.vmtaMap) srv.vmtaMap = {};
            (srv.allIps || []).forEach(ip => {
                if (mappings[ip]) {
                    const safeIp = ip.replace(/\./g, '_');
                    const oldVmta = srv.vmtaMap[safeIp] || '---';
                    const newVmta = mappings[ip];

                    if (oldVmta !== newVmta) {
                        srv.vmtaMap[safeIp] = newVmta;
                        updateCount++;
                        changeSummary.push(`• ${ip}: ${oldVmta} → ${newVmta}`);
                    }
                }
            });
        });

        // Save credentials and state
        window.app.state.gmail = { email, password };
        await window.app.saveState();
        window.app.updateDashboard();

        btn.innerText = `Updated ${updateCount} Mappings!`;
        setTimeout(() => {
            if (btn.closest('.modal-overlay')) btn.closest('.modal-overlay').remove();
        }, 2000);

    } catch (err) {
        alert('Sync Failed: ' + err.message);
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

// Remove old applyGmailMappings as it's now integrated
