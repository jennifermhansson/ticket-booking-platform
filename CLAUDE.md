# Ticket booking platform

Exam project for Chas Academy course 6 (Advanced fullstack, test & DevOps), built by Philip and Jennifer. The app sells 5,000 numbered tickets under heavy concurrent load without ever selling a ticket twice. The grade is set by the course's grading criteria (infrastructure, CI/CD, tests, backups, observability, scaling), not by the app's feature list: see [docs/plan.md](docs/plan.md) for the criteria, the phases and the priority order.

@STATUS.md

## Where things live

- [docs/plan.md](docs/plan.md): phases, timeline and checklist. Work follows its priority order: G criteria → VG criteria → extras.
- [GLOSSARY.md](GLOSSARY.md): domain terms. Use these words in code, docs and conversation.
- [docs/adr/](docs/adr/): decisions with real trade-offs. Read the relevant ADR before changing something it covers.
- `docs/runbooks/`: operational procedures (restore, incident handling), added as they are written.

Two people share this repo, each with their own Claude. Claude's memory is personal to one machine, so every project decision, status change or trade-off goes into these repo files, where both Claudes read it.

## Stack

- Runtime and package manager: Bun. Bun auto-loads `.env`, so there is no `dotenv`.
- Backend: Bun + Fastify + TypeScript (strict). Layers: `routes → controller → service → repository → db`, with no layer skipped.
- Module slice: `backend/src/modules/<name>/{route,controller,service,repository,mapper,schema,types}.ts`.
- Database: PostgreSQL via Bun's built-in client (`import { sql } from 'bun'`).
- Frontend: React + TypeScript + Vite, built to static files served from `cdn.<domain>`.
- Infrastructure: single-node k3s on a VPS (Traefik, cert-manager), images on GHCR, deploys from GitHub Actions.
- Load testing: k6.
- Layout: monorepo with `backend/`, `frontend/`, `k8s/`, `loadtests/`.
- File names are camelCase (`ticketService.ts`); inside a module slice the folder is the namespace, so files are just `service.ts`, `repository.ts` and so on.

## Git

- One branch per change; `main` only receives merged PRs, and the other person reviews each PR.
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Show git commands in modern syntax: `git switch`, `git switch -c`, `git restore`, `git restore --staged`.
- Update `STATUS.md` (and add an ADR if one is due) in the same PR as the work; `/update-status` does this at the end of a session.

## Working with Claude

This rule replaces any personal "scaffold, don't ghostwrite" default for this repo.

- Write complete, working code when asked: finish the function, the test or the manifest.
- Keep each change small and focused, roughly one PR. When a request is large, propose a split and start on the first part right away.
- End with 1–3 sentences on anything non-obvious: the why, not the what.
- Understanding the code is our responsibility; we ask when we want an explanation.
- The repo is public: secrets go in GitHub Actions secrets or Kubernetes secrets, and only example values (`.env.example`) are committed.
- Write repo docs in English, one unwrapped line per paragraph or bullet.
