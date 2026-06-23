
the bot write but i have this js and after that doesnt works well but when i manual write something to the grp it works fine

// =========================================================================
// CONFIGURATION SETUP
// =========================================================================
// IMPORTANT: Each team member MUST create their own Bot token and set it here!
// All bots must be added to the same Telegram Group Chat.
var bot_token       = "YOUR_UNIQUE_BOT_TOKEN_HERE"; 
var chat_id         = "-1003229248256";
var datasources_dir = "C:\\Users\\m.zaryouh\\Documents\\iMacros\\Datasources\\";
var history_file    = datasources_dir + "history_bot.txt";

var last_processed_id = ""; 

// =========================================================================
// 0. CLEANUP: CLOSE ALL EXTRA TABS AT STARTUP
// =========================================================================
iimDisplay("Cleaning up workspace tabs...");
iimPlayCode("TAB T=1\nTAB CLOSEALLOTHERS");

// =========================================================================
// HELPER: MANAGE HISTORY FILE (MEMORY)
// =========================================================================
function checkAndLogHistory(msg) {
    try {
        var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(history_file);
        
        var content = "";
        if (file.exists()) {
            var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
            istream.init(file, 0x01, 0444, 0);
            var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Components.interfaces.nsIConverterInputStream);
            cstream.init(istream, "UTF-8", 0, 0);
            var str = {};
            cstream.readString(0xffffffff, str);
            content = str.value;
            cstream.close();
            istream.close();
        }
<truncated 13740 bytes>
ALLOTHERS");

            // Report success back to Telegram
            var success_msg = "";
            if (isInsert) {
                success_msg = "Success! Inserted domain [" + new_domain + "] into rotation inside " + txt_filename + ".txt (" + matchesFound + " rows added)";
            } else if (isDelete) {
                success_msg = "Success! Deleted lines matching [" + target_filter + "] inside " + txt_filename + ".txt (" + matchesFound + " rows deleted)";
            } else {
                if (isBetween) {
                    success_msg = "Success! Updated column [random] with random values between [" + minRange + "] and [" + maxRange + "] inside " + txt_filename + ".txt";
                } else {
                    success_msg = "Success! Updated column [" + columnName + "] to [" + new_value + "] inside " + txt_filename + ".txt";
                }
            }
            
            iimDisplay("Checking history for: " + success_msg);
            var isNewMessage = checkAndLogHistory(success_msg);
            if (isNewMessage) {
                iimDisplay("Sending message to Telegram...");
                var telegram_send_url = "https://api.telegram.org/bot" + bot_token + "/sendMessage?chat_id=" + chat_id + "&text=" + encodeURIComponent(success_msg);
                iimPlayCode("URL GOTO=" + telegram_send_url);
            } else {
                iimDisplay("Message already in history. Skipping Telegram send.");
            }

            clearTelegramMessageSilently(current_update_id);
            last_processed_id = current_update_id;
            iimDisplay("Job Done Successfully!");

        } catch (err) {
            iimDisplay("Writing error: " + err.message);
            iimPlayCode("TAB CLOSE\nTAB T=1");
        }
    }

    iimPlayCode("WAIT SECONDS=6");
}

