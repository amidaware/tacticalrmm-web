#!/bin/sh
set -e

envsubst < /docker/env-config.js > /usr/share/nginx/html/env-config.js

exec nginx -g "daemon off;"
