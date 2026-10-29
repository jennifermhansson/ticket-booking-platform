# tickets.status keeps sold, written in the same statement as the purchase

A purchase marks the ticket `sold` and inserts its `purchases` row in one SQL statement (`WITH sold AS (UPDATE tickets …) INSERT INTO purchases …`). Postgres runs a statement atomically, so either both writes happen or neither does, and `tickets.status` and `purchases` cannot disagree as long as this statement is the only code that writes them. The UNIQUE constraint on `purchases.ticket_id` is still what makes a second sale impossible ([ADR 0002](0002-row-per-ticket-with-skip-locked.md)); `sold` is the fast way to read that a ticket is taken, not the guarantee.

## Considered options

- **Keep `sold`, written with the purchase (chosen).** The same fact lives in two places, but one statement writes both. Listing by status (#10) and picking a free ticket (#11) stay single-table queries on the hot path under load, and the glossary's three states map straight onto the column.
- **Drop `sold`, so a ticket counts as sold when a `purchases` row exists.** One source of truth that can never disagree with itself. But the CHECK constraint changes in a new migration, since an applied migration is never edited ([ADR 0007](0007-migrations-with-dbmate-as-a-job.md)), and the list and reserve queries, both already merged, each gain a join or `NOT EXISTS` on `purchases`. The reserve query runs once per booking attempt, so that check is paid on every request in a load test.

## Why not the single source of truth now

The two places only drift apart when some code writes one table without the other, for example a refund or an admin tool. No such code exists, and no G or VG criterion asks for it. We do not build a solution for a problem that has not arisen yet: the drop-`sold` design costs a migration and changes to merged code now, to protect against writes we have not planned.

If we later see that `purchases` needs to be the only source of truth, we switch then: a migration that removes `sold` from the CHECK (and turns existing `sold` rows back to `available`), and a `NOT EXISTS (purchases)` check in the list and reserve queries.

## Consequences

- Any new code that writes `tickets.status = 'sold'` or inserts into `purchases` must do both in the same statement or transaction, or this decision is revisited.
- The concurrency test (#15) checks that the number of `sold` tickets equals the number of `purchases` rows, so a drift would fail a test instead of going unnoticed.
- **In the defence:** asked "isn't `sold` redundant with `purchases`?", the answer is yes, deliberately: one statement writes both, the UNIQUE constraint stays the guarantee, and the test proves they agree.
