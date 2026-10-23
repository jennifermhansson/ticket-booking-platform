ARG BUN_VERSION=1.3.6
FROM oven/bun:${BUN_VERSION}-slim

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY src ./src

USER bun
EXPOSE 3000

CMD ["bun", "src/server.ts"]
