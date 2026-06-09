window.withFocusPreservation = function(fn) {
    const activeElement = document.activeElement;
    const activeId = activeElement ? activeElement.id : null;
    let start = null;
    let end = null;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        try {
            start = activeElement.selectionStart;
            end = activeElement.selectionEnd;
        } catch(e) {}
    }

    fn();

    if (activeId) {
        const el = document.getElementById(activeId);
        if (el) {
            el.focus();
            if (start !== null && end !== null && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                try {
                    el.setSelectionRange(start, end);
                } catch(e) {}
            }
        }
    }
};

function getRootDomain(domain) {
    if (!domain) return '';
    const parts = domain.split('.');
    if (parts.length <= 2) return domain;
    
    const lastTwo = parts.slice(-2).join('.');
    const isMultiPartTld = lastTwo.match(/\.(com|net|org|edu|gov|co|org)\.[a-z]{2}$/i);
    
    if (isMultiPartTld) {
        return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
}

function renderLogin(app) {
    const container = document.getElementById('login-screen');
    container.innerHTML = `
        <div class="login-card">
            <div class="login-header" style="display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 24px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                    <i data-lucide="shield-check" style="color: var(--accent-primary); width: 40px; height: 40px;"></i>
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
            <i data-lucide="shield-check" style="color: var(--accent-primary); width: 32px; height: 32px;"></i>
            <span style="font-size: 1.5rem; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(135deg, var(--text-primary), var(--accent-primary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">GestiQ</span>
        </div>
        <div class="nav-group">
            <div class="nav-label">Main</div>
            <div class="nav-item ${view === 'overview' ? 'active' : ''}" onclick="app.setView('overview')">
                <i data-lucide="layout-dashboard"></i>
                <span>Dashboard</span>
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
                <div class="nav-item ${view === 'inventory' ? 'active' : ''}" onclick="app.setView('inventory')">
                    <i data-lucide="package"></i>
                    <span>Server Inventory</span>
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
            <div class="nav-item ${view === 'ai-agent' ? 'active' : ''}" onclick="app.setView('ai-agent')">
                <i data-lucide="bot"></i>
                <span>AI Agent</span>
            </div>
            <div class="nav-item ${view === 'rp-inventory' ? 'active' : ''}" onclick="app.setView('rp-inventory')">
                <i data-lucide="globe"></i>
                <span>RPs</span>
            </div>
            <div class="nav-item ${view === 'warmup' ? 'active' : ''}" onclick="app.setView('warmup')">
                <i data-lucide="trending-up"></i>
                <span>Warmup Progress</span>
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
    const rpSpfProgress = app.state.rpSpfProgress || { status: 'idle', current: 0, total: 0 };
    const isSpfRunning = rpSpfProgress.status === 'running' && (Date.now() - (rpSpfProgress.timestamp || 0) < 30000);
    const checking = app.state.rpSpfChecking || isSpfRunning;

    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: var(--spacing-md);">
            <h2 style="font-size: 1.1rem; font-weight: 600;">${app.state.currentView === 'drops' ? 'Drop Details' : (app.state.currentView === 'rp-inventory' ? 'RPs' : app.state.currentView.charAt(0).toUpperCase() + app.state.currentView.slice(1))}</h2>
        </div>
        <div style="display: flex; align-items: center; gap: var(--spacing-md);">
            ${app.state.currentUser.role === 'admin' && app.state.currentView === 'management' ? `
                <button onclick="showAddServerModal()" style="padding: 6px 12px; font-size: 0.8rem; width: auto; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary);">+ Server</button>
                <button onclick="showAddRPModal()" style="padding: 6px 12px; font-size: 0.8rem; width: auto;">+ RP</button>
            ` : ''}
            ${app.state.currentView === 'rp-inventory' && app.state.currentUser.role === 'admin' ? `
                <button onclick="window.app.triggerRPSpfCheck()" ${checking ? 'disabled' : ''} style="padding: 6px 12px; font-size: 0.8rem; width: auto; background: var(--accent-primary); border: none; color: white;">
                    ${checking ? 'Checking...' : '<i data-lucide="refresh-cw" style="width:12px; vertical-align:middle; margin-right:4px;"></i> Check SPF'}
                </button>
                <button onclick="window.app.bulkAutoDetectRPSpf()" ${app.state.rpAutoDetecting ? 'disabled' : ''} style="padding: 6px 12px; font-size: 0.8rem; width: auto; background: #8B5CF6; border: none; color: white;">
                    ${app.state.rpAutoDetecting ? '<i data-lucide="loader" class="spin" style="width:12px; vertical-align:middle; margin-right:4px;"></i> Detecting ' + (app.state.rpAutoDetectProgress ? app.state.rpAutoDetectProgress.current + '/' + app.state.rpAutoDetectProgress.total : '...') : '<i data-lucide="scan" style="width:12px; vertical-align:middle; margin-right:4px;"></i> Auto-Detect All'}
                </button>
                <button onclick="showImportRPInventoryModal()" style="padding: 6px 12px; font-size: 0.8rem; width: auto; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary);"><i data-lucide="upload" style="width:12px; vertical-align:middle; margin-right:4px;"></i> Bulk Import</button>
                <button onclick="showAddRPInventoryItemModal()" style="padding: 6px 12px; font-size: 0.8rem; width: auto;"><i data-lucide="plus" style="width:12px; vertical-align:middle; margin-right:4px;"></i> New RP</button>
            ` : ''}
            ${app.state.currentUser.role === 'admin' && app.state.currentView === 'team' ? `
                <button onclick="showAddMailerModal()" style="padding: 6px 12px; font-size: 0.8rem; width: auto;">+ Mailer</button>
            ` : ''}
            ${app.state.currentUser.role === 'admin' && app.state.currentView === 'tools' && (!app.state.toolsActiveTab || app.state.toolsActiveTab === 'hosted') ? `
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
    } else if (view === 'inventory') {
        renderServerInventory(app, container);
    } else if (view === 'history') {
        renderCanceledServers(app, container);
    } else if (view === 'spamhaus') {
        renderSpamhaus(app, container);
    } else if (view === 'ai-agent') {
        renderAiAgent(app, container);
    } else if (view === 'rp-inventory') {
        renderRPsInventory(app, container);
    } else if (view === 'warmup') {
        renderWarmupProgress(app, container);
    }
}

function renderCanceledServers(app, container) {
    const { historyServers = [] } = app.state;
    const sorted = [...historyServers].sort((a, b) => b.canceledAt.localeCompare(a.canceledAt));

    container.innerHTML = `
        <div style="padding: 24px;">
            <div class="card" style="padding: 0; overflow: hidden; background: var(--bg-secondary); border: 1px solid var(--border-color);">
                <div style="padding: 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02);">
                    <div>
                        <h3 style="margin: 0; font-size: 1.1rem;">Canceled Servers Archive</h3>
                        <p style="margin: 4px 0 0; font-size: 0.8rem; color: var(--text-secondary);">Review decommissioned infrastructure and total earnings.</p>
                    </div>
                </div>
                
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.75rem;">
                        <thead>
                            <tr style="text-align: left; background: var(--bg-tertiary);">
                                <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Server Name</th>
                                <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Provider</th>
                                <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Entity</th>
                                <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Group</th>
                                <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Revenue</th>
                                <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Entered</th>
                                <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); color: #ef4444;">Canceled Date</th>
                                <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); text-align: center; width: 100px;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sorted.map((s, idx) => {
                                const rowBg = idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';
                                return `
                                    <tr style="background: ${rowBg}; border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 12px; font-weight: 700; color: var(--text-secondary);">${s.name}</td>
                                        <td style="padding: 12px;">${s.provider || '---'}</td>
                                        <td style="padding: 12px;">${s.entity || '---'}</td>
                                        <td style="padding: 12px;">${s.group || '---'}</td>
                                        <td style="padding: 12px; color: var(--accent-primary); font-weight: 700;">$${s.revenue || '0.00'}</td>
                                        <td style="padding: 12px;">${s.enteredDate || '---'}</td>
                                        <td style="padding: 12px; color: #ef4444; font-weight: 700;">${s.canceledAt || '---'}</td>
                                        <td style="padding: 12px; text-align: center;">
                                            <button onclick="restoreCanceledServer('${s.id}')"
                                                style="padding: 4px 8px; font-size: 0.65rem; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; width: auto; border-radius: 4px; cursor: pointer;"
                                                onmouseover="this.style.background='#10b981'; this.style.color='#fff'"
                                                onmouseout="this.style.background='rgba(16, 185, 129, 0.15)'; this.style.color='#34d399'">
                                                Back to Prod
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                            ${historyServers.length === 0 ? '<tr><td colspan="8" style="padding: 60px; text-align: center; color: var(--text-secondary);">No canceled servers in archive.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

window.toggleServerCancelMark = async (id) => {
    const srv = window.app.state.servers.find(s => s.id === id);
    if (!srv) return;
    
    srv.markedForCancel = !srv.markedForCancel;
    if (srv.markedForCancel) {
        srv.reqAt = new Date().toISOString().split('T')[0];
    } else {
        srv.reqAt = '';
    }
    await window.app.saveState();
    window.app.updateDashboard();
};

window.cancelServerImmediately = async (id) => {
    const srv = window.app.state.servers.find(s => s.id === id);
    if (!srv) return;
    
    if (!confirm(`Are you sure you want to cancel server "${srv.name}" immediately? It will be archived and removed from active inventory.`)) {
        return;
    }
    
    let totalRev = 0;
    const drops = window.app.state.drops || [];
    drops.forEach(drop => {
        const srvStat = (drop.serverStats || []).find(st => st.srv === srv.name);
        if (srvStat) {
            totalRev += parseFloat(drop.rev || 0);
        }
    });
    
    if (!window.app.state.historyServers) {
        window.app.state.historyServers = [];
    }
    
    const todayStr = new Date().toISOString().split('T')[0];
    window.app.state.historyServers.push({
        ...srv,
        canceledAt: todayStr,
        revenue: totalRev.toFixed(2),
        originalId: srv.id
    });
    
    window.app.state.servers = window.app.state.servers.filter(s => s.id !== id);
    await window.app.saveState();
    window.app.updateDashboard();
};

window.restoreCanceledServer = async (id) => {
    const srv = window.app.state.historyServers.find(s => s.id === id);
    if (!srv) return;
    
    if (!confirm(`Are you sure you want to restore server "${srv.name}" back to active production?`)) {
        return;
    }
    
    // Safety check: is there another active server with the same name or ID?
    const exists = window.app.state.servers.find(s => s.name === srv.name || s.id === srv.id);
    if (exists) {
        alert(`A server with name "${srv.name}" or ID "${srv.id}" already exists in active inventory! Cannot restore.`);
        return;
    }
    
    const restored = { ...srv };
    delete restored.canceledAt;
    delete restored.revenue;
    delete restored.originalId;
    
    restored.markedForCancel = false;
    restored.reqAt = '';
    // Keep restored.cancelDate and restored.cancelNoticeDate so they don't disappear
    
    // Remove from history
    window.app.state.historyServers = window.app.state.historyServers.filter(s => s.id !== id);
    
    // Add to active
    window.app.state.servers.push(restored);
    
    await window.app.saveState();
    window.app.updateDashboard();
};

window.restoreActiveServerToProd = async (id) => {
    const srv = window.app.state.servers.find(s => s.id === id);
    if (!srv) return;
    
    if (!confirm(`Are you sure you want to restore server "${srv.name}" back to active production?`)) {
        return;
    }
    
    srv.markedForCancel = false;
    srv.reqAt = '';
    // Keep srv.cancelDate and srv.cancelNoticeDate so they don't disappear
    
    await window.app.saveState();
    window.app.updateDashboard();
};



window.toggleServerWarmupType = async (serverId) => {
    const srv = window.app.state.servers.find(s => s.id === serverId);
    if (srv) {
        const cur = srv.warmupType || 'RDNS';
        if (cur === 'RDNS') {
            srv.warmupType = 'RP';
        } else if (cur === 'RP' || cur === 'Domain RP') {
            srv.warmupType = 'Switch';
        } else {
            srv.warmupType = 'RDNS';
        }
        await window.app.saveState();
        window.app.updateDashboard();
    }
};


window.updateServerField = async (serverId, field, value) => {
    const srv = window.app.state.servers.find(s => s.id === serverId);
    if (srv) {
        const cleanVal = value.replace(/\u00a0/g, ' ').trim();
        if (srv[field] !== cleanVal) {
            srv[field] = cleanVal;
            if (field === 'mainIp') {
                srv.ip = cleanVal;
            }
            await window.app.saveState();
            window.app.updateDashboard();
        }
    }
};

function renderServerInventory(app, container) {
    const { servers } = app.state;
    const safeServers = (servers || []).filter(s => s);
    const sortedServers = [...safeServers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const activeFilter = window._activeInventoryFilter || 'keep';
    const serversToKeepCount = safeServers.filter(s => s.markedForCancel !== true).length;
    const allActiveCount = safeServers.length;

    const filteredActiveServers = sortedServers.filter(s => {
        if (activeFilter === 'keep') {
            return s.markedForCancel !== true;
        }
        return true;
    });

    container.innerHTML = `
        <div style="padding: 24px;">
            <div class="card" style="padding: 0; overflow: hidden; background: var(--bg-secondary); border: 1px solid var(--border-color);">
                <div style="padding: 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02);">
                    <div>
                        <h3 style="margin: 0; font-size: 1.1rem;">Server Inventory</h3>
                        <p style="margin: 4px 0 0; font-size: 0.8rem; color: var(--text-secondary);">Manage administrative details and cancellation schedules.</p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="showChangeDomainModal()" style="padding: 8px 16px; font-size: 0.8rem; display: flex; align-items: center; gap: 8px; width: auto; background: var(--bg-tertiary); border: 1px solid var(--border-color);">
                            <i data-lucide="globe" style="width: 14px;"></i> Change Domain
                        </button>
                        <button onclick="showBulkDeclareCancelModal()" style="padding: 8px 16px; font-size: 0.8rem; display: flex; align-items: center; gap: 8px; width: auto; background: var(--bg-tertiary); border: 1px solid #ef444455; color: #f87171;">
                            <i data-lucide="trash-2" style="width: 14px;"></i> Bulk Declare Cancel
                        </button>
                        <button onclick="showBulkImportInventoryModal()" style="padding: 8px 16px; font-size: 0.8rem; display: flex; align-items: center; gap: 8px; width: auto; background: var(--bg-tertiary); border: 1px solid var(--border-color);">
                            <i data-lucide="file-text" style="width: 14px;"></i> Bulk Import Details
                        </button>
                    </div>
                </div>

                <div style="padding: 0 20px; border-bottom: 1px solid var(--border-color); display: flex; gap: 24px; background: rgba(255,255,255,0.01);">
                    <div id="tab-active" class="tab ${(!window._activeInventoryTab || window._activeInventoryTab === 'active') ? 'active' : ''}" onclick="window.switchInventoryTab('active')" style="padding: 14px 4px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border-bottom: 2px solid ${(!window._activeInventoryTab || window._activeInventoryTab === 'active') ? 'var(--accent-primary)' : 'transparent'}; color: ${(!window._activeInventoryTab || window._activeInventoryTab === 'active') ? 'var(--text-primary)' : 'var(--text-secondary)'};">
                        Active Inventory (${safeServers.length})
                    </div>
                    <div id="tab-history" class="tab ${window._activeInventoryTab === 'history' ? 'active' : ''}" onclick="window.switchInventoryTab('history')" style="padding: 14px 4px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border-bottom: 2px solid ${window._activeInventoryTab === 'history' ? 'var(--accent-primary)' : 'transparent'}; color: ${window._activeInventoryTab === 'history' ? 'var(--text-primary)' : 'var(--text-secondary)'};">
                        Canceled History (${(app.state.historyServers || []).length})
                    </div>
                    <div id="tab-domain-history" class="tab ${window._activeInventoryTab === 'domain_history' ? 'active' : ''}" onclick="window.switchInventoryTab('domain_history')" style="padding: 14px 4px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border-bottom: 2px solid ${window._activeInventoryTab === 'domain_history' ? 'var(--accent-primary)' : 'transparent'}; color: ${window._activeInventoryTab === 'domain_history' ? 'var(--text-primary)' : 'var(--text-secondary)'};">
                        Domain Change History (${(app.state.domainChangeHistory || []).length})
                    </div>
                </div>

                ${(!window._activeInventoryTab || window._activeInventoryTab === 'active') ? `
                <div style="padding: 12px 20px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; gap: 16px; background: rgba(255,255,255,0.015);">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Filter:</div>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="window.switchActiveInventoryFilter('keep')" 
                                    style="padding: 6px 14px; font-size: 0.75rem; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s;
                                           background: ${activeFilter === 'keep' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)'};
                                           color: ${activeFilter === 'keep' ? 'var(--accent-primary)' : 'var(--text-secondary)'};
                                           border: 1px solid ${activeFilter === 'keep' ? 'var(--accent-primary)' : 'var(--border-color)'};">
                                To keep Servers (${serversToKeepCount})
                            </button>
                            <button onclick="window.switchActiveInventoryFilter('all')" 
                                    style="padding: 6px 14px; font-size: 0.75rem; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s;
                                           background: ${activeFilter === 'all' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)'};
                                           color: ${activeFilter === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)'};
                                           border: 1px solid ${activeFilter === 'all' ? 'var(--accent-primary)' : 'var(--border-color)'};">
                                All active (${allActiveCount})
                            </button>
                        </div>
                    </div>
                    <button onclick="window.copyServersToKeep(this)" 
                            style="padding: 6px 12px; font-size: 0.75rem; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s;
                                   background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); display: flex; align-items: center; gap: 6px; width: auto;">
                        <i data-lucide="copy" style="width: 12px;"></i> Copy "To Keep" Servers
                    </button>
                </div>
                ` : ''}
                
                <div style="overflow-x: auto;">
                    ${window._activeInventoryTab === 'history' 
                        ? renderHistoryTable(app) 
                        : (window._activeInventoryTab === 'domain_history' 
                            ? renderDomainChangeHistoryTable(app) 
                            : renderActiveTable(app, filteredActiveServers))}
                </div>
            </div>
        </div>
    `;
    const domainSearchInput = document.getElementById('domain-history-search');
    if (domainSearchInput) {
        domainSearchInput.focus();
        const val = domainSearchInput.value;
        domainSearchInput.value = '';
        domainSearchInput.value = val;
    }
    if (window.lucide) window.lucide.createIcons();
}

window.switchInventoryTab = (tab) => {
    window._activeInventoryTab = tab;
    window.app.updateDashboard();
};

window.switchActiveInventoryFilter = (filter) => {
    window._activeInventoryFilter = filter;
    window.app.updateDashboard();
};

window.copyServersToKeep = (btn) => {
    const servers = window.app.state.servers || [];
    const names = servers
        .filter(s => s && s.markedForCancel !== true)
        .map(s => s.name || '')
        .filter(name => name.trim() !== '')
        .sort((a, b) => a.localeCompare(b));
        
    const textToCopy = names.join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
        const origHtml = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="check" style="width: 12px; height: 12px; color: #10b981;"></i> Copied!`;
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
            btn.innerHTML = origHtml;
            if (window.lucide) window.lucide.createIcons();
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy server names:', err);
    });
};

function renderActiveTable(app, sortedServers) {
    return `
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.75rem;">
            <thead>
                <tr style="text-align: left; background: var(--bg-tertiary);">
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); position: sticky; left: 0; background: var(--bg-tertiary); z-index: 10;">Server Name</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Class (IP Ranges)</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Main IP</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); text-align: center; width: 100px;">Warmup Type</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Entered</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Entity</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Group</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">IP Provider</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">ASN</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); color: #ef4444;">Cancel Notice</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Req. At</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); color: #ef4444; font-weight: 700;">Cancel Date</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); width: 100px;">To Cancel?</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); width: 40px;"></th>
                </tr>
            </thead>
            <tbody>
                ${sortedServers.map((s, idx) => {
                    const isMarked = s.markedForCancel === true;
                    const defaultBg = isMarked ? 'rgba(249, 115, 22, 0.05)' : (idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent');
                    const hoverBg = isMarked ? 'rgba(249, 115, 22, 0.1)' : 'rgba(59, 130, 246, 0.05)';
                    return `
                        <tr style="background: ${defaultBg}; border-bottom: 1px solid ${isMarked ? '#f97316' : 'var(--border-color)'}; transition: background 0.2s;" onmouseover="this.style.background='${hoverBg}'" onmouseout="this.style.background='${defaultBg}'">
                            <td contenteditable="true" onblur="updateServerField('${s.id}', 'name', this.innerText)" style="padding: 12px; font-weight: 700; color: ${isMarked ? '#f97316' : 'var(--accent-primary)'}; border-right: 1px solid var(--border-color); position: sticky; left: 0; background: inherit; z-index: 5; cursor: text;">${s.name || '&nbsp;'}</td>
                            <td contenteditable="true" onblur="updateServerField('${s.id}', 'ipClass', this.innerText)" style="padding: 12px; color: var(--text-secondary); max-width: 250px; line-height: 1.4; cursor: text;">${s.ipClass || '&nbsp;'}</td>
                            <td contenteditable="true" onblur="updateServerField('${s.id}', 'mainIp', this.innerText)" style="padding: 12px; font-family: monospace; cursor: text;">${s.mainIp || s.ip || '&nbsp;'}</td>
                            <td style="padding: 12px; text-align: center;">
                                <select onchange="updateServerField('${s.id}', 'warmupType', this.value)" style="background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 6px; font-size: 0.7rem; cursor: pointer; outline: none; width: 95px;">
                                    <option value="RDNS" ${s.warmupType === 'RDNS' || !s.warmupType ? 'selected' : ''}>RDNS</option>
                                    <option value="RP" ${s.warmupType === 'RP' || s.warmupType === 'Domain RP' ? 'selected' : ''}>RP</option>
                                    <option value="Switch" ${s.warmupType === 'Switch' ? 'selected' : ''}>Switch</option>
                                </select>
                            </td>
                            <td contenteditable="true" onblur="updateServerField('${s.id}', 'enteredDate', this.innerText)" style="padding: 12px; cursor: text;">${s.enteredDate || '&nbsp;'}</td>
                            <td contenteditable="true" onblur="updateServerField('${s.id}', 'entity', this.innerText)" style="padding: 12px; font-weight: 600; color: var(--accent-primary); cursor: text;">${s.entity || '&nbsp;'}</td>
                            <td contenteditable="true" onblur="updateServerField('${s.id}', 'group', this.innerText)" style="padding: 12px; cursor: text;">${s.group || '&nbsp;'}</td>
                            <td contenteditable="true" onblur="updateServerField('${s.id}', 'provider', this.innerText)" style="padding: 12px; font-weight: 600; cursor: text;">${s.provider || '&nbsp;'}</td>
                            <td contenteditable="true" onblur="updateServerField('${s.id}', 'asn', this.innerText)" style="padding: 12px; color: var(--text-secondary); font-size: 0.7rem; cursor: text;">${s.asn || '&nbsp;'}</td>
                            <td contenteditable="true" onblur="updateServerField('${s.id}', 'cancelNoticeDate', this.innerText)" style="padding: 12px; color: #f87171; cursor: text;">${s.cancelNoticeDate || '&nbsp;'}</td>
                            <td contenteditable="true" onblur="updateServerField('${s.id}', 'reqAt', this.innerText)" style="padding: 12px; cursor: text;">${s.reqAt || '&nbsp;'}</td>
                            <td contenteditable="true" onblur="updateServerField('${s.id}', 'cancelDate', this.innerText)" style="padding: 12px; color: #ef4444; font-weight: 700; background: rgba(239, 68, 68, 0.03); cursor: text;">${s.cancelDate || '&nbsp;'}</td>
                            <td style="padding: 12px; text-align: center;">
                                <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                                    ${isMarked ? `
                                        <button onclick="restoreActiveServerToProd('${s.id}')" 
                                            style="padding: 4px 8px; font-size: 0.65rem; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; width: auto; border-radius: 4px; cursor: pointer;"
                                            onmouseover="this.style.background='#10b981'; this.style.color='#fff'"
                                            onmouseout="this.style.background='rgba(16, 185, 129, 0.15)'; this.style.color='#34d399'">
                                            BACK TO PROD
                                        </button>
                                    ` : `
                                        <button onclick="toggleServerCancelMark('${s.id}')" 
                                            style="padding: 4px 8px; font-size: 0.65rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-secondary); width: auto; border-radius: 4px; cursor: pointer;">
                                            KEEP
                                        </button>
                                    `}
                                    <button onclick="cancelServerImmediately('${s.id}')" 
                                        style="padding: 4px 8px; font-size: 0.65rem; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef444433; color: #f87171; width: auto; border-radius: 4px; cursor: pointer;"
                                        onmouseover="this.style.background='#ef4444'; this.style.color='#fff'"
                                        onmouseout="this.style.background='rgba(239, 68, 68, 0.15)'; this.style.color='#f87171'">
                                        CANCEL NOW
                                    </button>
                                </div>
                            </td>
                            <td style="padding: 12px; text-align: center;">
                                <span class="action-icon" onclick="refreshServerInfo('${s.id}', this)" title="Refresh IP Info">
                                    <i data-lucide="refresh-cw" style="width: 12px;"></i>
                                </span>
                            </td>
                        </tr>
                    `;
                }).join('')}
                ${sortedServers.length === 0 ? '<tr><td colspan="14" style="padding: 60px; text-align: center; color: var(--text-secondary);">No active servers in inventory.</td></tr>' : ''}
            </tbody>
        </table>
    `;
}

function renderHistoryTable(app) {
    const { historyServers = [] } = app.state;
    const sorted = [...historyServers].sort((a, b) => b.canceledAt.localeCompare(a.canceledAt));
    return `
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.75rem;">
            <thead>
                <tr style="text-align: left; background: var(--bg-tertiary);">
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Server Name</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Provider</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Entity</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Group</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Revenue</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Entered</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); color: #ef4444;">Canceled Date</th>
                    <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); text-align: center; width: 100px;">Action</th>
                </tr>
            </thead>
            <tbody>
                ${sorted.map((s, idx) => {
                    const rowBg = idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';
                    return `
                        <tr style="background: ${rowBg}; border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 12px; font-weight: 700; color: var(--text-secondary);">${s.name}</td>
                            <td style="padding: 12px;">${s.provider || '---'}</td>
                            <td style="padding: 12px;">${s.entity || '---'}</td>
                            <td style="padding: 12px;">${s.group || '---'}</td>
                            <td style="padding: 12px; color: var(--accent-primary); font-weight: 700;">$${s.revenue || '0.00'}</td>
                            <td style="padding: 12px;">${s.enteredDate || '---'}</td>
                            <td style="padding: 12px; color: #ef4444; font-weight: 700;">${s.canceledAt || '---'}</td>
                            <td style="padding: 12px; text-align: center;">
                                <button onclick="restoreCanceledServer('${s.id}')"
                                    style="padding: 4px 8px; font-size: 0.65rem; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; width: auto; border-radius: 4px; cursor: pointer;"
                                    onmouseover="this.style.background='#10b981'; this.style.color='#fff'"
                                    onmouseout="this.style.background='rgba(16, 185, 129, 0.15)'; this.style.color='#34d399'">
                                    Back to Prod
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
                ${historyServers.length === 0 ? '<tr><td colspan="8" style="padding: 60px; text-align: center; color: var(--text-secondary);">No canceled servers in archive.</td></tr>' : ''}
            </tbody>
        </table>
    `;
}

window.autoFetchIpInfo = async (ip) => {
    if (!ip || !ip.includes('.')) return;
    
    const providerInput = document.getElementById('srv-provider');
    const asnInput = document.getElementById('srv-asn');
    
    if (!providerInput || !asnInput) return;

    const originalProvider = providerInput.value;
    const originalAsn = asnInput.value;
    
    // Only fetch if fields are empty to avoid overwriting manual entries
    if (originalProvider && originalAsn) return;

    providerInput.value = 'Fetching...';
    asnInput.value = 'Fetching...';

    try {
        const response = await fetch('/api/get-ip-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip })
        });
        
        const data = await response.json();
        
        if (data.provider) providerInput.value = data.provider;
        else providerInput.value = originalProvider;
        
        if (data.asn) asnInput.value = data.asn;
        else asnInput.value = originalAsn;

    } catch (err) {
        console.warn('IP Auto-fetch failed:', err);
        providerInput.value = originalProvider;
        asnInput.value = originalAsn;
    }
};

window.showBulkImportInventoryModal = () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal" style="width: 700px;">
            <h2 style="margin-bottom: 8px;">Bulk Import Server Details</h2>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 20px;">
                Paste your list from Excel. Format: <br>
                <code>ServerName | Class | MainIP | Entered | Entity | Group | Provider | ASN | Notice | ReqAt | CancelDate</code>
            </p>
            
            <textarea id="import-data" placeholder="s_wmn3_2232	134.119.206.176/29	134.119.206.178	2026-05-14	WMN3	WMN	velia	* velia.net..." 
                style="width: 100%; height: 300px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 0.75rem; margin-bottom: 20px;"></textarea>

            <div style="display: flex; gap: 12px;">
                <button onclick="importInventoryData(this)" style="flex: 2;">Import & Apply to Inventory</button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary); color: var(--text-primary);">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
};

