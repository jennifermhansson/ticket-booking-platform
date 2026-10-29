-- migrate:up
CREATE TABLE purchases (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id integer NOT NULL UNIQUE REFERENCES tickets (id),
  purchased_at timestamptz NOT NULL DEFAULT now()
);

-- migrate:down
DROP TABLE purchases;
