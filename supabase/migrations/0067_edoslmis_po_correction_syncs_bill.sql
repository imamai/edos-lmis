-- EDOS LMIS — a PO receipt correction now syncs an already-generated
-- supplier bill instead of being locked out entirely.
--
-- 0064/0065 blocked correcting a received line once a bill existed, on the
-- reasoning that bill totals are frozen at generation and never manually
-- editable. Turns out that's too strict for the real workflow: the
-- supplier's invoice (and any quantity/cost discrepancy it reveals) usually
-- only arrives after the bill's already been raised off the GRN, so
-- corrections need to reach an existing bill, not be blocked by it. Bill
-- totals stay fully system-derived — they're just re-derived now instead of
-- frozen at generation.
--
-- Guards against the one genuinely unsafe case: correcting a line down
-- would drop the bill's total below what's already been paid against it.
-- That's rejected outright (no partial application) rather than silently
-- leaving a bill with a negative balance_due — the caller has to sort out a
-- refund/credit with the supplier first, same as the app has no automated
-- path for reducing a bill below its payment history anywhere else.

create or replace function edoslmis_correct_purchase_order_line_receipt(
  p_line_id uuid,
  p_new_quantity_received numeric,
  p_new_unit_cost numeric,
  p_reason text
)
returns edoslmis_purchase_order_lines
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_line edoslmis_purchase_order_lines;
  v_po edoslmis_purchase_orders;
  v_item_name text;
  v_delta numeric;
  v_total_lines int;
  v_fully_received_lines int;
  v_any_received int;
  v_bill edoslmis_supplier_bills;
  v_new_total numeric(14,2);
  v_new_status edoslmis_supplier_bill_status;
begin
  if p_new_quantity_received is null or p_new_quantity_received < 0 then
    raise exception 'Corrected quantity cannot be negative';
  end if;
  if p_new_unit_cost is not null and p_new_unit_cost < 0 then
    raise exception 'Corrected unit cost cannot be negative';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Enter a reason for this correction';
  end if;

  select * into v_line from edoslmis_purchase_order_lines where id = p_line_id for update;
  if not found then
    raise exception 'Purchase order line % not found', p_line_id;
  end if;

  select * into v_po from edoslmis_purchase_orders where id = v_line.po_id for update;

  if v_po.tenant_id <> edoshms_get_tenant_id() and not edoshms_is_platform_admin() then
    raise exception 'Not authorized for this tenant';
  end if;
  if not (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(v_po.tenant_id)) then
    raise exception 'Not authorized to correct purchase order receipts';
  end if;

  if v_po.status not in ('partially_received', 'received') then
    raise exception 'Only a received purchase order line can be corrected';
  end if;

  v_delta := p_new_quantity_received - v_line.quantity_received;
  if v_delta = 0 and p_new_unit_cost is not distinct from v_line.unit_cost then
    raise exception 'Enter a quantity or unit cost different from what is currently recorded';
  end if;

  -- Lock the bill (if any) up front, same lock order edoslmis_generate_supplier_bill_from_po
  -- uses (PO/line before bill), so a concurrent payment can't race the
  -- balance-floor check below.
  select * into v_bill from edoslmis_supplier_bills
    where po_id = v_po.id and status <> 'cancelled'
    for update;

  if v_delta <> 0 then
    perform edoslmis_record_stock_transaction(
      v_line.item_id, 'stock_count_correction', v_delta, null, null,
      'Correction to received quantity on ' || v_po.po_number || ': ' || p_reason
    );
  end if;

  update edoslmis_purchase_order_lines
    set quantity_received = p_new_quantity_received,
        unit_cost = p_new_unit_cost
    where id = p_line_id
    returning * into v_line;

  select
    count(*),
    count(*) filter (where quantity_received >= quantity_ordered),
    count(*) filter (where quantity_received > 0)
    into v_total_lines, v_fully_received_lines, v_any_received
  from edoslmis_purchase_order_lines where po_id = v_po.id;

  update edoslmis_purchase_orders
    set status = case
      when v_fully_received_lines = v_total_lines then 'received'::edoslmis_po_status
      when v_any_received > 0 then 'partially_received'::edoslmis_po_status
      else 'confirmed'::edoslmis_po_status
    end
    where id = v_po.id;

  if v_bill.id is not null then
    if p_new_quantity_received = 0 then
      delete from edoslmis_supplier_bill_items where bill_id = v_bill.id and po_line_id = p_line_id;
    else
      select i.name into v_item_name from edoslmis_inventory_items i where i.id = v_line.item_id;

      update edoslmis_supplier_bill_items
        set quantity = p_new_quantity_received,
            unit_cost = coalesce(p_new_unit_cost, 0),
            total_amount = p_new_quantity_received * coalesce(p_new_unit_cost, 0),
            description = v_item_name
        where bill_id = v_bill.id and po_line_id = p_line_id;

      if not found then
        insert into edoslmis_supplier_bill_items (
          tenant_id, bill_id, po_line_id, description, quantity, unit_cost, total_amount
        ) values (
          v_bill.tenant_id, v_bill.id, p_line_id, v_item_name,
          p_new_quantity_received, coalesce(p_new_unit_cost, 0), p_new_quantity_received * coalesce(p_new_unit_cost, 0)
        );
      end if;
    end if;

    select coalesce(sum(total_amount), 0) into v_new_total
    from edoslmis_supplier_bill_items where bill_id = v_bill.id;

    if v_new_total < v_bill.amount_paid then
      raise exception 'Corrected total (KES %) would be less than the KES % already paid on bill % — resolve the payment/refund first',
        v_new_total, v_bill.amount_paid, v_bill.bill_number;
    end if;

    v_new_status := case
      when v_new_total > 0 and v_bill.amount_paid >= v_new_total then 'paid'::edoslmis_supplier_bill_status
      when v_bill.amount_paid > 0 then 'partially_paid'::edoslmis_supplier_bill_status
      else 'issued'::edoslmis_supplier_bill_status
    end;

    update edoslmis_supplier_bills
      set subtotal = v_new_total,
          total_amount = v_new_total,
          status = v_new_status
      where id = v_bill.id;
  end if;

  return v_line;
end;
$$;

grant execute on function edoslmis_correct_purchase_order_line_receipt(uuid, numeric, numeric, text) to authenticated;
