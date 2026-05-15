async function test() {
    const token = "8737550836:AAFK68Ig7xyW3KIvBhI5gpO1bGaPTwUimr0";
    const chatId = "-5252005797";
    const message = "<b>Test Message</b> from Antigravity node script.";
    
    try {
        const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });
        const data = await resp.json();
        console.log('Telegram Response:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}
test();
