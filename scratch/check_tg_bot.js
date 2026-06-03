const BOT_TOKEN = "8277348945:AAGd4UVlLqxKiQUF4wdVMTs_VonGoMfEgfk";

async function main() {
    try {
        console.log("Checking webhook info...");
        const webhookInfoResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
        const webhookInfo = await webhookInfoResp.json();
        console.log("Webhook Info:", JSON.stringify(webhookInfo, null, 2));

        console.log("\nChecking getUpdates...");
        const updatesResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
        const updates = await updatesResp.json();
        console.log("getUpdates Response:", JSON.stringify(updates, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

main();
