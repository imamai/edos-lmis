-- EDOS LMIS Phase 11 — additive VAT for invoices & quotations
-- edoslmis_invoices already had a subtotal/tax_amount/total_amount design
-- (standard additive tax: total = subtotal + tax) but edoslmis_generate_
-- invoice_for_order (0014) never populated tax_amount — it was always 0,
-- and total_amount was just set equal to subtotal. This migration makes
-- tax_amount real, and adds VAT-exempt as an explicit per-document choice
-- (e.g. clinical lab tests may not be VAT-applicable, unlike retail-style
-- commodity sales) rather than assuming every document is taxable.
-- Additive only: existing historical invoices/quotations are untouched —
-- this only changes newly generated/created documents going forward.

alter table edoslmis_invoices
  add column if not exists is_vat_exempt boolean not null default false;

alter table edoslmis_quotations
  add column if not exists tax_amount numeric(14,2) not null default 0,
  add column if not exists is_vat_exempt boolean not null default false;

-- ---------------------------------------------------------------------------
-- Re-generate an invoice from an order's line items, now computing VAT
-- additively (total_amount = subtotal + tax_amount) using the tenant's
-- configured vat_rate (edoslmis_tenant_settings, default 16 if unset),
-- unless the caller marks the invoice VAT-exempt. Adding a parameter
-- creates a distinct Postgres overload rather than replacing the old
-- signature, so the single-argument version is dropped first — the new
-- one's default keeps p_order_id-only calls working unchanged.
-- ---------------------------------------------------------------------------
drop function if exists edoslmis_generate_invoice_for_order(uuid);

create or replace function edoslmis_generate_invoice_for_order(
  p_order_id uuid,
  p_is_vat_exempt boolean default false
)
returns edoslmis_invoices
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant_id uuid;
  v_branch_id uuid;
  v_patient_id uuid;
  v_patient_category edoslmis_patient_category;
  v_subtotal numeric(14,2);
  v_vat_rate numeric(5,2);
  v_tax_amount numeric(14,2);
  v_invoice_number text;
  v_payer_type edoslmis_payer_type;
  v_invoice edoslmis_invoices;
begin
  select o.tenant_id, o.branch_id, o.patient_id
    into v_tenant_id, v_branch_id, v_patient_id
  from edoslmis_orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  if v_tenant_id <> edoshms_get_tenant_id() and not edoshms_is_platform_admin() then
    raise exception 'Not authorized for this tenant';
  end if;

  if not (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(v_tenant_id)) then
    raise exception 'Not authorized to generate invoices';
  end if;

  if exists (select 1 from edoslmis_invoices where order_id = p_order_id) then
    raise exception 'An invoice already exists for this order';
  end if;

  select patient_category into v_patient_category from edoslmis_patients where id = v_patient_id;
  v_payer_type := case v_patient_category
    when 'insurance' then 'insurance'
    when 'corporate' then 'corporate'
    else 'self_pay'
  end;

  select coalesce(sum(price), 0) into v_subtotal
  from edoslmis_order_tests
  where order_id = p_order_id;

  select coalesce(vat_rate, 16) into v_vat_rate
  from edoslmis_tenant_settings
  where tenant_id = v_tenant_id;
  v_vat_rate := coalesce(v_vat_rate, 16);

  v_tax_amount := case when p_is_vat_exempt then 0 else round(v_subtotal * v_vat_rate / 100, 2) end;

  v_invoice_number := edoslmis_generate_invoice_number();

  insert into edoslmis_invoices (
    tenant_id, branch_id, invoice_number, patient_id, order_id, payer_type,
    subtotal, tax_amount, total_amount, is_vat_exempt, status, issued_at, created_by
  ) values (
    v_tenant_id, v_branch_id, v_invoice_number, v_patient_id, p_order_id, v_payer_type,
    v_subtotal, v_tax_amount, v_subtotal + v_tax_amount, p_is_vat_exempt, 'issued', now(), auth.uid()
  )
  returning * into v_invoice;

  insert into edoslmis_invoice_items (tenant_id, invoice_id, order_test_id, description, quantity, unit_price, total_amount)
  select v_tenant_id, v_invoice.id, ot.id, t.name, 1, ot.price, ot.price
  from edoslmis_order_tests ot
  join edoslmis_tests t on t.id = ot.test_id
  where ot.order_id = p_order_id;

  return v_invoice;
end;
$$;

grant execute on function edoslmis_generate_invoice_for_order(uuid, boolean) to authenticated;
