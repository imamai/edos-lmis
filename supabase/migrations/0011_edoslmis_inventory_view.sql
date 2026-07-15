-- EDOS LMIS Phase 1 (extension) — current balance view
-- security_invoker is required so this view enforces the *querying user's*
-- RLS on edoslmis_stock_transactions, not the view owner's (which would
-- otherwise bypass RLS entirely if owned by a superuser role).

create or replace view edoslmis_inventory_balances
with (security_invoker = true) as
select distinct on (item_id)
  item_id,
  balance_after as current_balance,
  performed_at as last_transaction_at
from edoslmis_stock_transactions
order by item_id, performed_at desc, created_at desc, id desc;
