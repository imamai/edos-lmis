-- EDOS LMIS — make manual_usage editable/deletable like other manual movements
--
-- manual_usage is now posted through the same "Record Stock Movement" picker
-- as receipts/adjustments/wastage (Quantity + Notes) rather than through a
-- separate Quick Entry form, so a mis-entered manual usage quantity should be
-- correctable the same way those are: via the Stock Card's edit/delete
-- controls. test_usage stays locked — it's still tied to automatic result
-- entry, not a free-form user action.

create or replace function edoslmis_update_stock_transaction(
  p_transaction_id uuid,
  p_transaction_type edoslmis_stock_transaction_type,
  p_quantity_change numeric,
  p_notes text default null
)
returns edoslmis_stock_transactions
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_item_id uuid;
  v_tenant_id uuid;
  v_authorized boolean;
  v_old edoslmis_stock_transactions;
  v_delta numeric;
  v_new_balance numeric;
  v_row edoslmis_stock_transactions;
begin
  if p_transaction_type not in (
    'opening_balance','positive_adjustment','negative_adjustment','wastage','expiry','stock_count_correction','manual_usage'
  ) then
    raise exception 'This movement type cannot be edited here';
  end if;

  select item_id into v_item_id from edoslmis_stock_transactions where id = p_transaction_id;
  if not found then
    raise exception 'Stock movement % not found', p_transaction_id;
  end if;

  -- Lock the item first (same order edoslmis_record_stock_transaction uses) to
  -- avoid deadlocking against concurrent inserts/edits on this item's ledger.
  select tenant_id into v_tenant_id from edoslmis_inventory_items where id = v_item_id for update;
  if not found then
    raise exception 'Inventory item not found';
  end if;

  if v_tenant_id <> edoshms_get_tenant_id() and not edoshms_is_platform_admin() then
    raise exception 'Not authorized for this tenant';
  end if;

  v_authorized := edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(v_tenant_id);
  if not v_authorized then
    raise exception 'Not authorized to edit this stock transaction';
  end if;

  select * into v_old from edoslmis_stock_transactions where id = p_transaction_id for update;

  if v_old.transaction_type not in (
    'opening_balance','positive_adjustment','negative_adjustment','wastage','expiry','stock_count_correction','manual_usage'
  ) then
    raise exception 'Receipts and test-usage deductions are linked to purchase orders or results and cannot be edited here';
  end if;

  v_new_balance := (v_old.balance_after - v_old.quantity_change) + p_quantity_change;
  v_delta := v_new_balance - v_old.balance_after;

  update edoslmis_stock_transactions
    set transaction_type = p_transaction_type,
        quantity_change = p_quantity_change,
        balance_after = v_new_balance,
        notes = p_notes
    where id = p_transaction_id
    returning * into v_row;

  if v_delta <> 0 then
    update edoslmis_stock_transactions
      set balance_after = balance_after + v_delta
      where item_id = v_item_id
        and (performed_at, created_at, id) > (v_old.performed_at, v_old.created_at, v_old.id);
  end if;

  return v_row;
end;
$$;

grant execute on function edoslmis_update_stock_transaction(uuid, edoslmis_stock_transaction_type, numeric, text) to authenticated;

create or replace function edoslmis_delete_stock_transaction(p_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_item_id uuid;
  v_tenant_id uuid;
  v_authorized boolean;
  v_old edoslmis_stock_transactions;
begin
  select item_id into v_item_id from edoslmis_stock_transactions where id = p_transaction_id;
  if not found then
    raise exception 'Stock movement % not found', p_transaction_id;
  end if;

  select tenant_id into v_tenant_id from edoslmis_inventory_items where id = v_item_id for update;
  if not found then
    raise exception 'Inventory item not found';
  end if;

  if v_tenant_id <> edoshms_get_tenant_id() and not edoshms_is_platform_admin() then
    raise exception 'Not authorized for this tenant';
  end if;

  v_authorized := edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(v_tenant_id);
  if not v_authorized then
    raise exception 'Not authorized to delete this stock transaction';
  end if;

  select * into v_old from edoslmis_stock_transactions where id = p_transaction_id for update;

  if v_old.transaction_type not in (
    'opening_balance','positive_adjustment','negative_adjustment','wastage','expiry','stock_count_correction','manual_usage'
  ) then
    raise exception 'Receipts and test-usage deductions are linked to purchase orders or results and cannot be deleted here';
  end if;

  update edoslmis_stock_transactions
    set balance_after = balance_after - v_old.quantity_change
    where item_id = v_item_id
      and (performed_at, created_at, id) > (v_old.performed_at, v_old.created_at, v_old.id);

  delete from edoslmis_stock_transactions where id = p_transaction_id;
end;
$$;

grant execute on function edoslmis_delete_stock_transaction(uuid) to authenticated;
