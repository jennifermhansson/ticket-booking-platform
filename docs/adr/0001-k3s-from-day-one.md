# k3s from day one

The G criteria only need a deployed backend, which Docker Compose would cover, but the VG criteria need at least two instances behind a load balancer, zero-downtime deploys and autoscaling. We run single-node k3s on the VPS from the first deploy, so that the infrastructure is built once instead of built on Compose for G and rebuilt on Kubernetes for VG. One node is enough: "instances" are pods, and the Horizontal Pod Autoscaler scales pods, not nodes.
