FROM node:24.14-slim AS web-builder

WORKDIR /app/web

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

FROM node:24.14-slim AS server-builder

WORKDIR /app

COPY server/package*.json ./
RUN npm ci

COPY server/tsconfig.json ./
COPY server/src ./src

RUN npm run build

FROM node:24.14-slim AS shoutrrr-downloader

ARG TARGETARCH

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
  && rm -rf /var/lib/apt/lists/*

RUN set -eux \
  && case "${TARGETARCH}" in \
    amd64) shoutrrr_arch='amd64'; shoutrrr_sha='18060f39eacf6949662f011ab651957a39dc840a26695724e295b714e97a7cc7' ;; \
    arm64) shoutrrr_arch='arm64'; shoutrrr_sha='c0147767fca91faf5870c4b4271b7043054294b634cc507c2f2128a57d7a7023' ;; \
    *) echo "Unsupported TARGETARCH: ${TARGETARCH}" >&2; exit 1 ;; \
  esac \
  && curl -fsSL --retry 3 --retry-all-errors --retry-delay 1 --connect-timeout 10 --max-time 30 -o /tmp/shoutrrr.tar.gz \
    "https://github.com/containrrr/shoutrrr/releases/download/v0.8.0/shoutrrr_linux_${shoutrrr_arch}.tar.gz" \
  && printf '%s  %s\n' "${shoutrrr_sha}" /tmp/shoutrrr.tar.gz | sha256sum -c --strict - \
  && tar -C /usr/local/bin -xzf /tmp/shoutrrr.tar.gz shoutrrr \
  && chmod +x /usr/local/bin/shoutrrr \
  && rm /tmp/shoutrrr.tar.gz

FROM node:24.14-slim AS production

WORKDIR /app

# required for shoutrrr
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./

RUN npm ci --omit=dev && \
    npm cache clean --force

COPY --from=shoutrrr-downloader /usr/local/bin/shoutrrr /usr/local/bin/shoutrrr
ENV SHOUTRRR_BINARY=/usr/local/bin/shoutrrr

COPY --from=server-builder /app/dist ./dist
COPY server/migrations ./migrations

COPY --from=web-builder /app/web/dist ./public

RUN mkdir -p /data
ENV DATABASE_PATH=/data/konttivahti.db

EXPOSE 3000

CMD ["node", "dist/index.js"]
