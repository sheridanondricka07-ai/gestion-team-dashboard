const fs = require('fs');
const data = JSON.parse(fs.readFileSync('database_backup.json', 'utf8'));

console.log("Analyzing root database keys size:");
Object.keys(data).forEach(key => {
  const size = Buffer.byteLength(JSON.stringify(data[key]));
  console.log(`- ${key}: ${(size / (1024 * 1024)).toFixed(3)} MB (${size} bytes)`);
});
