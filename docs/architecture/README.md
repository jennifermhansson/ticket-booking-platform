# Architecture map

A clickable map of the whole system, in three views: request → database, merge → deploy, and operations. Every planned part is on it. Each node's status (done, in progress, planned) comes from the GitHub issues it lists, so the map shows what is in place today without anyone editing it.

## Open it

Open `index.html` in a browser (double-click it, or `open docs/architecture/index.html`). No build and no server: it loads `model.js` and `snapshot.js` with `<script src>`, then asks the GitHub API for the current issue states. Offline, or past GitHub's 60 requests an hour without a token, it falls back to `snapshot.js`, and the header says which one it used.

Click a node for what it does, how it works, its issues, files and ADRs. The URL keeps the view and node (`index.html#deploy/migrate-job`), so a link points at one part.

## Keep it in sync

- **Status** follows the issues by itself. A node is done when its issues are closed.
- **Structure** lives in `model.js`. When a PR adds or changes a component, or a new issue belongs to one, update `model.js` in the same PR. An issue that no node lists, and that is not in `unmappedOnPurpose`, shows up in the header under *Not on the map*.
- **The snapshot** is refreshed by `./docs/architecture/refresh-snapshot.sh` (needs `gh` and `jq`), as part of `/update-status`.

## Add a node

Add an object to `nodes` in `model.js` with an `id`, the `view` it belongs to, a `col` and `row` on that view's grid, a `kind` (`client`, `network`, `k8s`, `api`, `data`, `ci` or `ops`), a `milestone`, the `issues` that build it and a one-sentence `summary`. `details`, `files` and `adrs` are optional. Then connect it with an entry in `edges`. Describe what the files actually do, not what the plan said they would.
