async function run() {
    const module = await import('../api/sync-telegram-warmup.js');
    const handler = module.default;

    const req = {
        method: 'GET',
        headers: {}
    };

    const res = {
        status(code) {
            console.log("Status:", code);
            return this;
        },
        json(obj) {
            console.log("JSON Response:", JSON.stringify(obj, null, 2));
            return this;
        }
    };

    await handler(req, res);
}

run().catch(console.error);
