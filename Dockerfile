FROM node:20-slim AS builder

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

COPY --from=builder /app/dist ./dist
COPY server/migrations ./migrations

RUN mkdir -p /data
ENV DATABASE_PATH=/data/konttivahti.db

EXPOSE 3000

CMD ["node", "dist/index.js"]
