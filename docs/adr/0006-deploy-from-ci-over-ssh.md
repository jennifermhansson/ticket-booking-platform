# CI deploys over SSH, as a namespace-scoped deploy user

The deploy job in GitHub Actions reaches the cluster over SSH, the same way we do. It logs in as a dedicated `deploy` user and runs `kubectl` on the server with a kubeconfig that can change only the `tickets` namespace. The Kubernetes API (port 6443) stays closed, as the firewall section of the [server runbook](../runbooks/server-setup.md#firewall) requires, and a leaked CI key cannot take over the server or the rest of the cluster.

## Considered options

- **Kubeconfig as an Actions secret.** The simplest workflow, but the runner talks to the Kubernetes API directly, so 6443 would have to be open to the whole internet: GitHub's runner IP ranges are large and change. The k3s admin kubeconfig is also cluster-admin, so a leaked secret would own the cluster.
- **Self-hosted runner on the VPS.** No inbound port at all, but GitHub advises against self-hosted runners on public repositories, because a pull request from a fork can run code on the runner. The runner would also compete with k3s for the VPS's RAM.
- **A VPN such as Tailscale or WireGuard.** Keeps 6443 private to the VPN, but adds a service to install, an auth key to manage and a step to every CI run, for no gain over the SSH port we already have open and hardened.
- **SSH as `root`.** Works with the access we have today, but puts a root key in CI.

## The deploy contract

These are the names #4 (cluster and manifests) and #6 (the workflow) both build against:

| What | Value |
|---|---|
| Images | `ghcr.io/jennifermhansson/ticket-booking-platform-backend` and `…-frontend` (#7) |
| Image tag | the full commit SHA (`${{ github.sha }}`), never `latest` |
| Namespace | `tickets` |
| Deployments and containers | `backend` and `frontend`, each with one container of the same name |
| Manifests CI applies | `k8s/*.yaml`: namespaced resources only, each file starting with `---` so they can be concatenated |
| Manifests applied by hand | `k8s/cluster/`: the namespace, the cert-manager install and its `ClusterIssuer`s, the Traefik override and the deploy user's RBAC |
| Image line in each Deployment | `ghcr.io/jennifermhansson/ticket-booking-platform-<app>:IMAGE_TAG`; the workflow replaces `IMAGE_TAG` with the SHA |
| SSH user | `deploy` |
| Actions secrets | `DEPLOY_HOST` (the server IP), `DEPLOY_SSH_KEY` (the deploy user's private key), `DEPLOY_KNOWN_HOSTS` (the server's `known_hosts` line) |

The deploy job does, in order:

1. Replace `IMAGE_TAG` in the manifests with the commit SHA.
2. Pipe them over SSH into `kubectl apply -n tickets -f -`.
3. Run `kubectl -n tickets rollout status` for each Deployment with `--timeout=120s`, so the job fails when the new pods never become ready.

[ADR 0007](0007-migrations-with-dbmate-as-a-job.md) adds two steps before these: CI applies `k8s/database/` and runs the migration Job from `k8s/jobs/`, and the backend is rolled out only once that Job has completed. Since #8 all the steps run in `k8s/deploy.sh` on the server, which also replaces `IMAGE_TAG`: CI sends `k8s/` over the same single SSH connection.

## Consequences

- **Philip, in #4:** create the `deploy` user, a `ServiceAccount` with a `Role` and `RoleBinding` limited to `tickets`, and a kubeconfig for that ServiceAccount in the deploy user's home. Generate an SSH key pair for CI, add the public key to the deploy user and the three secrets to the repo, and record the deploy user in the server runbook.
- **Jennifer, in #6:** the workflow needs `permissions: packages: write` to push to GHCR with `GITHUB_TOKEN`. The first push creates the package as private: make it public once in the package settings, so k3s can pull it without an `imagePullSecret`.
- **Host key pinning:** the job writes `DEPLOY_KNOWN_HOSTS` to `~/.ssh/known_hosts` and never uses `StrictHostKeyChecking=no`. Check the line against the fingerprint in the server runbook before saving it as a secret.
- **Cluster-scoped changes stay manual.** The deploy user cannot create namespaces, CRDs or cluster roles, so anything in `k8s/cluster/` is applied by hand over SSH. That is rare, and it is the price of a CI key that can only touch the app.
- **#43** validates both folders offline, and adds `kubectl apply --dry-run=server` over the same SSH connection right before the real apply.
