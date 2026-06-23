async function run() {
    const module = await import('./sync-telegram-warmup.mjs');
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
            console.log("JSON Response with", obj.addedCount, "added records.");
            return this;
        }
    };

    await handler(req, res);
}

run().catch(console.error);
