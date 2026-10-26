# The unprivileged image runs as a non-root user and listens on 8080, and
# serves /usr/share/nginx/html with its default config.
FROM nginxinc/nginx-unprivileged:1.30.6-alpine

COPY public/ /usr/share/nginx/html/

EXPOSE 8080
