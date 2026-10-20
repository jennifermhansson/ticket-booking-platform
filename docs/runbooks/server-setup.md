# Server setup

How the VPS was set up, so it can be checked or rebuilt. The server's IP address and credentials are not in this repo: ask Philip.

## Server

- Provider: Contabo VPS, bought for this project (replaces the plan to use Jennifer's 4 GB server; see [ADR 0004](../adr/0004-separate-contabo-vps.md)).
- Ubuntu 24.04 LTS, 4 vCPU (AMD EPYC), 8 GB RAM, 96 GB disk, no swap.
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

## Firewall (planned, not applied yet)

ufw is installed but inactive. The plan:

- Deny all incoming, allow all outgoing.
- `ufw limit 22/tcp` (SSH with rate limiting), allow `80/tcp` (Let's Encrypt HTTP challenge, redirect to HTTPS) and `443/tcp`.
- Allow from `10.42.0.0/16` (pods) and `10.43.0.0/16` (services), as the k3s docs require when ufw is on.
- Keep `6443` (Kubernetes API) closed. Run `kubectl` over SSH or an SSH tunnel, and deploy from CI the same way.
- Kubernetes NodePort and hostPort rules bypass ufw, so expose everything through Traefik on 80/443 and don't use NodePort services.

Enable it with a second SSH session open, and test a fresh login before closing it.

## DNS

The domain is `philipzachariasson.dev`, with DNS at name.com. Records are not set yet; see STATUS.md for the open choice between a project subdomain and the whole domain. Only A records (IPv4) for now: k3s runs IPv4-only by default, so AAAA records would send some visitors to an address nothing answers on. `.dev` is HTTPS-only in browsers, which cert-manager covers.
