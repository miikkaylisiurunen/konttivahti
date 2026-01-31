FROM node:20-slim AS web-builder

WORKDIR /app/web

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

FROM node:20-slim AS server-builder

WORKDIR /app

COPY server/package*.json ./
RUN npm ci

COPY server/tsconfig.json ./
COPY server/src ./src

RUN npm run build

FROM node:20-slim AS production

WORKDIR /app

COPY server/package*.json ./

RUN npm ci --omit=dev && \
    npm cache clean --force

COPY --from=server-builder /app/dist ./dist
COPY server/migrations ./migrations

COPY --from=web-builder /app/web/dist ./public

RUN mkdir -p /data
ENV DATABASE_PATH=/data/konttivahti.db

EXPOSE 3000

CMD ["node", "dist/index.js"]
