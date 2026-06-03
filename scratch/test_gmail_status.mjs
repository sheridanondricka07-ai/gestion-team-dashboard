import handler from '../api/cron-master.js';

const req = {
    query: { task: 'gmail-status' },
    headers: { 'x-vercel-cron': 'true' }
};

const res = {
    status(code) {
        console.log("Status Code:", code);
        return this;
    },
    json(data) {
        console.log("Response JSON:", JSON.stringify(data, null, 2));
        return this;
    },
    send(msg) {
        console.log("Response Send:", msg);
        return this;
    }
};

console.log("Running local test of cron-master handler...");
handler(req, res)
    .then(() => console.log("Done!"))
    .catch(err => console.error("Error:", err));
