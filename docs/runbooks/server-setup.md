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

## Firewall

ufw has been active since 2026-10-22 and starts on boot. The rules:

- Deny all incoming, allow all outgoing.
- `ufw limit 22/tcp` (SSH with rate limiting), allow `80/tcp` (Let's Encrypt HTTP challenge, redirect to HTTPS) and `443/tcp`.
- Allow from `10.42.0.0/16` (pods) and `10.43.0.0/16` (services), as the k3s docs require when ufw is on.
- Keep `6443` (Kubernetes API) closed. Run `kubectl` over SSH or an SSH tunnel, and deploy from CI the same way.
- Kubernetes NodePort and hostPort rules bypass ufw, so expose everything through Traefik on 80/443 and don't use NodePort services.

Check them with `ufw status verbose`.

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

The project uses the subdomain `tickets.philipzachariasson.dev` (DNS at name.com), so `api.tickets.philipzachariasson.dev`, `cdn.tickets.…` and `grafana.tickets.…`. Two A records point at the VPS: `tickets` and the wildcard `*.tickets`, so a new host needs no DNS change. The records are not set yet. Only A records (IPv4) for now: k3s runs IPv4-only by default, so AAAA records would send some visitors to an address nothing answers on. `.dev` is HTTPS-only in browsers, which cert-manager covers.
