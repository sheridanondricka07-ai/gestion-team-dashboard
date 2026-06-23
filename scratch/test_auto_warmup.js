// fetch is global in Node 20

const LEVELS = [50, 100, 200, 300, 500, 760, 1000, 1500, 2000, 3000, 5000, 7000, 8000, 10000, 15000, 19000, 21000, 26000, 30000];

function checkSuccess(records) {
    if (records.length < 3) return false;
    let success = true;
    for (let i = 0; i < 3; i++) {
        const r = records[i];
        const inVal = parseInt(r.inVal, 10) || 0;
        const outVal = parseInt(r.outVal, 10) || 0;
        if (inVal <= 0 || outVal < inVal * 0.95) {
            success = false;
            break;
        }
    }
    return success;
}

function getNextTarget(latestVal) {
    return LEVELS.find(l => l > latestVal) || latestVal;
}

// Test cases
const test1 = [
    { inVal: 101, outVal: 101 },
    { inVal: 317, outVal: 317 },
    { inVal: 317, outVal: 312 }
];
console.log("Test 1 success (expected: true):", checkSuccess(test1));
console.log("Test 1 next target (expected: 500):", getNextTarget(317));

const test2 = [
    { inVal: 100, outVal: 100 },
    { inVal: 100, outVal: 90 }, // 10% diff (not OK)
    { inVal: 100, outVal: 100 }
];
console.log("Test 2 success (expected: false):", checkSuccess(test2));