window.importInventoryData = async (btn) => {
    const text = document.getElementById('import-data').value;
    if (!text.trim()) return;

    btn.innerText = 'Parsing...';
    btn.disabled = true;

    const lines = text.split('\n').filter(l => l.trim() !== '');
    const servers = window.app.state.servers;
    let updateCount = 0;

    for (const line of lines) {
        // Handle both tab and multiple space separation
        const parts = line.split(/\t/).map(p => p.trim());
        if (parts.length < 2) continue;

        const name = parts[0];
        const srv = servers.find(s => s.name === name);

        if (srv) {
            // Mapping based on the user's columns
            if (parts[1]) srv.ipClass = parts[1];
            if (parts[2]) srv.mainIp = parts[2];
            if (parts[3]) srv.enteredDate = parts[3];
            if (parts[4]) srv.entity = parts[4];
            if (parts[5]) srv.group = parts[5];
            if (parts[6]) srv.provider = parts[6];
            if (parts[7]) srv.asn = parts[7];
            
            // Smarter logic for the last 3 date columns which can be tricky
            // Cancellation Date is always the LAST one
            if (parts.length >= 10) {
                srv.cancelDate = parts[parts.length - 1];
                // Req.At is often the second or third from last depending on the 'User' column
                // We'll look for the notice date around index 8
                if (parts[8]) srv.cancelNoticeDate = parts[8];
                
                // For Req At, we take what's between Notice and Cancel Date
                const middleParts = parts.slice(9, parts.length - 1);
                if (middleParts.length > 0) {
                    srv.reqAt = middleParts.join(' ');
                }
            }
            
            updateCount++;
        }
    }

    if (updateCount > 0) {
        await window.app.saveState();
        window.app.updateDashboard();
        btn.closest('.modal-overlay').remove();
        alert(`Successfully updated ${updateCount} servers in inventory!`);
    } else {
        btn.innerText = 'Import & Apply to Inventory';
        btn.disabled = false;
        alert('No matching server names found. Please check your data.');
    }
};

function renderDomainChangeHistoryTable(app) {
    const history = app.state.domainChangeHistory || [];
    const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
    const viewMode = window._domainHistoryViewMode || 'grouped';
    const query = (window._domainHistorySearch || '').toLowerCase().trim();

    let content = '';

    if (viewMode === 'grouped') {
        // Group history entries by IP
        const ipHistoryMap = {};
        history.forEach(h => {
            if (!ipHistoryMap[h.ip]) {
                ipHistoryMap[h.ip] = [];
            }
            ipHistoryMap[h.ip].push(h);
        });

        // For each IP, sort history by timestamp descending
        let ipList = Object.keys(ipHistoryMap).map(ip => {
            const changes = [...ipHistoryMap[ip]].sort((a, b) => b.timestamp - a.timestamp);
            return {
                ip,
                changes
            };
        }).sort((a, b) => b.changes[0].timestamp - a.changes[0].timestamp); // Sort IPs by most recent change

        // Apply search filter if query is present
        if (query) {
            ipList = ipList.filter(item => {
                const currentDomain = getRdns(item.ip, app.state) || '---';
                const ipMatches = item.ip.toLowerCase().includes(query);
                const currentDomainMatches = currentDomain.toLowerCase().includes(query);
                
                const server = app.state.servers && app.state.servers.find(s => s.allIps && s.allIps.includes(item.ip));
                const serverName = server ? server.name.toLowerCase() : '';
                const serverMatches = serverName.includes(query);

                const timelineMatches = item.changes.some(c => 
                    (c.oldDomain || '').toLowerCase().includes(query) || 
                    (c.newDomain || '').toLowerCase().includes(query) ||
                    (c.operator || '').toLowerCase().includes(query)
                );

                return ipMatches || currentDomainMatches || serverMatches || timelineMatches;
            });
        }

        content = `
            <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.75rem;">
                <thead>
                    <tr style="text-align: left; background: var(--bg-tertiary);">
                        <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); width: 180px;">IP Address</th>
                        <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); width: 220px;">Current Domain (RDNS)</th>
                        <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Domain History Timeline (Up to 6 Changes & Change Dates)</th>
                    </tr>
                </thead>
                <tbody>
                    ${ipList.length === 0 ? `
                        <tr>
                            <td colspan="3" style="padding: 60px; text-align: center; color: var(--text-secondary); font-size: 0.8rem;">No matching history entries found.</td>
                        </tr>
                    ` : ipList.map((item, idx) => {
                        const currentDomain = getRdns(item.ip, app.state) || '---';
                        // Keep last 6 changes
                        const displayedChanges = item.changes.slice(0, 6);
                        
                        return `
                            <tr style="background: ${idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'}; border-bottom: 1px solid var(--border-color); vertical-align: top;">
                                <td style="padding: 16px 12px; font-family: monospace; font-weight: 700; color: var(--text-primary); border-right: 1px solid var(--border-color);">${item.ip}</td>
                                <td style="padding: 16px 12px; font-family: monospace; color: #4ade80; border-right: 1px solid var(--border-color);">${currentDomain}</td>
                                <td style="padding: 16px 12px;">
                                    <div style="display: flex; flex-direction: column; gap: 8px;">
                                        ${displayedChanges.map((c, cIdx) => `
                                            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-tertiary); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.7rem;">
                                                <div style="display: flex; align-items: center; gap: 8px;">
                                                    <span style="background: rgba(239, 68, 68, 0.1); color: #f87171; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${c.oldDomain || '---'}</span>
                                                    <span style="color: var(--text-secondary); font-size: 0.65rem;">&rarr;</span>
                                                    <span style="background: rgba(74, 222, 128, 0.1); color: #4ade80; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: 600;">${c.newDomain}</span>
                                                </div>
                                                <div style="color: var(--text-secondary); font-size: 0.65rem; display: flex; gap: 12px; align-items: center;">
                                                    <span style="display: flex; align-items: center; gap: 4px;">
                                                        <i data-lucide="calendar" style="width: 12px; color: var(--accent-primary);"></i>
                                                        ${new Date(c.timestamp).toLocaleString()}
                                                    </span>
                                                    <span style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; color: var(--text-primary); font-weight: 500;">
                                                        <i data-lucide="user" style="width: 10px; display: inline; margin-right: 2px;"></i>${c.operator || 'Unknown'}
                                                    </span>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    } else {
        let displayedHistory = sortedHistory;
        if (query) {
            displayedHistory = sortedHistory.filter(h => {
                const ipMatches = h.ip.toLowerCase().includes(query);
                
                const server = app.state.servers && app.state.servers.find(s => s.allIps && s.allIps.includes(h.ip));
                const serverName = server ? server.name.toLowerCase() : '';
                const serverMatches = serverName.includes(query);

                const oldDomainMatches = (h.oldDomain || '').toLowerCase().includes(query);
                const newDomainMatches = (h.newDomain || '').toLowerCase().includes(query);
                const operatorMatches = (h.operator || '').toLowerCase().includes(query);

                return ipMatches || serverMatches || oldDomainMatches || newDomainMatches || operatorMatches;
            });
        }

        content = `
            <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.75rem;">
                <thead>
                    <tr style="text-align: left; background: var(--bg-tertiary);">
                        <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); width: 180px;">Date/Time</th>
                        <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); width: 150px;">IP Address</th>
                        <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Old Domain (RDNS)</th>
                        <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">New Domain (RDNS)</th>
                        <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); width: 150px;">Operator</th>
                    </tr>
                </thead>
                <tbody>
                    ${displayedHistory.length === 0 ? `
                        <tr>
                            <td colspan="5" style="padding: 60px; text-align: center; color: var(--text-secondary); font-size: 0.8rem;">No matching history entries found.</td>
                        </tr>
                    ` : displayedHistory.map((h, idx) => `
                        <tr style="background: ${idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'}; border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 14px 12px; color: var(--text-secondary);">${new Date(h.timestamp).toLocaleString()}</td>
                            <td style="padding: 14px 12px; font-family: monospace; font-weight: 700; color: var(--text-primary);">${h.ip}</td>
                            <td style="padding: 14px 12px; font-family: monospace; color: #f87171;">${h.oldDomain || '---'}</td>
                            <td style="padding: 14px 12px; font-family: monospace; color: #4ade80;">${h.newDomain || '---'}</td>
                            <td style="padding: 14px 12px; font-weight: 500; color: var(--text-secondary);">${h.operator || 'Unknown'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    return `
        <div style="padding: 12px 20px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 16px; flex: 1; min-width: 300px;">
                <div style="position: relative; width: 300px;">
                    <i data-lucide="search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 14px; color: var(--text-secondary);"></i>
                    <input type="text" id="domain-history-search" placeholder="Search by IP, Server, or Domain..." value="${window._domainHistorySearch || ''}" 
                           oninput="window._domainHistorySearch = this.value; window.app.updateDashboard();"
                           style="width: 100%; padding: 8px 12px 8px 32px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.8rem; color: var(--text-primary); outline: none;">
                </div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">
                    ${viewMode === 'grouped' ? 'Grouped by IP (shows up to last 6 domain changes per IP with their change dates)' : 'Flat list of all domain changes'}
                </div>
            </div>
            <div style="display: flex; gap: 8px; background: var(--bg-tertiary); padding: 4px; border-radius: 8px; border: 1px solid var(--border-color);">
                <button onclick="window._domainHistoryViewMode = 'grouped'; window.app.updateDashboard();" 
                    style="padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; border: none; background: ${viewMode === 'grouped' ? 'var(--accent-primary)' : 'transparent'}; color: ${viewMode === 'grouped' ? '#fff' : 'var(--text-secondary)'}; cursor: pointer; transition: all 0.2s;">
                    Grouped by IP
                </button>
                <button onclick="window._domainHistoryViewMode = 'flat'; window.app.updateDashboard();" 
                    style="padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; border: none; background: ${viewMode === 'flat' ? 'var(--accent-primary)' : 'transparent'}; color: ${viewMode === 'flat' ? '#fff' : 'var(--text-secondary)'}; cursor: pointer; transition: all 0.2s;">
                    Flat Log
                </button>
            </div>
        </div>
        ${content}
    `;
}

window.showChangeDomainModal = () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'change-domain-modal-overlay';
    
    overlay.innerHTML = `
        <div class="modal" style="width: 550px;">
            <h2 style="margin-bottom: 8px;">Change Domain & Update IP Statuses</h2>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 16px;">
                Paste your domain mappings. Syntax: <code>IP;domain</code> (one per line).<br>
                This will update the local RDNS mapping, set today's status to <b>Change DOM</b>, and log the change history.
            </p>
            
            <textarea id="change-domain-data" placeholder="67.205.121.53;oakvaleon.cam&#10;67.205.121.54;wivbillugeha.space" 
                style="width: 100%; height: 200px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 0.75rem; margin-bottom: 16px;"></textarea>

            <div style="display: flex; gap: 12px;">
                <button onclick="applyChangeDomain(this)" style="flex: 2; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i data-lucide="play" style="width: 16px;"></i> Apply Domain Changes
                </button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary); color: var(--text-primary);">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
};

window.applyChangeDomain = async (btn) => {
    const text = document.getElementById('change-domain-data').value;
    if (!text.trim()) return;

    btn.innerText = 'Applying changes...';
    btn.disabled = true;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    const today = new Date().toISOString().split('T')[0];
    const history = window.app.state.domainChangeHistory || [];
    const operator = window.app.state.currentUser ? window.app.state.currentUser.name : 'Unknown';

    let updateCount = 0;
    
    // Make sure we have vmtaResults mapping
    if (!window.app.state.vmtaResults) window.app.state.vmtaResults = {};
    if (!window.app.state.statuses) window.app.state.statuses = {};

    for (const line of lines) {
        if (!line.includes(';')) continue;
        const [ipRaw, domainRaw] = line.split(';');
        const ip = ipRaw.trim();
        const newDomain = domainRaw.trim();
        if (!ip || !newDomain) continue;

        const safeIp = ip.replace(/\./g, '_');
        const oldDomain = getRdns(ip, window.app.state) || '---';

        if (oldDomain !== newDomain) {
            // 1. Update vmtaResults
            if (!window.app.state.vmtaResults[safeIp]) {
                window.app.state.vmtaResults[safeIp] = {};
            }
            window.app.state.vmtaResults[safeIp].ptr = newDomain;

            // 2. Update server vmtaMap if this IP belongs to a server
            if (window.app.state.servers) {
                window.app.state.servers.forEach(srv => {
                    if (srv.vmtaMap && srv.vmtaMap[safeIp] !== undefined) {
                        srv.vmtaMap[safeIp] = newDomain;
                    } else if (srv.mainIp === ip || (srv.allIps && srv.allIps.includes(ip))) {
                        if (!srv.vmtaMap) srv.vmtaMap = {};
                        srv.vmtaMap[safeIp] = newDomain;
                    }
                });
            }

            // 3. Set status to 'change_dom'
            if (!window.app.state.statuses[safeIp]) {
                window.app.state.statuses[safeIp] = {};
            }
            window.app.state.statuses[safeIp][today] = 'change_dom';

            // 4. Log change history
            history.push({
                ip,
                oldDomain,
                newDomain,
                timestamp: Date.now(),
                operator
            });

            // 5. Update local IP history (up to 6)
            if (!window.app.state.vmtaResults[safeIp].history) {
                window.app.state.vmtaResults[safeIp].history = [];
            }
            const ipHistory = window.app.state.vmtaResults[safeIp].history;
            if (!ipHistory.length || ipHistory[ipHistory.length - 1].domain !== oldDomain) {
                ipHistory.push({
                    domain: oldDomain,
                    date: new Date().toLocaleString()
                });
                if (ipHistory.length > 6) {
                    ipHistory.shift();
                }
            }

            updateCount++;
        }
    }

    if (updateCount > 0) {
        window.app.state.domainChangeHistory = history;
        await window.app.saveState();
        
        // Close modal
        const m = document.getElementById('change-domain-modal-overlay');
        if (m) m.remove();

        // Switch to the history tab automatically
        window._activeInventoryTab = 'domain_history';
        window.app.updateDashboard();
        alert(`Successfully changed domain for ${updateCount} IPs! Statuses updated to Change DOM.`);
    } else {
        btn.innerText = 'Apply Domain Changes';
        btn.disabled = false;
        alert('No domain changes were detected. Check if domain values are different from current ones.');
    }
};

window.showBulkDeclareCancelModal = () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal" style="width: 500px;">
            <h2 style="margin-bottom: 8px;">Bulk Declare Cancellation</h2>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 20px;">
                Enter server names (one per line) to mark them as <b>DECLARED</b>.
            </p>
            
            <textarea id="cancel-srv-list" placeholder="s_wmn3_2232&#10;s_wmn3_2231&#10;s_wmn3_2230" 
                style="width: 100%; height: 250px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 0.8rem; margin-bottom: 20px;"></textarea>

            <div style="display: flex; gap: 12px;">
                <button onclick="bulkDeclareCancel(this)" style="flex: 2; background: #ef4444; border: none;">Declare for Cancellation</button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; background: var(--bg-tertiary); color: var(--text-primary);">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
};

window.bulkDeclareCancel = async (btn) => {
    const text = document.getElementById('cancel-srv-list').value;
    if (!text.trim()) return;

    btn.innerText = 'Processing...';
    btn.disabled = true;

    const names = text.split('\n').map(n => n.trim()).filter(n => n !== '');
    const servers = window.app.state.servers;
    let updateCount = 0;

    names.forEach(name => {
        const srv = servers.find(s => s.name === name);
        if (srv) {
            srv.markedForCancel = true;
            updateCount++;
        }
    });

    if (updateCount > 0) {
        await window.app.saveState();
        window.app.updateDashboard();
        btn.closest('.modal-overlay').remove();
        alert(`Successfully marked ${updateCount} servers as DECLARED!`);
    } else {
        btn.innerText = 'Declare for Cancellation';
        btn.disabled = false;
        alert('No matching server names found.');
    }
};

