const https = require('https');
https.get('https://gestion-team-c-01-default-rtdb.firebaseio.com/state.json', res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const state = JSON.parse(data);
        const results = [];
        
        function search(obj, path) {
            if (!obj) return;
            if (typeof obj === 'string') {
                if (obj.includes('briarfield.today')) {
                    results.push({ path, value: obj });
                }
            } else if (typeof obj === 'object') {
                Object.keys(obj).forEach(k => {
                    if (k.includes('briarfield_today') || k.includes('briarfield.today')) {
                        results.push({ path: path + '/' + k, value: obj[k] });
                    }
                    search(obj[k], path + '/' + k);
                });
            }
        }
        
        search(state, 'state');
        console.log('Search Results:');
        console.log(JSON.stringify(results, null, 2));
    });
});
