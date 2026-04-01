FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --cache ~/.npm

RUN npm i -g @quasar/cli

COPY . .

# Create empty env-config.js for build (populated at runtime via entrypoint)
RUN touch public/env-config.js

RUN quasar build

FROM nginxinc/nginx-unprivileged:stable-alpine

USER root

RUN apk add --no-cache gettext

COPY --from=build /app/dist /usr/share/nginx/html/
COPY docker/default.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /entrypoint.sh
COPY docker/env-config.js /env-config.js.template

RUN chmod +x /entrypoint.sh && \
    chown -R nginx:nginx /usr/share/nginx/html

USER nginx

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
