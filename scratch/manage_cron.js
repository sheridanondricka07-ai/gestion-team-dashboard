const fetch = require('node-fetch');

const API_KEY = "LLZY3mhIByx5C3gnAoYG+iaw5UfXbZMoiAgIcN8eyqI=";

async function listJobs() {
    try {
        const response = await fetch("https://api.cron-job.org/jobs", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${API_KEY}`
            }
        });
        const result = await response.json();
        console.log("Jobs list:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error listing jobs:", e);
    }
}

listJobs();
