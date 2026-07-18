-- EDOS LMIS — pay several supplier bills in one action
--
-- Mirrors edoslmis_record_supplier_payment exactly, looped over an array of
-- (bill_id, amount) pairs inside one function call — which is one Postgres
-- transaction, so the batch is atomic: either every bill in the selection
-- gets its payment posted, or none do (e.g. if one bill turns out to belong
-- to a different tenant, or an amount is invalid, the whole batch rolls
-- back rather than leaving some bills paid and others not). Each bill still
-- gets its own edoslmis_supplier_payments row, same as paying one at a time
-- — this only changes how many bills one form submission can cover.

create or replace function edoslmis_record_bulk_supplier_payments(
  p_bill_ids uuid[],
  p_amounts numeric[],
  p_payment_method varchar,
  p_reference_number text default null,
  p_notes text default null
)
returns setof edoslmis_supplier_payments
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant_id uuid;
  v_total_amount numeric(14,2);
  v_amount_paid numeric(14,2);
  v_new_paid numeric(14,2);
  v_bill_id uuid;
  v_amount numeric;
  v_row edoslmis_supplier_payments;
  i int;
begin
  if p_bill_ids is null or array_length(p_bill_ids, 1) is null then
    raise exception 'No bills selected';
  end if;
  if array_length(p_bill_ids, 1) <> array_length(p_amounts, 1) then
    raise exception 'Bill and amount counts do not match';
  end if;

  for i in 1..array_length(p_bill_ids, 1) loop
    v_bill_id := p_bill_ids[i];
    v_amount := p_amounts[i];

    if v_amount <= 0 then
      raise exception 'Payment amount must be positive for bill %', v_bill_id;
    end if;

    select tenant_id, total_amount, amount_paid
      into v_tenant_id, v_total_amount, v_amount_paid
    from edoslmis_supplier_bills
    where id = v_bill_id
    for update;

    if not found then
      raise exception 'Supplier bill % not found', v_bill_id;
    end if;

    if v_tenant_id <> edoshms_get_tenant_id() and not edoshms_is_platform_admin() then
      raise exception 'Not authorized for this tenant';
    end if;

    if not (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(v_tenant_id)) then
      raise exception 'Not authorized to record payments';
    end if;

    v_new_paid := v_amount_paid + v_amount;

    insert into edoslmis_supplier_payments (
      tenant_id, bill_id, amount, payment_method, reference_number, notes, received_by
    ) values (
      v_tenant_id, v_bill_id, v_amount, p_payment_method, p_reference_number, p_notes, auth.uid()
    )
    returning * into v_row;

    update edoslmis_supplier_bills
    set amount_paid = v_new_paid,
        status = case
          when v_new_paid >= v_total_amount then 'paid'
          when v_new_paid > 0 then 'partially_paid'
          else status
        end
    where id = v_bill_id;

    return next v_row;
  end loop;

  return;
end;
$$;

grant execute on function edoslmis_record_bulk_supplier_payments(uuid[], numeric[], varchar, text, text) to authenticated;
