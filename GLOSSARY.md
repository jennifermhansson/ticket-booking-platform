# Glossary

**Ticket**: one seat at the event, identified by a ticket number. There are exactly 5,000. A ticket is always in one of three states: available, reserved or sold.

**Ticket number**: the ticket's unique identifier from the supplied CSV file, `AMX-00001` to `AMX-05000`.

**Reservation**: a time-limited hold on one ticket for one customer. While it is active, no one else can reserve or buy that ticket. When it expires without a purchase, the ticket is available again.

**Purchase**: the simulated payment that turns a reserved ticket into a sold one. A ticket has at most one purchase, ever.

**Idempotency key**: a client-chosen key sent with a purchase. Repeating a purchase with the same key returns the original result instead of creating a second purchase.

**Booking attempt**: one customer's try at getting a ticket: a reservation and, if it succeeds, a purchase. Load test volumes are counted in booking attempts.

**Normal run**: a load test of 50,000 booking attempts spread over 15 minutes.

**Spike run**: a load test of 50,000 booking attempts over 6 minutes, with varying traffic and clear peaks.
