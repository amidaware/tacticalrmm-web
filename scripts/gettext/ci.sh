#!/bin/sh
set -eu
node --version
npm --version
msgfmt --version
msgmerge --version
npm ci
npm run format:check
npm run lint -- --max-warnings=0
npm run gettext:check
npm run gettext:check-extraction
npm run gettext:test
# Prove prebuild recreates the browser catalogue without a local cache.
rm -rf src/gettext/generated
npm run build
test -s src/gettext/generated/translations.json
test -s dist/index.html
