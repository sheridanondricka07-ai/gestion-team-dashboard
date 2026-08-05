const fs = require('fs');
const content = fs.readFileSync('components.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    if (lower.includes('distribution') || lower.includes('tier-filter') || lower.includes('tier filter') || lower.includes('minSize') || lower.includes('maxSize')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
