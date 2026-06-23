$content = Get-Content 'c:/Users/admin_11/Documents/Gestion_Team/api/sync-telegram-warmup.js' -Raw

$upgradeTarget = 'const reportText = formatWarmupReport(g.server, g.ip, cleanDomain, "Upgrade", latestVal, nextTarget, userName, "Last 3 drops succeeded (OUT >= 95% of IN)."); maxSendAt = maxSendAt \+ 10000; queueState\["q_" \+ safeKey \+ "_report"\] = \{ chat_id: "-1003735130681", message_thread_id: 91, text: reportText, parse_mode: "HTML", sendAt: maxSendAt \};'

$upgradeReplace = 'const reportText = formatWarmupReport(g.server, g.ip, cleanDomain, "Upgrade", latestVal, nextTarget, userName, "Last 3 drops succeeded (OUT >= 95% of IN).");
                    
                    // Mark as notified immediately to prevent duplicates
                    autoNotifiedState[safeKey] = true;
                    putFirebaseData("state/autoWarmupNotified", autoNotifiedState); // async fire-and-forget

                    // Send the report instantly
                    fetch(`https://api.telegram.org/bot${UPGRADE_BOT_TOKEN}/sendMessage`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ chat_id: "-5317343683", text: reportText, parse_mode: "HTML" })
                    });
                    
                    // Send send_size
                    fetch(`https://api.telegram.org/bot${UPGRADE_BOT_TOKEN}/sendMessage`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ chat_id: "-5317343683", text: msg1 })
                    });

                    // Wait 9 seconds before sending test_after
                    await new Promise(r => setTimeout(r, 9000));
                    fetch(`https://api.telegram.org/bot${UPGRADE_BOT_TOKEN}/sendMessage`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ chat_id: "-5317343683", text: msg2 })
                    });
                    
                    newNotified = true;
                    // Delete old queue logic variables
                    delete queueState["q_" + safeKey + "_send_size"];
                    delete queueState["q_" + safeKey + "_test_after"];'

$content = [System.Text.RegularExpressions.Regex]::Replace($content, $upgradeTarget, $upgradeReplace)

$downgradeTarget = 'const reportText = formatWarmupReport(g.server, g.ip, cleanDomain, "Downgrade", latestVal, prevTarget, userName, "Last 2 drops failed \(OUT < 95% of IN or IN <= 0\)."); maxSendAt = maxSendAt \+ 10000; queueState\["q_" \+ safeKey \+ "_report"\] = \{ chat_id: "-1003735130681", message_thread_id: 91, text: reportText, parse_mode: "HTML", sendAt: maxSendAt \};'

$downgradeReplace = 'const reportText = formatWarmupReport(g.server, g.ip, cleanDomain, "Downgrade", latestVal, prevTarget, userName, "Last 2 drops failed (OUT < 95% of IN or IN <= 0).");
                             
                             autoNotifiedState[safeKey] = Date.now();
                             putFirebaseData("state/autoWarmupNotified", autoNotifiedState); // async fire-and-forget

                             fetch(`https://api.telegram.org/bot${UPGRADE_BOT_TOKEN}/sendMessage`, {
                                 method: "POST", headers: { "Content-Type": "application/json" },
                                 body: JSON.stringify({ chat_id: "-5317343683", text: reportText, parse_mode: "HTML" })
                             });

                             fetch(`https://api.telegram.org/bot${UPGRADE_BOT_TOKEN}/sendMessage`, {
                                 method: "POST", headers: { "Content-Type": "application/json" },
                                 body: JSON.stringify({ chat_id: "-5317343683", text: msg1 })
                             });

                             await new Promise(r => setTimeout(r, 9000));
                             fetch(`https://api.telegram.org/bot${UPGRADE_BOT_TOKEN}/sendMessage`, {
                                 method: "POST", headers: { "Content-Type": "application/json" },
                                 body: JSON.stringify({ chat_id: "-5317343683", text: msg2 })
                             });
                             
                             newNotified = true;
                             delete queueState["q_" + safeKey + "_send_size"];
                             delete queueState["q_" + safeKey + "_test_after"];'

$content = [System.Text.RegularExpressions.Regex]::Replace($content, $downgradeTarget, $downgradeReplace)

Set-Content 'c:/Users/admin_11/Documents/Gestion_Team/api/sync-telegram-warmup.js' $content
