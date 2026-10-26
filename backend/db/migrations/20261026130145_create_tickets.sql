-- migrate:up
CREATE TABLE tickets (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_number text NOT NULL UNIQUE CHECK (ticket_number ~ '^AMX-[0-9]{5}$'),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
  reserved_until timestamptz,
  CHECK (status <> 'reserved' OR reserved_until IS NOT NULL)
);

-- migrate:down
DROP TABLE tickets;