window.testTelegramBot = async (btn) => {
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Sending...';
    btn.disabled = true;

    try {
        await window.app.sendTelegramNotification("🛠️ *GestiQ Bot Test*\nYour Telegram integration is working perfectly! ✅");
        btn.innerHTML = 'Success!';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
    } catch (err) {
        alert('Test failed. Check console for errors.');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

window.switchToolsTab = (tab) => {
    window.app.state.toolsActiveTab = tab;
    window.app.updateDashboard();
};

window.generateImacrosFile = () => {
    const ipsInput = document.getElementById('imacros-ips').value;
    const idNews = document.getElementById('imacros-id-news').value.trim();
    const limit = parseInt(document.getElementById('imacros-limit').value) || 0;
    const minMarge = parseInt(document.getElementById('imacros-marge-min').value) || 0;
    const maxMarge = parseInt(document.getElementById('imacros-marge-max').value) || 0;
    const pmtaWait = document.getElementById('imacros-pmta-wait').value.trim();
    const betweenDropsWait = document.getElementById('imacros-between-drops-wait').value.trim();

    if (!ipsInput.trim()) {
        alert("Please enter IPs and domains.");
        return;
    }

    const rawLines = ipsInput.split('\n');
    const parsedPairs = [];
    for (const line of rawLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        let parts = [];
        if (trimmed.includes(';')) {
            parts = trimmed.split(';');
        } else {
            parts = trimmed.split(/\s+/);
        }

        if (parts.length >= 2) {
            parsedPairs.push({
                ip: parts[0].trim(),
                domain: parts[1].trim()
            });
        }
    }

    if (parsedPairs.length === 0) {
        alert("Please enter at least one valid IP;domain or IP<space/tab>domain pair.");
        return;
    }

    const limitHalfPlus3 = Math.floor(limit / 2) + 3;
    const generatedLines = [];

    for (let i = 0; i < 500; i++) {
        const pair = parsedPairs[i % parsedPairs.length];
        let serverName = 'Unknown';
        if (window.app.state.servers) {
            const srv = window.app.state.servers.find(s => s.allIps && s.allIps.includes(pair.ip));
            if (srv) {
                serverName = srv.name;
            }
        }

        const randNum = Math.floor(Math.random() * (maxMarge - minMarge + 1)) + minMarge;
        
        // domain,id_news,server_name,pmta_wait,ip,limit,random_number,(limit/2)+3,between_drops_wait
        const row = `${pair.domain},${idNews},${serverName},${pmtaWait},${pair.ip},${limit},${randNum},${limitHalfPlus3},${betweenDropsWait}`;
        generatedLines.push(row);
    }

    const resultTextarea = document.getElementById('imacros-result');
    if (resultTextarea) {
        resultTextarea.value = generatedLines.join('\n');
    }
};

window.copyImacrosToClipboard = () => {
    const textarea = document.getElementById('imacros-result');
    if (!textarea || !textarea.value) {
        alert("Generate results first before copying!");
        return;
    }
    textarea.select();
    document.execCommand('copy');
    alert("Results copied to clipboard!");
};

window.downloadImacrosFile = () => {
    const text = document.getElementById('imacros-result').value;
    if (!text) {
        alert("Generate results first before downloading!");
        return;
    }

    const serverNames = [];
    const lines = text.split('\n');
    for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 3) {
            const serverName = parts[2].trim();
            if (serverName && serverName !== 'Unknown' && serverName !== 'Unknown Server' && !serverNames.includes(serverName)) {
                serverNames.push(serverName);
            }
        }
    }

    let fileName = 'imacros_rotation.txt';
    if (serverNames.length === 1) {
        fileName = `${serverNames[0]}.txt`;
    } else if (serverNames.length > 1) {
        const parsed = serverNames.map(name => {
            const lastIdx = name.lastIndexOf('_');
            if (lastIdx !== -1) {
                return {
                    prefix: name.substring(0, lastIdx + 1),
                    suffix: name.substring(lastIdx + 1)
                };
            }
            return { prefix: '', suffix: name };
        });

        const firstPrefix = parsed[0].prefix;
        const allSharePrefix = firstPrefix && parsed.every(p => p.prefix === firstPrefix);

        if (allSharePrefix) {
            const suffixes = parsed.map(p => p.suffix);
            fileName = `${firstPrefix}${suffixes.join('_')}.txt`;
        } else {
            fileName = `${serverNames.join('_')}.txt`;
        }
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

function renderTools(app, container) {
    const { tools } = app.state;
    const role = app.state.currentUser.role;
    const activeTab = app.state.toolsActiveTab || 'hosted';

    container.innerHTML = `
        <div style="padding: 16px 24px 0 24px; border-bottom: 1px solid var(--border-color); display: flex; gap: 24px; background: var(--bg-secondary);">
            <div onclick="window.switchToolsTab('hosted')" style="padding: 14px 4px; font-size: 0.85rem; font-weight: 600; cursor: pointer; border-bottom: 2px solid ${activeTab === 'hosted' ? 'var(--accent-primary)' : 'transparent'}; color: ${activeTab === 'hosted' ? 'var(--text-primary)' : 'var(--text-secondary)'}; transition: all 0.2s; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="layout-grid" style="width: 14px; height: 14px;"></i> hosted Tools
            </div>
            <div onclick="window.switchToolsTab('imacros')" style="padding: 14px 4px; font-size: 0.85rem; font-weight: 600; cursor: pointer; border-bottom: 2px solid ${activeTab === 'imacros' ? 'var(--accent-primary)' : 'transparent'}; color: ${activeTab === 'imacros' ? 'var(--text-primary)' : 'var(--text-secondary)'}; transition: all 0.2s; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="file-cog" style="width: 14px; height: 14px;"></i> Generate imacros File
            </div>
        </div>
        
        <div id="tools-tab-content">
            ${activeTab === 'hosted' ? `
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
            ` : `
                <div style="display: flex; gap: 24px; padding: 24px; flex-wrap: wrap;">
                    <div class="card" style="flex: 1 1 400px; padding: 24px; display: flex; flex-direction: column; gap: 16px; background: var(--bg-secondary);">
                        <h3 style="font-size: 1.1rem; margin-top: 0; display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="sliders" style="color: var(--accent-primary); width: 20px;"></i>
                            Imacros File Config
                        </h3>
                        
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">IPs / Domains (one pair per line, format: IP;domain)</label>
                            <textarea id="imacros-ips" placeholder="51.38.72.123;zultranexo.world&#10;51.38.72.126;grinnvolaz.com&#10;51.38.72.127;scoutdive.live&#10;51.75.173.104;clervazin.com&#10;51.75.173.105;justrightmax.world&#10;51.195.146.50;fieldborne.space" style="height: 150px; font-family: monospace; font-size: 0.85rem; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); resize: vertical;"></textarea>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">ID News</label>
                                <input type="text" id="imacros-id-news" value="25148" style="padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem;">
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Limit</label>
                                <input type="number" id="imacros-limit" value="10000" style="padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem;">
                            </div>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Marge (Min & Max Range)</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <input type="number" id="imacros-marge-min" value="5000" placeholder="Min" style="padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem;">
                                <input type="number" id="imacros-marge-max" value="200000" placeholder="Max" style="padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem;">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">PMTA Wait</label>
                                <input type="number" id="imacros-pmta-wait" value="20" style="padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem;">
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Between Drops Wait</label>
                                <input type="number" id="imacros-between-drops-wait" value="1200" style="padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem;">
                            </div>
                        </div>

                        <button onclick="window.generateImacrosFile()" style="margin-top: 8px; padding: 12px; background: var(--accent-primary); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i data-lucide="play" style="width: 16px; height: 16px;"></i> Generate File
                        </button>
                    </div>

                    <div class="card" style="flex: 1.5 1 500px; padding: 24px; display: flex; flex-direction: column; gap: 16px; background: var(--bg-secondary);">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                            <h3 style="font-size: 1.1rem; margin: 0; display: flex; align-items: center; gap: 8px;">
                                <i data-lucide="file-text" style="color: var(--success); width: 20px; height: 20px;"></i>
                                Generated Results (500 Lines)
                            </h3>
                            <div style="display: flex; gap: 8px;">
                                <button onclick="window.copyImacrosToClipboard()" style="padding: 6px 12px; font-size: 0.8rem; width: auto; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                                    <i data-lucide="copy" style="width: 12px; height: 12px;"></i> Copy
                                </button>
                                <button onclick="window.downloadImacrosFile()" style="padding: 6px 12px; font-size: 0.8rem; width: auto; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                                    <i data-lucide="download" style="width: 12px; height: 12px;"></i> Download
                                </button>
                            </div>
                        </div>
                        <textarea id="imacros-result" readonly placeholder="Results will appear here after generation..." style="flex: 1; min-height: 420px; font-family: monospace; font-size: 0.82rem; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.2); color: var(--text-primary); resize: none;"></textarea>
                    </div>
                </div>
            `}
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

window.updateRevDateRange = () => {
    const startVal = document.getElementById('rev-start-date').value;
    const endVal = document.getElementById('rev-end-date').value;
    window._revStartDate = startVal;
    window._revEndDate = endVal;
    window.app.updateDashboard();
};

window.clearRevDateRange = () => {
    window._revPreset = 'all';
    window._revStartDate = '';
    window._revEndDate = '';
    window.app.updateDashboard();
};

function getLocalDateString(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

window.handleRevPresetChange = (preset) => {
    window._revPreset = preset;
    const now = new Date();
    
    if (preset === 'today') {
        const todayStr = getLocalDateString(now);
        window._revStartDate = todayStr;
        window._revEndDate = todayStr;
    } else if (preset === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterday);
        window._revStartDate = yesterdayStr;
        window._revEndDate = yesterdayStr;
    } else if (preset === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 6);
        window._revStartDate = getLocalDateString(weekAgo);
        window._revEndDate = getLocalDateString(now);
    } else if (preset === 'month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        window._revStartDate = getLocalDateString(firstDay);
        window._revEndDate = getLocalDateString(now);
    } else if (preset === 'last_month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
        window._revStartDate = getLocalDateString(firstDay);
        window._revEndDate = getLocalDateString(lastDay);
    } else if (preset === 'custom') {
        window._revStartDate = window._revStartDate || '';
        window._revEndDate = window._revEndDate || '';
    } else { // 'all'
        window._revStartDate = '';
        window._revEndDate = '';
    }
    window.app.updateDashboard();
};

function getWarmupActiveIpsPerServer(app) {
    const warmupData = app.state.warmupData || {};
    const records = Object.values(warmupData);
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    const serverActiveIps = {};
    records.forEach(r => {
        if (!r.server || !r.ip) return;
        if (r.timestamp >= twentyFourHoursAgo) {
            if (!serverActiveIps[r.server]) serverActiveIps[r.server] = new Set();
            serverActiveIps[r.server].add(r.ip);
        }
    });
    const result = {};
    Object.keys(serverActiveIps).forEach(srv => {
        result[srv] = serverActiveIps[srv].size;
    });
    return result;
}

function renderOverview(app, container) {
    const { rps, servers, currentUser, drops, mailers } = app.state;
    const isAdmin = currentUser.role === 'admin';
    
    // Filter infra by mailer if not admin
    const myServers = isAdmin ? (servers || []) : (servers || []).filter(s => s && s.mailerId === currentUser.id);
    const myRps = isAdmin ? (rps || []) : (rps || []).filter(r => r && r.mailerId === currentUser.id);
    const warmupCounts = getWarmupActiveIpsPerServer(app);

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

    const myDrops = drops || [];

    // Calculate Standard Stats
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

    // Calculate Filtered Stats
    let showFilteredStats = false;
    let filteredTotal = 0;
    let filteredCount = 0;

    if (window._revStartDate || window._revEndDate) {
        showFilteredStats = true;
        const start = window._revStartDate ? new Date(window._revStartDate + 'T00:00:00') : null;
        const end = window._revEndDate ? new Date(window._revEndDate + 'T23:59:59') : null;

        myDrops.forEach(d => {
            const dDate = new Date(d.timestamp);
            let match = true;
            if (start && dDate < start) match = false;
            if (end && dDate > end) match = false;
            
            if (match) {
                filteredTotal += d.rev || 0;
                filteredCount++;
            }
        });
    }

    // Filter drops by the selected date range for the charts and tables below
    let activeRangeDrops = myDrops;
    const startRange = window._revStartDate ? new Date(window._revStartDate + 'T00:00:00') : null;
    const endRange = window._revEndDate ? new Date(window._revEndDate + 'T23:59:59') : null;
    
    if (startRange || endRange) {
        activeRangeDrops = myDrops.filter(d => {
            const dDate = new Date(d.timestamp);
            if (startRange && dDate < startRange) return false;
            if (endRange && dDate > endRange) return false;
            return true;
        });
    }

    // Build set of RP domains
    const rpDomains = new Set();
    if (rps) {
        rps.forEach(r => {
            if (r && r.domain) rpDomains.add(r.domain.trim().toLowerCase());
        });
    }
    if (app.state.rpInventory) {
        app.state.rpInventory.forEach(item => {
            if (item && item.rpDomain) rpDomains.add(item.rpDomain.trim().toLowerCase());
        });
    }

    const getMatchedRpDomain = (rpVal) => {
        if (!rpVal || rpVal === 'n/a' || rpVal === '---') return null;
        const clean = rpVal.trim().toLowerCase();
        for (const rpDom of rpDomains) {
            if (clean === rpDom || clean.endsWith('.' + rpDom)) {
                return rpDom;
            }
        }
        return null;
    };

    let rdnsRevenue = 0;
    let rpRevenue = 0;
    let rdnsDropsCount = 0;
    let rpDropsCount = 0;

    const rpBreakdown = {};
    const rdnsBreakdown = {};

    activeRangeDrops.forEach(d => {
        const rev = parseFloat(d.rev) || 0;
        const rpVal = (d.returnPath || '').trim().toLowerCase();
        
        if (!rpVal || rpVal === 'n/a' || rpVal === '---') {
            rdnsRevenue += rev;
            rdnsDropsCount++;
            const fallbackKey = 'Unspecified / Empty';
            if (!rdnsBreakdown[fallbackKey]) {
                rdnsBreakdown[fallbackKey] = { name: fallbackKey, rev: 0, count: 0 };
            }
            rdnsBreakdown[fallbackKey].rev += rev;
            rdnsBreakdown[fallbackKey].count++;
            return;
        }

        const matchedRpDom = getMatchedRpDomain(rpVal);

        if (matchedRpDom) {
            rpRevenue += rev;
            rpDropsCount++;
            if (!rpBreakdown[matchedRpDom]) {
                rpBreakdown[matchedRpDom] = { name: matchedRpDom, rev: 0, count: 0 };
            }
            rpBreakdown[matchedRpDom].rev += rev;
            rpBreakdown[matchedRpDom].count++;
        } else {
            rdnsRevenue += rev;
            rdnsDropsCount++;
            if (!rdnsBreakdown[rpVal]) {
                rdnsBreakdown[rpVal] = { name: rpVal, rev: 0, count: 0 };
            }
            rdnsBreakdown[rpVal].rev += rev;
            rdnsBreakdown[rpVal].count++;
        }
    });

    const totalActiveRevenue = rdnsRevenue + rpRevenue || 1;
    const rdnsPct = (rdnsRevenue / totalActiveRevenue) * 100;
    const rpPct = (rpRevenue / totalActiveRevenue) * 100;

    const sortedRpBreakdown = Object.values(rpBreakdown).sort((a, b) => b.rev - a.rev);
    const sortedRdnsBreakdown = Object.values(rdnsBreakdown).sort((a, b) => b.rev - a.rev);

    // Offer Statistics — group by offerId so same-offer drops consolidate
    const offerStatsMap = {};
    activeRangeDrops.forEach(d => {
        const offerName = d.offer || 'Unknown Offer';
        const oId = d.offerId || (window.app ? window.app.extractOfferId(offerName) : '');
        const key = oId || offerName; // fallback to full name if no ID extracted
        if (!offerStatsMap[key]) {
            offerStatsMap[key] = { name: offerName, offerId: oId, rev: 0, count: 0 };
        }
        offerStatsMap[key].rev += d.rev || 0;
        offerStatsMap[key].count++;
        // Keep the longest/most descriptive offer name for display
        if (offerName.length > offerStatsMap[key].name.length) {
            offerStatsMap[key].name = offerName;
        }
    });
    const offerStatsList = Object.values(offerStatsMap).sort((a, b) => b.rev - a.rev);

    // Mailer Statistics
    const mailerStatsMap = {};
    activeRangeDrops.forEach(d => {
        const mailerName = d.mailerName || 'Unknown Mailer';
        if (!mailerStatsMap[mailerName]) {
            mailerStatsMap[mailerName] = { name: mailerName, rev: 0, count: 0, offers: {}, epcSum: 0, cpmSum: 0 };
        }
        mailerStatsMap[mailerName].rev += d.rev || 0;
        mailerStatsMap[mailerName].count++;
        mailerStatsMap[mailerName].epcSum += d.epc || 0;
        mailerStatsMap[mailerName].cpmSum += d.cpm || 0;
        
        const offerName = d.offer || 'Unknown Offer';
        mailerStatsMap[mailerName].offers[offerName] = (mailerStatsMap[mailerName].offers[offerName] || 0) + (d.rev || 0);
    });
    
    const mailerStatsList = Object.values(mailerStatsMap).map(m => {
        let bestOffer = 'N/A';
        let maxOfferRev = -1;
        Object.entries(m.offers).forEach(([offName, offRev]) => {
            if (offRev > maxOfferRev) {
                maxOfferRev = offRev;
                bestOffer = offName;
            }
        });
        return {
            name: m.name,
            rev: m.rev,
            count: m.count,
            avgEpc: m.count > 0 ? (m.epcSum / m.count).toFixed(2) : '0.00',
            avgCpm: m.count > 0 ? (m.cpmSum / m.count).toFixed(2) : '0.00',
            bestOffer
        };
    }).sort((a, b) => b.rev - a.rev);

    const periodLabel = (window._revStartDate || window._revEndDate) ? 'Selected Period' : 'All Time';

    const leaderboard = (mailers || []).filter(m => m && m.role === 'mailer').map(m => {
        const rev = (drops || []).filter(d => {
            if (!d || d.mailerName !== m.name) return false;
            if (window._revStartDate || window._revEndDate) {
                const dDate = new Date(d.timestamp);
                const start = window._revStartDate ? new Date(window._revStartDate + 'T00:00:00') : null;
                const end = window._revEndDate ? new Date(window._revEndDate + 'T23:59:59') : null;
                if (start && dDate < start) return false;
                if (end && dDate > end) return false;
                return true;
            } else {
                const dDate = new Date(d.timestamp);
                return dDate.getMonth() === thisMonth && dDate.getFullYear() === thisYear;
            }
        }).reduce((sum, d) => sum + (d.rev || 0), 0);
        return { name: m.name, rev };
    }).sort((a, b) => b.rev - a.rev);

    const leaderboardTitle = (window._revStartDate || window._revEndDate) ? 'Mailers (Filtered)' : 'Top Mailers (Month)';
    window._revPreset = window._revPreset || 'all';

    container.innerHTML = `
        <div style="padding: 0 0 24px 0;">
            <!-- Date Filter Panel -->
            <div class="card" style="padding: 16px; margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between; background: var(--bg-tertiary);">
                <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="calendar" style="width: 18px; color: var(--accent-primary);"></i>
                        <span style="font-weight: 600; font-size: 0.85rem;">Revenue Filter</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <select id="rev-preset" onchange="handleRevPresetChange(this.value)" style="padding: 6px 12px; font-size: 0.8rem; background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 6px; cursor: pointer; font-weight: 500;">
                            <option value="all" ${window._revPreset === 'all' ? 'selected' : ''}>All Time</option>
                            <option value="today" ${window._revPreset === 'today' ? 'selected' : ''}>Today</option>
                            <option value="yesterday" ${window._revPreset === 'yesterday' ? 'selected' : ''}>Yesterday</option>
                            <option value="week" ${window._revPreset === 'week' ? 'selected' : ''}>Last 7 Days</option>
                            <option value="month" ${window._revPreset === 'month' ? 'selected' : ''}>This Month</option>
                            <option value="last_month" ${window._revPreset === 'last_month' ? 'selected' : ''}>Last Month</option>
                            <option value="custom" ${window._revPreset === 'custom' ? 'selected' : ''}>Custom Range</option>
                        </select>
                        
                        <div id="custom-date-container" style="display: ${window._revPreset === 'custom' ? 'flex' : 'none'}; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <label style="font-size: 0.75rem; color: var(--text-secondary);">From:</label>
                                <input type="date" id="rev-start-date" value="${window._revStartDate || ''}" onchange="updateRevDateRange()" style="padding: 6px 10px; font-size: 0.8rem; background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 6px;">
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <label style="font-size: 0.75rem; color: var(--text-secondary);">To:</label>
                                <input type="date" id="rev-end-date" value="${window._revEndDate || ''}" onchange="updateRevDateRange()" style="padding: 6px 10px; font-size: 0.8rem; background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 6px;">
                            </div>
                        </div>
                    </div>
                </div>
                ${showFilteredStats ? `
                    <div style="display: flex; align-items: center; gap: 16px; padding: 6px 16px; background: rgba(59, 130, 246, 0.1); border: 1px solid var(--accent-primary); border-radius: 8px;">
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Range Total: <b style="font-size: 1rem; color: var(--accent-primary); margin-left: 4px;">$${filteredTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</b></div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Drops: <b style="font-size: 0.9rem; color: var(--text-primary); margin-left: 4px;">${filteredCount}</b></div>
                    </div>
                ` : ''}
            </div>

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

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 24px;">
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

                <div class="card" style="padding: 20px; max-height: 250px; overflow-y: auto;">
                    <h3 style="margin: 0 0 20px 0; font-size: 1rem; display: flex; align-items: center; gap: 10px; position: sticky; top: 0; background: var(--bg-secondary); padding-bottom: 10px; z-index: 5;">
                        <i data-lucide="trophy" style="width: 18px; color: #f59e0b;"></i>
                        ${leaderboardTitle}
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${leaderboard.map((m, i) => {
                            const rankBg = i === 0 ? '#f59e0b' : (i === 1 ? '#94a3b8' : (i === 2 ? '#b45309' : 'var(--bg-primary)'));
                            const rankColor = i < 3 ? 'white' : 'var(--text-secondary)';
                            const rankBorder = i < 3 ? 'none' : '1px solid var(--border-color)';
                            return `
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <span style="width: 20px; height: 20px; border-radius: 50%; background: ${rankBg}; color: ${rankColor}; border: ${rankBorder}; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700;">${i + 1}</span>
                                        <span style="font-size: 0.85rem;">${m.name}</span>
                                    </div>
                                    <span style="font-weight: 600; font-size: 0.85rem;">$${m.rev.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                            `;
                        }).join('')}
                        ${leaderboard.length === 0 ? '<p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem;">No data yet for this period</p>' : ''}
                    </div>
                </div>
            </div>

            <!-- Domain Class & RP/RDNS Revenue Breakdown -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 32px 0 16px;">
                <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700;">Domain & Return Path (RP) Analytics (${periodLabel})</h2>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-bottom: 24px;">
                <!-- Column 1: Domain Class Distribution -->
                <div class="card" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px;">
                    <div>
                        <h3 style="margin: 0 0 20px 0; font-size: 1rem; display: flex; align-items: center; gap: 10px;">
                            <i data-lucide="pie-chart" style="width: 18px; color: var(--accent-primary);"></i>
                            Revenue Class Share
                        </h3>
                        <div style="display: flex; flex-direction: column; gap: 20px; margin-bottom: 20px;">
                            <!-- RP Share -->
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div style="width: 12px; height: 12px; border-radius: 4px; background: linear-gradient(135deg, var(--accent-primary) 0%, #a855f7 100%);"></div>
                                        <span style="font-size: 0.85rem; font-weight: 600;">RP Domains (Custom)</span>
                                    </div>
                                    <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">$${rpRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})} <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">(${rpPct.toFixed(1)}%)</span></span>
                                </div>
                                <div style="width: 100%; height: 10px; background: var(--bg-primary); border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color); padding: 1px;">
                                    <div style="width: ${rpPct}%; height: 100%; background: linear-gradient(90deg, var(--accent-primary) 0%, #a855f7 100%); border-radius: 4px; transition: width 0.6s ease-out;"></div>
                                </div>
                                <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px;">${rpDropsCount} drops tracked</div>
                            </div>

                            <!-- RDNS Share -->
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div style="width: 12px; height: 12px; border-radius: 4px; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);"></div>
                                        <span style="font-size: 0.85rem; font-weight: 600;">RDNS Hostnames (Server)</span>
                                    </div>
                                    <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">$${rdnsRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})} <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">(${rdnsPct.toFixed(1)}%)</span></span>
                                </div>
                                <div style="width: 100%; height: 10px; background: var(--bg-primary); border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color); padding: 1px;">
                                    <div style="width: ${rdnsPct}%; height: 100%; background: linear-gradient(90deg, #06b6d4 0%, #0891b2 100%); border-radius: 4px; transition: width 0.6s ease-out;"></div>
                                </div>
                                <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px;">${rdnsDropsCount} drops tracked</div>
                            </div>
                        </div>
                    </div>
                    <div style="border-top: 1px solid var(--border-color); padding-top: 14px; font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4;">
                        💡 <b>RP Domains</b> are custom domain Return Paths from your inventory. <b>RDNS Hostnames</b> are primary server hostname matches.
                    </div>
                </div>

                <!-- Column 2: Top RP Domains Revenue -->
                <div class="card" style="padding: 20px; max-height: 350px; overflow-y: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px;">
                    <h3 style="margin: 0 0 20px 0; font-size: 1rem; display: flex; align-items: center; gap: 10px; position: sticky; top: 0; background: var(--bg-secondary); padding-bottom: 10px; z-index: 5;">
                        <i data-lucide="globe" style="width: 18px; color: #a855f7;"></i>
                        Top RP Domains
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        ${sortedRpBreakdown.map((r, idx) => {
                            const maxRpRev = sortedRpBreakdown[0] ? sortedRpBreakdown[0].rev : 1;
                            const pctOfRp = maxRpRev > 0 ? (r.rev / maxRpRev) * 100 : 0;
                            const shareOfTotal = rpRevenue > 0 ? (r.rev / rpRevenue) * 100 : 0;
                            return `
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                        <span style="font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%;">${idx + 1}. ${r.name}</span>
                                        <span style="font-size: 0.8rem; color: var(--text-secondary);">${r.count} drops • <b style="color: #a855f7;">$${r.rev.toLocaleString(undefined, {minimumFractionDigits: 2})}</b></span>
                                    </div>
                                    <div style="width: 100%; height: 6px; background: var(--bg-primary); border-radius: 4px; overflow: hidden; border: 1px solid var(--border-color);">
                                        <div style="width: ${pctOfRp}%; height: 100%; background: linear-gradient(90deg, #a855f7 0%, #8b5cf6 100%); border-radius: 4px;"></div>
                                    </div>
                                    <div style="font-size: 0.65rem; color: var(--text-secondary); margin-top: 3px; display: flex; justify-content: space-between;">
                                        <span>Share of RP Revenue: ${shareOfTotal.toFixed(1)}%</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        ${sortedRpBreakdown.length === 0 ? '<p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 40px 0;">No RP domain revenue in this period</p>' : ''}
                    </div>
                </div>

                <!-- Column 3: Top RDNS Hostnames Revenue -->
                <div class="card" style="padding: 20px; max-height: 350px; overflow-y: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px;">
                    <h3 style="margin: 0 0 20px 0; font-size: 1rem; display: flex; align-items: center; gap: 10px; position: sticky; top: 0; background: var(--bg-secondary); padding-bottom: 10px; z-index: 5;">
                        <i data-lucide="shield" style="width: 18px; color: #06b6d4;"></i>
                        Top RDNS Hostnames
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        ${sortedRdnsBreakdown.map((r, idx) => {
                            const maxRdnsRev = sortedRdnsBreakdown[0] ? sortedRdnsBreakdown[0].rev : 1;
                            const pctOfRdns = maxRdnsRev > 0 ? (r.rev / maxRdnsRev) * 100 : 0;
                            const shareOfTotal = rdnsRevenue > 0 ? (r.rev / rdnsRevenue) * 100 : 0;
                            return `
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                        <span style="font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%;">${idx + 1}. ${r.name}</span>
                                        <span style="font-size: 0.8rem; color: var(--text-secondary);">${r.count} drops • <b style="color: #06b6d4;">$${r.rev.toLocaleString(undefined, {minimumFractionDigits: 2})}</b></span>
                                    </div>
                                    <div style="width: 100%; height: 6px; background: var(--bg-primary); border-radius: 4px; overflow: hidden; border: 1px solid var(--border-color);">
                                        <div style="width: ${pctOfRdns}%; height: 100%; background: linear-gradient(90deg, #06b6d4 0%, #0891b2 100%); border-radius: 4px;"></div>
                                    </div>
                                    <div style="font-size: 0.65rem; color: var(--text-secondary); margin-top: 3px; display: flex; justify-content: space-between;">
                                        <span>Share of RDNS Revenue: ${shareOfTotal.toFixed(1)}%</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        ${sortedRdnsBreakdown.length === 0 ? '<p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 40px 0;">No RDNS revenue in this period</p>' : ''}
                    </div>
                </div>
            </div>

            <!-- Performance Analytics & Charting Section -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 32px 0 16px;">
                <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700;">Performance Analytics (${periodLabel})</h2>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 24px; margin-bottom: 24px;">
                <!-- Column 1: Mailer Revenue Share (Chart) -->
                <div class="card" style="padding: 20px; max-height: 400px; overflow-y: auto;">
                    <h3 style="margin: 0 0 20px 0; font-size: 1rem; display: flex; align-items: center; gap: 10px; position: sticky; top: 0; background: var(--bg-secondary); padding-bottom: 10px; z-index: 5;">
                        <i data-lucide="bar-chart-3" style="width: 18px; color: var(--accent-primary);"></i>
                        Mailer Revenue Distribution
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        ${mailerStatsList.map(m => {
                            const maxRev = mailerStatsList[0] ? mailerStatsList[0].rev : 1;
                            const pct = maxRev > 0 ? (m.rev / maxRev) * 100 : 0;
                            return `
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                        <span style="font-size: 0.85rem; font-weight: 600;">${m.name}</span>
                                        <span style="font-size: 0.8rem; color: var(--text-secondary);">${m.count} drops • <b style="color: var(--accent-primary); font-size: 0.85rem;">$${m.rev.toLocaleString(undefined, {minimumFractionDigits: 2})}</b></span>
                                    </div>
                                    <div style="width: 100%; height: 10px; background: var(--bg-primary); border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color); padding: 1px;">
                                        <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, var(--accent-primary) 0%, #a855f7 100%); border-radius: 4px; transition: width 0.6s ease-out;"></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        ${mailerStatsList.length === 0 ? '<p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 40px 0;">No data found for this period</p>' : ''}
                    </div>
                </div>

                <!-- Column 2: Offer Performance -->
                <div class="card" style="padding: 20px; max-height: 400px; overflow-y: auto;">
                    <h3 style="margin: 0 0 20px 0; font-size: 1rem; display: flex; align-items: center; gap: 10px; position: sticky; top: 0; background: var(--bg-secondary); padding-bottom: 10px; z-index: 5;">
                        <i data-lucide="shopping-bag" style="width: 18px; color: #10b981;"></i>
                        Top Offers
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        ${offerStatsList.map((o, idx) => {
                            const maxOfferRev = offerStatsList[0] ? offerStatsList[0].rev : 1;
                            const pct = maxOfferRev > 0 ? (o.rev / maxOfferRev) * 100 : 0;
                            return `
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                        <span style="font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%;">${idx + 1}. ${o.name}</span>
                                        <span style="font-size: 0.8rem; color: var(--text-secondary);">${o.count} drops • <b style="color: #10b981;">$${o.rev.toLocaleString(undefined, {minimumFractionDigits: 2})}</b></span>
                                    </div>
                                    <div style="width: 100%; height: 6px; background: var(--bg-primary); border-radius: 4px; overflow: hidden; border: 1px solid var(--border-color);">
                                        <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #10b981 0%, #059669 100%); border-radius: 4px;"></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        ${offerStatsList.length === 0 ? '<p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 40px 0;">No offers found for this period</p>' : ''}
                    </div>
                </div>
            </div>

            <!-- Detailed Statistics Table -->
            <div class="card" style="padding: 20px; margin-bottom: 24px; overflow-x: auto;">
                <h3 style="margin: 0 0 20px 0; font-size: 1rem; display: flex; align-items: center; gap: 10px;">
                    <i data-lucide="table" style="width: 18px; color: var(--accent-primary);"></i>
                    Detailed Performance Matrix (${periodLabel})
                </h3>
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.75rem; text-align: left;">
                    <thead>
                        <tr style="background: var(--bg-tertiary);">
                            <th style="padding: 12px; border-bottom: 2px solid var(--border-color);">${isAdmin ? 'Mailer' : 'Profile'}</th>
                            <th style="padding: 12px; border-bottom: 2px solid var(--border-color);">Drops Count</th>
                            <th style="padding: 12px; border-bottom: 2px solid var(--border-color);">Best Performing Offer</th>
                            <th style="padding: 12px; border-bottom: 2px solid var(--border-color);">Avg. EPC</th>
                            <th style="padding: 12px; border-bottom: 2px solid var(--border-color);">Avg. CPM</th>
                            <th style="padding: 12px; border-bottom: 2px solid var(--border-color); text-align: right; color: var(--accent-primary); font-weight: 700;">Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(isAdmin ? mailerStatsList : [{
                            name: currentUser.name,
                            count: activeRangeDrops.length,
                            bestOffer: offerStatsList[0] ? offerStatsList[0].name : 'N/A',
                            avgEpc: activeRangeDrops.length > 0 ? (activeRangeDrops.reduce((s, d) => s + (d.epc || 0), 0) / activeRangeDrops.length).toFixed(2) : '0.00',
                            avgCpm: activeRangeDrops.length > 0 ? (activeRangeDrops.reduce((s, d) => s + (d.cpm || 0), 0) / activeRangeDrops.length).toFixed(2) : '0.00',
                            rev: activeRangeDrops.reduce((s, d) => s + (d.rev || 0), 0)
                        }]).map((m, idx) => {
                            const rowBg = idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent';
                            return `
                                <tr style="background: ${rowBg}; border-bottom: 1px solid var(--border-color);">
                                    <td style="padding: 12px; font-weight: 600;">${m.name}</td>
                                    <td style="padding: 12px; color: var(--text-secondary);">${m.count}</td>
                                    <td style="padding: 12px; font-weight: 500; color: var(--text-primary);">${m.bestOffer}</td>
                                    <td style="padding: 12px; font-family: monospace; color: var(--success); font-weight: 600;">$${m.avgEpc}</td>
                                    <td style="padding: 12px; font-family: monospace; color: #8b5cf6; font-weight: 600;">$${m.avgCpm}</td>
                                    <td style="padding: 12px; text-align: right; font-weight: 700; color: var(--accent-primary); font-size: 0.85rem;">$${m.rev.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                </tr>
                            `;
                        }).join('')}
                        ${(isAdmin ? mailerStatsList.length : activeRangeDrops.length) === 0 ? `
                            <tr>
                                <td colspan="6" style="padding: 40px; text-align: center; color: var(--text-secondary);">No data matches this criteria</td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
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
                    <p>${myRps.filter(r => r && r.status === 'active').length}</p>
                </div>
            </div>
            <div class="card stat-card">
                <div class="stat-icon" style="background: rgba(34, 197, 94, 0.1); color: #22c55e;">
                    <i data-lucide="check-circle"></i>
                </div>
                <div class="stat-info">
                    <h3>Stock RPs</h3>
                    <p>${(rps || []).filter(r => r && r.status === 'stock').length}</p>
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
                    const srvRps = (rps || []).filter(r => r && r.serverId === srv.id);
                    const isExpanded = app.expandedServers.has(srv.id);
                    const activeWarmupIps = warmupCounts[srv.name] || 0;
                    const totalSrvIps = (srv.allIps || []).length;
                    return `
                        <div class="server-container" style="background: var(--bg-secondary); margin-bottom: 12px; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;">
                            <div class="server-header" onclick="app.toggleServerExpand('${srv.id}')" style="padding: 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03);">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <i data-lucide="chevron-${isExpanded ? 'down' : 'right'}" style="width: 16px; color: var(--text-secondary);"></i>
                                    <span style="font-weight: 600;">${srv.name} <span style="color: var(--text-secondary); font-weight: 400; font-size: 0.85rem;">(${srvRps.length} RPs)</span></span>
                                    <span onclick="event.stopPropagation(); toggleServerWarmupType('${srv.id}')" 
                                          style="cursor: pointer; font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 8px;
                                                 background: ${(srv.warmupType === 'RP' || srv.warmupType === 'Domain RP') ? 'rgba(139, 92, 246, 0.12)' : (srv.warmupType === 'Switch' ? 'rgba(249, 115, 22, 0.12)' : 'rgba(16, 185, 129, 0.12)')};
                                                 color: ${(srv.warmupType === 'RP' || srv.warmupType === 'Domain RP') ? '#a78bfa' : (srv.warmupType === 'Switch' ? '#f97316' : '#34d399')};
                                                 border: 1px solid ${(srv.warmupType === 'RP' || srv.warmupType === 'Domain RP') ? 'rgba(139, 92, 246, 0.25)' : (srv.warmupType === 'Switch' ? 'rgba(249, 115, 22, 0.25)' : 'rgba(16, 185, 129, 0.25)')};"
                                          title="Click to toggle Warmup Mode">
                                        ${srv.warmupType === 'Domain RP' ? 'RP' : (srv.warmupType || 'RDNS')}
                                    </span>
                                    ${totalSrvIps > 0 ? `<span style="font-size: 0.6rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${activeWarmupIps > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(107, 114, 128, 0.08)'}; color: ${activeWarmupIps > 0 ? '#f59e0b' : '#6b7280'}; border: 1px solid ${activeWarmupIps > 0 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(107, 114, 128, 0.15)'};" title="${activeWarmupIps} of ${totalSrvIps} IPs active in warmup (last 24h)">${activeWarmupIps > 0 ? '🔥' : '💤'} ${activeWarmupIps}/${totalSrvIps} IPs</span>` : ''}
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
    const warmupCounts = getWarmupActiveIpsPerServer(app);
    const activeMailers = (mailers || []).filter(m => m && m.role === 'mailer');
    const query = (app.state.searchQuery || '').toLowerCase();
    
    const stockRps = (rps || []).filter(r => r && !r.serverId && !r.mailerId && r.domain && r.domain.toLowerCase().includes(query));
    const stockSrvs = (servers || []).filter(s => s && !s.mailerId && ((s.name || '').toLowerCase().includes(query) || (s.ip || '').includes(query)));

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
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase;">Unlinked RPs (${stockRps.length})</div>
                        <button onclick="app.toggleHideUnlinkedRps()" style="background: transparent; border: none; color: var(--accent-primary); cursor: pointer; padding: 2px 6px; font-size: 0.7rem; display: flex; align-items: center; gap: 4px;">
                            <i data-lucide="${app.hideUnlinkedRps ? 'eye' : 'eye-off'}" style="width: 12px; height: 12px; vertical-align: middle;"></i>
                            ${app.hideUnlinkedRps ? 'Show' : 'Hide'}
                        </button>
                    </div>
                    <div class="drop-zone" data-type="stock-rp" style="min-height: ${app.hideUnlinkedRps ? '0px' : '80px'}; display: ${app.hideUnlinkedRps ? 'none' : 'block'}; border: 1px dashed var(--border-color); border-radius: 8px; margin-bottom: 12px; overflow: hidden;">
                        ${stockRps.map(rp => `
                            <div class="draggable-item" ${isAdmin ? 'draggable="true" ondragstart="handleDragStart(event, \'rp\', \'' + rp.id + '\')"' : ''}>
                                <span class="item-name">${rp.domain}</span>
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
                        <div style="color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase;">Unassigned Servers (${stockSrvs.length})</div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="action-icon" onclick="copyUnassignedServerIps(this)" title="Copy all unassigned IPs">
                                <i data-lucide="copy" style="width: 12px; color: var(--text-secondary);"></i>
                            </span>
                            <button onclick="app.toggleHideUnassignedServers()" style="background: transparent; border: none; color: var(--accent-primary); cursor: pointer; padding: 2px 6px; font-size: 0.7rem; display: flex; align-items: center; gap: 4px;">
                                <i data-lucide="${app.hideUnassignedServers ? 'eye' : 'eye-off'}" style="width: 12px; height: 12px; vertical-align: middle;"></i>
                                ${app.hideUnassignedServers ? 'Show' : 'Hide'}
                            </button>
                        </div>
                    </div>
                    <div class="drop-zone" data-type="stock-srv" style="min-height: ${app.hideUnassignedServers ? '0px' : '80px'}; display: ${app.hideUnassignedServers ? 'none' : 'block'}; border: 1px dashed var(--border-color); border-radius: 8px; overflow: hidden;">
                        ${stockSrvs.map(srv => {
                            const isCancel = srv.markedForCancel === true;
                            const cancelStyle = isCancel ? 'border-color: #f97316; background: rgba(249, 115, 22, 0.08);' : '';
                            return `
                                <div class="draggable-item" ${isAdmin ? 'draggable="true" ondragstart="handleDragStart(event, \'srv\', \'' + srv.id + '\')"' : ''} style="${cancelStyle}">
                                    <span class="item-name" style="color: ${isCancel ? '#f97316' : 'inherit'};">${srv.name}</span>
                                    ${isAdmin ? `
                                        <span class="action-icon delete" onclick="event.stopPropagation(); deleteServer('${srv.id}')" title="Delete Server">
                                            <i data-lucide="trash-2" style="width: 14px; color: var(--error);"></i>
                                        </span>
                                    ` : ''}
                                    <span class="badge ${isCancel ? '' : 'badge-srv'}" style="margin-left: 8px; ${isCancel ? 'background: rgba(249, 115, 22, 0.2); color: #f97316; border: 1px solid #f97316;' : ''}">SRV</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>

            <div class="mailer-grid">
                ${activeMailers.map(m => {
                    const mSrvs = (servers || []).filter(s => s && s.mailerId === m.id);
                    const mStandaloneRps = (rps || []).filter(r => r && r.mailerId === m.id && !r.serverId);
                    
                    return `
                        <div class="mailer-card">
                            <div class="mailer-card-header">
                                <span style="font-weight: 600;">${m.name}</span>
                                <span style="font-size: 0.7rem; color: var(--text-secondary);">${mSrvs.length} Servers</span>
                            </div>
                            <div class="drop-zone" data-type="mailer" data-id="${m.id}" style="min-height: 100px;">
                                ${mSrvs.map(srv => {
                                    const srvRps = (rps || []).filter(r => r && r.serverId === srv.id);
                                    const isExpanded = app.expandedServers.has(srv.id);
                                    const isCancel = srv.markedForCancel === true;
                                    const cancelStyle = isCancel ? 'border-color: #f97316; background: rgba(249, 115, 22, 0.04);' : '';
                                    const activeWarmupIps = warmupCounts[srv.name] || 0;
                                    const totalSrvIps = (srv.allIps || []).length;
                                    return `
                                        <div class="server-container draggable-item" ${isAdmin ? 'draggable="true" ondragstart="handleDragStart(event, \'srv\', \'' + srv.id + '\')"' : ''} style="display: block; padding: 0; margin-bottom: 8px; border-radius: 8px; overflow: hidden; ${cancelStyle}">
                                            <div class="server-header" onclick="app.toggleServerExpand('${srv.id}')" style="cursor: pointer; background: ${isCancel ? 'rgba(249, 115, 22, 0.08)' : 'rgba(255,255,255,0.03)'};">
                                                <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                                                    <i data-lucide="chevron-${isExpanded ? 'down' : 'right'}" style="width: 14px; color: ${isCancel ? '#f97316' : 'var(--text-secondary)'};"></i>
                                                    <span style="font-weight: 600; font-size: 0.85rem; color: ${isCancel ? '#f97316' : 'inherit'};">${srv.name} <span style="color: ${isCancel ? 'rgba(249, 115, 22, 0.8)' : 'var(--text-secondary)'}; font-weight: 400; font-size: 0.75rem;">(${srvRps.length} RPs)</span></span>
                                                    <span onclick="event.stopPropagation(); toggleServerWarmupType('${srv.id}')" 
                                                          style="cursor: pointer; font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 8px;
                                                                 background: ${(srv.warmupType === 'RP' || srv.warmupType === 'Domain RP') ? 'rgba(139, 92, 246, 0.12)' : (srv.warmupType === 'Switch' ? 'rgba(249, 115, 22, 0.12)' : 'rgba(16, 185, 129, 0.12)')};
                                                                 color: ${(srv.warmupType === 'RP' || srv.warmupType === 'Domain RP') ? '#a78bfa' : (srv.warmupType === 'Switch' ? '#f97316' : '#34d399')};
                                                                 border: 1px solid ${(srv.warmupType === 'RP' || srv.warmupType === 'Domain RP') ? 'rgba(139, 92, 246, 0.25)' : (srv.warmupType === 'Switch' ? 'rgba(249, 115, 22, 0.25)' : 'rgba(16, 185, 129, 0.25)')};"
                                                          title="Click to toggle Warmup Mode">
                                                        ${srv.warmupType === 'Domain RP' ? 'RP' : (srv.warmupType || 'RDNS')}
                                                    </span>
                                                    ${totalSrvIps > 0 ? `<span style="font-size: 0.6rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${activeWarmupIps > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(107, 114, 128, 0.08)'}; color: ${activeWarmupIps > 0 ? '#f59e0b' : '#6b7280'}; border: 1px solid ${activeWarmupIps > 0 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(107, 114, 128, 0.15)'};" title="${activeWarmupIps} of ${totalSrvIps} IPs active in warmup (last 24h)">${activeWarmupIps > 0 ? '🔥' : '💤'} ${activeWarmupIps}/${totalSrvIps} IPs</span>` : ''}
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
                                                        <div style="flex: 1; min-width: 0; margin-right: 8px;">
                                                            <div class="item-name" style="font-size: 0.85rem;">${rp.domain}</div>
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
                                            <span class="item-name">${rp.domain}</span>
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
    const teamMembers = (mailers || []).filter(m => m && m.role === 'mailer');

    container.innerHTML = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 style="font-size: 1.25rem;">Team Management</h3>
                <span style="color: var(--text-secondary); font-size: 0.85rem;">${teamMembers.length} Mailers Active</span>
            </div>
            
            <div class="team-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
                ${teamMembers.map(member => {
                    const memberSrvs = (servers || []).filter(s => s && s.mailerId === member.id);
                    const memberRps = (rps || []).filter(r => r && r.mailerId === member.id);
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
        <div class="modal" style="width: 500px; max-width: 95vw;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0;">Add New Server to Inventory</h2>
                <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-secondary);">&times;</button>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <div class="form-group">
                    <label>Server Name</label>
                    <input type="text" id="srv-name" placeholder="s_wmn3_2235" style="width:100%; padding:10px; background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); border-radius:8px;">
                </div>

                <div class="form-group">
                    <label>Production IPs (One per line for PTR/VMTA check)</label>
                    <textarea id="srv-ips" placeholder="173.44.157.34 vmta1.com&#10;173.44.157.35 vmta2.com" style="width:100%; height:200px; background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); border-radius:8px; padding:12px; font-family:monospace;"></textarea>
                </div>
            </div>

            <div style="margin-top: 32px; display: flex; gap: 12px; border-top: 1px solid var(--border-color); padding-top: 24px;">
                <button onclick="saveServer(this)" style="flex: 2; height: 48px; font-size: 1rem;">Create Server & Add to Inventory</button>
                <button onclick="this.closest('.modal-overlay').remove()" style="flex: 1; height: 48px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 1rem;">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
};

window.saveServer = async (btn) => {
    const data = {
        name: document.getElementById('srv-name').value.trim(),
        ips: document.getElementById('srv-ips').value.trim()
    };

    if (data.name && data.ips) {
        btn.innerText = 'Saving...';
        btn.disabled = true;
        await window.app.addServer(data);
        btn.closest('.modal-overlay').remove();
    } else {
        alert('Server Name and at least one IP are required.');
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
                <div style="display: flex; gap: 12px;">
                    <button onclick="showGmailIPStatusModal()" class="btn-primary" style="width: auto; padding: 8px 16px; font-size: 0.8rem; display: flex; align-items: center; gap: 8px; background: #EA4335; border: none;">
                        <i data-lucide="mail" style="width: 16px;"></i>
                        Sync from Gmail
                    </button>
                    <button onclick="showBulkUpdateModal()" style="width: auto; padding: 8px 16px; font-size: 0.8rem; display: flex; align-items: center; gap: 8px; background: var(--accent-primary); border-radius: 6px;">
                        <i data-lucide="list-checks" style="width: 16px;"></i>
                        Bulk Update Status
                    </button>
                </div>
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
                <div id="status-scroll-container">
                    <table class="status-table">
                        <thead>
                            ${STATUS_TYPES.filter(s => s.id !== 'none' && s.id !== 'bounce').map(s => {
                                const isDown = s.id === 'down';
                                const rowLabel = isDown ? 'DOWN + BOUNCE' : s.label;
                                return `
                                <tr style="font-size: 0.65rem;">
                                    <th colspan="2" style="padding: 4px 12px; text-align: right; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color); color: ${s.color}; font-weight: 700; border-right: 1px solid var(--border-color);">${rowLabel}</th>
                                    ${days.map((day, dIdx) => {
                                        const count = isDown ? (dailyStats[dIdx]['down'] + dailyStats[dIdx]['bounce']) : (dailyStats[dIdx][s.id] || 0);
                                        return `<th style="padding: 4px; text-align: center; background: ${s.color}; color: white; border-bottom: 1px solid var(--border-color); border-right: 1px solid var(--border-color); font-weight: 800;">${count}</th>`;
                                    }).join('')}
                                </tr>
                                `;
                            }).join('')}
                            <tr>
                                <th class="sticky-col-1" style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border-color); border-right: 1px solid var(--border-color); background: var(--bg-tertiary);">
                                    <div style="display: flex; align-items: center; justify-content: space-between;">
                                        <span>Server (${totalServers})</span>
                                        <div data-ips="${filteredServers.map(s => s.name).join(',')}" onclick="window.copyIPsFromAttr(this)" style="cursor: pointer; padding: 4px; border-radius: 4px; display: flex;" title="Copy all shown Servers" onmouseover="this.style.background='var(--bg-primary)'" onmouseout="this.style.background='transparent'">
                                            <i data-lucide="copy" style="width: 14px; color: var(--text-secondary);"></i>
                                        </div>
                                    </div>
                                </th>
                                <th class="sticky-col-2" style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border-color); border-right: 1px solid var(--border-color); background: var(--bg-tertiary);">
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
                                    return `<th class="status-cell" style="padding: 12px; text-align: center; border-bottom: 2px solid var(--border-color); font-weight: 700; border-right: 1px solid var(--border-color); ${isSelected ? 'background: var(--bg-primary); border-top: 2px solid var(--accent-primary);' : ''}"> ${day}/${m}</th>`;
                                }).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredServers.map((srv, srvIdx) => {
                                const srvIps = srv.filteredIps || [];
                                const rowBg = srvIdx % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)';
                                const isCancel = srv.markedForCancel === true;
                                const finalSrvBg = isCancel ? 'rgba(249, 115, 22, 0.12)' : rowBg;
                                const finalSrvColor = isCancel ? '#f97316' : 'inherit';
                                const finalSrvBorderLeft = isCancel ? '4px solid #f97316' : '';
                                const finalSrvPaddingLeft = isCancel ? '8px' : '12px';
                                return srvIps.map((ip, idx) => {
                                    const isLastRow = idx === srvIps.length - 1;
                                    const borderBottom = isLastRow ? '3px solid var(--border-color)' : '1px solid var(--border-color)';
                                    
                                    return `
                                    <tr style="border-bottom: ${borderBottom};">
                                        ${idx === 0 ? `<td class="sticky-col-1" rowspan="${srvIps.length}" style="padding: 12px 12px 12px ${finalSrvPaddingLeft}; font-weight: 700; border-right: 1px solid var(--border-color); border-left: ${finalSrvBorderLeft}; background: ${finalSrvBg}; color: ${finalSrvColor}; vertical-align: top; border-bottom: 3px solid var(--border-color);">${srv.name}${isCancel ? '<div style="font-size: 0.55rem; background: rgba(249, 115, 22, 0.2); color: #f97316; padding: 2px 4px; border-radius: 4px; display: block; margin-top: 6px; font-weight: 800; border: 1px solid #f97316; width: max-content;">TO CANCEL</div>' : ''}</td>` : ''}
                                        <td class="sticky-col-2" style="padding: 12px; font-family: monospace; border-right: 1px solid var(--border-color); background: ${rowBg}; border-bottom: ${borderBottom};">
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
                                                    onmouseenter="enterCellDrag(event, '${ip}', '${date}', this)">
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
    const isRunning = spamhausProgress && (spamhausProgress.status === 'scanning' || spamhausProgress.status === 'running');
    
    // TAB MIGRATION: Ensure old tab names default to new ones
    if (!app.state.spamhausTab || app.state.spamhausTab === 'rdns' || app.state.spamhausTab === 'vmta') {
        app.state.spamhausTab = 'grid'; 
    }
    
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
                <div class="date-selector-bar" style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 16px; margin-bottom: 24px; scrollbar-width: thin; -ms-overflow-style: none;">
                    ${[today, ...historyDates.filter(d => d !== today)].map(date => {
                        const isSelected = date === selectedDate;
                        const [y, m, d] = date.split('-');
                        const hasHistory = spamhausHistory && spamhausHistory[date];
                        return `
                            <div onclick="window.setSpamhausDate('${date}')" style="min-width: 80px; padding: 10px; border-radius: 10px; text-align: center; cursor: pointer; transition: all 0.2s; border: 1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}; background: ${isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)'};">
                                <div style="font-size: 0.65rem; color: var(--text-secondary); margin-bottom: 2px;">${y}</div>
                                <div style="font-size: 1rem; font-weight: 700; color: ${isSelected ? 'var(--accent-primary)' : 'var(--text-primary)'};">${d}/${m}</div>
                                ${hasHistory ? `<div style="font-size: 0.55rem; margin-top: 4px; color: var(--success); font-weight: 600;">RECORDED</div>` : `<div style="font-size: 0.55rem; margin-top: 4px; color: var(--text-secondary);">EMPTY</div>`}
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 24px;">
                    <div class="card stat-card" style="display: flex; align-items: center; gap: 16px; padding: 20px;">
                        <div class="stat-icon" style="background: rgba(59, 130, 246, 0.1); color: var(--accent-primary); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            <i data-lucide="shield" style="width: 24px;"></i>
                        </div>
                        <div class="stat-info">
                            <h3 style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">Total Checked</h3>
                            <p style="font-size: 1.5rem; font-weight: 700; margin: 4px 0 0;">${summary.total || 0}</p>
                        </div>
                    </div>
                    <div class="card stat-card" style="display: flex; align-items: center; gap: 16px; padding: 20px;">
                        <div class="stat-icon" style="background: rgba(239, 68, 68, 0.1); color: var(--error); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            <i data-lucide="alert-circle" style="width: 24px;"></i>
                        </div>
                        <div class="stat-info">
                            <h3 style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">Listed IPs</h3>
                            <p style="font-size: 1.5rem; font-weight: 700; margin: 4px 0 0;">${summary.listed || 0}</p>
                        </div>
                    </div>
                </div>

                <div class="card" style="padding: 0; overflow: hidden;">
                    <div style="padding: 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02);">
                        <div>
                            <h3 style="margin: 0; font-size: 1.1rem;">Spamhaus History</h3>
                            <p style="margin: 4px 0 0; font-size: 0.8rem; color: var(--text-secondary);">Detailed results for all active production IPs.</p>
                        </div>
                        <button id="spamhaus-check-btn" onclick="triggerManualSpamhausCheck(this)" class="btn-primary" style="width: auto; padding: 8px 16px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="refresh-cw" class="${isRunning ? 'spin' : ''}" style="width: 14px;"></i> 
                            ${isRunning ? 'Scanning...' : 'Run Manual Scan'}
                        </button>
                    </div>
                    <div style="overflow-x: auto; background: var(--bg-secondary);">
                        <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.85rem;">
                            <thead>
                                <tr style="text-align: left; background: var(--bg-tertiary);">
                                    <th style="padding: 16px 12px; width: 180px;">Server</th>
                                    <th style="padding: 16px 12px; width: 150px;">IP Address</th>
                                    <th style="padding: 16px 12px;">Status (${selectedDate})</th>
                                    <th style="padding: 16px 12px; text-align: right;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${servers.map((s, sIdx) => {
                                    const sIps = s.allIps || [];
                                    return sIps.map((ip, ipIdx) => {
                                        const safeIp = ip.replace(/\./g, '_');
                                        const data = results[safeIp];
                                        const isFirstInServer = ipIdx === 0 && sIdx !== 0;
                                        const thickBorder = isFirstInServer ? 'border-top: 3px solid rgba(255,255,255,0.15);' : '';
                                        
                                        let statusHtml = '<span style="color: var(--text-secondary); opacity: 0.3;">---</span>';
                                        if (data) {
                                            const color = data.status === 'listed' ? 'var(--error)' : 'var(--success)';
                                            const label = data.status === 'listed' ? (data.list || 'LISTED') : 'CLEAN';
                                            statusHtml = `<span style="background: ${color}20; color: ${color}; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; border: 1px solid ${color}30;">${label}</span>`;
                                        }

                                        return `
                                            <tr style="border-bottom: 1px solid var(--border-color); vertical-align: middle;">
                                                ${ipIdx === 0 ? `
                                                    <td rowspan="${sIps.length}" style="padding: 16px 12px; border-right: 1px solid var(--border-color); background: rgba(255,255,255,0.01); font-weight: 700; color: var(--accent-primary); border-bottom: 1px solid var(--border-color); ${thickBorder}">
                                                        ${s.name}
                                                    </td>
                                                ` : ''}
                                                <td style="padding: 12px; font-family: monospace; border-right: 1px solid var(--border-color); ${thickBorder}">${ip}</td>
                                                <td style="padding: 12px; ${thickBorder}">${statusHtml}</td>
                                                <td style="padding: 12px; text-align: right; ${thickBorder}">
                                                    <button onclick="window.open('https://check.spamhaus.org/query/ip/${ip}', '_blank')" style="background: rgba(59, 130, 246, 0.1); border: none; color: var(--accent-primary); cursor: pointer; padding: 6px 12px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Lookup</button>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('');
                                }).join('')}
                                ${servers.length === 0 ? '<tr><td colspan="4" style="padding: 40px; text-align: center; color: var(--text-secondary);">No servers found.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}

            ${app.state.spamhausTab === 'unified' ? `
                <!-- Unified Infrastructure Section -->
                <div class="card" style="padding: 0; overflow: hidden;">
                    <div style="padding: 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02);">
                        <div>
                            <h3 style="margin: 0; font-size: 1.1rem;">Infrastructure Check</h3>
                            <p style="margin: 4px 0 0; font-size: 0.8rem; color: var(--text-secondary);">Verify PTR records, Sync VMTA mappings from Gmail, and check Google Postmaster reputation.</p>
                        </div>
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <button onclick="triggerVMTACheck(this)" class="btn-primary" style="width: auto; padding: 8px 16px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; background: #3B82F6; border: none;">
                                <i data-lucide="zap" style="width: 14px;"></i> Check RDNS
                            </button>
                            <button onclick="showGmailSyncModal()" class="btn-primary" style="width: auto; padding: 8px 16px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; background: #EA4335; border: none;">
                                <i data-lucide="mail" style="width: 14px;"></i> Sync VMTA from Gmail
                            </button>
                            <button onclick="syncPostmasterHealth(this)" class="btn-primary" style="width: auto; padding: 8px 16px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; background: #10B981; border: none;">
                                <i data-lucide="shield" style="width: 14px;"></i> Sync Postmaster
                            </button>
                            <button onclick="autoAddPostmasterDomains(this)" class="btn-primary" style="width: auto; padding: 8px 16px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; background: #8B5CF6; border: none;">
                                <i data-lucide="plus-circle" style="width: 14px;"></i> Auto-Add Postmaster
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
                                    <th style="padding: 16px 12px; width: 180px;">Postmaster Health</th>
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
                                        
                                        // Extract domain name from PTR
                                        let ptrDomain = (ptrData.ptr || '').trim().toLowerCase();
                                        if (ptrDomain.endsWith('.')) ptrDomain = ptrDomain.slice(0, -1);

                                        // Fetch postmaster stats
                                        const cleanDomainKey = ptrDomain.replace(/\./g, '_');
                                        let postmasterData = app.state.postmasterResults && app.state.postmasterResults[cleanDomainKey];
                                        
                                        // Fallback to root domain if subdomain not found in results
                                        if (!postmasterData && ptrDomain && !ptrDomain.includes('No PTR') && !ptrDomain.includes('NXDOMAIN')) {
                                            const rootDomain = getRootDomain(ptrDomain);
                                            const rootKey = rootDomain.replace(/\./g, '_');
                                            postmasterData = app.state.postmasterResults && app.state.postmasterResults[rootKey];
                                        }

                                        let postmasterHtml = '<span style="color: var(--text-secondary); opacity: 0.3;">---</span>';
                                        if (postmasterData) {
                                            const domainRep = postmasterData.domainReputation || 'REPUTATION_UNSPECIFIED';
                                            const ipRep = postmasterData.ipReputations && postmasterData.ipReputations[safeIp] || 'REPUTATION_UNSPECIFIED';
                                            const spamRate = postmasterData.spamRate !== null && postmasterData.spamRate !== undefined ? `${(postmasterData.spamRate * 100).toFixed(2)}%` : '---';

                                            const getRepColor = (rep) => {
                                                if (rep === 'HIGH') return '#4ade80';
                                                if (rep === 'MEDIUM') return '#facc15';
                                                if (rep === 'LOW') return '#fb923c';
                                                if (rep === 'BAD') return '#ef4444';
                                                return 'var(--text-secondary)';
                                            };

                                            const getRepLabel = (rep) => {
                                                if (rep === 'REPUTATION_UNSPECIFIED') return 'UNSP';
                                                return rep;
                                            };

                                            postmasterHtml = `
                                                <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.7rem; line-height: 1.2;">
                                                    <div style="display: flex; gap: 6px; align-items: center;">
                                                        <span style="color: var(--text-secondary); font-size: 0.65rem; width: 45px;">Domain:</span>
                                                        <span style="color: ${getRepColor(domainRep)}; font-weight: 700;">${getRepLabel(domainRep)}</span>
                                                    </div>
                                                    <div style="display: flex; gap: 6px; align-items: center;">
                                                        <span style="color: var(--text-secondary); font-size: 0.65rem; width: 45px;">IP:</span>
                                                        <span style="color: ${getRepColor(ipRep)}; font-weight: 700;">${getRepLabel(ipRep)}</span>
                                                    </div>
                                                    ${postmasterData.spamRate !== null ? `
                                                        <div style="display: flex; gap: 6px; align-items: center;">
                                                            <span style="color: var(--text-secondary); font-size: 0.65rem; width: 45px;">Spam:</span>
                                                            <span style="color: ${parseFloat(spamRate) > 0.3 ? '#ef4444' : '#4ade80'}; font-weight: 600;">${spamRate}</span>
                                                        </div>
                                                    ` : ''}
                                                </div>
                                            `;
                                        }

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
                                                <td style="padding: 12px; font-family: monospace; color: var(--text-secondary); ${thickBorder}">
                                                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                                                        <span>${ptrData.ptr}</span>
                                                        ${ptrData.history && ptrData.history.length > 0 ? `
                                                            <span class="history-badge" 
                                                                  style="cursor: help; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: var(--accent-primary); font-size: 0.6rem; padding: 2px 6px; border-radius: 4px;"
                                                                  title="Previous Domains:&#10;${ptrData.history.map(h => `• ${h.domain} (${h.date})`).join('&#10;')}">
                                                                History (${ptrData.history.length})
                                                            </span>
                                                        ` : ''}
                                                    </div>
                                                </td>
                                                <td style="padding: 12px; font-family: monospace; color: var(--accent-primary); ${thickBorder}">${vmta}</td>
                                                <td style="padding: 12px; ${thickBorder}">${postmasterHtml}</td>
                                                <td style="padding: 12px; text-align: center; ${thickBorder}">
                                                    <span style="color: ${ptrData.status === 'OK' ? 'var(--success)' : (ptrData.status === '---' ? 'var(--text-secondary)' : 'var(--error)')}; font-weight: 700; font-size: 0.7rem;">
                                                        ${ptrData.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('');
                                }).join('')}
                                ${servers.length === 0 ? '<tr><td colspan="6" style="padding: 40px; text-align: center; color: var(--text-secondary);">No servers found.</td></tr>' : ''}
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
    let myDrops = drops || [];

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
                                             <th style="padding: 16px 12px; cursor: pointer; width: 160px;" onclick="app.setDropSort('mailerName')">Mailer ${key === 'mailerName' ? `<i data-lucide="chevron-${order === 'desc' ? 'down' : 'up'}" style="width: 14px; vertical-align: middle;"></i>` : ''}</th>
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
                                    </td>
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
                            ${sortedDrops.length === 0 ? `<tr><td colspan="13" style="padding: 60px; text-align: center; color: var(--text-secondary);">No drop records yet. Click "+ New Drop" to begin tracking.</td></tr>` : ''}
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
                Your Spamhaus scanner is now fully automated. It runs 3 times daily (at <strong>01:00 AM</strong>, <strong>09:00 AM</strong>, and <strong>05:00 PM</strong> Moroccan Time) for 100% accuracy.
            </p>
            <button id="modal-spamhaus-scan-btn" onclick="window.startManualSpamhausScan(this)" class="btn-primary" style="width: 100%; margin-bottom: 12px;">Manual Scan</button>
            <button onclick="this.closest('.modal-overlay').remove()" class="btn-secondary" style="width: 100%; background: transparent; border: 1px solid var(--border-color); color: var(--text-primary);">Got it!</button>
        </div>
    `;
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
};

window.startManualSpamhausScan = async (btn) => {
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Starting Scan...';
    try {
        const resp = await fetch('/api/check-spamhaus', { method: 'POST' });
        if (resp.ok) {
            btn.innerText = 'Scan Started!';
            btn.style.background = 'var(--success)';
            setTimeout(() => {
                const overlay = btn.closest('.modal-overlay');
                if (overlay) overlay.remove();
            }, 1200);
        } else {
            alert('Failed to start scan: ' + resp.statusText);
            btn.disabled = false;
            btn.innerText = originalText;
        }
    } catch (e) {
        alert('Error starting scan: ' + e.message);
        btn.disabled = false;
        btn.innerText = originalText;
    }
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
    }
};

window.syncPostmasterHealth = async (btn) => {
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="refresh-cw" class="spin" style="width: 14px;"></i> Syncing...';
    btn.disabled = true;
    
    const app = window.app;
    
    try {
        const response = await fetch('/api/check-postmaster', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || errData.message || 'API request failed');
        }
        
        const data = await response.json();
        if (data.results) {
            if (!app.state.postmasterResults) {
                app.state.postmasterResults = {};
            }
            app.state.postmasterResults = { ...app.state.postmasterResults, ...data.results };
            await app.saveState();
        }
        alert('Postmaster sync completed successfully!');
    } catch (err) {
        console.error('Postmaster Sync Error:', err);
        alert('Postmaster sync failed: ' + err.message);
    } finally {
        app.updateDashboard();
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

window.autoAddPostmasterDomains = async (btn) => {
    const defaultToken = "google-site-verification=qo8V9cAsy9CrNm42J8V_DuUIILXgXsnj8-Wzehk7rOA";
    const tokenInput = prompt("Enter Google site verification token:", defaultToken);
    if (tokenInput === null) return; 

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="refresh-cw" class="spin" style="width: 14px;"></i> Adding...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/check-postmaster', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add', token: tokenInput })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || errData.message || 'API request failed');
        }

        const data = await response.json();
        const added = data.added || [];

        if (added.length === 0) {
            alert('All system domains are already registered in Google Postmaster Tools!');
            return;
        }

        window.showPostmasterVerificationModal(added, tokenInput);
    } catch (err) {
        console.error('Auto-Add Postmaster Error:', err);
        alert('Auto-Add Postmaster failed: ' + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        if (window.lucide) window.lucide.createIcons();
    }
};

window.showPostmasterVerificationModal = (addedList, token) => {
    const recordsText = addedList.map(item => item.record).join('\n');
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    
    overlay.innerHTML = `
        <div class="modal" style="width: 600px; max-width: 90%; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 24px; color: var(--text-primary);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(139, 92, 246, 0.1); display: flex; align-items: center; justify-content: center; color: #8B5CF6;">
                    <i data-lucide="shield-check" style="width: 24px;"></i>
                </div>
                <div>
                    <h2 style="margin: 0; font-size: 1.25rem;">Postmaster Verification Records</h2>
                    <p style="margin: 4px 0 0; font-size: 0.8rem; color: var(--text-secondary);">${addedList.length} domains registered.</p>
                </div>
            </div>
            
            <p style="font-size: 0.85rem; margin-bottom: 16px; line-height: 1.4;">
                Add the following TXT records to your DNS provider. Once updated, Google Postmaster Tools will verify ownership automatically.
            </p>
            
            <textarea id="pm-verification-records" readonly style="width: 100%; height: 180px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 0.8rem; color: var(--text-primary); resize: none; margin-bottom: 20px;">${recordsText}</textarea>
            
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                <div style="display: flex; gap: 12px;">
                    <button onclick="copyPostmasterRecords()" class="btn-primary" style="background: var(--accent-primary); border: none; padding: 8px 16px; font-size: 0.85rem; cursor: pointer;">
                        Copy All Records
                    </button>
                    <button onclick="downloadPostmasterRecords()" class="btn-secondary" style="padding: 8px 16px; font-size: 0.85rem; cursor: pointer;">
                        Download TXT File
                    </button>
                </div>
                <button onclick="this.closest('.modal-overlay').remove()" class="btn-secondary" style="padding: 8px 16px; font-size: 0.85rem; background: transparent; border: 1px solid var(--border-color); cursor: pointer;">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
    
    window.copyPostmasterRecords = () => {
        const copyText = document.getElementById('pm-verification-records');
        copyText.select();
        document.execCommand('copy');
        alert('All verification records copied to clipboard!');
    };
    
    window.downloadPostmasterRecords = () => {
        const element = document.createElement('a');
        const file = new Blob([recordsText], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = 'postmaster_dns_verification_records.txt';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };
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

window.showGmailIPStatusModal = () => {
    const gmail = window.app.state.gmail_status || { email: '', password: '' };
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="width: 450px;">
            <div class="modal-header">
                <h3>Sync IP Status from Gmail</h3>
                <button onclick="this.closest('.modal-overlay').remove()" class="close-btn">&times;</button>
            </div>
            <div style="padding: 20px;">
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 20px;">
                    Enter your test Gmail credentials to extract delivery statuses (INBOX/SPAM) from recent emails.
                </p>
                
                <div class="form-group">
                    <label>Gmail Address</label>
                    <input type="email" id="sync-gmail-email-status" value="${gmail.email}" placeholder="test-inbox@gmail.com">
                </div>
                
                <div class="form-group">
                    <label>App Password</label>
                    <input type="password" id="sync-gmail-password-status" value="${gmail.password}" placeholder="xxxx xxxx xxxx xxxx">
                    <small style="display: block; margin-top: 4px; color: var(--text-secondary); font-size: 0.7rem;">
                        Use a Google App Password, NOT your regular password.
                    </small>
                </div>

                <div id="sync-progress-status" style="display: none; margin-top: 20px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 8px;">
                        <span id="sync-status-text-status">Connecting to Gmail...</span>
                        <span id="sync-percent-status">0%</span>
                    </div>
                    <div style="height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden;">
                        <div id="sync-bar-status" style="width: 0%; height: 100%; background: #EA4335; transition: width 0.3s ease;"></div>
                    </div>
                </div>

                <div id="sync-results-status" style="display: none; margin-top: 20px; max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-tertiary);">
                    <div style="padding: 8px 12px; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); position: sticky; top: 0; background: var(--bg-tertiary);">
                        IP STATUS UPDATES
                    </div>
                    <div id="status-updates-list" style="padding: 8px;"></div>
                </div>

                <div style="margin-top: 24px; display: flex; gap: 12px;">
                    <button onclick="runGmailIPStatusSync(this)" class="btn-primary" style="flex: 1; background: #EA4335; border: none;">Start Sync</button>
                    <button onclick="this.closest('.modal-overlay').remove()" class="btn-secondary" style="flex: 1;">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.runGmailIPStatusSync = async (btn) => {
    const email = document.getElementById('sync-gmail-email-status').value.trim();
    const password = document.getElementById('sync-gmail-password-status').value.trim();
    
    if (!email || !password) return alert('Please enter both email and password.');

    const originalText = btn.innerText;
    btn.innerText = 'Syncing...';
    btn.disabled = true;

    const progressDiv = document.getElementById('sync-progress-status');
    const bar = document.getElementById('sync-bar-status');
    const statusText = document.getElementById('sync-status-text-status');
    const percentText = document.getElementById('sync-percent-status');
    
    progressDiv.style.display = 'block';

    const setProgress = (p, text) => {
        bar.style.width = `${p}%`;
        percentText.innerText = `${p}%`;
        if (text) statusText.innerText = text;
    };

    try {
        let p = 0;
        const interval = setInterval(() => {
            if (p < 90) {
                p += Math.random() * 5;
                setProgress(Math.round(p));
            }
        }, 1000);

        // Prepare all production IPs to filter in backend
        const targetIps = window.app.state.servers.flatMap(s => s.allIps || []);
        
        const response = await fetch('/api/sync-ip-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, targetIps })
        });

        const data = await response.json();
        clearInterval(interval);
        
        if (data.error) throw new Error(data.error);

        setProgress(100, 'Scan Complete!');

        const ipData = data.results || {};
        const count = Object.keys(ipData).length;

        if (count === 0) {
            alert('No IP delivery data found in recent emails.');
            btn.innerText = originalText;
            btn.disabled = false;
            return;
        }

        // Show results preview
        const resultsDiv = document.getElementById('sync-results-status');
        const listDiv = document.getElementById('status-updates-list');
        resultsDiv.style.display = 'block';
        listDiv.innerHTML = '';
        
        btn.innerText = 'Applying...';
        
        let updateCount = 0;
        const today = new Date().toISOString().split('T')[0];
        const statuses = window.app.state.statuses || {};
        const rdnsMap = {};
        
        // Build RDNS map from vmtaResults
        Object.entries(window.app.state.vmtaResults || {}).forEach(([safeIp, data]) => {
            rdnsMap[safeIp] = (data.ptr || '').toLowerCase().trim();
        });

        Object.entries(ipData).forEach(([ip, info]) => {
            const safeIp = ip.replace(/\./g, '_');
            
            // 1. Get RDNS to compare against (Priority: State > Header Fallback)
            const stateRdns = (rdnsMap[safeIp] || '').toLowerCase().trim();
            const headerRdns = (info.headerRdns || '').toLowerCase().trim();
            const targetRdns = stateRdns || headerRdns;
            
            // 2. Clean Return-Path and extract domain
            const rpFull = (info.returnPath || '').toLowerCase().trim();
            const rpDomain = rpFull.includes('@') ? rpFull.split('@')[1] : rpFull;
            
            // 3. Extract domain from Target RDNS
            const rdnsDomain = targetRdns.includes('.') ? targetRdns : targetRdns; // Simplified, we compare the whole RDNS usually

            const folder = info.folder; // 'INBOX' or 'SPAM'
            
            let newStatusId = 'none';
            if (folder === 'INBOX') {
                // MATCH LOGIC: Check if Return-Path matches the RDNS hostname or domain
                const isMatch = (targetRdns && rpDomain && (rpFull.includes(targetRdns) || targetRdns.includes(rpDomain)));
                newStatusId = isMatch ? 'rdns' : 'rp_test';
            } else if (folder === 'SPAM') {
                newStatusId = 'spam';
            }

            if (newStatusId !== 'none') {
                if (!statuses[safeIp]) statuses[safeIp] = {};
                const currentStatusId = statuses[safeIp][today] || 'none';
                
                // OVERRIDE RULES: RDNS > RP TEST > SPAM
                let shouldApply = false;
                if (newStatusId === 'rdns') {
                    shouldApply = true;
                } else if (newStatusId === 'rp_test') {
                    if (currentStatusId !== 'rdns') shouldApply = true;
                } else if (newStatusId === 'spam') {
                    if (currentStatusId === 'none' || currentStatusId === 'spam' || currentStatusId === 'down') shouldApply = true;
                }

                if (shouldApply && currentStatusId !== newStatusId) {
                    statuses[safeIp][today] = newStatusId;
                    updateCount++;
                    
                    const item = document.createElement('div');
                    item.style.cssText = 'display: flex; justify-content: space-between; font-size: 0.8rem; padding: 4px 8px; background: rgba(255,255,255,0.03); border-radius: 4px; margin-bottom: 4px;';
                    const statusLabel = newStatusId.toUpperCase();
                    const statusColor = newStatusId === 'rdns' ? '#166534' : (newStatusId === 'rp_test' ? '#22c55e' : '#ef4444');
                    item.innerHTML = `<span>${ip}</span><span style="color: ${statusColor}; font-weight: 700;">${statusLabel}</span>`;
                    listDiv.appendChild(item);
                }
            }
        });

        // Save credentials and state
        window.app.state.gmail_status = { email, password };
        window.app.state.statuses = statuses;
        await window.app.saveState();
        window.app.updateDashboard();

        btn.innerText = `Updated ${updateCount} IPs!`;
        setTimeout(() => {
            if (btn.closest('.modal-overlay')) btn.closest('.modal-overlay').remove();
        }, 2500);

    } catch (err) {
        alert('Sync Failed: ' + err.message);
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

window.renderAiAgent = (app, container) => {
    const aiConfig = app.state.aiConfig || {};
    const key = aiConfig.geminiApiKey || '';
    const hasKey = !!key;

    if (!app.aiChatHistory) {
        app.aiChatHistory = [];
    }

    // Preserve textarea focus and typed content by only updating messages list when already rendered
    const existingInput = document.getElementById('ai-chat-input');
    if (existingInput) {
        const messagesDiv = document.getElementById('ai-chat-messages');
        if (messagesDiv) {
            const currentMessagesHTML = app.aiChatHistory.length === 0 ? `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; max-width: 400px; margin: 0 auto; gap: 16px; opacity: 0.85;">
                    <div style="background: rgba(59, 130, 246, 0.1); color: var(--accent-primary); width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(59,130,246,0.15);">
                        <i data-lucide="bot" style="width: 28px;"></i>
                    </div>
                    <div>
                        <h5 style="margin: 0 0 6px 0; font-size: 0.95rem;">Ask your AI Assistant</h5>
                        <p style="margin: 0; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">
                            I have read your current dashboard data. Ask me to find blacklisted IPs, compute average EPCs, summarize top offers, or audit servers!
                        </p>
                    </div>
                </div>
            ` : app.aiChatHistory.map(msg => `
                <div style="display: flex; justify-content: ${msg.role === 'user' ? 'flex-end' : 'flex-start'};">
                    <div style="max-width: 80%; padding: 12px 16px; border-radius: 12px; font-size: 0.85rem; line-height: 1.5; ${msg.role === 'user' 
                        ? 'background: linear-gradient(135deg, var(--accent-primary) 0%, #2563eb 100%); color: #fff; border-bottom-right-radius: 2px; box-shadow: 0 4px 12px rgba(59,130,246,0.2);' 
                        : 'background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); border-bottom-left-radius: 2px;'
                    }">
                        ${msg.text}
                    </div>
                </div>
            `).join('');

            // Normalize whitespace comparison
            const normExisting = messagesDiv.innerHTML.replace(/\s+/g, ' ').trim();
            const normNew = currentMessagesHTML.replace(/\s+/g, ' ').trim();

            if (normExisting !== normNew) {
                messagesDiv.innerHTML = currentMessagesHTML;
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                if (window.lucide) window.lucide.createIcons();
            }
        }
        return;
    }

    container.innerHTML = `
        <div style="padding: 24px; display: flex; flex-direction: column; height: calc(100vh - 64px); max-height: calc(100vh - 64px); overflow: hidden; gap: 20px;">
            
            <!-- Page Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                <div>
                    <h2 style="margin: 0; font-size: 1.5rem; display: flex; align-items: center; gap: 10px;">
                        <i data-lucide="bot" style="width: 28px; height: 28px; color: var(--accent-primary);"></i>
                        Gestion Team AI Copilot
                    </h2>
                    <p style="margin: 4px 0 0; font-size: 0.85rem; color: var(--text-secondary);">
                        Real-time AI analyst trained on your server inventory, Spamhaus status, and drops performance.
                    </p>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; color: #22c55e; font-weight: 600;">
                    <span style="display: inline-block; width: 8px; height: 8px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 8px #22c55e; animation: pulse 2s infinite;"></span>
                    AI Engine Online
                </div>
            </div>

            <!-- Two Column Chat Layout -->
            <div style="display: flex; gap: 20px; flex: 1; min-height: 0;">
                
                <!-- Left Sidebar: Quick Prompts -->
                <div style="width: 320px; display: flex; flex-direction: column; gap: 20px; flex-shrink: 0;">

                    <!-- Quick Insights Panel -->
                    <div class="card" style="padding: 20px; background: var(--bg-secondary); border: 1px solid var(--border-color); flex: 1; display: flex; flex-direction: column; gap: 14px; overflow-y: auto;">
                        <h4 style="margin: 0; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="sparkles" style="width: 16px; color: #a855f7;"></i>
                            AI Quick Insights
                        </h4>
                        <p style="margin: 0; font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 4px;">
                            Select a preset analysis prompt to immediately inspect your active dashboard data:
                        </p>
                        
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div class="insight-prompt-btn" onclick="triggerPresetPrompt('Analyze the current revenue performance, listing top offers and highlighting the highest earners.')">
                                <div style="font-weight: 600; font-size: 0.8rem; color: var(--text-primary); margin-bottom: 2px;">📈 Revenue Analysis</div>
                                <div style="font-size: 0.7rem; color: var(--text-secondary);">Ranks top offers & computes revenue share.</div>
                            </div>
                            
                            <div class="insight-prompt-btn" onclick="triggerPresetPrompt('Scan our server inventory and identify if any servers or IPs are blacklisted on Spamhaus or have VMTA/PTR record issues.')">
                                <div style="font-weight: 600; font-size: 0.8rem; color: var(--text-primary); margin-bottom: 2px;">🚨 Server Health Check</div>
                                <div style="font-size: 0.7rem; color: var(--text-secondary);">Detects PTR errors & listed IPs.</div>
                            </div>
                            
                            <div class="insight-prompt-btn" onclick="triggerPresetPrompt('Evaluate each mailer\\'s drop volume and total revenue performance. Provide a performance summary.')">
                                <div style="font-weight: 600; font-size: 0.8rem; color: var(--text-primary); margin-bottom: 2px;">👥 Team Performance</div>
                                <div style="font-size: 0.7rem; color: var(--text-secondary);">Compares drop volume & contributions.</div>
                            </div>
                            
                            <div class="insight-prompt-btn" onclick="triggerPresetPrompt('Generate a comprehensive executive summary of the entire team state, servers, and financial indicators.')">
                                <div style="font-weight: 600; font-size: 0.8rem; color: var(--text-primary); margin-bottom: 2px;">📊 Executive Summary</div>
                                <div style="font-size: 0.7rem; color: var(--text-secondary);">High-level overview & key trends.</div>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- Right Column: Interactive Chat Area -->
                <div class="card" style="flex: 1; background: var(--bg-secondary); border: 1px solid var(--border-color); display: flex; flex-direction: column; padding: 0; overflow: hidden; position: relative;">
                    
                    <!-- Chat Header -->
                    <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.01);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="message-square" style="width: 18px; color: var(--accent-primary);"></i>
                            <span style="font-weight: 600; font-size: 0.9rem;">Chat Session</span>
                        </div>
                        <button onclick="clearAiChat()" style="background: transparent; border: none; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.75rem; transition: color 0.2s;" onmouseover="this.style.color='var(--error)'" onmouseout="this.style.color='var(--text-secondary)'">
                            <i data-lucide="trash-2" style="width: 14px;"></i> Clear History
                        </button>
                    </div>

                    <!-- Chat Messages List -->
                    <div id="ai-chat-messages" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; scroll-behavior: smooth;">
                        ${app.aiChatHistory.length === 0 ? `
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; max-width: 400px; margin: 0 auto; gap: 16px; opacity: 0.85;">
                                <div style="background: rgba(59, 130, 246, 0.1); color: var(--accent-primary); width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(59,130,246,0.15);">
                                    <i data-lucide="bot" style="width: 28px;"></i>
                                </div>
                                <div>
                                    <h5 style="margin: 0 0 6px 0; font-size: 0.95rem;">Ask your AI Assistant</h5>
                                    <p style="margin: 0; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">
                                        I have read your current dashboard data. Ask me to find blacklisted IPs, compute average EPCs, summarize top offers, or audit servers!
                                    </p>
                                </div>
                            </div>
                        ` : app.aiChatHistory.map(msg => `
                            <div style="display: flex; justify-content: ${msg.role === 'user' ? 'flex-end' : 'flex-start'};">
                                <div style="max-width: 80%; padding: 12px 16px; border-radius: 12px; font-size: 0.85rem; line-height: 1.5; ${msg.role === 'user' 
                                    ? 'background: linear-gradient(135deg, var(--accent-primary) 0%, #2563eb 100%); color: #fff; border-bottom-right-radius: 2px; box-shadow: 0 4px 12px rgba(59,130,246,0.2);' 
                                    : 'background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); border-bottom-left-radius: 2px;'
                                }">
                                    ${msg.text}
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Typing Indicator -->
                    <div id="ai-chat-typing" style="padding: 12px 20px; display: none; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--text-secondary); background: rgba(0,0,0,0.05); border-top: 1px solid var(--border-color); flex-shrink: 0;">
                        <span style="display: inline-block; width: 6px; height: 6px; background: var(--accent-primary); border-radius: 50%; animation: pulse-dot 1.4s infinite ease-in-out;"></span>
                        <span style="display: inline-block; width: 6px; height: 6px; background: var(--accent-primary); border-radius: 50%; animation: pulse-dot 1.4s infinite ease-in-out 0.2s;"></span>
                        <span style="display: inline-block; width: 6px; height: 6px; background: var(--accent-primary); border-radius: 50%; animation: pulse-dot 1.4s infinite ease-in-out 0.4s;"></span>
                        <span style="margin-left: 4px;">AI is thinking and analyzing dashboard state...</span>
                    </div>

                    <!-- Chat Input Panel -->
                    <div style="padding: 16px 20px; border-top: 1px solid var(--border-color); display: flex; gap: 10px; background: rgba(0,0,0,0.02); flex-shrink: 0;">
                        <textarea id="ai-chat-input" placeholder="Type a message or request a data extraction..." style="flex: 1; min-height: 44px; max-height: 120px; height: 44px; padding: 12px 16px; border-radius: 8px; background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); font-size: 0.85rem; outline: none; transition: all 0.2s; resize: none; line-height: 1.4;" onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 2px rgba(59,130,246,0.1)'" onblur="this.style.borderColor='var(--border-color)'; this.style.boxShadow='none'" onkeydown="handleAiInputKeydown(event)"></textarea>
                        <button onclick="submitAiAgentMessage()" class="btn-primary" style="width: auto; padding: 0 20px; border-radius: 8px; background: var(--accent-primary); border: none; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='var(--accent-secondary)'" onmouseout="this.style.background='var(--accent-primary)'">
                            <span>Send</span>
                            <i data-lucide="send" style="width: 14px;"></i>
                        </button>
                    </div>

                </div>

            </div>

        </div>
    `;

    window.triggerPresetPrompt = (promptText) => {
        const input = document.getElementById('ai-chat-input');
        if (input) {
            input.value = promptText;
            input.focus();
            window.submitAiAgentMessage();
        }
    };

    window.clearAiChat = () => {
        app.aiChatHistory = [];
        app.updateDashboard();
    };

    window.handleAiInputKeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            window.submitAiAgentMessage();
        }
    };

    window.submitAiAgentMessage = async () => {
        const input = document.getElementById('ai-chat-input');
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        app.aiChatHistory.push({ role: 'user', text: text });
        input.value = '';
        
        app.updateDashboard();

        const container = document.getElementById('ai-chat-messages');
        if (container) container.scrollTop = container.scrollHeight;

        const typing = document.getElementById('ai-chat-typing');
        if (typing) typing.style.display = 'flex';

        try {
            const response = await fetch('/api/ai-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    history: app.aiChatHistory.slice(0, -1)
                })
            });

            const result = await response.json();
            
            if (result.error) {
                app.aiChatHistory.push({ role: 'model', text: `⚠️ <b>Error:</b> ${result.error}` });
            } else {
                app.aiChatHistory.push({ role: 'model', text: result.response });
            }
        } catch (e) {
            app.aiChatHistory.push({ role: 'model', text: `⚠️ <b>Connection Error:</b> Failed to reach AI Agent endpoint. (${e.message})` });
        } finally {
            if (typing) typing.style.display = 'none';
            app.updateDashboard();
            
            setTimeout(() => {
                const freshContainer = document.getElementById('ai-chat-messages');
                if (freshContainer) freshContainer.scrollTop = freshContainer.scrollHeight;
            }, 100);
        }
    };

    if (!document.getElementById('ai-agent-styles')) {
        const style = document.createElement('style');
        style.id = 'ai-agent-styles';
        style.innerHTML = `
            @keyframes pulse {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
            }
            @keyframes pulse-dot {
                0%, 100% { transform: scale(0.6); opacity: 0.4; }
                50% { transform: scale(1); opacity: 1; }
            }
            .insight-prompt-btn {
                padding: 10px 14px;
                border-radius: 8px;
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                cursor: pointer;
                transition: all 0.2s ease-in-out;
                text-align: left;
            }
            .insight-prompt-btn:hover {
                border-color: var(--accent-primary);
                background: rgba(59, 130, 246, 0.05);
                transform: translateX(4px);
            }
        `;
        document.head.appendChild(style);
    }

    if (window.lucide) window.lucide.createIcons();
    
    setTimeout(() => {
        const msgList = document.getElementById('ai-chat-messages');
        if (msgList) msgList.scrollTop = msgList.scrollHeight;
    }, 100);
};

window.switchRPTab = (tab) => {
    window._activeRPTab = tab;
    window.app.updateDashboard();
};

window.updateGenSelectedServers = () => {
    if (!window._genRecordsState) window._genRecordsState = {};
    const selectedButtons = document.querySelectorAll('.gen-srv-btn.selected');
    window._genRecordsState.selectedServers = Array.from(selectedButtons).map(btn => btn.getAttribute('data-value'));
};

function renderRPsInventory(app, container) {
    window.withFocusPreservation(() => {
        _renderRPsInventory(app, container);
    });
}

function _renderRPsInventory(app, container) {
    // CRITICAL: Capture live DOM values BEFORE innerHTML destroys them.
    // Firebase .on('value') can trigger updateDashboard() at ANY time,
    // which re-renders this view and replaces all DOM elements.
    // The 'input' event saves text as-you-type, but there's a gap:
    // if a Firebase sync fires between the last keystroke and a click,
    // the textarea DOM is destroyed before its value is read.
    const liveRpInput = document.getElementById('gen-rp-input');
    if (liveRpInput) {
        if (!window._genRecordsState) window._genRecordsState = {};
        window._genRecordsState.rpInput = liveRpInput.value;
    }
    // Also snapshot server button selections from the live DOM
    const liveServerBtns = document.querySelectorAll('.gen-srv-btn.selected');
    if (liveServerBtns.length > 0) {
        if (!window._genRecordsState) window._genRecordsState = {};
        window._genRecordsState.selectedServers = Array.from(liveServerBtns).map(btn => btn.getAttribute('data-value'));
    }

    const existingDropdown = document.getElementById('rp-server-dropdown-options');
    const scrollPos = existingDropdown ? existingDropdown.scrollTop : 0;

    const isAdmin = app.state.currentUser && app.state.currentUser.role === 'admin';
    if (app.state.rpSearch === undefined) app.state.rpSearch = '';
    if (app.state.rpFilterServer === undefined) {
        app.state.rpFilterServer = ['all'];
    } else if (!Array.isArray(app.state.rpFilterServer)) {
        app.state.rpFilterServer = [app.state.rpFilterServer];
    }
    if (app.state.rpFilterSpfType === undefined) app.state.rpFilterSpfType = 'all';
    if (app.state.rpFilterRpType === undefined) app.state.rpFilterRpType = 'all';
    if (app.state.rpFilterSent === undefined) app.state.rpFilterSent = 'all';
    if (app.state.rpFilterSpfStatus === undefined) app.state.rpFilterSpfStatus = 'all';

    const rpSpfProgress = app.state.rpSpfProgress || { status: 'idle', current: 0, total: 0 };
    const isSpfRunning = rpSpfProgress.status === 'running' && (Date.now() - (rpSpfProgress.timestamp || 0) < 30000);

    const items = app.getProcessedRPInventory() || [];

    const totalCount = items.length;
    const sentCount = items.filter(item => item.alreadySent).length;
    const unsentCount = totalCount - sentCount;
    const sentPct = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;
    const unsentPct = totalCount > 0 ? Math.round((unsentCount / totalCount) * 100) : 0;
    const includeCount = items.filter(item => item.spfType === 'Include').length;
    const arecodCount = totalCount - includeCount;
    const spfOkCount = items.filter(item => item.spfStatus === 'OK').length;
    const spfWarningCount = items.filter(item => item.spfStatus === 'WARNING').length;
    const spfErrorCount = items.filter(item => item.spfStatus === 'ERROR').length;
    const spfUnchecked = totalCount - spfOkCount - spfWarningCount - spfErrorCount;

    const search = app.state.rpSearch.trim().toLowerCase();
    const filteredItems = items.filter(item => {
        if (search) {
            const domainMatch = (item.rpDomain || '').toLowerCase().includes(search);
            const domIncMatch = (item.domainIncluded || '').toLowerCase().includes(search);
            const subIncMatch = (item.subdomainIncluded || '').toLowerCase().includes(search);
            const srvMatch = (item.srv || '').toLowerCase().includes(search);
            if (!domainMatch && !domIncMatch && !subIncMatch && !srvMatch) return false;
        }

        if (!app.state.rpFilterServer.includes('all')) {
            let matched = false;
            for (const val of app.state.rpFilterServer) {
                if (val === 'SENT') {
                    if (item.srv === 'SENT') { matched = true; break; }
                } else if (val === 'none') {
                    if (!item.srv) { matched = true; break; }
                } else if (val === 'available') {
                    if (item.srv && item.srv !== '') continue;
                    let hasConflict = false;
                    if (item.domainIncluded) {
                        const domInc = item.domainIncluded.trim().toLowerCase();
                        const conflict = items.find(other => 
                            other.id !== item.id && 
                            other.domainIncluded && 
                            other.domainIncluded.trim().toLowerCase() === domInc && 
                            other.srv && 
                            other.srv !== '' && 
                            other.srv !== 'SENT'
                        );
                        if (conflict) hasConflict = true;
                    }
                    if (!hasConflict) { matched = true; break; }
                } else {
                    if (item.srv === val) { matched = true; break; }
                }
            }
            if (!matched) return false;
        }

        if (app.state.rpFilterSpfType !== 'all') {
            if (item.spfType !== app.state.rpFilterSpfType) return false;
        }

        if (app.state.rpFilterRpType !== 'all') {
            if (item.rpType !== app.state.rpFilterRpType) return false;
        }

        if (app.state.rpFilterSent !== 'all') {
            const isSent = !!item.alreadySent;
            if (app.state.rpFilterSent === 'sent' && !isSent) return false;
            if (app.state.rpFilterSent === 'unsent' && isSent) return false;
        }

        if (app.state.rpFilterSpfStatus !== 'all') {
            if (app.state.rpFilterSpfStatus === 'OK') {
                if (item.spfStatus !== 'OK' && item.spfStatus !== 'WARNING') return false;
            } else if (app.state.rpFilterSpfStatus === 'WARNING') {
                if (item.spfStatus !== 'WARNING') return false;
            } else if (app.state.rpFilterSpfStatus === 'ERROR') {
                if (item.spfStatus !== 'ERROR') return false;
            } else if (app.state.rpFilterSpfStatus === 'none') {
                if (item.spfStatus === 'OK' || item.spfStatus === 'WARNING' || item.spfStatus === 'ERROR') return false;
            }
        }

        return true;
    });

    if (window._activeRPTab === undefined) {
        window._activeRPTab = 'database';
    }
    window._lastFilteredRPs = filteredItems;

    const serverNames = (app.state.servers || []).map(s => s.name).filter(Boolean);
    const uniqueServerNames = [...new Set(serverNames)].sort();

    let selectedText = 'All Servers';
    if (!app.state.rpFilterServer.includes('all') && app.state.rpFilterServer.length > 0) {
        const displayNames = app.state.rpFilterServer.map(val => {
            if (val === 'SENT') return 'SENT (State)';
            if (val === 'none') return 'Unassigned';
            if (val === 'available') return 'Available Only';
            return val;
        });
        const joined = displayNames.join(', ');
        selectedText = joined.length > 20 ? `${app.state.rpFilterServer.length} Selected` : joined;
    }

    container.innerHTML = `
        <style>
            .option-hover:hover {
                background: rgba(255,255,255,0.05);
            }
            .multiselect-options::-webkit-scrollbar {
                width: 6px;
            }
            .multiselect-options::-webkit-scrollbar-track {
                background: rgba(0,0,0,0.1);
                border-radius: 4px;
            }
            .multiselect-options::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.2);
                border-radius: 4px;
            }
            .rps-inventory-container {
                display: flex;
                flex-direction: column;
                gap: 24px;
                padding: 4px 0 24px 0;
            }
            .rp-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 20px;
            }
            .rp-stat-card {
                padding: 16px 20px;
                border-left: 4px solid var(--accent-primary);
            }
            .rp-filters-bar {
                display: flex;
                flex-wrap: wrap;
                gap: 16px;
                align-items: center;
                background: var(--bg-secondary);
                padding: 16px;
                border-radius: 12px;
                border: 1px solid var(--border-color);
            }
            .rp-filter-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
                min-width: 140px;
            }
            .rp-filter-group.search {
                flex: 1;
                min-width: 200px;
            }
            .rp-filter-label {
                font-size: 0.7rem;
                font-weight: 600;
                color: var(--text-secondary);
                text-transform: uppercase;
            }
            .rp-input, .rp-select {
                padding: 8px 12px;
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                color: var(--text-primary);
                font-size: 0.8rem;
                outline: none;
                width: 100%;
                transition: border-color 0.2s;
            }
            .rp-input:focus, .rp-select:focus {
                border-color: var(--accent-primary);
            }
            .rp-table-card {
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                overflow: hidden;
            }
            .rp-table-wrapper {
                overflow-x: auto;
            }
            .rp-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.85rem;
            }
            .rp-table th {
                background: var(--bg-tertiary);
                padding: 14px 16px;
                text-align: left;
                font-weight: 600;
                color: var(--text-secondary);
                position: sticky;
                top: 0;
                z-index: 5;
                border-bottom: 1px solid var(--border-color);
            }
            .rp-table td {
                padding: 12px 16px;
                border-bottom: 1px solid var(--border-color);
                vertical-align: middle;
            }
            .rp-badge-sent {
                background: rgba(16, 185, 129, 0.1);
                color: var(--success);
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 0.75rem;
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
                border: 1px solid rgba(16, 185, 129, 0.2);
            }
            .rp-badge-unsent {
                background: rgba(255, 255, 255, 0.05);
                color: var(--text-secondary);
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 0.75rem;
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
                border: 1px solid var(--border-color);
            }
            .rp-badge-sent:hover, .rp-badge-unsent:hover {
                transform: scale(1.05);
            }
            .rp-cell-select {
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                padding: 6px 10px;
                color: var(--text-primary);
                font-size: 0.8rem;
                cursor: pointer;
                outline: none;
                width: 100%;
            }
            .rp-cell-select:focus {
                border-color: var(--accent-primary);
            }
            .btn-action-delete {
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.2);
                color: #ef4444;
                padding: 6px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .btn-action-delete:hover {
                background: rgba(239, 68, 68, 0.2);
            }
            .rp-status-ok {
                background: rgba(16, 185, 129, 0.1);
                color: var(--success);
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 0.75rem;
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                border: 1px solid rgba(16, 185, 129, 0.2);
            }
            .rp-status-error {
                background: rgba(239, 68, 68, 0.1);
                color: #ef4444;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 0.75rem;
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                border: 1px solid rgba(239, 68, 68, 0.2);
            }
            .rp-status-warning {
                background: rgba(245, 158, 11, 0.1);
                color: #f59e0b;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 0.75rem;
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                border: 1px solid rgba(245, 158, 11, 0.2);
            }
            .rp-status-unknown {
                background: rgba(255, 255, 255, 0.05);
                color: var(--text-secondary);
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 0.75rem;
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                border: 1px solid var(--border-color);
            }
        </style>

        <div class="rps-inventory-container">
            <!-- Tabs Navigation -->
            <div style="padding: 0 10px; border-bottom: 1px solid var(--border-color); display: flex; gap: 24px; background: rgba(255,255,255,0.01); margin-bottom: 8px;">
                <div id="rp-tab-database" class="tab ${window._activeRPTab !== 'generator' ? 'active' : ''}" onclick="window.switchRPTab('database')" style="padding: 14px 4px; font-size: 0.82rem; font-weight: 700; cursor: pointer; border-bottom: 2px solid ${window._activeRPTab !== 'generator' ? 'var(--accent-primary)' : 'transparent'}; color: ${window._activeRPTab !== 'generator' ? 'var(--text-primary)' : 'var(--text-secondary)'}; transition: all 0.2s; display: flex; align-items: center; gap: 6px;">
                    <i data-lucide="globe" style="width: 14px;"></i> RPs Database (${filteredItems.length})
                </div>
                <div id="rp-tab-generator" class="tab ${window._activeRPTab === 'generator' ? 'active' : ''}" onclick="window.switchRPTab('generator')" style="padding: 14px 4px; font-size: 0.82rem; font-weight: 700; cursor: pointer; border-bottom: 2px solid ${window._activeRPTab === 'generator' ? 'var(--accent-primary)' : 'transparent'}; color: ${window._activeRPTab === 'generator' ? 'var(--text-primary)' : 'var(--text-secondary)'}; transition: all 0.2s; display: flex; align-items: center; gap: 6px;">
                    <i data-lucide="zap" style="width: 14px;"></i> Generate Records
                </div>
            </div>

            ${window._activeRPTab !== 'generator' ? `
            ${isSpfRunning ? `
                <div id="rp-spf-progress-container" class="card" style="padding: 16px 20px; background: var(--bg-secondary); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 8px; animation: fadeIn 0.3s ease; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; font-weight: 600;">
                        <span style="display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="refresh-cw" class="rotating" style="width: 14px; color: var(--accent-primary);"></i>
                            Checking SPF Records...
                        </span>
                        <span id="rp-spf-progress-text" style="color: var(--text-secondary);">
                            ${Math.round((rpSpfProgress.current / rpSpfProgress.total) * 100)}% (${rpSpfProgress.current}/${rpSpfProgress.total})
                        </span>
                    </div>
                    <div class="progress-container progress-active" style="margin: 4px 0 0 0; height: 8px;">
                        <div class="progress-bar" style="width: ${Math.round((rpSpfProgress.current / rpSpfProgress.total) * 100)}%; height: 100%;"></div>
                    </div>
                </div>
            ` : ''}

            ${app.state.rpAutoDetecting ? `
                <div id="rp-autodetect-progress-container" class="card" style="padding: 16px 20px; background: var(--bg-secondary); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 8px; animation: fadeIn 0.3s ease; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; font-weight: 600;">
                        <span style="display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="scan" class="rotating" style="width: 14px; color: #8B5CF6;"></i>
                            Auto-Detecting SPF Records...
                        </span>
                        <span id="rp-autodetect-progress-text" style="color: var(--text-secondary);">
                            ${Math.round(((app.state.rpAutoDetectProgress ? app.state.rpAutoDetectProgress.current : 0) / (app.state.rpAutoDetectProgress ? app.state.rpAutoDetectProgress.total : 1)) * 100)}% (${app.state.rpAutoDetectProgress ? app.state.rpAutoDetectProgress.current : 0}/${app.state.rpAutoDetectProgress ? app.state.rpAutoDetectProgress.total : 0})
                        </span>
                    </div>
                    <div class="progress-container progress-active" style="margin: 4px 0 0 0; height: 8px; background: rgba(139, 92, 246, 0.1);">
                        <div class="progress-bar" style="width: ${Math.round(((app.state.rpAutoDetectProgress ? app.state.rpAutoDetectProgress.current : 0) / (app.state.rpAutoDetectProgress ? app.state.rpAutoDetectProgress.total : 1)) * 100)}%; height: 100%; background: #8B5CF6;"></div>
                    </div>
                </div>
            ` : ''}

            <div class="rp-stats-grid">
                <div class="card rp-stat-card">
                    <h4 class="rp-filter-label" style="margin: 0;">Total RPs</h4>
                    <p style="font-size: 1.8rem; font-weight: 800; margin: 8px 0 0;">${totalCount}</p>
                </div>
                <div class="card rp-stat-card" style="border-left-color: var(--success);">
                    <h4 class="rp-filter-label" style="margin: 0;">Sent before</h4>
                    <p style="font-size: 1.8rem; font-weight: 800; margin: 8px 0 0; color: var(--success);">${sentCount} <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-secondary);">(${sentPct}%)</span></p>
                </div>
                <div class="card rp-stat-card" style="border-left-color: #f59e0b;">
                    <h4 class="rp-filter-label" style="margin: 0;">Unsent</h4>
                    <p style="font-size: 1.8rem; font-weight: 800; margin: 8px 0 0; color: #f59e0b;">${unsentCount} <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-secondary);">(${unsentPct}%)</span></p>
                </div>
                <div class="card rp-stat-card" style="border-left-color: var(--accent-primary);">
                    <h4 class="rp-filter-label" style="margin: 0;">SPF Include / Arecod</h4>
                    <p style="font-size: 1.8rem; font-weight: 800; margin: 8px 0 0;">${includeCount} <span style="font-size: 1.2rem; font-weight: 400; color: var(--text-secondary);">/</span> ${arecodCount}</p>
                </div>
                <div class="card rp-stat-card" style="border-left-color: ${spfErrorCount > 0 ? '#ef4444' : (spfWarningCount > 0 ? '#f59e0b' : 'var(--success)')};">
                    <h4 class="rp-filter-label" style="margin: 0;">SPF Health</h4>
                    <p style="font-size: 1.2rem; font-weight: 800; margin: 8px 0 0;">
                        <span style="color: var(--success);">${spfOkCount} OK</span>
                        ${spfWarningCount > 0 ? `<span style="font-size: 0.9rem; color: var(--text-secondary);"> / </span><span style="color: #f59e0b;">${spfWarningCount} WARN</span>` : ''}
                        <span style="font-size: 0.9rem; color: var(--text-secondary);"> / </span>
                        <span style="color: #ef4444;">${spfErrorCount} ERR</span>
                        ${spfUnchecked > 0 ? `<span style="font-size: 0.75rem; color: var(--text-secondary);"> (${spfUnchecked} unchecked)</span>` : ''}
                    </p>
                </div>
            </div>

            <div class="rp-filters-bar">
                <div class="rp-filter-group search">
                    <span class="rp-filter-label">Search RPs</span>
                    <div style="position: relative;">
                        <input type="text" id="rp-search-input" class="rp-input" placeholder="Search RP, domain or server..." value="${app.state.rpSearch}">
                        <i data-lucide="search" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 14px; color: var(--text-secondary);"></i>
                    </div>
                </div>
                <div class="rp-filter-group" style="position: relative;">
                    <span class="rp-filter-label">Server</span>
                    <div id="rp-server-multiselect" class="rp-select" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; min-width: 160px; position: relative; user-select: none;">
                        <span class="selected-servers-text" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">
                            ${selectedText}
                        </span>
                        <i data-lucide="chevron-down" style="width: 14px;"></i>
                    </div>
                    <div id="rp-server-dropdown-options" class="multiselect-options" style="display: ${app.state.rpFilterServerDropdownOpen ? 'block' : 'none'}; position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; margin-top: 4px; max-height: 250px; overflow-y: auto; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); padding: 8px;">
                        <label style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; cursor: pointer; border-radius: 4px;" class="option-hover">
                            <input type="checkbox" value="all" ${app.state.rpFilterServer.includes('all') ? 'checked' : ''} class="rp-server-checkbox">
                            <span>All Servers</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; cursor: pointer; border-radius: 4px;" class="option-hover">
                            <input type="checkbox" value="SENT" ${app.state.rpFilterServer.includes('SENT') ? 'checked' : ''} class="rp-server-checkbox">
                            <span>SENT (State)</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; cursor: pointer; border-radius: 4px;" class="option-hover">
                            <input type="checkbox" value="none" ${app.state.rpFilterServer.includes('none') ? 'checked' : ''} class="rp-server-checkbox">
                            <span>Unassigned</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; cursor: pointer; border-radius: 4px;" class="option-hover">
                            <input type="checkbox" value="available" ${app.state.rpFilterServer.includes('available') ? 'checked' : ''} class="rp-server-checkbox">
                            <span>Available Only</span>
                        </label>
                        <div style="border-top: 1px solid var(--border-color); margin: 6px 0;"></div>
                        ${uniqueServerNames.map(name => `
                            <label style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; cursor: pointer; border-radius: 4px;" class="option-hover">
                                <input type="checkbox" value="${name}" ${app.state.rpFilterServer.includes(name) ? 'checked' : ''} class="rp-server-checkbox">
                                <span>${name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="rp-filter-group">
                    <span class="rp-filter-label">SPF Type</span>
                    <select id="rp-filter-spftype" class="rp-select">
                        <option value="all" ${app.state.rpFilterSpfType === 'all' ? 'selected' : ''}>All Types</option>
                        <option value="Include" ${app.state.rpFilterSpfType === 'Include' ? 'selected' : ''}>Include</option>
                        <option value="Arecod" ${app.state.rpFilterSpfType === 'Arecod' ? 'selected' : ''}>Arecod</option>
                    </select>
                </div>
                <div class="rp-filter-group">
                    <span class="rp-filter-label">RPtype</span>
                    <select id="rp-filter-rptype" class="rp-select">
                        <option value="all" ${app.state.rpFilterRpType === 'all' ? 'selected' : ''}>All</option>
                        <option value="intern" ${app.state.rpFilterRpType === 'intern' ? 'selected' : ''}>intern</option>
                        <option value="extern" ${app.state.rpFilterRpType === 'extern' ? 'selected' : ''}>extern</option>
                    </select>
                </div>
                <div class="rp-filter-group">
                    <span class="rp-filter-label">SPF Status</span>
                    <select id="rp-filter-spfstatus" class="rp-select">
                        <option value="all" ${app.state.rpFilterSpfStatus === 'all' ? 'selected' : ''}>All</option>
                        <option value="OK" ${app.state.rpFilterSpfStatus === 'OK' ? 'selected' : ''}>OK / Could be OK</option>
                        <option value="WARNING" ${app.state.rpFilterSpfStatus === 'WARNING' ? 'selected' : ''}>Could be OK (Only)</option>
                        <option value="ERROR" ${app.state.rpFilterSpfStatus === 'ERROR' ? 'selected' : ''}>NOT OK</option>
                        <option value="none" ${app.state.rpFilterSpfStatus === 'none' ? 'selected' : ''}>Unchecked</option>
                    </select>
                </div>
                <div class="rp-filter-group">
                    <span class="rp-filter-label">Sent Mark</span>
                    <select id="rp-filter-sent" class="rp-select">
                        <option value="all" ${app.state.rpFilterSent === 'all' ? 'selected' : ''}>All</option>
                        <option value="sent" ${app.state.rpFilterSent === 'sent' ? 'selected' : ''}>Sent</option>
                        <option value="unsent" ${app.state.rpFilterSent === 'unsent' ? 'selected' : ''}>Unsent</option>
                    </select>
                </div>
            </div>

            <div class="rp-table-card">
                <div class="rp-table-wrapper">
                    <table class="rp-table">
                        <thead>
                            <tr>
                                <th style="width: 250px;"><div style="display:flex;align-items:center;gap:6px;">RPs<button id="rp-copy-all-rps" style="background:none;border:none;padding:2px;cursor:pointer;color:var(--text-secondary);opacity:0.5;display:inline-flex;align-items:center;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.5'" title="Copy all filtered RPs"><i data-lucide="copy" style="width:12px"></i></button></div></th>
                                <th style="width: 200px;"><div style="display:flex;align-items:center;gap:6px;">Domain included<button id="rp-copy-all-domains" style="background:none;border:none;padding:2px;cursor:pointer;color:var(--text-secondary);opacity:0.5;display:inline-flex;align-items:center;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.5'" title="Copy all filtered domains"><i data-lucide="copy" style="width:12px"></i></button></div></th>
                                <th style="width: 250px;"><div style="display:flex;align-items:center;gap:6px;">SubDomain included<button id="rp-copy-all-subdomains" style="background:none;border:none;padding:2px;cursor:pointer;color:var(--text-secondary);opacity:0.5;display:inline-flex;align-items:center;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.5'" title="Copy all filtered subdomains"><i data-lucide="copy" style="width:12px"></i></button></div></th>
                                <th style="width: 160px;">SRV</th>
                                <th style="width: 120px;">TYPE</th>
                                <th style="width: 120px;">RPtype</th>
                                <th style="width: 130px; text-align: center;">SPF Status</th>
                                <th style="width: 100px; text-align: center;">Sent</th>
                                ${isAdmin ? `<th style="width: 80px; text-align: right;">Actions</th>` : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredItems.map(item => {
                                let isUnavailable = false;
                                if (!item.srv || item.srv === '') {
                                    if (item.domainIncluded) {
                                        const domInc = item.domainIncluded.trim().toLowerCase();
                                        const conflict = items.find(other => 
                                            other.id !== item.id && 
                                            other.domainIncluded && 
                                            other.domainIncluded.trim().toLowerCase() === domInc && 
                                            other.srv && 
                                            other.srv !== '' && 
                                            other.srv !== 'SENT'
                                        );
                                        if (conflict) isUnavailable = true;
                                    }
                                }
                                return `
                                <tr>
                                    <td style="font-weight: 600; color: var(--text-primary);">
                                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                            <div style="display: flex; align-items: center; gap: 6px;">
                                                <i data-lucide="globe" style="width: 14px; flex-shrink: 0; color: var(--accent-primary);"></i>
                                                ${item.rpDomain}
                                                <button onclick="navigator.clipboard.writeText('${item.rpDomain}');this.innerHTML='<i data-lucide=\\'check\\' style=\\'width:11px;color:var(--success)\\'></i>';lucide.createIcons();setTimeout(()=>{this.innerHTML='<i data-lucide=\\'copy\\' style=\\'width:11px\\'></i>';lucide.createIcons();},1200)" style="background:none;border:none;padding:2px;cursor:pointer;color:var(--text-secondary);opacity:0.4;flex-shrink:0;display:inline-flex;align-items:center;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.4'" title="Copy RP"><i data-lucide="copy" style="width:11px"></i></button>
                                            </div>
                                            ${isUnavailable ? `<span style="font-size: 0.65rem; background: rgba(239,68,68,0.1); color: #ef4444; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(239,68,68,0.2);" title="Domain included is already assigned to another server">Unavailable</span>` : ''}
                                        </div>
                                    </td>
                                    <td>${item.domainIncluded ? `<div style="display:flex;align-items:center;gap:6px;"><span>${item.domainIncluded}</span><button onclick="navigator.clipboard.writeText('${item.domainIncluded}');this.innerHTML='<i data-lucide=\\'check\\' style=\\'width:11px;color:var(--success)\\'></i>';lucide.createIcons();setTimeout(()=>{this.innerHTML='<i data-lucide=\\'copy\\' style=\\'width:11px\\'></i>';lucide.createIcons();},1200)" style="background:none;border:none;padding:2px;cursor:pointer;color:var(--text-secondary);opacity:0.4;flex-shrink:0;display:inline-flex;align-items:center;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.4'" title="Copy Domain"><i data-lucide="copy" style="width:11px"></i></button></div>` : '<span style="color: var(--text-secondary); opacity: 0.5;">---</span>'}</td>
                                    <td>${item.subdomainIncluded ? `<div style="display:flex;align-items:center;gap:6px;"><span>${item.subdomainIncluded}</span><button onclick="navigator.clipboard.writeText('${item.subdomainIncluded}');this.innerHTML='<i data-lucide=\\'check\\' style=\\'width:11px;color:var(--success)\\'></i>';lucide.createIcons();setTimeout(()=>{this.innerHTML='<i data-lucide=\\'copy\\' style=\\'width:11px\\'></i>';lucide.createIcons();},1200)" style="background:none;border:none;padding:2px;cursor:pointer;color:var(--text-secondary);opacity:0.4;flex-shrink:0;display:inline-flex;align-items:center;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.4'" title="Copy SubDomain"><i data-lucide="copy" style="width:11px"></i></button></div>` : '<span style="color: var(--text-secondary); opacity: 0.5;">---</span>'}</td>
                                    <td>
                                        <select class="rp-cell-select" ${isAdmin ? `onchange="updateRPItemField('${item.id}', 'srv', this.value)"` : 'disabled'}>
                                            <option value="">-- None --</option>
                                            <option value="SENT" ${item.srv === 'SENT' ? 'selected' : ''} style="color: var(--success); font-weight: bold;">SENT</option>
                                            ${uniqueServerNames.map(name => `<option value="${name}" ${item.srv === name ? 'selected' : ''}>${name}</option>`).join('')}
                                        </select>
                                    </td>
                                    <td>
                                        <select class="rp-cell-select" ${isAdmin ? `onchange="updateRPItemField('${item.id}', 'spfType', this.value)"` : 'disabled'}>
                                            <option value="Include" ${item.spfType === 'Include' ? 'selected' : ''}>Include</option>
                                            <option value="Arecod" ${item.spfType === 'Arecod' ? 'selected' : ''}>Arecod</option>
                                        </select>
                                    </td>
                                    <td>
                                        <select class="rp-cell-select" ${isAdmin ? `onchange="updateRPItemField('${item.id}', 'rpType', this.value)"` : 'disabled'}>
                                            <option value="intern" ${item.rpType === 'intern' ? 'selected' : ''}>intern</option>
                                            <option value="extern" ${item.rpType === 'extern' ? 'selected' : ''}>extern</option>
                                        </select>
                                    </td>
                                    <td style="text-align: center;">
                                        ${item.spfStatus === 'OK' ? `
                                            <span class="rp-status-ok" title="SPF Record Valid. Checked at: ${item.spfCheckedAt ? new Date(item.spfCheckedAt).toLocaleString() : 'N/A'}">
                                                <i data-lucide="check" style="width: 12px; vertical-align: middle;"></i> OK
                                            </span>
                                        ` : (item.spfStatus === 'WARNING' ? `
                                            <span class="rp-status-warning" title="${item.spfStatusDetail || 'Multiple SPF Records'}. Checked at: ${item.spfCheckedAt ? new Date(item.spfCheckedAt).toLocaleString() : 'N/A'}">
                                                <i data-lucide="alert-circle" style="width: 12px; vertical-align: middle;"></i> Could be OK
                                            </span>
                                        ` : (item.spfStatus === 'ERROR' ? `
                                            <span class="rp-status-error" title="${item.spfStatusDetail || 'Invalid SPF'}. Checked at: ${item.spfCheckedAt ? new Date(item.spfCheckedAt).toLocaleString() : 'N/A'}">
                                                <i data-lucide="alert-triangle" style="width: 12px; vertical-align: middle;"></i> NOT OK
                                            </span>
                                        ` : `
                                            <span class="rp-status-unknown" title="Not checked yet">
                                                <i data-lucide="help-circle" style="width: 12px; vertical-align: middle;"></i> Unchecked
                                            </span>
                                        `))}
                                    </td>
                                    <td style="text-align: center;">
                                        ${item.alreadySent ? `
                                            <span class="rp-badge-sent" ${isAdmin ? `onclick="toggleRPSentState('${item.id}', false)"` : 'style="cursor: default;"'} title="${isAdmin ? 'Click to mark unsent' : 'Sent'}">
                                                <i data-lucide="check-circle" style="width: 12px;"></i> SENT
                                            </span>
                                        ` : `
                                            <span class="rp-badge-unsent" ${isAdmin ? `onclick="toggleRPSentState('${item.id}', true)"` : 'style="cursor: default;"'} title="${isAdmin ? 'Click to mark sent' : 'Unsent'}">
                                                <i data-lucide="circle" style="width: 12px;"></i> UNSENT
                                            </span>
                                        `}
                                    </td>
                                    ${isAdmin ? `
                                    <td style="text-align: right;">
                                        <button class="btn-action-delete" onclick="deleteRPInventoryItemPrompt('${item.id}', '${item.rpDomain}')">
                                            <i data-lucide="trash-2" style="width: 14px;"></i>
                                        </button>
                                    </td>
                                    ` : ''}
                                </tr>
                            `; }).join('')}
                            ${filteredItems.length === 0 ? `
                                <tr>
                                    <td colspan="${isAdmin ? 9 : 8}" style="padding: 60px; text-align: center; color: var(--text-secondary);">
                                        No RPs found.${isAdmin ? ' Click <b>"New RP"</b> or <b>"Bulk Import"</b> to add data.' : ''}
                                    </td>
                                </tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
            ` : `
            <!-- Generate Records Tab View -->
            <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-lg); padding: 24px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color);">
                    <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #f97316, #ea580c); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(234, 88, 12, 0.25);">
                        <i data-lucide="zap" style="width: 18px; color: white;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; font-weight: 700; font-size: 1.05rem; color: var(--text-primary);">Generate Records</h3>
                        <p style="margin: 4px 0 0; font-size: 0.75rem; color: var(--text-secondary);">Generate SPF/Arecord DNS entries from selected RPs & Servers</p>
                    </div>
                </div>
                <div id="gen-records-body" style="padding: 0;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px;">
                        <!-- RP Selection -->
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 4px;">
                                <i data-lucide="globe" style="width: 12px; color: var(--accent-primary);"></i> Select RPs 
                                <span style="font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--text-secondary); margin-left: 4px;">(one per line)</span>
                            </label>
                            <textarea id="gen-rp-input" placeholder="Enter RP domains (one per line)...\ne.g.:\nmy-rp-domain.com\nanother-rp.net" style="min-height: 140px; padding: 12px; background: rgba(10, 12, 16, 0.5); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.8rem; resize: vertical; outline: none; line-height: 1.5; transition: border-color 0.2s;" onfocus="this.style.borderColor='var(--accent-primary)'" onblur="this.style.borderColor='var(--border-color)'">${window._genRecordsState && window._genRecordsState.rpInput ? window._genRecordsState.rpInput : ''}</textarea>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                <button onclick="window.genRecordsFillFilteredRPs()" style="padding: 6px 12px; font-size: 0.72rem; font-weight: 600; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.2s;" onmouseover="this.style.background='var(--border-color)'" onmouseout="this.style.background='var(--bg-tertiary)'">
                                    <i data-lucide="list" style="width: 12px;"></i> Fill from filtered list
                                </button>
                                <button onclick="document.getElementById('gen-rp-input').value=''; if (!window._genRecordsState) window._genRecordsState = {}; window._genRecordsState.rpInput = '';" style="padding: 6px 12px; font-size: 0.72rem; font-weight: 600; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-secondary); border-radius: 6px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='var(--border-color)', this.style.color='var(--text-primary)'" onmouseout="this.style.background='var(--bg-tertiary)', this.style.color='var(--text-secondary)'">Clear</button>
                            </div>
                        </div>

                        <!-- Server Selection -->
                        <div style="display: flex; flex-direction: column; gap: 8px; grid-column: span 2;">
                            <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 4px;">
                                <i data-lucide="server" style="width: 12px; color: #ea580c;"></i> Select Servers
                            </label>
                            <div id="gen-servers-list" class="gen-srv-grid">
                                ${(app.state.servers || []).map(srv => {
                                    const isSelected = window._genRecordsState && window._genRecordsState.selectedServers && window._genRecordsState.selectedServers.includes(srv.name);
                                    return `
                                    <button type="button" class="gen-srv-btn ${isSelected ? 'selected' : ''}" data-value="${srv.name}" onclick="this.classList.toggle('selected'); window.updateGenSelectedServers();">
                                        <span>${srv.name}</span>
                                        <span class="srv-btn-badge">${(srv.allIps || []).length} IPs</span>
                                    </button>`;
                                }).join('')}
                            </div>
                            <div style="display: flex; gap: 8px; max-width: 280px; margin-top: 4px;">
                                <button onclick="document.querySelectorAll('.gen-srv-btn').forEach(btn => btn.classList.add('selected')); window.updateGenSelectedServers();" style="flex: 1; padding: 6px 12px; font-size: 0.72rem; font-weight: 600; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 6px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='var(--border-color)'" onmouseout="this.style.background='var(--bg-tertiary)'">Select All</button>
                                <button onclick="document.querySelectorAll('.gen-srv-btn').forEach(btn => btn.classList.remove('selected')); window.updateGenSelectedServers();" style="flex: 1; padding: 6px 12px; font-size: 0.72rem; font-weight: 600; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-secondary); border-radius: 6px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='var(--border-color)', this.style.color='var(--text-primary)'" onmouseout="this.style.background='var(--bg-tertiary)', this.style.color='var(--text-secondary)'">Deselect All</button>
                            </div>
                        </div>
                    </div>

                    <!-- Generate Button -->
                    <button onclick="window.generateDNSRecords()" style="padding: 11px 24px; font-size: 0.85rem; font-weight: 700; background: linear-gradient(135deg, #f97316, #ea580c); border: none; color: white; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.25); width: auto;" onmouseover="this.style.opacity='0.95'; this.style.transform='translateY(-1px)'" onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'">
                        <i data-lucide="zap" style="width: 15px;"></i> Generate Records
                    </button>

                    <!-- Results -->
                    <div id="gen-records-results" style="display: ${window._genRecordsState && window._genRecordsState.showResults ? 'block' : 'none'}; margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 20px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                            <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 4px;">
                                <i data-lucide="terminal" style="width: 12px; color: var(--success);"></i> Generated Records
                            </label>
                            <button onclick="navigator.clipboard.writeText(document.getElementById('gen-records-output').value); this.innerHTML='<i data-lucide=\\'check\\' style=\\'width:12px;color:var(--success)\\'></i> Copied!'; if(window.lucide) window.lucide.createIcons(); setTimeout(()=>{this.innerHTML='<i data-lucide=\\'copy\\' style=\\'width:12px\\'></i> Copy All'; if(window.lucide) window.lucide.createIcons();}, 2000);" style="padding: 5px 12px; font-size: 0.72rem; font-weight: 600; background: var(--accent-primary); border: none; color: white; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2); transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                                <i data-lucide="copy" style="width: 12px;"></i> Copy All
                            </button>
                        </div>
                        <textarea id="gen-records-output" readonly style="width: 100%; min-height: 160px; padding: 12px; background: rgba(10, 12, 16, 0.8); border: 1px solid var(--border-color); border-radius: 8px; color: #22c55e; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.78rem; resize: vertical; outline: none; line-height: 1.6; box-shadow: inset 0 2px 6px rgba(0,0,0,0.3);">${window._genRecordsState && window._genRecordsState.output ? window._genRecordsState.output : ''}</textarea>
                        <div id="gen-records-count" style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 8px; line-height: 1.4;">${window._genRecordsState && window._genRecordsState.countHtml ? window._genRecordsState.countHtml : ''}</div>
                    </div>
                </div>
            </div>
            `}
        </div>
    `;

    const searchInput = document.getElementById('rp-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            app.state.rpSearch = e.target.value;
            renderRPsInventory(app, container);
        });
    }

    // Restore scroll position of the multiselect dropdown
    const newDropdown = document.getElementById('rp-server-dropdown-options');
    if (newDropdown) {
        newDropdown.scrollTop = scrollPos;
    }

    const genRpInput = document.getElementById('gen-rp-input');
    if (genRpInput) {
        // Save on every keystroke
        genRpInput.addEventListener('input', (e) => {
            if (!window._genRecordsState) window._genRecordsState = {};
            window._genRecordsState.rpInput = e.target.value;
        });
        // Safety net: also save on blur (when user clicks away to server buttons)
        genRpInput.addEventListener('blur', (e) => {
            if (!window._genRecordsState) window._genRecordsState = {};
            window._genRecordsState.rpInput = e.target.value;
        });
    }

    const multiselectTrigger = document.getElementById('rp-server-multiselect');
    if (multiselectTrigger) {
        multiselectTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            app.state.rpFilterServerDropdownOpen = !app.state.rpFilterServerDropdownOpen;
            renderRPsInventory(app, container);
        });
    }

    const outsideClickListener = (e) => {
        const dropdown = document.getElementById('rp-server-dropdown-options');
        const trigger = document.getElementById('rp-server-multiselect');
        if (dropdown && trigger && !dropdown.contains(e.target) && !trigger.contains(e.target)) {
            if (app.state.rpFilterServerDropdownOpen) {
                app.state.rpFilterServerDropdownOpen = false;
                document.removeEventListener('click', outsideClickListener);
                renderRPsInventory(app, container);
            }
        }
    };
    if (app.state.rpFilterServerDropdownOpen) {
        document.addEventListener('click', outsideClickListener);
    }

    const checkboxes = container.querySelectorAll('.rp-server-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', (e) => {
            const val = e.target.value;
            const isChecked = e.target.checked;
            
            let current = [...(app.state.rpFilterServer || [])];
            
            if (val === 'all') {
                if (isChecked) {
                    current = ['all'];
                } else {
                    current = [];
                }
            } else {
                current = current.filter(x => x !== 'all');
                if (isChecked) {
                    if (!current.includes(val)) current.push(val);
                } else {
                    current = current.filter(x => x !== val);
                }
            }
            
            if (current.length === 0) {
                current = ['all'];
            }
            
            app.state.rpFilterServer = current;
            renderRPsInventory(app, container);
        });
    });

    const filterSpfType = document.getElementById('rp-filter-spftype');
    if (filterSpfType) {
        filterSpfType.addEventListener('change', (e) => {
            app.state.rpFilterSpfType = e.target.value;
            renderRPsInventory(app, container);
        });
    }

    const filterRpType = document.getElementById('rp-filter-rptype');
    if (filterRpType) {
        filterRpType.addEventListener('change', (e) => {
            app.state.rpFilterRpType = e.target.value;
            renderRPsInventory(app, container);
        });
    }

    const filterSent = document.getElementById('rp-filter-sent');
    if (filterSent) {
        filterSent.addEventListener('change', (e) => {
            app.state.rpFilterSent = e.target.value;
            renderRPsInventory(app, container);
        });
    }

    const filterSpfStatus = document.getElementById('rp-filter-spfstatus');
    if (filterSpfStatus) {
        filterSpfStatus.addEventListener('change', (e) => {
            app.state.rpFilterSpfStatus = e.target.value;
            renderRPsInventory(app, container);
        });
    }

    const copyAllBtn = (btnId, getData) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                const text = getData().filter(Boolean).join('\n');
                if (!text) return;
                navigator.clipboard.writeText(text);
                btn.innerHTML = '<i data-lucide="check" style="width:12px;color:var(--success)"></i>';
                if (window.lucide) window.lucide.createIcons();
                setTimeout(() => { btn.innerHTML = '<i data-lucide="copy" style="width:12px"></i>'; if (window.lucide) window.lucide.createIcons(); }, 1500);
            });
        }
    };
    copyAllBtn('rp-copy-all-rps', () => filteredItems.map(i => i.rpDomain));
    copyAllBtn('rp-copy-all-domains', () => filteredItems.map(i => i.domainIncluded));
    copyAllBtn('rp-copy-all-subdomains', () => filteredItems.map(i => i.subdomainIncluded));

    if (window.lucide) window.lucide.createIcons();
}

window.genRecordsFillFilteredRPs = () => {
    const input = document.getElementById('gen-rp-input');
    if (!input) return;
    
    const items = window.app.getProcessedRPInventory() || [];
    const rpDomains = items.map(i => i.rpDomain).filter(Boolean);
    input.value = rpDomains.join('\n');
    if (!window._genRecordsState) window._genRecordsState = {};
    window._genRecordsState.rpInput = input.value;
};

window.generateDNSRecords = () => {
    const rpInput = document.getElementById('gen-rp-input');
    const outputDiv = document.getElementById('gen-records-results');
    const outputArea = document.getElementById('gen-records-output');
    const countDiv = document.getElementById('gen-records-count');
    
    if (!rpInput || !outputArea || !outputDiv) return;

    const rpDomains = rpInput.value.split('\n').map(l => l.trim()).filter(Boolean);
    if (rpDomains.length === 0) {
        alert('Please enter at least one RP domain.');
        return;
    }

    const selectedServerNames = (window._genRecordsState && window._genRecordsState.selectedServers) ? window._genRecordsState.selectedServers : [];
    if (selectedServerNames.length === 0) {
        alert('Please select at least one server.');
        return;
    }

    const servers = window.app.state.servers || [];
    const allIps = [];
    selectedServerNames.forEach(srvName => {
        const srv = servers.find(s => s.name === srvName);
        if (srv && srv.allIps) {
            srv.allIps.forEach(ip => {
                if (!allIps.includes(ip)) allIps.push(ip);
            });
        }
    });

    if (allIps.length === 0) {
        alert('Selected servers have no IPs.');
        return;
    }

    const inventory = window.app.getProcessedRPInventory() || [];
    const lines = [];
    let matched = 0;
    let unmatched = 0;

    let generatedIncludeCount = 0;
    let generatedArecordCount = 0;

    rpDomains.forEach(rpDomain => {
        const rpLower = rpDomain.toLowerCase();
        const item = inventory.find(i => (i.rpDomain || '').toLowerCase() === rpLower);
        
        const domainIncluded = item ? (item.domainIncluded || rpDomain) : rpDomain;
        const subdomainIncluded = item ? (item.subdomainIncluded || '') : '';

        const recordType = (item && (item.spfType === 'Arecord' || item.spfType === 'Arecod')) ? 'Arecord' : 'Include';

        if (item) matched++;
        else unmatched++;

        if (recordType === 'Include') {
            generatedIncludeCount++;
            const ipPart = allIps.map(ip => `ip4:${ip}`).join(' ');
            lines.push(`${domainIncluded},${subdomainIncluded},TXT,v=spf1 ${ipPart} -all`);
        } else {
            generatedArecordCount++;
            const ipPart = allIps.join(';');
            lines.push(`${domainIncluded},${subdomainIncluded},TXT,Arecords:${ipPart}`);
        }
    });

    let limitWarnings = [];
    if (generatedArecordCount > 0 && allIps.length > 49) {
        limitWarnings.push(`You have selected ${allIps.length} IPs for Arecord type (limit is 49).`);
    }
    if (generatedIncludeCount > 0 && allIps.length > 99) {
        limitWarnings.push(`You have selected ${allIps.length} IPs for Include type (limit is 99).`);
    }

    if (limitWarnings.length > 0) {
        alert(`⚠️ WARNING:\n${limitWarnings.join('\n')}`);
    }

    outputArea.value = lines.join('\n');
    outputDiv.style.display = 'block';
    
    let resultMessage = `✅ Generated <b>${lines.length}</b> record(s) using <b>${allIps.length}</b> IPs from <b>${selectedServerNames.length}</b> server(s). ${matched > 0 ? `<span style="color: var(--success);">${matched} matched in inventory</span>` : ''} ${unmatched > 0 ? `<span style="color: var(--warning);">${unmatched} not found in inventory (using domain as-is)</span>` : ''}`;
    
    if (limitWarnings.length > 0) {
        limitWarnings.forEach(warning => {
            resultMessage += `<div style="margin-top: 10px; padding: 10px 14px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; color: #ef4444; font-weight: 600; font-size: 0.75rem; display: flex; align-items: center; gap: 8px;"><i data-lucide="alert-circle" style="width: 16px; flex-shrink: 0; color: #ef4444;"></i> <span>⚠️ ${warning}</span></div>`;
        });
    }
    
    countDiv.innerHTML = resultMessage;

    if (!window._genRecordsState) window._genRecordsState = {};
    window._genRecordsState.output = lines.join('\n');
    window._genRecordsState.countHtml = resultMessage;
    window._genRecordsState.showResults = true;

    if (window.lucide) window.lucide.createIcons();
};

window.updateRPItemField = (id, field, value) => {
    if (field === 'srv' && value && value !== '' && value !== 'SENT') {
        const inventory = window.app.state.rpInventory || [];
        const currentItem = inventory.find(item => item.id === id);
        if (currentItem && currentItem.domainIncluded) {
            const domInc = currentItem.domainIncluded.trim().toLowerCase();
            const conflict = inventory.find(item =>
                item.id !== id &&
                item.domainIncluded &&
                item.domainIncluded.trim().toLowerCase() === domInc &&
                item.srv &&
                item.srv !== '' &&
                item.srv !== 'SENT' &&
                item.srv.trim().toLowerCase() !== value.trim().toLowerCase()
            );
            if (conflict) {
                // Show styled warning modal
                const overlay = document.createElement('div');
                overlay.className = 'modal-overlay';
                overlay.style.zIndex = '10000';
                overlay.innerHTML = `
                    <div class="modal" style="max-width: 480px; text-align: center; padding: 32px;">
                        <div style="background: rgba(239, 68, 68, 0.1); color: var(--error); width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                            <i data-lucide="alert-triangle" style="width: 32px;"></i>
                        </div>
                        <h2 style="margin: 0 0 12px;">Domain Conflict Detected</h2>
                        <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px;">
                            The included domain <b style="color: var(--accent-primary);">${currentItem.domainIncluded}</b> is already used by RP 
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

                // Revert the dropdown to previous value
                window.app.updateDashboard();
                return;
            }
        }
    }

    const updates = {};
    updates[field] = value;
    if (field === 'srv' && value === 'SENT') {
        updates.alreadySent = true;
    }
    window.app.updateRPInventoryItem(id, updates).then(() => {
        window.app.updateDashboard();
    });
};

window.toggleRPSentState = (id, state) => {
    window.app.updateRPInventoryItem(id, { alreadySent: state }).then(() => {
        window.app.updateDashboard();
    });
};

window.deleteRPInventoryItemPrompt = (id, domain) => {
    if (confirm(`Are you sure you want to remove Return Path "${domain}" from inventory?`)) {
        window.app.deleteRPInventoryItem(id).then(() => {
            window.app.updateDashboard();
        });
    }
};

window.showImportRPInventoryModal = () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal" style="max-width: 500px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700;">Import RPs from Excel (.xlsx/.csv)</h3>
                <span style="cursor: pointer; font-size: 1.2rem;" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div id="rp-import-dropzone" style="border: 2px dashed var(--border-color); border-radius: 8px; padding: 40px 20px; text-align: center; cursor: pointer; transition: border-color 0.2s;"
                 onmouseover="this.style.borderColor='var(--accent-primary)'"
                 onmouseout="this.style.borderColor='var(--border-color)'">
                <i data-lucide="upload-cloud" style="width: 40px; height: 40px; color: var(--accent-primary); margin-bottom: 12px; display: inline-block;"></i>
                <p style="margin: 0 0 8px; font-weight: 600; font-size: 0.9rem;">Drag & drop your Excel file here</p>
                <p style="margin: 0; font-size: 0.75rem; color: var(--text-secondary);">or click to select file from computer</p>
                <input type="file" id="rp-import-file-input" accept=".xlsx,.csv" style="display: none;">
            </div>
            <div style="margin-top: 16px; font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4;">
                <p style="font-weight: 600; margin-bottom: 4px; color: var(--text-primary);">Column header naming guidelines:</p>
                <ul style="margin: 0; padding-left: 16px;">
                    <li><b>RPs</b> (or ReturnPath, Domain)</li>
                    <li><b>Domain included</b></li>
                    <li><b>SubDomain included</b></li>
                    <li><b>SRV</b> (or Server - values like s_wmn3_2208 or SENT)</li>
                    <li><b>TYPE</b> (or spfType - values Include or Arecod)</li>
                    <li><b>Delivred</b> (or RPtype - values intern or extern)</li>
                </ul>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
                <button onclick="this.closest('.modal-overlay').remove()" class="btn-secondary" style="width: auto;">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const dropzone = document.getElementById('rp-import-dropzone');
    const fileInput = document.getElementById('rp-import-file-input');

    dropzone.addEventListener('click', () => fileInput.click());

    const handleFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (!json || json.length === 0) {
                    alert("The uploaded sheet appears to be empty.");
                    return;
                }

                const items = json.map(row => {
                    const findKey = (prefixes) => {
                        let key = Object.keys(row).find(k => {
                            const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                            return prefixes.some(p => cleanK === p.toLowerCase().replace(/[^a-z0-9]/g, ''));
                        });
                        if (key) return row[key];

                        key = Object.keys(row).find(k => {
                            const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                            return prefixes.some(p => cleanK.includes(p.toLowerCase().replace(/[^a-z0-9]/g, '')));
                        });
                        return key ? row[key] : '';
                    };

                    const rpDomain = findKey(['rps', 'rpdomain', 'returnpath']);
                    const domainIncluded = findKey(['domainincluded', 'domain']);
                    const subdomainIncluded = findKey(['subdomainincluded', 'subdomain']);
                    const srv = findKey(['srv', 'server']);
                    const spfType = findKey(['type', 'spftype']);
                    const rpTypeVal = findKey(['rptype', 'delivred', 'delivery']);

                    let normSpfType = 'Include';
                    if (spfType) {
                        const val = spfType.toString().trim().toLowerCase();
                        if (val.includes('arecod') || val.includes('arecord') || val.startsWith('a')) {
                            normSpfType = 'Arecod';
                        }
                    }

                    let normRpType = 'intern';
                    if (rpTypeVal) {
                        const val = rpTypeVal.toString().trim().toLowerCase();
                        if (val.includes('intern') || val === 'yes') {
                            normRpType = 'intern';
                        } else if (val.includes('extern') || val === 'no') {
                            normRpType = 'extern';
                        }
                    }

                    const isSent = srv && srv.toString().trim().toLowerCase() === 'sent';

                    return {
                        rpDomain,
                        domainIncluded,
                        subdomainIncluded,
                        srv,
                        spfType: normSpfType,
                        rpType: normRpType,
                        alreadySent: isSent
                    };
                }).filter(item => item.rpDomain);

                window.app.bulkImportRPInventory(items).then(() => {
                    overlay.remove();
                    alert(`Successfully imported ${items.length} RPs into inventory!`);
                });
            } catch (err) {
                console.error(err);
                alert("Failed to parse the Excel file. Please ensure it is a valid format.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--accent-primary)';
    });
    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--border-color)';
    });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--border-color)';
        handleFile(e.dataTransfer.files[0]);
    });
};

window.showAddRPInventoryItemModal = () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const serverNames = (window.app.state.servers || []).map(s => s.name).filter(Boolean);
    const uniqueServerNames = [...new Set(serverNames)].sort();

    overlay.innerHTML = `
        <div class="modal" style="max-width: 450px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700;">Add New Return Path (RP)</h3>
                <span style="cursor: pointer; font-size: 1.2rem;" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <form id="rp-add-form" style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase;">RP Domain *</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="add-rp-domain" required class="rp-input" placeholder="e.g. orchid-lifestyle.com" style="flex:1;">
                        <button type="button" id="rp-auto-detect-btn" style="padding: 6px 14px; font-size: 0.75rem; background: #8B5CF6; border: none; color: white; border-radius: 6px; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
                            <i data-lucide="scan" style="width:12px;"></i> Auto-Detect
                        </button>
                    </div>
                    <div id="rp-auto-detect-status" style="font-size: 0.7rem; margin-top: 4px; min-height: 16px;"></div>
                </div>
                <div>
                    <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase;">Domain included</label>
                    <input type="text" id="add-rp-domain-inc" class="rp-input" placeholder="e.g. prohost-server.com">
                </div>
                <div>
                    <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase;">SubDomain included</label>
                    <input type="text" id="add-rp-subdomain-inc" class="rp-input" placeholder="e.g. server.prohost-server.com">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase;">SRV</label>
                        <select id="add-rp-srv" class="rp-select">
                            <option value="">-- None --</option>
                            <option value="SENT">SENT</option>
                            ${uniqueServerNames.map(name => `<option value="${name}">${name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase;">TYPE</label>
                        <select id="add-rp-spftype" class="rp-select">
                            <option value="Include">Include</option>
                            <option value="Arecod">Arecod</option>
                        </select>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: center; margin-top: 8px;">
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase;">RPtype</label>
                        <select id="add-rp-rptype" class="rp-select">
                            <option value="intern">intern</option>
                            <option value="extern">extern</option>
                        </select>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; padding-top: 20px;">
                        <input type="checkbox" id="add-rp-sent" style="cursor: pointer; width: 16px; height: 16px;">
                        <label for="add-rp-sent" style="font-size: 0.8rem; font-weight: 600; cursor: pointer; user-select: none;">Already Sent</label>
                    </div>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px;">
                    <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-secondary" style="width: auto;">Cancel</button>
                    <button type="submit" class="btn-primary" style="width: auto;">Add RP</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    document.getElementById('rp-add-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const rpDomain = document.getElementById('add-rp-domain').value.trim();
        const domainIncluded = document.getElementById('add-rp-domain-inc').value.trim();
        const subdomainIncluded = document.getElementById('add-rp-subdomain-inc').value.trim();
        const srv = document.getElementById('add-rp-srv').value;
        const spfType = document.getElementById('add-rp-spftype').value;
        const rpType = document.getElementById('add-rp-rptype').value;
        const alreadySent = document.getElementById('add-rp-sent').checked;

        window.app.addRPInventoryItem({
            rpDomain,
            domainIncluded,
            subdomainIncluded,
            srv,
            spfType,
            rpType,
            alreadySent: alreadySent || (srv === 'SENT')
        }).then(() => {
            overlay.remove();
        });
    });

    // Auto-detect button handler
    document.getElementById('rp-auto-detect-btn').addEventListener('click', async () => {
        const domain = document.getElementById('add-rp-domain').value.trim();
        const statusEl = document.getElementById('rp-auto-detect-status');
        const btn = document.getElementById('rp-auto-detect-btn');
        if (!domain) {
            statusEl.innerHTML = '<span style="color:var(--error);">Enter a domain first.</span>';
            return;
        }
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader" class="spin" style="width:12px;"></i> Scanning...';
        if (window.lucide) window.lucide.createIcons();
        statusEl.innerHTML = '<span style="color:var(--text-secondary);">Looking up SPF record...</span>';
        try {
            const resp = await fetch('/api/extract-spf-info?domain=' + encodeURIComponent(domain));
            const data = await resp.json();
            if (data && data.success && data.found) {
                document.getElementById('add-rp-domain-inc').value = data.domainIncluded || '';
                document.getElementById('add-rp-subdomain-inc').value = data.subdomainIncluded || '';
                if (data.server) document.getElementById('add-rp-srv').value = data.server;
                if (data.spfType) document.getElementById('add-rp-spftype').value = data.spfType;
                if (data.rpType) document.getElementById('add-rp-rptype').value = data.rpType;
                statusEl.innerHTML = '<span style="color:var(--success);">✓ Found! Server: ' + (data.server || 'N/A') + ' | Type: ' + (data.rpType || '') + ' | via ' + (data.matchedVia || '') + '</span>';
            } else {
                statusEl.innerHTML = '<span style="color:var(--warning);">No matching infrastructure found in SPF.</span>';
            }
        } catch (err) {
            statusEl.innerHTML = '<span style="color:var(--error);">Error: ' + err.message + '</span>';
        }
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="scan" style="width:12px;"></i> Auto-Detect';
        if (window.lucide) window.lucide.createIcons();
    });
};

function getRdns(ip, state) {
    if (!ip) return '';
    const safeIp = ip.replace(/\./g, '_');
    if (state.vmtaResults && state.vmtaResults[safeIp] && state.vmtaResults[safeIp].ptr) {
        return state.vmtaResults[safeIp].ptr;
    }
    // Search in servers' vmtaMap
    if (state.servers) {
        for (const s of state.servers) {
            if (s.vmtaMap) {
                const sKey = Object.keys(s.vmtaMap).find(k => k === safeIp);
                if (sKey) return s.vmtaMap[sKey];
            }
        }
    }
    return '';
}

function getRepresentativeVolume(drops) {
    const nonZeros = drops.filter(v => v > 0);
    if (nonZeros.length === 0) return 0;
    if (nonZeros.length === 1) return nonZeros[0];
    
    // Sort descending
    nonZeros.sort((a, b) => b - a);
    
    // Check if any two values are close (within 30% margin of the larger one)
    for (let i = 0; i < nonZeros.length; i++) {
        for (let j = i + 1; j < nonZeros.length; j++) {
            const a = nonZeros[i];
            const b = nonZeros[j];
            const maxVal = Math.max(a, b);
            const minVal = Math.min(a, b);
            if (maxVal > 0 && (maxVal - minVal) / maxVal <= 0.3) {
                return maxVal;
            }
        }
    }
    
    // Default to the highest non-zero value
    return nonZeros[0];
}

function parseMessageText(text) {
    if (!text.includes('Server Deployment Summary')) return null;
    
    const lines = text.split('\n').map(l => l.trim());
    
    // 1. User
    let user = 'Unknown';
    const userLine = lines.find(l => l.includes('User:'));
    if (userLine) {
        user = userLine.split('User:')[1].trim();
    }
    
    // 2. IP Address
    let ip = '';
    const ipLine = lines.find(l => l.includes('【IP】:'));
    if (ipLine) {
        ip = ipLine.split('【IP】:')[1].trim();
    }
    
    // 3. Server name, IN, OUT, Domain
    let server = '';
    let inVal = 0;
    let outVal = 0;
    let domain = '';
    
    const summaryIdx = lines.findIndex(l => l.includes('Server Deployment Summary'));
    const ipIdx = lines.findIndex(l => l.includes('【IP】:'));
    
    if (summaryIdx !== -1 && ipIdx !== -1) {
        const sublines = lines.slice(summaryIdx + 1, ipIdx).map(l => l.trim()).filter(l => l !== '' && !l.startsWith('---'));
        
        if (sublines.length >= 2) {
            const serverLine = sublines[1];  // e.g. "s_wmn3_2233 1510 1510" or "sh_wmn3_6 7013 7012"
            
            const serverParts = serverLine.split(/\s+/);
            if (serverParts.length >= 3) {
                server = serverParts[0];
                inVal = parseInt(serverParts[1], 10) || 0;
                outVal = parseInt(serverParts[2], 10) || 0;
            } else if (serverParts.length >= 1) {
                server = serverParts[0];
                const volumesLine = sublines[0]; // e.g. "1510 (IN) 1510 (OUT)"
                const matches = volumesLine.match(/(\d+)\s*\(IN\)\s*(\d+)\s*\(OUT\)/i);
                if (matches) {
                    inVal = parseInt(matches[1], 10) || 0;
                    outVal = parseInt(matches[2], 10) || 0;
                }
            }
            
            if (sublines.length >= 3) {
                domain = sublines[2]; // e.g. "lodoguide.com"
            }
        }
    }
    
    if (!server && !ip) return null;
    
    return {
        user,
        server,
        inVal,
        outVal,
        domain,
        ip
    };
}

function renderWarmupProgress(app, container) {
    if (app.state.warmupSearch === undefined) app.state.warmupSearch = '';
    if (app.state.warmupFilterServer === undefined) app.state.warmupFilterServer = 'all';

    // Trigger background fetch once per view switch to keep it fresh automatically
    if (!window._hasFetchedWarmupThisSession) {
        window._hasFetchedWarmupThisSession = true;
        (async () => {
            try {
                const resp = await fetch('/api/sync-telegram-warmup');
                const data = await resp.json();
                if (data.success && data.addedCount > 0) {
                    const snapshot = await window.db.ref('state/warmupData').once('value');
                    app.state.warmupData = snapshot.val() || {};
                    app.updateDashboard();
                }
            } catch(e) {
                console.warn("Background telegram fetch failed:", e);
            }
        })();
    }

    const rawRecords = Object.values(app.state.warmupData || {});
    rawRecords.sort((a, b) => b.timestamp - a.timestamp);

    const search = app.state.warmupSearch.trim().toLowerCase();
    const filterServer = app.state.warmupFilterServer;
    
    const grouped = {};
    rawRecords.forEach(r => {
        const cleanDomain = (r.domain || '').trim();
        const isRdnsPlaceholder = cleanDomain.toLowerCase() === '[rdns]' || cleanDomain.toLowerCase() === 'rdns';
        const resolvedDomain = (!cleanDomain || isRdnsPlaceholder) ? (getRdns(r.ip, app.state) || 'Unknown') : cleanDomain;
        const key = `${resolvedDomain}::${r.server}`;
        if (!grouped[key]) {
            grouped[key] = {
                domain: resolvedDomain,
                server: r.server,
                ip: r.ip,
                records: []
            };
        }
        grouped[key].records.push(r);
    });

    const groups = Object.values(grouped);

    // Cross-reference with RP Inventory to find "Sent" items
    const rpInventory = app.state.rpInventory || [];
    const sentDomains = new Set();
    const sentIps = new Set();
    rpInventory.forEach(item => {
        if (item.alreadySent || item.srv === 'SENT') {
            if (item.rpDomain) sentDomains.add(item.rpDomain.trim().toLowerCase());
            if (item.rpIp) sentIps.add(item.rpIp.trim());
        }
    });

    const active12Groups = [];
    const active24Groups = [];
    const archivedGroups = [];
    const inactiveGroups = [];
    const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    const seenActiveDomains = new Set();
    const seenActiveIps = new Set();
    const seenActiveServers = new Set();

    groups.forEach(g => {
        g.records.sort((a, b) => b.timestamp - a.timestamp);
        const latestTimestamp = g.records[0] ? g.records[0].timestamp : 0;
        
        const d = g.domain ? g.domain.trim().toLowerCase() : '';
        const i = g.ip ? g.ip.trim() : '';
        const s = g.server ? g.server.trim() : '';
        
        if ((d && sentDomains.has(d)) || (i && sentIps.has(i))) {
            archivedGroups.push(g);
        } else if (latestTimestamp < twentyFourHoursAgo) {
            inactiveGroups.push(g);
        } else {
            active24Groups.push(g);
            if (latestTimestamp >= twelveHoursAgo) {
                active12Groups.push(g);
            }
            if (d) seenActiveDomains.add(d);
            if (i) seenActiveIps.add(i);
            if (s) seenActiveServers.add(s);
        }
    });

    // Add servers and IPs from infrastructure that have no recent warmup activity
    const allServers = app.state.servers || [];
    allServers.forEach(srv => {
        const srvName = srv.name || '';
        const ips = srv.allIps || [];
        
        if (ips.length > 0) {
            ips.forEach(ipStr => {
                const i = ipStr.trim();
                if (!i) return;
                
                if (!seenActiveIps.has(i) && !sentIps.has(i)) {
                    const alreadyInInactive = inactiveGroups.some(g => g.ip === i);
                    if (!alreadyInInactive) {
                        inactiveGroups.push({
                            domain: '---', 
                            server: srvName,
                            ip: i,
                            records: [],
                            repOut: 0
                        });
                    }
                }
            });
        } else if (srvName && !seenActiveServers.has(srvName)) {
            // Server has no IPs but is completely missing from logs
            const alreadyInInactive = inactiveGroups.some(g => g.server === srvName);
            if (!alreadyInInactive) {
                inactiveGroups.push({
                    domain: '---', 
                    server: srvName,
                    ip: '---',
                    records: [],
                    repOut: 0
                });
            }
        }
    });

    if (!app.state.warmupActiveTab || app.state.warmupActiveTab === 'active') app.state.warmupActiveTab = 'active12';
    let currentGroups = active12Groups;
    if (app.state.warmupActiveTab === 'active24') currentGroups = active24Groups;
    if (app.state.warmupActiveTab === 'archived') currentGroups = archivedGroups;
    if (app.state.warmupActiveTab === 'inactive') currentGroups = inactiveGroups;

    const filteredGroups = currentGroups.filter(g => {
        const matchSearch = g.domain.toLowerCase().includes(search) || 
                            (g.server || '').toLowerCase().includes(search) || 
                            (g.ip || '').includes(search) ||
                            g.records.some(r => (r.user || '').toLowerCase().includes(search));
        const matchServer = filterServer === 'all' || g.server === filterServer;
        return matchSearch && matchServer;
    });

    filteredGroups.forEach(g => {
        const allOuts = g.records.map(r => r.outVal);
        g.repOut = getRepresentativeVolume(allOuts);
    });
    filteredGroups.sort((a, b) => b.repOut - a.repOut);

    const totalDomains = active24Groups.length;
    const totalArchived = archivedGroups.length;
    const totalInactive = inactiveGroups.length;
    const totalLogs = rawRecords.length;
    const maxOut = rawRecords.reduce((max, r) => r.outVal > max ? r.outVal : max, 0);

    const serversList = Array.from(new Set(rawRecords.map(r => r.server).filter(s => s)));

    const intel = window.computeWarmupIntelligence ? window.computeWarmupIntelligence() : null;

    container.innerHTML = `
        <div style="padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <div>
                    <h2 style="margin: 0; font-size: 1.5rem; font-weight: 700;">Warmup Progress Tracker</h2>
                    <p style="margin: 4px 0 0; font-size: 0.85rem; color: var(--text-secondary);">Monitor sending and warmup progress of Return Path domains extracted from Telegram.</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="fetchTelegramWarmup(this)" class="btn-primary" style="display: flex; align-items: center; gap: 8px; width: auto; padding: 10px 16px; font-size: 0.75rem; border-radius: 8px;">
                        <i data-lucide="refresh-cw" style="width: 14px;"></i> Fetch Telegram
                    </button>
                    <button onclick="window.showWarmupIntelligenceModal()" class="btn-primary" style="display: flex; align-items: center; gap: 8px; width: auto; padding: 10px 16px; font-size: 0.75rem; border-radius: 8px; background: var(--gradient-primary); border: none; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);">
                        <i data-lucide="brain-circuit" style="width: 14px;"></i> AI Insights
                    </button>
                    <button onclick="showBulkPasteWarmupModal()" class="btn-secondary" style="display: flex; align-items: center; gap: 8px; width: auto; padding: 10px 16px; font-size: 0.75rem; border-radius: 8px; border: 1px solid var(--accent-primary); color: var(--accent-primary); background: transparent;">
                        <i data-lucide="clipboard-list" style="width: 14px;"></i> Bulk Paste Logs
                    </button>
                    <button onclick="clearAllWarmupData()" class="btn-secondary" style="display: flex; align-items: center; gap: 8px; width: auto; padding: 10px 16px; font-size: 0.75rem; border-radius: 8px; border: 1px solid #ef4444; color: #ef4444; background: rgba(239,68,68,0.05);" onmouseover="this.style.background='#ef4444'; this.style.color='#fff';" onmouseout="this.style.background='rgba(239,68,68,0.05)'; this.style.color='#ef4444';">
                        <i data-lucide="trash-2" style="width: 14px;"></i> Reset Data
                    </button>
                </div>
            </div>

            <!-- Summary Cards -->
            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 24px;">
                <div class="card" style="padding: 20px; display: flex; align-items: center; gap: 16px;">
                    <div style="background: rgba(59, 130, 246, 0.1); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #3b82f6;">
                        <i data-lucide="globe" style="width: 24px; height: 24px;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Tracked Domains</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${totalDomains}</div>
                    </div>
                </div>
                <div class="card" style="padding: 20px; display: flex; align-items: center; gap: 16px;">
                    <div style="background: rgba(16, 185, 129, 0.1); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #10b981;">
                        <i data-lucide="bar-chart-2" style="width: 24px; height: 24px;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Total Logs / Drops</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${totalLogs}</div>
                    </div>
                </div>
                <div class="card" style="padding: 20px; display: flex; align-items: center; gap: 16px;">
                    <div style="background: rgba(245, 158, 11, 0.1); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #f59e0b;">
                        <i data-lucide="zap" style="width: 24px; height: 24px;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Max Warmup Out</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${maxOut.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <!-- Tabs -->
            <div style="display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 0;">
                <div onclick="window.app.state.warmupActiveTab = 'active12'; window.app.updateDashboard();" style="padding: 10px 16px; cursor: pointer; font-weight: 600; font-size: 0.85rem; border-bottom: 2px solid ${app.state.warmupActiveTab === 'active12' ? 'var(--accent-primary)' : 'transparent'}; color: ${app.state.warmupActiveTab === 'active12' ? 'var(--accent-primary)' : 'var(--text-secondary)'}; transition: all 0.2s;">
                    Active (12h) <span style="background: ${app.state.warmupActiveTab === 'active12' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)'}; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; margin-left: 6px;">${active12Groups.length}</span>
                </div>
                <div onclick="window.app.state.warmupActiveTab = 'active24'; window.app.updateDashboard();" style="padding: 10px 16px; cursor: pointer; font-weight: 600; font-size: 0.85rem; border-bottom: 2px solid ${app.state.warmupActiveTab === 'active24' ? 'var(--accent-primary)' : 'transparent'}; color: ${app.state.warmupActiveTab === 'active24' ? 'var(--accent-primary)' : 'var(--text-secondary)'}; transition: all 0.2s;">
                    Active (24h) <span style="background: ${app.state.warmupActiveTab === 'active24' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)'}; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; margin-left: 6px;">${active24Groups.length}</span>
                </div>
                <div onclick="window.app.state.warmupActiveTab = 'inactive'; window.app.updateDashboard();" style="padding: 10px 16px; cursor: pointer; font-weight: 600; font-size: 0.85rem; border-bottom: 2px solid ${app.state.warmupActiveTab === 'inactive' ? 'var(--accent-primary)' : 'transparent'}; color: ${app.state.warmupActiveTab === 'inactive' ? 'var(--accent-primary)' : 'var(--text-secondary)'}; transition: all 0.2s;">
                    Inactive (> 24h) <span style="background: ${app.state.warmupActiveTab === 'inactive' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)'}; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; margin-left: 6px;">${totalInactive}</span>
                </div>
                <div onclick="window.app.state.warmupActiveTab = 'archived'; window.app.updateDashboard();" style="padding: 10px 16px; cursor: pointer; font-weight: 600; font-size: 0.85rem; border-bottom: 2px solid ${app.state.warmupActiveTab === 'archived' ? 'var(--accent-primary)' : 'transparent'}; color: ${app.state.warmupActiveTab === 'archived' ? 'var(--accent-primary)' : 'var(--text-secondary)'}; transition: all 0.2s;">
                    Archived (Sent) <span style="background: ${app.state.warmupActiveTab === 'archived' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)'}; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; margin-left: 6px;">${totalArchived}</span>
                </div>
            </div>

            <!-- Filters -->
            <div class="card" style="padding: 16px; margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between;">
                <div style="display: flex; gap: 12px; flex-grow: 1; max-width: 600px;">
                    <div class="search-input-wrapper" style="position: relative; flex-grow: 1;">
                        <i data-lucide="search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; color: var(--text-secondary);"></i>
                        <input type="text" id="warmup-search-input" value="${app.state.warmupSearch}" placeholder="Search Domain, Server, IP or User..." style="padding-left: 38px; width: 100%;" oninput="window.updateWarmupSearch(this.value)">
                    </div>
                    <select id="warmup-server-filter" onchange="window.updateWarmupServerFilter(this.value)" style="width: 180px;">
                        <option value="all" ${filterServer === 'all' ? 'selected' : ''}>All Servers</option>
                        ${serversList.map(s => `<option value="${s}" ${filterServer === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                ${app.state.warmupActiveTab === 'inactive' ? `
                <button onclick="window.copyInactiveIps()" class="btn-secondary" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; font-size: 0.8rem; font-weight: 600; border-radius: 8px; border: 1px solid #8b5cf6; color: #8b5cf6; background: rgba(139, 92, 246, 0.05); cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#8b5cf6'; this.style.color='#fff';" onmouseout="this.style.background='rgba(139, 92, 246, 0.05)'; this.style.color='#8b5cf6';">
                    <i data-lucide="copy" style="width: 14px;"></i> Copy Inactive IPs
                </button>
                ` : ''}
            </div>

            <!-- Table -->
            <div class="card" style="padding: 0; overflow: hidden;">
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.75rem;">
                        <thead>
                            <tr style="text-align: left; background: var(--bg-tertiary);">
                                <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Domain / RDNS</th>
                                <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">User</th>
                                <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Server</th>
                                <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">IP Address</th>
                                <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); text-align: center;">Last 3 Drops (Out)</th>
                                <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); text-align: center; font-weight: 700; color: var(--accent-primary);">Representative Out</th>
                                <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); text-align: center; font-weight: 700; color: #8b5cf6;">Total Sent / Next Target</th>
                                <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color);">Last Active</th>
                                <th style="padding: 16px 12px; border-bottom: 2px solid var(--border-color); width: 60px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredGroups.map((g, idx) => {
                                const latest = g.records[0];
                                const oldest = g.records[g.records.length - 1];
                                
                                const last3 = g.records.slice(0, 3).map(r => r.outVal);
                                const repOut = g.repOut;
                                const totalOutAllTime = g.records.reduce((sum, r) => sum + (parseInt(r.outVal) || 0), 0);
                                
                                let durationDays = 0;
                                if (latest && oldest) {
                                    const msDiff = latest.timestamp - oldest.timestamp;
                                    durationDays = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
                                }
                                const startDateStr = oldest ? new Date(oldest.timestamp).toLocaleDateString() : 'Unknown';
                                const totalDrops = g.records.length;
                                
                                const rec = window.getWarmupRecommendation ? window.getWarmupRecommendation(totalOutAllTime, repOut, intel) : null;
                                let recHtml = '';
                                if (rec && (app.state.warmupActiveTab === 'active12' || app.state.warmupActiveTab === 'active24')) {
                                    recHtml = `<div style="font-size: 0.65rem; color: var(--text-secondary); margin-top: 4px;">${rec.text} <span style="opacity: 0.7;">(${rec.sub})</span></div>`;
                                }
                                
                                const last3Html = g.records.slice(0, 3).map(r => {
                                    const valColor = r.outVal === 0 ? 'var(--text-secondary)' : 'var(--text-primary)';
                                    const titleText = `IN: ${r.inVal} | User: ${r.user}`;
                                    return `<span title="${titleText}" style="display:inline-block; padding: 2px 6px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 4px; margin: 0 2px; color: ${valColor}; font-weight: 500;">${r.outVal}</span>`;
                                }).join('');

                                let repColor = '#ef4444';
                                let repBg = 'rgba(239, 68, 68, 0.1)';
                                if (repOut >= 5000) {
                                    repColor = '#10b981';
                                    repBg = 'rgba(16, 185, 129, 0.1)';
                                } else if (repOut >= 2000) {
                                    repColor = '#f59e0b';
                                    repBg = 'rgba(245, 158, 11, 0.1)';
                                }
                                
                                const timeStr = latest ? new Date(latest.timestamp).toLocaleString() : 'Never / > 24h ago';
                                const latestClean = latest && latest.domain ? latest.domain.trim().toLowerCase() : '';
                                const isRdns = latest ? (!latest.domain || latestClean === '[rdns]' || latestClean === 'rdns') : false;
                                let isSwitch = false;
                                const srv = app.state.servers.find(s => s.name && s.name.toLowerCase() === (g.server || '').toLowerCase());
                                if (srv && g.domain && g.ip) {
                                    const ipRdns = getRdns(g.ip, app.state);
                                    const domainMatches = (d1, d2) => {
                                        if (!d1 || !d2) return false;
                                        const clean = d => d.trim().toLowerCase().replace(/\.$/, '');
                                        const c1 = clean(d1);
                                        const c2 = clean(d2);
                                        return c1 === c2 || c1.endsWith('.' + c2) || c2.endsWith('.' + c1);
                                    };
                                    const domainIsIpRdns = domainMatches(g.domain, ipRdns);
                                    if (!domainIsIpRdns) {
                                        const otherIps = srv.allIps || [];
                                        for (const otherIp of otherIps) {
                                            if (otherIp !== g.ip) {
                                                const otherRdns = getRdns(otherIp, app.state);
                                                if (domainMatches(g.domain, otherRdns)) {
                                                    isSwitch = true;
                                                    break;
                                                 }
                                            }
                                        }
                                    }
                                }
                                if (isSwitch && srv && srv.warmupType !== 'Switch') {
                                    srv.warmupType = 'Switch';
                                    window.app.saveState().catch(e => console.error("Error auto-updating server warmupType to Switch:", e));
                                }

                                return `
                                    <tr style="background: ${idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'}; border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 14px 12px; font-weight: 600;">
                                            <div style="font-size: 0.85rem;">
                                                ${g.domain}
                                                ${isRdns ? `<span style="font-size: 0.6rem; padding: 2px 4px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px; color: #3b82f6; margin-left: 6px;" title="No domain in summary. Resolved via IP PTR.">RDNS</span>` : ''}
                                                ${isSwitch ? `<span style="font-size: 0.6rem; padding: 2px 4px; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 4px; color: #8b5cf6; margin-left: 6px;" title="This domain is the RDNS of another IP on the same server.">Switch</span>` : ''}
                                            </div>
                                            <div style="font-size: 0.65rem; color: var(--text-secondary); margin-top: 6px; font-weight: 500; display: flex; flex-direction: column; gap: 3px;">
                                                <div style="display: flex; align-items: center; gap: 4px;" title="First recorded drop date"><i data-lucide="calendar" style="width: 12px; height: 12px;"></i> Started: ${startDateStr}</div>
                                                <div style="display: flex; align-items: center; gap: 4px;" title="Total days since first drop"><i data-lucide="clock" style="width: 12px; height: 12px;"></i> Duration: ${durationDays} Days</div>
                                                <div style="display: flex; align-items: center; gap: 4px;" title="Total successful drops"><i data-lucide="activity" style="width: 12px; height: 12px;"></i> Drops: ${totalDrops}</div>
                                            </div>
                                        </td>
                                        <td style="padding: 14px 12px; font-weight: 500; color: var(--text-secondary);"><i data-lucide="user" style="width: 12px; margin-right: 4px; display: inline-block; vertical-align: middle;"></i><span style="vertical-align: middle;">${latest && latest.user ? latest.user : 'Unknown'}</span></td>
                                        <td style="padding: 14px 12px; font-weight: 500; color: var(--accent-primary);">${g.server || '---'}</td>
                                        <td style="padding: 14px 12px; font-family: monospace; color: var(--text-secondary);">${g.ip || '---'}</td>
                                        <td style="padding: 14px 12px; text-align: center;">${last3Html}</td>
                                        <td style="padding: 14px 12px; text-align: center;">
                                            <span style="display: inline-block; padding: 4px 10px; background: ${repBg}; border: 1px solid ${repColor}33; border-radius: 20px; color: ${repColor}; font-weight: 700; font-size: 0.8rem; box-shadow: 0 0 6px ${repColor}1a;">
                                                ${repOut.toLocaleString()}
                                            </span>
                                        </td>
                                        <td style="padding: 14px 12px; text-align: center;">
                                            <div style="font-weight: 700; color: #8b5cf6; font-size: 0.8rem;">${totalOutAllTime.toLocaleString()}</div>
                                            ${recHtml}
                                        </td>
                                        <td style="padding: 14px 12px; color: var(--text-secondary); font-size: 0.7rem;">${timeStr}</td>
                                        <td style="padding: 14px 12px; text-align: center;">
                                            <button onclick="deleteWarmupGroup('${g.domain}', '${g.server}')" title="Delete Group Logs" style="padding: 4px; background:transparent; border:none; color: #ef4444; cursor:pointer;">
                                                <i data-lucide="trash-2" style="width: 14px; height:14px;"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                            ${filteredGroups.length === 0 ? '<tr><td colspan="9" style="padding: 60px; text-align: center; color: var(--text-secondary); font-size:0.8rem;">No warmup data found. Fetch from Telegram or paste logs above.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

window.copyInactiveIps = () => {
    const table = document.querySelector('.card table');
    if (!table) return;
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const ips = [];
    rows.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length >= 4) {
            const ip = tds[3].textContent.trim();
            if (ip && ip !== '---' && !ip.includes('No warmup data')) {
                ips.push(ip);
            }
        }
    });
    
    if (ips.length === 0) {
        alert("No IPs found to copy.");
        return;
    }
    
    const uniqueIps = [...new Set(ips)];
    navigator.clipboard.writeText(uniqueIps.join('\n')).then(() => {
        const btn = document.querySelector('button[onclick="window.copyInactiveIps()"]');
        if (btn) {
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="check" style="width: 14px;"></i> Copied!';
            if (window.lucide) window.lucide.createIcons();
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                if (window.lucide) window.lucide.createIcons();
            }, 2000);
        } else {
            alert(`Copied ${uniqueIps.length} inactive IPs!`);
        }
    }).catch(err => {
        alert('Failed to copy IPs: ' + err);
    });
};

window.deleteWarmupGroup = async (domain, server) => {
    if (!confirm(`Are you sure you want to delete all warmup logs for "${domain}" on server "${server}"?`)) return;
    const currentData = window.app.state.warmupData || {};
    const updatedData = {};
    Object.entries(currentData).forEach(([msgId, r]) => {
        const cleanDomain = (r.domain || '').trim();
        const isRdnsPlaceholder = cleanDomain.toLowerCase() === '[rdns]' || cleanDomain.toLowerCase() === 'rdns';
        const resolvedDomain = (!cleanDomain || isRdnsPlaceholder) ? (getRdns(r.ip, window.app.state) || 'Unknown') : cleanDomain;
        if (resolvedDomain === domain && r.server === server) {
            // Deleted
        } else {
            updatedData[msgId] = r;
        }
    });
    
    await window.db.ref('state/warmupData').set(updatedData);
    window.app.state.warmupData = updatedData;
    window.app.updateDashboard();
};

window.clearAllWarmupData = async () => {
    if (!confirm("Are you sure you want to reset all Warmup Progress data? This cannot be undone.")) return;
    await window.db.ref('state/warmupData').set(null);
    window.app.state.warmupData = {};
    window.app.updateDashboard();
};

window.updateWarmupSearch = (val) => {
    window.app.state.warmupSearch = val;
    window.app.updateDashboard();
    
    // Retain focus and cursor position after re-render
    setTimeout(() => {
        const input = document.getElementById('warmup-search-input');
        if (input) {
            input.focus();
            const len = input.value.length;
            input.setSelectionRange(len, len);
        }
    }, 0);
};

window.updateWarmupServerFilter = (val) => {
    window.app.state.warmupFilterServer = val;
    window.app.updateDashboard();
};

window.fetchTelegramWarmup = async (btn) => {
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="spin" style="width:14px; height:14px;"></i> Fetching...';
    if (window.lucide) window.lucide.createIcons();
    
    try {
        const resp = await fetch('/api/sync-telegram-warmup');
        const data = await resp.json();
        if (data.success) {
            alert(`Successfully fetched updates! Added ${data.addedCount} new logs. Total: ${data.totalCount}`);
            const snapshot = await window.db.ref('state/warmupData').once('value');
            window.app.state.warmupData = snapshot.val() || {};
            window.app.updateDashboard();
        } else {
            alert(`Error: ${data.error || 'Failed to fetch updates.'}`);
        }
    } catch(e) {
        alert(`Request failed: ${e.message}`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
        if (window.lucide) window.lucide.createIcons();
    }
};

window.showBulkPasteWarmupModal = () => {
    const overlay = document.createElement('div');
    overlay.id = 'bulk-paste-warmup-overlay';
    overlay.style = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);';
    
    overlay.innerHTML = `
        <div class="card" style="width:600px; max-width:90%; padding:24px; position:relative; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="margin:0; font-size:1.2rem; font-weight:700;">Bulk Paste Warmup Logs</h3>
                <span onclick="document.getElementById('bulk-paste-warmup-overlay').remove()" style="cursor:pointer; color:var(--text-secondary);" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='var(--text-secondary)'">
                    <i data-lucide="x" style="width:20px; height:20px;"></i>
                </span>
            </div>
            
            <p style="margin:0 0 16px; font-size:0.8rem; color:var(--text-secondary);">
                Paste the server deployment logs copied directly from Telegram. You can paste multiple logs at once.
            </p>
            
            <textarea id="bulk-warmup-paste-text" placeholder="Paste Telegram logs here..." style="width:100%; height:250px; padding:12px; font-family:monospace; font-size:0.75rem; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:8px; color:var(--text-primary); resize:vertical;"></textarea>
            
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
                <button onclick="document.getElementById('bulk-paste-warmup-overlay').remove()" class="btn-secondary" style="width:auto; padding:10px 16px; font-size:0.75rem; border-radius:6px; cursor:pointer;">Cancel</button>
                <button onclick="submitBulkPasteWarmup()" class="btn-primary" style="width:auto; padding:10px 16px; font-size:0.75rem; border-radius:6px; cursor:pointer;">Process Logs</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
};

