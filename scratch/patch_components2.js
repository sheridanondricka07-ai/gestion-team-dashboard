const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../components.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add Tab
code = code.replace(
    /Archived \(Sent\) <span style="background: \$\{app\.state\.warmupActiveTab === 'archived' \? 'rgba\(59, 130, 246, 0\.1\)' : 'var\(--bg-tertiary\)'\}; padding: 2px 8px; border-radius: 10px; font-size: 0\.7rem; margin-left: 6px;">\$\{totalArchived\}<\/span>\s*<\/div>\s*<\/div>/,
    `Archived (Sent) <span style="background: \${app.state.warmupActiveTab === 'archived' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)'}; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; margin-left: 6px;">\${totalArchived}</span>
                </div>
                <div onclick="window.app.state.warmupActiveTab = 'remote'; window.app.updateDashboard();" style="padding: 10px 16px; cursor: pointer; font-weight: 600; font-size: 0.85rem; border-bottom: 2px solid \${app.state.warmupActiveTab === 'remote' ? 'var(--accent-primary)' : 'transparent'}; color: \${app.state.warmupActiveTab === 'remote' ? 'var(--accent-primary)' : 'var(--text-secondary)'}; transition: all 0.2s; display: flex; align-items: center; gap: 6px;">
                    <i data-lucide="terminal" style="width: 14px; height: 14px;"></i> Remote Controller
                </div>
            </div>`
);

// 3. Wrap end of view
code = code.replace(
    /No warmup data found\. Fetch from Telegram or paste logs above\.<\/td><\/tr>' : ''\}\s*<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>\s*<\/div>\s*`;\s*\}/,
    `No warmup data found. Fetch from Telegram or paste logs above.</td></tr>' : ''}
                          </tbody>
                      </table>
                  </div>
              </div>
              \`}
          </div>
      \`;
  }`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log("Patched components.js successfully with regex!");
