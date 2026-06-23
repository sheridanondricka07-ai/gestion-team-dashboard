const fs = require('fs');
const data = JSON.parse(fs.readFileSync('database_backup.json', 'utf8'));

// Check state.warmupData or root warmupData
const warmup = data.warmupData || (data.state && data.state.warmupData) || {};

console.log("Checking warmupData for quotes or special characters:");
Object.keys(warmup).forEach(k => {
  const r = warmup[k];
  if (r.domain && (r.domain.includes("'") || r.domain.includes('"') || r.domain.includes('\\'))) {
    console.log(`Domain match: key=${k}, domain=${r.domain}`);
  }
  if (r.server && (r.server.includes("'") || r.server.includes('"') || r.server.includes('\\'))) {
    console.log(`Server match: key=${k}, server=${r.server}`);
  }
});
