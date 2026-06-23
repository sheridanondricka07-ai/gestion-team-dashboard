const token = 'LLZY3mhIByx5C3gnAoYG+iaw5UfXbZMoiAgIcN8eyqI=';

async function createJob() {
    const payload = {
        job: {
            url: "https://gestion-team-dashboard.vercel.app/api/sync-telegram-warmup",
            enabled: true,
            title: "Telegram Auto-Upgrade Sync",
            saveResponses: true,
            schedule: {
                timezone: "UTC",
                expiresAt: 0,
                hours: [-1],
                mdays: [-1],
                minutes: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
                months: [-1],
                wdays: [-1]
            }
        }
    };

    const res = await fetch('https://api.cron-job.org/jobs', {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    if (res.ok) {
        const data = await res.json();
        console.log("Job created successfully:", data);
    } else {
        const err = await res.text();
        console.error("Failed to create job:", res.status, err);
    }
}

createJob();
