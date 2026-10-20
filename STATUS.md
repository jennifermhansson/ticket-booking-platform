# Status

Last updated: 2026-10-20

**Phase:** 1 (G criteria), step 1: infrastructure skeleton. Target: a merge to `main` shows up live by 2026-10-23.

**Next step:** confirm the VPS specs and buy the domain, then install k3s and serve `https://api.<domain>/health`.

## In progress

| What | Who |
| --- | --- |
| Infrastructure skeleton (pair programming) | Philip + Jennifer |

## Open items

- [ ] Check Jennifer's VPS: at least 2 vCPU, nothing else running, SSH access for both, 2–4 GB swap added
- [ ] Buy the domain and point `api`, `cdn` and `grafana` at the VPS
- [ ] Add the ticket number CSV (`biljettnummer_examination.csv`, AMX-00001 to AMX-05000) to the repo
- [ ] Ask Ahmad to confirm the priority order (G → VG → extras) and that Redis, the queue and the documented load test runs may be skipped if time runs out
- [ ] Ask Ahmad what applies to AI use in the exam
- [ ] Enable branch protection on `main` (require a PR and one review)

## Blockers

None.

## Key dates

- 2026-11-04: oral defence; the system is demoed as it is that day
- 2026-11-08: code submission
