-- Fails on purpose to test that a failed migration stops the deploy before the backend rollout (#8). Removed again in the next PR.
-- migrate:up
SELECT 1/0;

-- migrate:down
