const crypto = require('crypto');

const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";

const DEFAULT_CREDS = {
  "type": "service_account",
  "project_id": "braided-destiny-498415-s1",
  "private_key_id": "3fe1c7c12ceeb1b6b119b0ae1e2578e51e576eaf",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC3+ZrxE08tD3FD\nD2+h3l833kt/AteDH13NL6XwtZVZXE7XRamQQYEdUSYegfrFsYF9SVkSss3jQH1/\nj2ANh+F56UgyhsHt9kxE0K/ZaIq+8DfneZlbZn53bHzUXvU2/tkziITWcYQj1ebc\n5HgaW6hnxyBkDbKTtcqyE07yki6FCRlVrk5F07bQ3Po6CZmfJEYG/BTbo+vZRAgg\n6SEW8vV64juL0v0JKkDUjV/frV12PB4SJ0XgXhFR/FJKEa2YqBNH/Y+VO3WDXN0g\n6jw204aZp4bKGqwTxFnb05gsrv7xh7NLbCDS6xipOKkbMf8YCiL8TzSLjQvCend2\nuthbDfibAgMBAAECggEABtqQKKIBBZs5K3fkP0IDBxhLdLhc4gAlpPK8+loxbapQ\nL5njRsIB9t8ijelmt720pr+4R0eM/wXUhw+G0wo4XqvPqj419FEEJ14k5vMLlDBr\nzL5Ndce8N2O9xMWi2gElg1N3K2wAMbuSxbDnPoginncfIEsYV4NiwT6R5tyGSiNr\n4MP3L9dRZ/qAcwrgDnmG/62Lo65YTZ8R0Z199ijk/nIYur7dYIEoxlNaEtubA5eK\n2WKUDsIp8nIXHrjgHqexjwRNlylOA459h6RDFQ8+GntbPOBDXhGE93varWzmSAIl\nHg635EltU5DWjPFOrRYmqwzH2V4rTxrXgMGtp7VsaQKBgQDxYas6gMr97SKOUEXH\nzMZm0tHNCzmnUfO6ymimjlexAG2nXQmapdORMQIuQciQtvVoF1WLpMo9QeUh1w5b\nUamQA1Cx/k73sx7vb6MwgJSlLQ1E54GQVAM+z1u/rFnCJPiWTANLttS0XcBf9T8i\nAbU+nuFxRtR9FcHuqUoJWYLl8wKBgQDDHercbWA/wKoSan228Uophf+tPHfmenuC\nD1N9CMCvIZUeFO4s0lKD3TMuB56qi1C7BTUVDZNwmQaCuf/TS+OzROZC/JcfTW/G\n/Nip9GPFnU+u9f7yt24prOmzJOR/jEqhdX3p0ViK4bUxhtkpe/Ptn5jDaP+Tuzos\nraapAioEuQKBgFon3qqFPExHa+a3uLh9lYUGLPJmxOvnwh78RsYe2EX2IP6n01R9\np13NbkEUtPLIQzTTslHsBNWIbSqMhoI5KBnwAw3YLGp77owDqHIPNHXVM+WOimf7\n2RJ2pJAcsZG/+VE5pul6qkuL0LSGh0QOW0G+WfnTOL5XiA26ETsYwbldAoGBAKko\nnN+x68oZzNjeflNG6dcKF1onnIOzGLTveKBkIDk1UkScPMmbJnKwKZj0fji5Q6qA\nnz67YGI0KRLZEtQrbSOUzlSxDIvU5N2NhIIEISPIeLblCr1/DgEPqiToDToPdPx6\nEknOd4cgm6hukoOGtToELbrsovd/ULY/bsgD2k3xAoGARAdoR31LFRkodUcN3R75\nnap7iSVCy5E1VjpZNXxUiTncavtMOH1IRUk/1QdFzZXRTCmQdcpQnyUZQKQpbJwF\nTlEydNDoW8u2yRadPRGfybIfWU5HGebwgwT/WSgtZt5M+8ARwliexUm3UUd/8XRn\n0mixobkVoFdYyX6TtCFV3GQ=\n-----END PRIVATE KEY-----\n",
  "client_email": "postmaster-monitor@braided-destiny-498415-s1.iam.gserviceaccount.com"
};

function getCreds() {
    if (process.env.GOOGLE_POSTMASTER_CREDS) {
        try {
            return JSON.parse(process.env.GOOGLE_POSTMASTER_CREDS);
        } catch (e) {
            console.error("Failed to parse GOOGLE_POSTMASTER_CREDS env var:", e);
        }
    }
    return DEFAULT_CREDS;
}

async function getAccessToken() {
    const creds = getCreds();
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;
    
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
        iss: creds.client_email,
        scope: 'https://www.googleapis.com/auth/postmaster.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        exp: exp,
        iat: iat
    };
    
    const base64UrlEncode = (obj) => {
        return Buffer.from(JSON.stringify(obj))
            .toString('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    };
    
    const tokenParts = base64UrlEncode(header) + '.' + base64UrlEncode(payload);
    
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(tokenParts);
    const signature = sign.sign(creds.private_key, 'base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
        
    const jwt = tokenParts + '.' + signature;
    
    const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });
    
    const data = await resp.json();
    if (data.error) {
        throw new Error(data.error_description || data.error);
    }
    return data.access_token;
}

async function getFirebaseData(path) {
    try {
        const resp = await fetch(`${DB_URL}/${path}.json`);
        return await resp.json();
    } catch (e) {
        return null;
    }
}

