-- After a load test run: every sold ticket has exactly one purchase, and no
-- more than 5,000 tickets are sold.
SELECT
  (SELECT count(*) FROM tickets) AS tickets,
  (SELECT count(*) FROM tickets WHERE status = 'sold') AS sold,
  (SELECT count(*) FROM purchases) AS purchases,
  (SELECT count(*) FROM (
    SELECT ticket_id FROM purchases GROUP BY ticket_id HAVING count(*) > 1
  ) AS duplicates) AS duplicate_purchases,
  (SELECT count(*) FROM tickets t
    WHERE (t.status = 'sold') <> EXISTS (SELECT 1 FROM purchases p WHERE p.ticket_id = t.id)
  ) AS sold_without_purchase_or_reverse;