window.submitBulkPasteWarmup = async () => {
    const rawText = document.getElementById('bulk-warmup-paste-text').value;
    if (!rawText.trim()) {
        alert("Please paste some text first.");
        return;
    }
    
    const parts = rawText.split(/(?:👤\s*)?User:/i);
    const newRecords = {};
    let count = 0;
    
    parts.forEach(part => {
        if (!part.trim()) return;
        
        const messageText = "User:" + part;
        const parsed = parseMessageText(messageText);
        if (parsed) {
            const timestamp = Date.now() - (count * 1000);
            const messageId = "manual_" + timestamp + "_" + Math.random().toString(36).substr(2, 5);
            parsed.messageId = messageId;
            parsed.timestamp = timestamp;
            newRecords[messageId] = parsed;
            count++;
        }
    });
    
    if (count === 0) {
        alert("Could not parse any valid deployment summary messages. Please check the format.");
        return;
    }
    
    await window.db.ref('state/warmupData').update(newRecords);
    
    if (!window.app.state.warmupData) window.app.state.warmupData = {};
    Object.assign(window.app.state.warmupData, newRecords);
    
    document.getElementById('bulk-paste-warmup-overlay').remove();
    window.app.updateDashboard();
    alert(`Successfully processed and saved ${count} logs!`);
};

