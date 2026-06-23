const token = 'LLZY3mhIByx5C3gnAoYG+iaw5UfXbZMoiAgIcN8eyqI=';

async function listJobs() {
    const res = await fetch('https://api.cron-job.org/jobs', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const data = await res.json();
    console.log(JSON.stringify(data.jobs.slice(0, 2), null, 2));
}

listJobs();
