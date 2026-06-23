// =========================================================================
// CONFIGURATION SETUP
// =========================================================================
var bot_token       = "8882488896:AAF8SJvDYFZ4JFD927_UxifG5IqrkFTKDF4"; 
var chat_id         = "-1003229248256";
var datasources_dir = "C:\\Users\\m.zaryouh\\Documents\\iMacros\\Datasources\\";
var history_file    = datasources_dir + "history_bot.txt";

// Firebase Queue URL
var firebase_db_url = "https://gestion-team-c-01-default-rtdb.firebaseio.com/state/autoWarmupQueue.json";

var last_processed_id = ""; 

// =========================================================================
// 0. CLEANUP: CLOSE ALL EXTRA TABS AT STARTUP
// =========================================================================
iimDisplay("Cleaning up workspace tabs...");
iimPlayCode("TAB T=1\nTAB CLOSEALLOTHERS");

// =========================================================================
// HELPER: HTTP GET REQUEST
// =========================================================================
function httpGet(url) {
    try {
        var xhr = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
            .createInstance(Components.interfaces.nsIXMLHttpRequest);
        xhr.open("GET", url, false);
        xhr.send(null);
        r
<truncated 12503 bytes>
t(foStream, "UTF-8", 0, 0);
        coStream.writeString(updatedContentBlock);
        coStream.close();
        foStream.close();

        iimPlayCode("TAB CLOSEALLOTHERS");

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
        }

        // Delete processed command from Firebase
        var delete_url = "https://gestion-team-c-01-default-rtdb.firebaseio.com/state/autoWarmupQueue/" + oldestKey + ".json";
        httpDelete(delete_url);

        iimDisplay("Job Done Successfully!");

    } catch (err) {
        iimDisplay("Writing error: " + err.message);
        iimPlayCode("TAB CLOSE\nTAB T=1");
    }

    iimPlayCode("WAIT SECONDS=6");
}

