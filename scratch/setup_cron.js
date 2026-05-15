const fetch = require('node-fetch'); // Using fetch in Node 18+ style

const API_KEY = "LLZY3mhIByx5C3gnAoYG+iaw5UfXbZMoiAgIcN8eyqI=";
const TARGET_URL = "https://gestion-team-dashboard.vercel.app/api/cron-master";

async function createCronJob() {
    const payload = {
        job: {
            url: TARGET_URL,
            title: "Team Infrastructure Check (3x Daily)",
            enabled: true,
            saveResponses: true,
            auth: {
                enable: false
            },
            requestMethod: 0, // GET
            customHeaders: {
                "Authorization": "Bearer internal-cron-secret"
            },
            schedule: {
                timezone: "Europe/London", // GMT/UTC
                expiresAt: 0,
                hours: [9, 15, 21],
                minutes: [0],
                mdays: [-1],
                months: [-1],
                wdays: [-1]
            }
        }
    };

    try {
        const response = await fetch("https://api.cron-job.org/jobs", {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log("API Response:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

createCronJob();
