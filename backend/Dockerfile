FROM oven/bun:1.3-slim

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY src ./src

USER bun
EXPOSE 3000

CMD ["bun", "src/server.ts"]
