-- EDOS LMIS — allow Record Stock Movement to post against a chosen date
--
-- Adds an optional p_performed_at date to edoslmis_record_stock_transaction.
-- When omitted (every existing caller — results.ts test_usage, procurement
-- receiving, opening balance, stock count correction), behavior is unchanged:
-- the transaction is stamped with now(). When a past date is chosen, the
-- calendar date is combined with the current time-of-day (not midnight), so
-- a backdated entry still sits after same-day transactions actually recorded
-- earlier and keeps a sane relative order among entries backdated to the
-- same day. Because a backdated insert can land before transactions that
-- already exist for later dates, this reuses the same "chain off the true
-- predecessor, then cascade the delta forward" approach 0024 already applies
-- to edits — an insert here is really just an edit of one link in the chain.

create or replace function edoslmis_record_stock_transaction(
  p_item_id uuid,
  p_transaction_type edoslmis_stock_transaction_type,
  p_quantity_change numeric,
  p_batch_id uuid default null,
  p_reference_order_test_id uuid default null,
  p_notes text default null,
  p_performed_at date default null
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
  v_performed_at timestamptz;
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

  if p_performed_at is not null and p_performed_at > current_date then
    raise exception 'Cannot record a stock movement dated in the future';
  end if;

  v_performed_at := case
    when p_performed_at is null then now()
    else p_performed_at + now()::time
  end;

  -- Chain off the true predecessor for the chosen date, not today's balance —
  -- a backdated entry needs the balance as of that point in time. Existing
  -- rows with the same performed_at instant are treated as earlier than this
  -- new one (it hasn't been inserted yet, so it can only come after).
  select balance_after into v_prev_balance
  from edoslmis_stock_transactions
  where item_id = p_item_id
    and performed_at <= v_performed_at
  order by performed_at desc, created_at desc, id desc
  limit 1;

  v_prev_balance := coalesce(v_prev_balance, 0);

  insert into edoslmis_stock_transactions (
    tenant_id, branch_id, item_id, batch_id, transaction_type,
    quantity_change, balance_after, reference_order_test_id, notes, performed_by, performed_at
  ) values (
    v_tenant_id, v_branch_id, p_item_id, p_batch_id, p_transaction_type,
    p_quantity_change, v_prev_balance + p_quantity_change, p_reference_order_test_id, p_notes, auth.uid(), v_performed_at
  )
  returning * into v_row;

  -- A backdated insert lands before transactions that already exist for
  -- later dates — cascade this row's quantity_change onto everything after
  -- it in the chain, same tuple ordering edoslmis_update_stock_transaction
  -- already uses, so exact-timestamp ties resolve deterministically.
  update edoslmis_stock_transactions
    set balance_after = balance_after + p_quantity_change
    where item_id = p_item_id
      and (performed_at, created_at, id) > (v_row.performed_at, v_row.created_at, v_row.id);

  return v_row;
end;
$$;

grant execute on function edoslmis_record_stock_transaction(uuid, edoslmis_stock_transaction_type, numeric, uuid, uuid, text, date) to authenticated;
