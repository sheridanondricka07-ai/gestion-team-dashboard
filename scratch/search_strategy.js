const fs = require('fs');
const content = fs.readFileSync('components.js', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(8680, 8715).join('\n'));
