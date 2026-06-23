const fs = require('fs');
const data = JSON.parse(fs.readFileSync('database_backup.json', 'utf8'));

const state = data.state || data;

console.log("Analyzing database keys size:");
Object.keys(state).forEach(key => {
  const size = Buffer.byteLength(JSON.stringify(state[key]));
  console.log(`- ${key}: ${(size / (1024 * 1024)).toFixed(3)} MB (${size} bytes)`);
});
