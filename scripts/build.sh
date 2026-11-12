#!/usr/bin/env bash
# Regenerates js/data.js from data/content.json so the page works via file://
# (fetch() of local JSON is blocked in most browsers on file://).
set -e
cd "$(dirname "$0")/.."
printf '/* Generated from data/content.json — do not edit by hand. Run scripts/build.sh after editing the JSON. */\nwindow.SITE_DATA = ' > js/data.js
cat data/content.json >> js/data.js
printf ';\n' >> js/data.js
echo "js/data.js regenerated"
