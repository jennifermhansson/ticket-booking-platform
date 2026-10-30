ARG BUN_VERSION=1.3.6

# Vite builds the React app into dist/. VITE_API_URL comes from
# .env.production, so the API address is baked into the bundle.
FROM oven/bun:${BUN_VERSION}-slim AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
# Bun loads .env.$NODE_ENV into the environment before Vite starts, and Vite
# lets an existing variable win over its own .env files. Without production
# here, Bun loads .env.development and the image calls localhost:3000.
RUN NODE_ENV=production bun run build

# The unprivileged image runs as a non-root user and listens on 8080, and
# serves /usr/share/nginx/html with its default config.
FROM nginxinc/nginx-unprivileged:1.30.6-alpine

COPY --from=build /app/dist/ /usr/share/nginx/html/

EXPOSE 8080
