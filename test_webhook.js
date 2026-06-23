const payload = {
    text: `User: h.ghazzali
Server Deployment Summary
200 (IN) 200 (OUT)
s_wmn3_2236 200 200
104.206.145.37
【IP】: 104.206.145.37`
};

fetch('https://gestion-team-dashboard.vercel.app/api/sync-telegram-warmup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
