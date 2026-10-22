# One node, with redundancy only at the pod level

We run k3s on a single node and do not build a high-availability cluster. The VG criteria ask for at least two backend instances behind a load balancer, zero-downtime deploys and autoscaling, and all three are met by pods on one node: the Service and Traefik spread traffic over 2+ backend pods, rolling updates replace pods one at a time, and the HPA scales pods, not nodes ([ADR 0001](0001-k3s-from-day-one.md)). Node-level HA would cost more than the criteria reward in the two weeks before the defence, so we accept that the VPS, Traefik and Postgres are each a single point of failure.

## Considered options

- **Two nodes.** Gives no real HA: k3s with embedded etcd needs three server nodes for quorum, so losing either node of two can still take the control plane down.
- **Three server nodes (a real HA control plane).** About three times the VPS cost, and it still leaves Postgres on one node: k3s's default `local-path` volumes are bound to the node they were created on, so the database pod cannot move to a surviving node without replicated storage (for example Longhorn) or a replicated Postgres (for example CloudNativePG or Patroni). That is several days of work and RAM on each node, for something no criterion asks for.
- **Managed Kubernetes.** Takes the control plane off our hands but moves the infrastructure the course wants us to build and explain into a provider's console, and costs more than the VPS.

## Consequences

- **What we protect against:** a backend pod crashing or being deleted (traffic carries on to the other replicas while k3s starts a new pod, shown in the crash test, #28), deploys (#23), and load spikes (#24).
- **What we do not protect against:** the VPS going down, a Traefik failure, or a Postgres failure. Any of these takes the whole system down until it is restarted or restored. Daily backups and the restore runbook are our answer for the database, not failover.
- **In the defence:** we say this before we are asked. A real HA setup would need three control-plane nodes for etcd quorum, plus a replicated Postgres with storage that is not tied to one node.
