-- EDOS LMIS — commodity tracking mode + manual daily-usage transactions
--
-- Adds a per-commodity switch between the automatic clinical pipeline
-- (Orders -> Results -> test_usage) and manual daily entry (Daily Stock
-- Check / Quick Entry -> manual_usage). The two deduction paths are
-- mutually exclusive per item and enforced inside
-- edoslmis_record_stock_transaction() itself, not just in the app layer,
-- so the same commodity can never be deducted by both at once. Flipping
-- tracking_mode back to 'order_driven' is the literal "resume the original
-- clinical workflow" switch — no data migration or rollback needed.

do $$ begin
  create type edoslmis_inventory_tracking_mode as enum ('order_driven', 'manual_entry');
exception when duplicate_object then null; end $$;

alter table edoslmis_inventory_items
  add column if not exists tracking_mode edoslmis_inventory_tracking_mode not null default 'order_driven';

alter type edoslmis_stock_transaction_type add value if not exists 'manual_usage';

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

  select coalesce(max(balance_after), 0) into v_prev_balance
  from edoslmis_stock_transactions
  where item_id = p_item_id;

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