window.computeWarmupIntelligence = () => {
    const rawRecords = Object.values(window.app.state.warmupData || {});
    if (rawRecords.length === 0) return null;

    const grouped = {};
    rawRecords.forEach(r => {
        const cleanDomain = (r.domain || '').trim();
        const isRdnsPlaceholder = cleanDomain.toLowerCase() === '[rdns]' || cleanDomain.toLowerCase() === 'rdns';
        const resolvedDomain = (!cleanDomain || isRdnsPlaceholder) ? getRdns(r.ip, window.app.state) : cleanDomain;
        if (!resolvedDomain || resolvedDomain === 'Unknown') return;
        if (!grouped[resolvedDomain]) grouped[resolvedDomain] = [];
        grouped[resolvedDomain].push(r);
    });

    const milestones = [100, 300, 500, 1000, 2000, 5000, 10000, 15000, 20000, 25000, 30000];
    const milestoneTotals = {};
    milestones.forEach(m => milestoneTotals[m] = []);

    let learnedDomains = 0;

    Object.values(grouped).forEach(records => {
        records.sort((a, b) => a.timestamp - b.timestamp); // Oldest first
        
        // Skip domains where we missed the early warmup phase (started tracking at >= 500 drops)
        if (records[0].outVal >= 500) return;

        let cumulative = 0;
        const reached = new Set();
        let contributed = false;

        records.forEach(r => {
            const out = r.outVal;
            milestones.forEach(m => {
                if (out >= m && !reached.has(m)) {
                    reached.add(m);
                    milestoneTotals[m].push(cumulative);
                    contributed = true;
                }
            });
            cumulative += out;
        });
        
        if (contributed) learnedDomains++;
    });

    const averages = {};
    milestones.forEach(m => {
        if (milestoneTotals[m].length > 0) {
            const sum = milestoneTotals[m].reduce((a, b) => a + b, 0);
            averages[m] = Math.round(sum / milestoneTotals[m].length);
        } else {
            averages[m] = null;
        }
    });

    return { averages, milestones, learnedDomains };
};

