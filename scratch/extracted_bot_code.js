Created At: 2026-06-20T17:10:34Z
Completed At: 2026-06-20T17:10:35Z
File Path: `file:///c:/Users/admin_11/Documents/Gestion_Team/scratch/desktop_client.js`
Total Lines: 73
Total Bytes: 3231
Showing lines 1 to 73
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: // =========================================================================
2: // CONFIGURATION SETUP
3: // =========================================================================
4: var bot_token       = "8882488896:AAF8SJvDYFZ4JFD927_UxifG5IqrkFTKDF4"; 
5: var chat_id         = "-1003229248256";
6: var datasources_dir = "C:\\Users\\m.zaryouh\\Documents\\iMacros\\Datasources\\";
7: var history_file    = datasources_dir + "history_bot.txt";
8: 
9: // Firebase Queue URL
10: var firebase_db_url = "https://gestion-team-c-01-default-rtdb.firebaseio.com/state/autoWarmupQueue.json";
11: 
12: var last_processed_id = ""; 
13: 
14: // =========================================================================
15: // 0. CLEANUP: CLOSE ALL EXTRA TABS AT STARTUP
16: // =========================================================================
17: iimDisplay("Cleaning up workspace tabs...");
18: iimPlayCode("TAB T=1\nTAB CLOSEALLOTHERS");
19: 
20: // =========================================================================
21: // HELPER: HTTP GET REQUEST
22: // =========================================================================
23: function httpGet(url) {
24:     try {
25:         var xhr = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
26:             .createInstance(Components.interfaces.nsIXMLHttpRequest);
27:         xhr.open("GET", url, false);
28:         xhr.send(null);
29:         r
30: <truncated 12503 bytes>
31: t(foStream, "UTF-8", 0, 0);
32:         coStream.writeString(updatedContentBlock);
33:         coStream.close();
34:         foStream.close();
35: 
36:         iimPlayCode("TAB CLOSEALLOTHERS");
37: 
38:         var success_msg = "";
39:         if (isInsert) {
40:             success_msg = "Success! Inserted domain [" + new_domain + "] into rotation inside " + txt_filename + ".txt (" + matchesFound + " rows added)";
41:         } else if (isDelete) {
42:             success_msg = "Success! Deleted lines matching [" + target_filter + "] inside " + txt_filename + ".txt (" + matchesFound + " rows deleted)";
43:         } else {
44:             if (isBetween) {
45:                 success_msg = "Success! Updated column [random] with random values between [" + minRange + "] and [" + maxRange + "] inside " + txt_filename + ".txt";
46:             } else {
47:                 success_msg = "Success! Updated column [" + columnName + "] to [" + new_value + "] inside " + txt_filename + ".txt";
48:             }
49:         }
50:         
51:         iimDisplay("Checking history for: " + success_msg);
52:         var isNewMessage = checkAndLogHistory(success_msg);
53:         if (isNewMessage) {
54:             iimDisplay("Sending message to Telegram...");
55:             var telegram_send_url = "https://api.telegram.org/bot" + bot_token + "/sendMessage?chat_id=" + chat_id + "&text=" + encodeURIComponent(success_msg);
56:             iimPlayCode("URL GOTO=" + telegram_send_url);
57:         }
58: 
59:         // Delete processed command from Firebase
60:         var delete_url = "https://gestion-team-c-01-default-rtdb.firebaseio.com/state/autoWarmupQueue/" + oldestKey + ".json";
61:         httpDelete(delete_url);
62: 
63:         iimDisplay("Job Done Successfully!");
64: 
65:     } catch (err) {
66:         iimDisplay("Writing error: " + err.message);
67:         iimPlayCode("TAB CLOSE\nTAB T=1");
68:     }
69: 
70:     iimPlayCode("WAIT SECONDS=6");
71: }
72: 
73: 
The above content shows the entire, complete file contents of the requested file.
