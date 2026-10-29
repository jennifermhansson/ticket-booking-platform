-- migrate:up
ALTER TABLE tickets ADD COLUMN reservation_token uuid;

-- migrate:down
ALTER TABLE tickets DROP COLUMN reservation_token;
