# Static files from a separate nginx pod behind Traefik

`cdn.<domain>` is served by its own Deployment: an `nginxinc/nginx-unprivileged` image with the static files copied in at build time, behind its own Service and Ingress. Traefik, the ingress controller k3s ships, routes `cdn.<domain>` to it the same way it routes `api.<domain>` to the backend. Traefik only terminates TLS and picks a Service by host; it cannot serve our files, so something in the cluster has to hold them and answer HTTP, and nginx does that with no config of our own.

## Considered options

- **The backend serves the files (`@fastify/static`).** No extra image, but static traffic would share CPU with reservations during the load tests and drive the HPA's scaling of backend pods, and every frontend change would need a backend rollout.
- **The files in a ConfigMap mounted into an nginx pod.** No image of our own, but the deploy Role has no access to ConfigMaps ([ADR 0006](0006-deploy-from-ci-over-ssh.md)), and a ConfigMap holds at most 1 MiB, which a Vite build can outgrow.
- **Replacing Traefik with ingress-nginx.** An ingress controller routes traffic but does not serve our files, so the file pod would still be needed. ingress-nginx was also [retired by the Kubernetes project in March 2026](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/), and switching would redo the Traefik and firewall work in the [server runbook](../runbooks/server-setup.md).
- **A real CDN (Cloudflare, or Backblaze B2 with a CDN in front).** What the name `cdn` suggests, but it adds a service and a deploy path outside the cluster, which no criterion asks for.

## Consequences

- A changed page ships as a new image and a deploy, like the backend. Each version is tagged with its commit SHA, so a rollback is the previous image.
- The frontend's GHCR package is created private by the first push and must be made public once, as the backend's was.
- #13 replaces `frontend/public/` with a Vite build stage in the same Dockerfile. The manifest, the Ingress and the pipeline stay as they are.
- **In the defence:** we say this before we are asked. `cdn.<domain>` is a separate host for static files on the same VPS, not a geographically distributed CDN.
