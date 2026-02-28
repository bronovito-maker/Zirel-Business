#!/bin/bash
# Remove from chat-tooltip to the end of script
sed -i.bak -e '/<!-- Chat Tooltip -->/,/<\/script>/d' demo/index.html