window.getWarmupRecommendation = (totalSent, repOut, intel) => {
    if (!intel || !intel.averages) return null;
    
    let nextMilestone = null;
    let needed = 0;
    
    // Find the next milestone they haven't reached based on averages
    for (const m of intel.milestones) {
        if (intel.averages[m] !== null && totalSent < intel.averages[m]) {
            nextMilestone = m;
            needed = intel.averages[m] - totalSent;
            break;
        }
    }

    if (nextMilestone) {
        return { text: `Next: ${nextMilestone}`, sub: `Need ${needed.toLocaleString()}` };
    } else {
        return { text: `Target: 30k+`, sub: `Scale freely` };
    }
};

window.showWarmupIntelligenceModal = () => {
    const intel = window.computeWarmupIntelligence();
    if (!intel || intel.learnedDomains === 0) {
        alert("Not enough historical data to generate a Warmup Schema. Keep sending!");
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'warmup-intelligence-overlay';
    overlay.style = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);';
    
    let rowsHtml = '';
    intel.milestones.forEach(m => {
        const avg = intel.averages[m];
        if (avg !== null) {
            rowsHtml += `
                <div style="display:flex; justify-content:space-between; padding:12px; border-bottom:1px solid var(--border-color); background:rgba(255,255,255,0.02);">
                    <div style="font-weight:700; color:var(--text-primary);">Reach ${m.toLocaleString()} emails/Drop</div>
                    <div style="font-weight:600; color:var(--accent-primary);">${avg.toLocaleString()} Total Sent</div>
                </div>
            `;
        }
    });

    overlay.innerHTML = `
        <div class="card" style="width:600px; max-width:90%; padding:24px; position:relative; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="background:var(--gradient-primary); width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; color:#fff;">
                        <i data-lucide="brain-circuit" style="width:20px; height:20px;"></i>
                    </div>
                    <div>
                        <h3 style="margin:0; font-size:1.2rem; font-weight:700;">AI Warmup Strategy</h3>
                        <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Learned from ${intel.learnedDomains} successful domains in your history.</div>
                    </div>
                </div>
                <span onclick="document.getElementById('warmup-intelligence-overlay').remove()" style="cursor:pointer; color:var(--text-secondary);" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='var(--text-secondary)'">
                    <i data-lucide="x" style="width:20px; height:20px;"></i>
                </span>
            </div>
            
            <p style="margin:0 0 20px; font-size:0.85rem; color:var(--text-secondary); line-height:1.5;">
                This schema is dynamically generated by analyzing your past successful telegram deployments. It calculates exactly how much total volume you usually send before safely reaching the next tier.
            </p>
            
            <div style="border:1px solid var(--border-color); border-radius:8px; overflow:hidden;">
                ${rowsHtml}
            </div>
            
            <div style="margin-top:20px; padding:12px; background:rgba(59, 130, 246, 0.1); border-radius:8px; border:1px solid rgba(59, 130, 246, 0.2); display:flex; gap:12px;">
                <i data-lucide="info" style="color:#3b82f6; width:20px; flex-shrink:0;"></i>
                <div style="font-size:0.8rem; color:var(--text-primary); line-height:1.4;">
                    <strong>Live Recommendations:</strong> The "Total Sent" column in your dashboard now features a live tracker recommending when your active domains are ready to scale up to the next target based on this exact schema!
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
};

