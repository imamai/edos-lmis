-- EDOS LMIS — extend PO receipt correction (0064) to also fix a wrong unit cost.
--
-- The supplier's actual price often only surfaces once the invoice arrives,
-- by which point the receiving unit_cost may already be wrong — and it
-- feeds straight into the supplier bill's subtotal at generation time
-- (quantity_received * unit_cost), so it needs the same correction path and
-- the same "locked out once a bill exists" guard quantity already has.
--
-- Adding a parameter changes the function's signature, so per the 0057/0060
-- lesson (CREATE OR REPLACE only replaces an exact signature match — a
-- changed one creates a second overload and every call becomes ambiguous)
-- the old 3-arg version is dropped explicitly first.
--
-- Quantity corrections authorize themselves via the nested
-- edoslmis_record_stock_transaction call (it's the one that actually checks
-- tenant/permission) — but a cost-only correction (no quantity change) now
-- skips that call entirely, so this checks authorization itself up front
-- instead of relying on it happening to run.

drop function if exists edoslmis_correct_purchase_order_line_receipt(uuid, numeric, text);

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
  v_delta numeric;
  v_total_lines int;
  v_fully_received_lines int;
  v_any_received int;
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

  if exists (select 1 from edoslmis_supplier_bills where po_id = v_po.id and status <> 'cancelled') then
    raise exception 'A supplier bill already exists for this purchase order — cancel it before correcting received quantities';
  end if;

  v_delta := p_new_quantity_received - v_line.quantity_received;
  if v_delta = 0 and p_new_unit_cost is not distinct from v_line.unit_cost then
    raise exception 'Enter a quantity or unit cost different from what is currently recorded';
  end if;

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

  return v_line;
end;
$$;

grant execute on function edoslmis_correct_purchase_order_line_receipt(uuid, numeric, numeric, text) to authenticated;
