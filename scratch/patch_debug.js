const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../api/sync-telegram-warmup.js');
let code = fs.readFileSync(filePath, 'utf8');

const regexComment = /\/\/\s*Write debug log of raw payload[\s\S]*?\/\*\s*([\s\S]*?)\s*\*\//g;

const replComment = `// Write debug log of raw payload
                  $1`;

if (regexComment.test(code)) {
    code = code.replace(regexComment, replComment);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log("Uncommented debug logic.");
} else {
    console.log("Could not find target.");
}
