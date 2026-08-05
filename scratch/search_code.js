const fs = require('fs');
const content = fs.readFileSync('components.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    if (lower.includes('representative') || lower.includes('repout') || lower.includes('rep_out') || lower.includes('getrepresentative')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
