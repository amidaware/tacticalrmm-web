#!/bin/sh
set -e

envsubst '${TRMM_PROTO} ${API_LOCALHOST_HOST} ${WS_PROTO}' \
  < /env-config.js.template \
  > /usr/share/nginx/html/env-config.js

exec "$@"