async function setFirebaseData(path, data) {
    try {
        const resp = await fetch(`${DB_URL}/${path}.json`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        await resp.text();
    } catch (e) {
        console.error('Firebase REST Error:', e);
    }
}

function getRootDomain(domain) {
    if (!domain) return '';
    const parts = domain.split('.');
    if (parts.length <= 2) return domain;
    
    const lastTwo = parts.slice(-2).join('.');
    const isMultiPartTld = lastTwo.match(/\.(com|net|org|edu|gov|co|org)\.[a-z]{2}$/i);
    
    if (isMultiPartTld) {
        return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const accessToken = await getAccessToken();
        const action = req.body.action || 'check';

        if (action === 'add') {
            // === AUTO-ADD DOMAINS LOGIC ===
            
            // 1. Get current domains in Google Postmaster
            const domainsResp = await fetch('https://gmailpostmastertools.googleapis.com/v1/domains', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!domainsResp.ok) {
                const errorDetails = await domainsResp.text();
                return res.status(domainsResp.status).json({ 
                    error: 'Failed to fetch domains from Google Postmaster',
                    details: errorDetails
                });
            }

            const domainsData = await domainsResp.json();
            const verifiedDomains = new Set((domainsData.domains || []).map(d => d.name.replace('domains/', '').toLowerCase().trim()));

            // 2. Get active domains from Firebase RTDB (from state/vmtaResults PTR records)
            const vmtaResults = await getFirebaseData('state/vmtaResults') || {};
            const systemDomains = new Set();
            Object.values(vmtaResults).forEach(d => {
                if (d.ptr && d.ptr !== '---' && !d.ptr.includes('No PTR') && !d.ptr.includes('NXDOMAIN')) {
                    let clean = d.ptr.trim().toLowerCase();
                    if (clean.endsWith('.')) clean = clean.slice(0, -1);
                    
                    systemDomains.add(clean);
                    
                    const root = getRootDomain(clean);
                    if (root) systemDomains.add(root);
                }
            });

            // 3. Find missing domains
            const missingDomains = [];
            for (const dom of systemDomains) {
                if (!verifiedDomains.has(dom)) {
                    missingDomains.push(dom);
                }
            }

            if (missingDomains.length === 0) {
                return res.status(200).json({ 
                    success: true, 
                    added: [], 
                    message: 'All system domains are already added to Google Postmaster Tools.' 
                });
            }

            const verificationToken = req.body.token || "google-site-verification=qo8V9cAsy9CrNm42J8V_DuUIILXgXsnj8-Wzehk7rOA";
            const added = missingDomains.map(domain => ({
                domain,
                record: `${domain},${domain},TXT,${verificationToken}`
            }));

            return res.status(200).json({ 
                success: true, 
                added,
                verificationToken
            });

        } else {
            // === CHECK REPUTATION LOGIC ===

            // 1. Fetch verified domains from Google Postmaster
            const domainsResp = await fetch('https://gmailpostmastertools.googleapis.com/v1/domains', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!domainsResp.ok) {
                const errorDetails = await domainsResp.text();
                return res.status(domainsResp.status).json({ 
                    error: 'Failed to fetch domains from Google Postmaster',
                    details: errorDetails
                });
            }

            const domainsData = await domainsResp.json();
            const verifiedDomains = (domainsData.domains || []).map(d => d.name.replace('domains/', ''));

            if (verifiedDomains.length === 0) {
                return res.status(200).json({ success: true, message: 'No verified domains found in Google Postmaster account.' });
            }

            const results = {};

            // 2. Fetch traffic stats for each verified domain
            for (const domain of verifiedDomains) {
                try {
                    const statsResp = await fetch(`https://gmailpostmastertools.googleapis.com/v1/domains/${domain}/trafficStats`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });

                    if (!statsResp.ok) continue;

                    const statsData = await statsResp.json();
                    const stats = statsData.trafficStats || [];

                    if (stats.length === 0) continue;

                    // Sort stats to find the latest daily record
                    stats.sort((a, b) => a.name.localeCompare(b.name));
                    const latestStat = stats[stats.length - 1];

                    const ipReputations = {};
                    if (latestStat.ipReputationDetails) {
                        latestStat.ipReputationDetails.forEach(detail => {
                            const rep = detail.ipReputation;
                            const ips = detail.sampleIps || [];
                            ips.forEach(ip => {
                                const safeIp = ip.replace(/\./g, '_');
                                ipReputations[safeIp] = rep;
                            });
                        });
                    }

                    const cleanDomainKey = domain.replace(/\./g, '_');
                    const postmasterRecord = {
                        domain: domain,
                        domainReputation: latestStat.domainReputation || 'REPUTATION_UNSPECIFIED',
                        spamRate: latestStat.spamRate !== undefined ? latestStat.spamRate : null,
                        spfSuccess: latestStat.spfSuccessRate !== undefined ? latestStat.spfSuccessRate : null,
                        dkimSuccess: latestStat.dkimSuccessRate !== undefined ? latestStat.dkimSuccessRate : null,
                        dmarcSuccess: latestStat.dmarcSuccessRate !== undefined ? latestStat.dmarcSuccessRate : null,
                        ipReputations: ipReputations,
                        timestamp: Date.now(),
                        dateString: latestStat.name.split('/').pop() // e.g. "20260603"
                    };

                    results[cleanDomainKey] = postmasterRecord;

                    // Save to Firebase under state/postmasterResults/{cleanDomainKey}
                    await setFirebaseData(`state/postmasterResults/${cleanDomainKey}`, postmasterRecord);

                } catch (err) {
                    console.error(`Error fetching stats for ${domain}:`, err.message);
                }
            }

            // Save last updated timestamp
            await setFirebaseData('state/postmasterLastUpdate', new Date().toLocaleString());

            return res.status(200).json({ success: true, results });
        }

    } catch (error) {
        console.error('Postmaster handler critical error:', error);
        return res.status(500).json({ error: 'Critical server error', message: error.message });
    }
}
