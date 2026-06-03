async function run() {
    const token = '8277348945:AAGd4UVlLqxKiQUF4wdVMTs_VonGoMfEgfk';
    const url = `https://api.telegram.org/bot${token}/getUpdates`;
    try {
        console.log("Fetching Telegram updates...");
        const resp = await fetch(url);
        const data = await resp.json();
        if (!data.ok) {
            console.error("Telegram API Error:", data.description);
            return;
        }
        
        const results = data.result || [];
        if (results.length === 0) {
            console.log("\nNo updates found. Please send a message in the group first, and make sure the bot is added to it.");
            return;
        }
        
        console.log("\nFound updates:");
        const chats = new Map();
        results.forEach(update => {
            const msg = update.message || update.edited_message || update.channel_post;
            if (msg && msg.chat) {
                chats.set(msg.chat.id, msg.chat);
            }
        });
        
        if (chats.size === 0) {
            console.log("No chat objects found in the updates.");
            return;
        }
        
        for (const [id, chat] of chats.entries()) {
            console.log(`- Chat Title: "${chat.title || chat.username || 'Private'}" | ID: ${id} | Type: ${chat.type}`);
        }
    } catch(e) {
        console.error("Error connecting to Telegram:", e);
    }
}
run();
