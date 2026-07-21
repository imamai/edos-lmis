-- EDOS LMIS — correct a wrong quantity received against a PO line.
--
-- Receiving is otherwise a one-way ratchet (edoslmis_receive_purchase_order_line
-- only ever adds to quantity_received), so a fat-fingered receipt had no way
-- back. This posts the delta as a 'stock_count_correction' ledger entry
-- (same transaction type/semantics the daily-check discrepancy poster in
-- postStockCountCorrection already uses — "a physical count can come in
-- over or under what the ledger expects"), reusing
-- edoslmis_record_stock_transaction so its own tenant/permission checks are
-- what actually authorizes this, same as edoslmis_receive_purchase_order_line
-- does. Sets quantity_received to the corrected absolute value and rolls the
-- PO status forward/back to match — including back to 'confirmed' if a
-- correction zeroes out every line, so a fully-wrong receipt isn't stuck.
--
-- Locked out once a supplier bill exists for the PO: bill amounts are frozen
-- at generation from received-line totals and are never manually editable
-- (deliberately, per Bill edit scope), so correcting receipt quantities
-- after a bill has already been raised off them would silently desync the
-- two. Cancel the bill first (only possible while unpaid) to unlock a
-- correction, then regenerate it afterward.

create or replace function edoslmis_correct_purchase_order_line_receipt(
  p_line_id uuid,
  p_new_quantity_received numeric,
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
  v_delta numeric;
  v_total_lines int;
  v_fully_received_lines int;
  v_any_received int;
begin
  if p_new_quantity_received is null or p_new_quantity_received < 0 then
    raise exception 'Corrected quantity cannot be negative';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Enter a reason for this correction';
  end if;

  select * into v_line from edoslmis_purchase_order_lines where id = p_line_id for update;
  if not found then
    raise exception 'Purchase order line % not found', p_line_id;
  end if;

  select * into v_po from edoslmis_purchase_orders where id = v_line.po_id for update;
  if v_po.status not in ('partially_received', 'received') then
    raise exception 'Only a received purchase order line can be corrected';
  end if;

  if exists (select 1 from edoslmis_supplier_bills where po_id = v_po.id and status <> 'cancelled') then
    raise exception 'A supplier bill already exists for this purchase order — cancel it before correcting received quantities';
  end if;

  v_delta := p_new_quantity_received - v_line.quantity_received;
  if v_delta = 0 then
    raise exception 'Enter a quantity different from what is currently recorded';
  end if;

  perform edoslmis_record_stock_transaction(
    v_line.item_id, 'stock_count_correction', v_delta, null, null,
    'Correction to received quantity on ' || v_po.po_number || ': ' || p_reason
  );

  update edoslmis_purchase_order_lines
    set quantity_received = p_new_quantity_received
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

  return v_line;
end;
$$;

grant execute on function edoslmis_correct_purchase_order_line_receipt(uuid, numeric, text) to authenticated;
