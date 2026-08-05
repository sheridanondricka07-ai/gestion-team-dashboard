var raw_msg = "update s_wmn3_2200 send_size for google.com to 200";

var target_col  = raw_msg.match(/update\s+\S+\s+(\S+)/i);
var value_match = raw_msg.match(/to\s+(.+)$/i);

var columnName   = target_col ? target_col[1].trim().toLowerCase() : "send_size";
var new_value    = value_match ? value_match[1].trim() : "";

var file_match = raw_msg.match(/update\s+(\S+)/i);
var file_target = file_match ? file_match[1].trim() : "test";
var target_match = raw_msg.match(/for\s+(\S+)/i);
var target_filter = target_match ? target_match[1].trim() : "";

var scope = (target_filter && target_filter !== "") ? target_filter : "all";

console.log("raw_msg:", raw_msg);
console.log("columnName:", columnName);
console.log("new_value:", new_value);
console.log("file_target:", file_target);
console.log("target_filter:", target_filter);
console.log("scope:", scope);
