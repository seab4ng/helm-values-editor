FROM node:26-alpine AS vendor
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM nginx:1.29-alpine

LABEL maintainer="Yakir Veneci" \
      org.opencontainers.image.authors="Yakir Veneci" \
      org.opencontainers.image.url="https://github.com/seab4ng" \
      org.opencontainers.image.source="https://github.com/seab4ng/helm-values-veiwer"

RUN apk upgrade --no-cache && \
    apk del curl && \
    rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf /var/cache/apk/*

COPY nginx.conf           /etc/nginx/conf.d/default.conf
COPY app/index.html       /usr/share/nginx/html/index.html
COPY app/lib.js           /usr/share/nginx/html/lib.js
COPY docker-entrypoint.sh /docker-entrypoint.sh
COPY --from=vendor /build/node_modules/js-yaml/dist/js-yaml.min.js \
                   /usr/share/nginx/html/vendor/js-yaml.min.js

RUN chmod +x /docker-entrypoint.sh && \
    chmod -R 644 /usr/share/nginx/html && \
    find /usr/share/nginx/html -type d -exec chmod 755 {} +

EXPOSE 8080

ARG BUILD_VERSION=none
ENV APP_VERSION=$BUILD_VERSION

ENTRYPOINT ["/docker-entrypoint.sh"]
