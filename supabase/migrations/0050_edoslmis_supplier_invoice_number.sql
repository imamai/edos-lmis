-- Record the supplier's own invoice number against a PO, and carry it onto
-- the auto-generated Supplier Bill so it's visible wherever payments are
-- actually tracked/audited. The invoice usually arrives after the PO has
-- already been sent/received, so both fields are editable independently of
-- PO/bill status (except cancelled) via small dedicated app-layer actions
-- rather than the full PO edit form.

alter table edoslmis_purchase_orders add column if not exists supplier_invoice_number varchar(100);
alter table edoslmis_supplier_bills add column if not exists supplier_invoice_number varchar(100);

-- Redefine to also carry the PO's supplier_invoice_number onto the new bill.
create or replace function edoslmis_generate_supplier_bill_from_po(p_po_id uuid)
returns edoslmis_supplier_bills
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant_id uuid;
  v_branch_id uuid;
  v_supplier_id uuid;
  v_status edoslmis_po_status;
  v_supplier_invoice_number varchar(100);
  v_subtotal numeric(14,2);
  v_bill_number text;
  v_bill edoslmis_supplier_bills;
begin
  select tenant_id, branch_id, supplier_id, status, supplier_invoice_number
    into v_tenant_id, v_branch_id, v_supplier_id, v_status, v_supplier_invoice_number
  from edoslmis_purchase_orders
  where id = p_po_id
  for update;

  if not found then
    raise exception 'Purchase order % not found', p_po_id;
  end if;

  if v_tenant_id <> edoshms_get_tenant_id() and not edoshms_is_platform_admin() then
    raise exception 'Not authorized for this tenant';
  end if;

  if not (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(v_tenant_id)) then
    raise exception 'Not authorized to generate supplier bills';
  end if;

  if v_status not in ('partially_received', 'received') then
    raise exception 'Cannot bill a purchase order that has not received any commodities';
  end if;

  if exists (select 1 from edoslmis_supplier_bills where po_id = p_po_id) then
    raise exception 'A supplier bill already exists for this purchase order';
  end if;

  select coalesce(sum(quantity_received * coalesce(unit_cost, 0)), 0) into v_subtotal
  from edoslmis_purchase_order_lines
  where po_id = p_po_id and quantity_received > 0;

  v_bill_number := edoslmis_generate_supplier_bill_number();

  insert into edoslmis_supplier_bills (
    tenant_id, branch_id, bill_number, supplier_id, po_id, subtotal, total_amount, status, supplier_invoice_number, created_by
  ) values (
    v_tenant_id, v_branch_id, v_bill_number, v_supplier_id, p_po_id, v_subtotal, v_subtotal, 'issued', v_supplier_invoice_number, auth.uid()
  )
  returning * into v_bill;

  insert into edoslmis_supplier_bill_items (tenant_id, bill_id, po_line_id, description, quantity, unit_cost, total_amount)
  select v_tenant_id, v_bill.id, l.id, i.name, l.quantity_received, coalesce(l.unit_cost, 0), l.quantity_received * coalesce(l.unit_cost, 0)
  from edoslmis_purchase_order_lines l
  join edoslmis_inventory_items i on i.id = l.item_id
  where l.po_id = p_po_id and l.quantity_received > 0;

  return v_bill;
end;
$$;

grant execute on function edoslmis_generate_supplier_bill_from_po(uuid) to authenticated;
