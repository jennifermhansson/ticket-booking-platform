# The page on `<domain>`, its assets on `cdn.<domain>`

Visitors open `https://<domain>`, which serves only `index.html`; the hashed JS and CSS it names stay on `cdn.<domain>` (#56). The same nginx pod from [ADR 0008](0008-static-files-from-nginx-pod.md) answers both hosts: Traefik passes the Host header through, and `frontend/nginx.conf` has one server block per host. A second Ingress, `frontend-page`, routes the bare domain to the existing `frontend` Service with a certificate of its own, so adding the host does not reissue cdn.'s. The page gets `Cache-Control: no-cache` and the assets `max-age=31536000, immutable`: a changed asset gets a new hash in its name, so only the page has to be fetched again after a deploy. `cdn.<domain>/` redirects to the page, so there is one page URL and one origin calling the API.

## Considered options

- **Headers and routing in nginx, in the image (chosen).** The cache and CORS headers ship with the files they describe and can be checked with `docker run` and `curl -H 'Host: …'` before a deploy. The cost is a config file of our own, which ADR 0008 did without.
- **A Traefik `Middleware` for the headers.** No nginx config, but the deploy Role has no rules for `traefik.io` objects ([ADR 0006](0006-deploy-from-ci-over-ssh.md)), and `k8s/cluster/` is applied by hand, so the first deploy would need a manual RBAC change on the server.
- **A second nginx Deployment for the page.** Clean separation, but a second image or a ConfigMap for one file, and two rollouts that can disagree on which asset hashes exist.
- **cdn keeps serving the page as well.** Old links keep working, but then the backend must allow two origins, and a forgotten one breaks that copy of the page without a visible error. The 301 keeps old links working without that.

## Consequences

- `vite.config.ts` reads the asset base from `ASSET_BASE_URL`, which only the Dockerfile sets. A hard-coded cdn base would make the e2e build on localhost load the production JS from cdn and test that instead of the bundle under test.
- Vite marks the script and CSS tags `crossorigin`, so assets need `Access-Control-Allow-Origin: https://<domain>`, or the browser refuses to run the app. The backend's `CORS_ORIGINS` is the page's origin, not cdn.'s, since the app's JS runs in the page's origin.
- nginx drops server-level `add_header` in any `location` that sets its own, so every location in `nginx.conf` lists all its headers.
- The page server is nginx's `default_server`, since the probes call the pod IP, not a host name.
- CI checks the page and its `no-cache` header after each deploy, with the same TLS retries as for cdn: the first deploy waits for cert-manager to issue `frontend-page-tls`.
- **In the defence:** the split is the one production apps use, so assets can move to a real CDN later by changing one URL in the Dockerfile. `cdn.<domain>` itself is still a host on the same VPS (ADR 0008).
