-- EDOS LMIS — fix a regression of the balance bug 0024 already fixed once
--
-- 0054 (tracking_mode / manual_usage) replaced edoslmis_record_stock_transaction
-- to add the tracking-mode guard, but was based off the original 0009 body and
-- reintroduced the exact bug 0024 fixed: computing the "previous balance" as
-- max(balance_after) across ALL of an item's transactions instead of the
-- balance as of the truly latest transaction by performed_at. Any item whose
-- balance ever dipped below a prior peak (any wastage/usage/negative
-- adjustment) had every later transaction chain off that stale higher peak.
-- This re-applies 0024's fix on top of 0054's tracking-mode logic, then
-- re-runs 0024's backfill to repair any rows corrupted in the window since
-- 0054 was applied.

create or replace function edoslmis_record_stock_transaction(
  p_item_id uuid,
  p_transaction_type edoslmis_stock_transaction_type,
  p_quantity_change numeric,
  p_batch_id uuid default null,
  p_reference_order_test_id uuid default null,
  p_notes text default null
)
returns edoslmis_stock_transactions
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant_id uuid;
  v_branch_id uuid;
  v_tracking_mode edoslmis_inventory_tracking_mode;
  v_prev_balance numeric;
  v_row edoslmis_stock_transactions;
  v_authorized boolean;
begin
  select tenant_id, branch_id, tracking_mode into v_tenant_id, v_branch_id, v_tracking_mode
  from edoslmis_inventory_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Inventory item % not found', p_item_id;
  end if;

  if v_tenant_id <> edoshms_get_tenant_id() and not edoshms_is_platform_admin() then
    raise exception 'Not authorized for this tenant';
  end if;

  if p_transaction_type = 'test_usage' then
    if v_tracking_mode <> 'order_driven' then
      raise exception 'This commodity is tracked via manual daily entry — automatic test-usage deduction is disabled. Switch its tracking mode to resume automatic deduction.';
    end if;
    v_authorized := edoslmis_has_permission('edoslmis.result.enter') or edoslmis_is_admin_for(v_tenant_id);
  elsif p_transaction_type = 'manual_usage' then
    if v_tracking_mode <> 'manual_entry' then
      raise exception 'This commodity is tracked via automatic test usage — manual usage entries are disabled. Switch its tracking mode to enable manual entry.';
    end if;
    v_authorized := edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(v_tenant_id);
  else
    v_authorized := edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(v_tenant_id);
  end if;

  if not v_authorized then
    raise exception 'Not authorized to record this stock transaction';
  end if;

  -- Chain off the truly latest transaction (by performed_at, tiebroken by
  -- created_at/id), matching edoslmis_inventory_balances' ordering — not the
  -- highest balance_after ever recorded.
  select balance_after into v_prev_balance
  from edoslmis_stock_transactions
  where item_id = p_item_id
  order by performed_at desc, created_at desc, id desc
  limit 1;

  v_prev_balance := coalesce(v_prev_balance, 0);

  insert into edoslmis_stock_transactions (
    tenant_id, branch_id, item_id, batch_id, transaction_type,
    quantity_change, balance_after, reference_order_test_id, notes, performed_by
  ) values (
    v_tenant_id, v_branch_id, p_item_id, p_batch_id, p_transaction_type,
    p_quantity_change, v_prev_balance + p_quantity_change, p_reference_order_test_id, p_notes, auth.uid()
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function edoslmis_record_stock_transaction(uuid, edoslmis_stock_transaction_type, numeric, uuid, uuid, text) to authenticated;

-- Backfill: recompute balance_after for every existing row by replaying each
-- item's ledger in true chronological order. Idempotent — re-running this is a
-- no-op once balances are already correct.
with ordered as (
  select
    id,
    sum(quantity_change) over (
      partition by item_id
      order by performed_at, created_at, id
      rows between unbounded preceding and current row
    ) as running_balance
  from edoslmis_stock_transactions
)
update edoslmis_stock_transactions t
set balance_after = o.running_balance
from ordered o
where t.id = o.id
  and t.balance_after is distinct from o.running_balance;
