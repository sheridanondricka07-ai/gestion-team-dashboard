Created At: 2026-06-19T16:30:49Z
Completed At: 2026-06-19T16:30:50Z
File Path: `file:///c:/Users/admin_11/Documents/Gestion_Team/api/sync-telegram-warmup.js`
Total Lines: 491
Total Bytes: 19797
Showing lines 26 to 60
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
26: }
27: 
28: async function putFirebaseData(path, data) {
29:     try {
30:         await fetch(`${DB_URL}/${path}.json`, {
31:             method: 'PUT',
32:             headers: { 'Content-Type': 'application/json' },
33:             body: JSON.stringify(data)
34:         });
35:         return true;
36:     } catch (e) {
37:         console.error("Firebase put error:", e);
38:         return false;
39:     }
40: }
41: 
42: async function processAutoWarmup(allData, newRecords) {
43:     try {
44:         const autoNotifiedState = await getFirebaseData('state/autoWarmupNotified') || {};
45:         const queueState = await getFirebaseData('state/autoWarmupQueue') || {};
46:         
47:         const updatedKeys = new Set();
48:         if (newRecords) {
49:             Object.values(newRecords).forEach(r => {
50:                 if (!r.domain && !r.ip && !r.server) return;
51:                 const key = `${r.domain || ''}_${r.server || ''}_${r.ip || ''}`;
52:                 updatedKeys.add(key);
53:             });
54:         }
55: 
56:         let newNotified = false;
57:         let newQueue = false;
58: 
59:         const grouped = {};
60:         Object.values(allData).forEach(r => {
The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.
