const https = require('https');
const DB_URL = 'https://gestion-team-c-01-default-rtdb.firebaseio.com';

function putFirebaseDataConditional(path, data, etag) {
    const payload = JSON.stringify(data);
    const options = {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'if-match': etag,
            'Content-Length': Buffer.byteLength(payload)
        }
    };
    
    const req = https.request(`${DB_URL}/${path}.json`, options, res => {
        let resData = '';
        res.on('data', c => resData += c);
        res.on('end', () => console.log('Status:', res.statusCode, 'Data:', resData));
    });
    req.write(payload);
    req.end();
}

putFirebaseDataConditional('test/test_conditional', true, 'null_etag');
