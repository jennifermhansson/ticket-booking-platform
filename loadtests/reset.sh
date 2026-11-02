#!/usr/bin/env bash
# Makes every ticket available again after a load test run (ADR 0014).
# Usage: loadtests/reset.sh <ssh-host>, for example loadtests/reset.sh root@<server-ip>
set -euo pipefail

host="${1:?usage: loadtests/reset.sh <ssh-host>}"

read -r -p "Delete every purchase and reservation in the database on $host? [y/N] " answer
[[ "$answer" == "y" ]] || { echo "Aborted."; exit 1; }

ssh "$host" 'kubectl -n tickets exec -i postgres-0 -- psql -U postgres -d tickets -v ON_ERROR_STOP=1' <<'SQL'
BEGIN;
TRUNCATE purchases;
UPDATE tickets SET status = 'available', reserved_until = NULL, reservation_token = NULL
  WHERE status <> 'available';
COMMIT;
SELECT count(*) FILTER (WHERE status = 'available') AS available, count(*) AS tickets FROM tickets;
SQL
