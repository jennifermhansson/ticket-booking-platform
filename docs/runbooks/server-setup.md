# Server setup

How the VPS was set up, so it can be checked or rebuilt. The server's IP address and credentials are not in this repo: ask Philip.

## Server

- Provider: Contabo VPS, bought for this project (replaces the plan to use Jennifer's 4 GB server; see [ADR 0004](../adr/0004-separate-contabo-vps.md)).
- Ubuntu 24.04 LTS, 4 vCPU (AMD EPYC), 8 GB RAM, 96 GB disk.
- No swap, decided in #2: Kubernetes expects nodes without swap by default, and about 7 GB is free before k3s. Revisit if memory runs short under load testing.
- SSH host key (ED25519): `SHA256:iXg82TKzj5txBOyJrohMOIsspi/Xvr/AitWOcJmVVqU`. Check that your first `ssh` connection shows this fingerprint before you answer `yes`.

## SSH access

- Login is as `root` with an SSH key only. Password login over SSH is turned off.
- To get access, send Philip your public key (the `.pub` file, never the private key). He adds it to `/root/.ssh/authorized_keys`.
- If every key is lost, the provider's VNC console in the Contabo customer panel still works with the root password.

The hardening lives in `/etc/ssh/sshd_config.d/00-hardening.conf`:

```
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
```

The file name starts with `00-` on purpose: the image ships `50-cloud-init.conf` with `PasswordAuthentication yes`, and sshd keeps the first value it reads for each setting. Check the effective config with `sshd -T | grep -iE 'passwordauth|permitroot'`.

## Firewall

ufw has been active since 2026-10-22 and starts on boot. The rules:

- Deny all incoming, allow all outgoing. `deny` drops packets silently rather than rejecting them (`reject`). We keep it: every legitimate client uses an open port, and a scanner learns less from silence than from a reset. The cost is that our own port scans are slow (see below).
- `ufw limit 22/tcp` (SSH with rate limiting), allow `80/tcp` (Let's Encrypt HTTP challenge, redirect to HTTPS) and `443/tcp`.
- Allow from `10.42.0.0/16` (pods) and `10.43.0.0/16` (services), as the k3s docs require when ufw is on.
- Keep `6443` (Kubernetes API) closed. Run `kubectl` over SSH or an SSH tunnel, and deploy from CI the same way.
- Kubernetes NodePort and hostPort rules bypass ufw, so expose everything through Traefik on 80/443 and don't use NodePort services. A `LoadBalancer` service gets NodePorts too unless told otherwise, which is why Traefik's are turned off (see [Traefik without NodePorts](#traefik-without-nodeports)).

Check them with `ufw status verbose`.

The SSH rate limit rejects an address that opens 6 new connections to port 22 within 30 seconds, and every rejected attempt restarts the window. A burst of separate `ssh` commands from a script trips it, so wait a minute without retrying and it clears. The CI deploy should stay well under 6 connections per run.

### Checking open ports from outside

ufw is only part of the picture: kube-proxy and hostPorts add iptables rules of their own that act before ufw. Scan from your own machine (the SYN scan needs `sudo` and takes about 2 minutes; without `sudo` nmap falls back to a connect scan that takes about 25):

```
sudo nmap -Pn -sS -p- -T4 --min-rate 1000 --max-retries 1 --stats-every 30s api.<domain>
```

The scan on 2026-10-22, after the Traefik NodePorts were removed, showed only `22`, `80` and `443` open and the other 65,532 ports `filtered` (dropped by ufw, none `closed`). Any other open port, or any `closed` one, needs explaining.

On the server, `ss -tln` also lists `6443` (Kubernetes API) and `10250` (kubelet) on all interfaces: k3s binds them there, and ufw is what keeps them private. Both require authentication, but they are reachable while ufw is off, for example during the 5 minutes of a rollback timer. Ports 80 and 443 do not show up in `ss` at all, because ServiceLB's hostPorts are iptables rules rather than a listening process.

### Changing rules that could lock us out

Opening a new port can't lock anyone out, so it needs no precautions. A change to the SSH rule, the default policies or a rule deletion can, so use a rollback timer: a one-off systemd timer that turns the firewall off after 5 minutes unless it is cancelled.

1. Open a second SSH session and leave it alone as a fallback.
2. Start the timer: `systemd-run --unit=ufw-rollback --on-active=5min /usr/sbin/ufw disable`.
3. Make the change.
4. Test from a new terminal: `ssh root@<server-ip> 'echo ok'`. The open sessions usually survive a bad rule, so only a new connection proves anything.
5. If it works, cancel the timer: `systemctl stop ufw-rollback.timer`. If it fails, wait 5 minutes, log in again, fix the rule (`ufw status numbered`) and start again from step 2. `ufw disable` keeps the rules, and the firewall stays off until `ufw --force enable` turns it back on.
6. Check that `systemctl list-timers ufw-rollback.timer` shows no timer and `ufw status` says `active`. A forgotten timer turns the firewall off without anyone noticing.

Don't reboot while the timer runs: the timer doesn't survive a reboot, but the enabled firewall does. If all else fails, the Contabo VNC console still works.

## DNS

The project uses the subdomain `tickets.philipzachariasson.dev` (DNS at name.com), so `api.tickets.philipzachariasson.dev`, `cdn.tickets.…` and `grafana.tickets.…`. Two A records point at the VPS: `tickets` and the wildcard `*.tickets`, so a new host needs no DNS change (TTL 300, set 2026-10-22). The wildcard covers one level only: `api.tickets.…` matches, `a.b.tickets.…` does not. Check a record against name.com's own nameserver, which skips every cache: `dig +short @ns1bqx.name.com api.tickets.philipzachariasson.dev A`. Only A records (IPv4) for now: k3s runs IPv4-only by default, so AAAA records would send some visitors to an address nothing answers on. `.dev` is HTTPS-only in browsers, which cert-manager covers.

## k3s

k3s `v1.37.1+k3s1` was installed on 2026-10-22 (#4), pinned so that a rebuild gets the same version:

```
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=v1.37.1+k3s1 sh -
```

- It runs as the systemd service `k3s` and starts on boot. `kubectl` on the server, as root, uses the admin kubeconfig `/etc/rancher/k3s/k3s.yaml`.
- The bundled add-ons are kept: Traefik (ingress on 80/443), ServiceLB (the `svclb-traefik` pod that binds the host's ports 80 and 443), CoreDNS, local-path-provisioner (volumes) and metrics-server (needed by the autoscaler).
- To upgrade, rerun the install command with the new version and update this section. `/usr/local/bin/k3s-uninstall.sh` removes k3s completely, including every workload and volume.
- Manifests in `k8s/cluster/` are applied by hand: `ssh root@<server-ip> 'kubectl apply -f -' < k8s/cluster/<file>.yaml`.

### Checking pod networking with ufw on

ufw also filters traffic between pods, so after any firewall change check that pods still reach each other and DNS. Run a web pod and a client pod, then clean up:

```
kubectl run nettest-web --image=nginx:1.27-alpine --restart=Never
kubectl run nettest-client --image=busybox:1.36 --restart=Never --rm -it -- sh
#   nslookup kubernetes.default.svc.cluster.local   internal DNS
#   nslookup github.com                             external DNS
#   wget -qO- http://<nettest-web pod IP>           pod to pod
kubectl delete pod nettest-web
```

A blocked check hangs until it times out. All four passed on 2026-10-22.

### Traefik without NodePorts

Kubernetes gives every `LoadBalancer` service a NodePort per port, because cloud load balancers send their traffic to the nodes on those ports. kube-proxy opens them with its own iptables rules, before ufw sees the traffic, so Traefik was reachable from the internet on two random ports above 30000 even though ufw does not allow them.

We don't need them: ServiceLB forwards ports 80 and 443 to Traefik's ClusterIP, not to the NodePorts (see `DEST_IPS` in the `svclb-traefik` pod's environment). [`k8s/cluster/traefik-config.yaml`](../../k8s/cluster/traefik-config.yaml) sets `allocateLoadBalancerNodePorts: false` on Traefik's service. It is a `HelmChartConfig`, which k3s merges into the values of its own Traefik chart, so the setting survives k3s upgrades.

- **Existing NodePorts are not removed by the flag.** After applying it the first time, remove them by hand: `kubectl -n kube-system patch svc traefik --type=json -p '[{"op":"remove","path":"/spec/ports/0/nodePort"},{"op":"remove","path":"/spec/ports/1/nodePort"}]'`. Do the same after a rebuild: the installer starts Traefik before this file can be applied.
- **Check from outside, not with `ufw status`.** See [Checking open ports from outside](#checking-open-ports-from-outside).
- **Before setting `externalTrafficPolicy: Local`** on Traefik's service (to log visitors' real IPs), check how ServiceLB forwards in that mode: it may need the NodePorts back.

## cert-manager

cert-manager `v1.21.2` issues the Let's Encrypt certificates. [`k8s/cluster/cert-manager.yaml`](../../k8s/cluster/cert-manager.yaml) is a `HelmChart` that k3s's Helm controller installs into the `cert-manager` namespace, with its CRDs, so there is no Helm on the server. To upgrade, change `version` in that file and apply it.

[`k8s/cluster/cluster-issuer.yaml`](../../k8s/cluster/cluster-issuer.yaml) holds two `ClusterIssuer`s that solve the HTTP-01 challenge through Traefik on port 80:

- `letsencrypt-staging`: untrusted certificates but generous rate limits. Point a new Ingress at it first, with the annotation `cert-manager.io/cluster-issuer: letsencrypt-staging`.
- `letsencrypt-prod`: trusted certificates, with strict rate limits (5 failed validations per host per hour). Switch the annotation to it once staging issues a certificate.

The ACME accounts have no email address: Let's Encrypt no longer sends expiry emails, and cert-manager renews 30 days before expiry. Check with `kubectl get clusterissuer` (both `Ready`) and, per Ingress, `kubectl -n tickets get certificate`.

## The tickets namespace and the backend

[`k8s/cluster/namespace.yaml`](../../k8s/cluster/namespace.yaml) creates the `tickets` namespace, applied by hand like the rest of `k8s/cluster/`. [`k8s/backend.yaml`](../../k8s/backend.yaml) holds the backend's Deployment, Service and Ingress. It names no namespace and keeps the literal `IMAGE_TAG` in its image line, because CI fills in both, as [ADR 0006](../adr/0006-deploy-from-ci-over-ssh.md) describes. To apply it by hand, do what CI does:

```
sed 's/IMAGE_TAG/<tag>/' k8s/backend.yaml | ssh root@<server-ip> 'kubectl apply -n tickets -f -'
```

- The Ingress serves `api.<domain>` with a `letsencrypt-prod` certificate in the secret `backend-tls`. It was first issued from staging, then switched to prod, on 2026-10-22.
- Readiness and liveness probes call `/health` on port 3000, so a pod gets traffic only once the app answers and is restarted if it stops answering.
- Plain HTTP is not redirected to HTTPS yet. Browsers use HTTPS anyway, since `.dev` is on the HSTS preload list, but `curl` and k6 do not.

### Until CI deploys the first image

CI has pushed the backend image to GHCR on every merge to `main` since 2026-10-23, and the package is public. Until the deploy step (#6) applies the manifests, though, the Deployment runs a copy of the backend built from `main` on a laptop and loaded straight into k3s:

```
docker buildx build --platform linux/amd64 -t ghcr.io/jennifermhansson/ticket-booking-platform-backend:placeholder-<short sha> --load backend
docker save ghcr.io/jennifermhansson/ticket-booking-platform-backend:placeholder-<short sha> | ssh root@<server-ip> 'k3s ctr images import -'
```

Then apply `k8s/backend.yaml` with `placeholder-<short sha>` as the tag. The image is the real backend, so the manifest and probes are the same ones CI uses. The `placeholder-` prefix can never match a commit SHA, so the first CI deploy pulls the real image from GHCR and needs no cleanup. The image left in k3s's store can be removed with `k3s crictl rmi` afterwards.

## The deploy user

CI deploys over SSH as the Linux user `deploy`, which runs `kubectl` with a ServiceAccount that can change only the `tickets` namespace ([ADR 0006](../adr/0006-deploy-from-ci-over-ssh.md)). Set up on 2026-10-22.

**Kubernetes side.** [`k8s/cluster/deploy-rbac.yaml`](../../k8s/cluster/deploy-rbac.yaml) holds the `deploy` ServiceAccount, a Role, its RoleBinding and the Secret `deploy-token`:

- The Role allows get, list, watch, create, update and patch on Deployments, Services and Ingresses, and read-only access to ReplicaSets, Pods, pod logs and Events, which `kubectl rollout status` and debugging need. It allows no delete, no Secrets and nothing outside `tickets`. When a manifest in `k8s/` gets a new kind (a StatefulSet for Postgres, a HorizontalPodAutoscaler), add it to the Role first, or CI's apply is refused.
- `deploy-token` is a `kubernetes.io/service-account-token` Secret, so the token does not expire. Since Kubernetes 1.24 a ServiceAccount gets no lasting token by itself, and `kubectl create token` expires within hours.
- Check what it may do: `kubectl auth can-i --list -n tickets --as=system:serviceaccount:tickets:deploy`.

**Linux side.** `deploy` was created with `adduser --disabled-password` (key login only, no sudo, not in any admin group). Its kubeconfig is `/home/deploy/.kube/config` (mode 600), built from `deploy-token`: server `https://127.0.0.1:6443`, the cluster CA embedded, default namespace `tickets`. If the token Secret is ever recreated, rebuild it:

```
KC=/home/deploy/.kube/config; CA=$(mktemp)
kubectl -n tickets get secret deploy-token -o jsonpath='{.data.ca\.crt}' | base64 -d > $CA
kubectl config --kubeconfig=$KC set-cluster k3s --server=https://127.0.0.1:6443 --certificate-authority=$CA --embed-certs=true
kubectl config --kubeconfig=$KC set-credentials deploy --token="$(kubectl -n tickets get secret deploy-token -o jsonpath='{.data.token}' | base64 -d)"
kubectl config --kubeconfig=$KC set-context deploy --cluster=k3s --user=deploy --namespace=tickets
kubectl config --kubeconfig=$KC use-context deploy
rm $CA; chown deploy:deploy $KC; chmod 600 $KC
```

**`KUBECONFIG` comes from sshd.** k3s's bundled `kubectl` falls back to the root-only `/etc/rancher/k3s/k3s.yaml` even when `~/.kube/config` exists, and CI's non-interactive SSH commands never read `.bashrc` or `.profile`. So `/etc/ssh/sshd_config.d/99-deploy.conf` sets the variable for this user only:

```
Match User deploy
    SetEnv KUBECONFIG=/home/deploy/.kube/config
```

Check it with `sshd -T -C user=deploy,host=x,addr=203.0.113.1 | grep setenv`; the same command with `user=root` must show no `setenv` and the same password settings. After editing, run `sshd -t`, then `systemctl reload ssh`, and test a fresh login before closing your session.

**SSH key.** CI's public key goes in `/home/deploy/.ssh/authorized_keys` with the `restrict` option in front (`restrict ssh-ed25519 AAAA… github-actions-deploy`). It blocks port forwarding, agent forwarding and an interactive terminal, so the key can only run commands as `deploy`.

**CI key and Actions secrets, set up on 2026-10-23.** The key pair was generated on a laptop in a temporary folder, the public key added as above, and the private key deleted locally once stored, so it exists only as the secret `DEPLOY_SSH_KEY`. `DEPLOY_KNOWN_HOSTS` comes from `ssh-keyscan -t ed25519 <server IP>`, checked against the fingerprint at the top of this file, and `DEPLOY_HOST` is the server IP. Before saving them, the same three values logged in as `deploy` with `ssh -F /dev/null` and ran `kubectl -n tickets get deploy`. To rotate the key, repeat these steps with a new key pair and delete the old `github-actions-deploy` line from `authorized_keys`.

**Verified on 2026-10-22** with a temporary key, removed afterwards: with the host key pinned from `ssh-keyscan` (it matches the fingerprint at the top of this file) and no `~/.ssh/config`, the three ADR 0006 steps (`kubectl apply --dry-run=server`, `kubectl apply`, `kubectl rollout status`) all succeed as `deploy`, and `kubectl -n kube-system get pods` is refused.
