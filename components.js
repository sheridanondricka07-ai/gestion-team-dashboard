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
            ${app.state.dbConnected ? `
                <div style="display: flex; align-items: center; gap: 8px; margin-right: 12px;">
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">
                        ${app.state.lastSynced ? `Synced: ${app.state.lastSynced}` : 'Live'}
                    </span>
                    <button onclick="window.app.syncData()" ${app.state.syncing ? 'disabled' : ''} style="padding: 6px 10px; font-size: 0.75rem; width: auto; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); display: flex; align-items: center; gap: 4px; border-radius: 4px; cursor: pointer;">
                        <i data-lucide="refresh-cw" class="${app.state.syncing ? 'spin' : ''}" style="width: 12px; height: 12px;"></i>
                        Sync
                    </button>
                </div>
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

window.queueManualCommands = async () => {
    const statusDiv = document.getElementById('mc-status');
    const btn = document.querySelector('button[onclick="window.queueManualCommands()"]');
    
    const scope = document.getElementById('mc-target-scope').value;
    const targetsStr = document.getElementById('mc-targets').value;
    const field = document.getElementById('mc-field').value;
    const val = document.getElementById('mc-value').value;
    
    if (!targetsStr.trim() || (!val.trim() && scope !== 'custom')) {
        statusDiv.innerText = "Please provide targets and a new value.";
        statusDiv.style.color = "#ef4444";
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="lucide-loader"></i> Processing...';
    statusDiv.innerText = "Processing targets...";
    statusDiv.style.color = "var(--text-secondary)";
    
    const targets = targetsStr.split(/[\n,]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
    const newQueueItems = {};
    let sendAtMs = Date.now() + 1000;
    
    // Build a map of domain/ip -> server to lookup if scope is domain
    const domainToServer = {};
    if (scope === 'domain') {
        const warmupData = window.app.state.warmupData || {};
        for (const [key, record] of Object.entries(warmupData)) {
            if (record.domain) domainToServer[record.domain.toLowerCase()] = record.server;
            if (record.ip) domainToServer[record.ip] = record.server;
        }
        // Also check server inventory mapping if not found in warmup
        if (window.app.state.servers) {
            window.app.state.servers.forEach(s => {
                if (s.allIps) {
                    s.allIps.forEach(ip => {
                        if (!domainToServer[ip]) domainToServer[ip] = s.name;
                    });
                }
            });
        }
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const t of targets) {
        let msg = "";
        let serverName = "";
        
        if (scope === 'server') {
            serverName = t;
            msg = `update ${serverName} ${field} to ${val}`;
        } else if (scope === 'domain') {
            serverName = domainToServer[t];
            if (!serverName) {
                failCount++;
                continue;
            }
            msg = `update ${serverName} ${field} for ${t} to ${val}`;
        } else if (scope === 'custom') {
            msg = t; // Treat each line as a raw command
            // Extract server name from raw command if possible to create a somewhat unique ID
            const match = msg.match(/update\s+(sh_wmn3_\d+|s_wmn3_\d+)/i);
            serverName = match ? match[1] : 'custom';
        }
        
        const queueId = `q_manual_${Date.now()}_${Math.floor(Math.random()*10000)}`;
        newQueueItems[queueId] = {
            chat_id: "-5317343683",
            text: msg,
            sendAt: sendAtMs
        };
        sendAtMs += 7000; // Stagger by 7s
        successCount++;
    }
    
    if (successCount === 0) {
        statusDiv.innerText = `Failed to queue: Could not match ${failCount} domains/IPs to servers.`;
        statusDiv.style.color = "#ef4444";
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="zap" style="width: 16px;"></i> Queue Commands to Firebase';
        if (window.lucide) window.lucide.createIcons();
        return;
    }
    
    try {
        await window.db.ref('state/autoWarmupQueue').update(newQueueItems);
        statusDiv.innerText = `Successfully queued ${successCount} commands! ${failCount > 0 ? `(${failCount} unmapped skipped)` : ''}`;
        statusDiv.style.color = "#10b981";
        document.getElementById('mc-targets').value = '';
    } catch (e) {
        console.error(e);
        statusDiv.innerText = "Error pushing to Firebase!";
        statusDiv.style.color = "#ef4444";
    }
    
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="zap" style="width: 16px;"></i> Queue Commands to Firebase';
    if (window.lucide) window.lucide.createIcons();
};
