ARG BUN_VERSION=1.3.6
# Keep in step with the dbmate devDependency in package.json.
ARG DBMATE_VERSION=2.37.0

FROM ghcr.io/amacneil/dbmate:${DBMATE_VERSION} AS dbmate

FROM oven/bun:${BUN_VERSION}-slim

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# The migration Job runs this image (ADR 0007). `--production` skips the npm
# dbmate package, so the binary comes from dbmate's own image instead.
COPY --from=dbmate /usr/local/bin/dbmate /usr/local/bin/dbmate
COPY db ./db
COPY src ./src

USER bun
EXPOSE 3000

CMD ["bun", "src/server.ts"]
