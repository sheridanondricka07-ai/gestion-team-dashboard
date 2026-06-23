const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";

async function getFirebase(path) {
    const r = await fetch(`${DB_URL}/${path}.json`);
    return await r.json();
}

async function putFirebase(path, data) {
    await fetch(`${DB_URL}/${path}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}

async function runTest() {
    console.log("=== STARTING DUAL UPGRADE TEST ===");

    // 1. Clear notified states for the test targets
    console.log("Clearing notified states...");
    const notified = await getFirebase("state/autoWarmupNotified") || {};
    const clearedNotified = {};
    for (const key in notified) {
        if (!key.includes("swimtofightcancer") && !key.includes("energieface") && !key.includes("57_131_4_160")) {
            clearedNotified[key] = notified[key];
        }
    }
    await putFirebase("state/autoWarmupNotified", clearedNotified);

    // 2. Clear any existing queue items for these test targets
    console.log("Clearing existing queue items...");
    const queue = await getFirebase("state/autoWarmupQueue") || {};
    const clearedQueue = {};
    for (const key in queue) {
        if (!key.includes("swimtofightcancer") && !key.includes("energieface") && !key.includes("57_131_4_160")) {
            clearedQueue[key] = queue[key];
        }
    }
    await putFirebase("state/autoWarmupQueue", clearedQueue);

    // 3. Insert 3 successful drops for swimtofightcancer.nl (s_wmn3_2236 - RP)
    console.log("Writing 3 successful drops for s_wmn3_2236 (RP)...");
    const warmupData = await getFirebase("warmupData") || {};
    const now = Date.now();

    warmupData["test_swim_1_" + now] = {
        domain: "swimtofightcancer.nl",
        ip: "104.206.145.37",
        server: "s_wmn3_2236",
        user: "h.ghazzali",
        inVal: 200,
        outVal: 200,
        timestamp: now - 30 * 60 * 1000
    };
    warmupData["test_swim_2_" + now] = {
        domain: "swimtofightcancer.nl",
        ip: "104.206.145.37",
        server: "s_wmn3_2236",
        user: "h.ghazzali",
        inVal: 200,
        outVal: 200,
        timestamp: now - 20 * 60 * 1000
    };
    warmupData["test_swim_3_" + now] = {
        domain: "swimtofightcancer.nl",
        ip: "104.206.145.37",
        server: "s_wmn3_2236",
        user: "h.ghazzali",
        inVal: 200,
        outVal: 200,
        timestamp: now - 10 * 60 * 1000
    };

    // 4. Insert 3 successful drops for energieface.com (s_wmn3_2193 - Switch/7-column)
    console.log("Writing 3 successful drops for s_wmn3_2193 (Switch)...");
    warmupData["test_switch_1_" + now] = {
        domain: "energieface.com",
        ip: "57.131.4.160",
        server: "s_wmn3_2193",
        user: "a.zeggaf",
        inVal: 3000,
        outVal: 3000,
        timestamp: now - 30 * 60 * 1000
    };
    warmupData["test_switch_2_" + now] = {
        domain: "energieface.com",
        ip: "57.131.4.160",
        server: "s_wmn3_2193",
        user: "a.zeggaf",
        inVal: 3000,
        outVal: 3000,
        timestamp: now - 20 * 60 * 1000
    };
    warmupData["test_switch_3_" + now] = {
        domain: "energieface.com",
        ip: "57.131.4.160",
        server: "s_wmn3_2193",
        user: "a.zeggaf",
        inVal: 3000,
        outVal: 3000,
        timestamp: now - 10 * 60 * 1000
    };

    await putFirebase("warmupData", warmupData);

    // 5. Run handler locally
    console.log("Importing and running handler...");
    const module = await import('../api/sync-telegram-warmup.js');
    const handler = module.default;

    // Simulate POST payload for a new drop on s_wmn3_2193
    const req = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
            update_id: 999999,
            message: {
                message_id: "test_msg_" + now,
                date: Math.floor(now / 1000),
                chat: { id: "-5317343683", type: "supergroup" },
                text: `User: a.zeggaf\nServer Deployment Summary\n3000 (IN) 3000 (OUT)\ns_wmn3_2193 3000 3000\nenergieface.com\n【IP】: 57.131.4.160`
            }
        }
    };

    const res = {
        status(code) { return this; },
        json(obj) { return this; }
    };

    await handler(req, res);

    // 6. Verify autoWarmupQueue in Firebase
    console.log("\n=== POST-RUN VERIFICATION ===");
    const updatedQueue = await getFirebase("state/autoWarmupQueue") || {};
    
    // Group and print target commands
    console.log("Current Firebase Queue (filtered for test runs):");
    Object.entries(updatedQueue).forEach(([key, val]) => {
        if (key.includes("swimtofightcancer") || key.includes("energieface") || key.includes("57_131_4_160")) {
            console.log(`- ${key}: ${JSON.stringify(val)}`);
        }
    });

    console.log("=== TEST RUN COMPLETE ===");
}

runTest().catch(console.error);
