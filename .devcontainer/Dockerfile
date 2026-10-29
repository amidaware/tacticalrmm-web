FROM public.ecr.aws/docker/library/node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293

# Shared, reproducible Node/GNU gettext environment for CI and development.
RUN apk add --no-cache gettext=0.24.1-r1 \
    && test "$(node --version)" = "v20.20.2" \
    && msgfmt --version \
    && msgmerge --version
