-- Tenant-wide VAT on/off switch, separate from the existing per-document
-- "VAT exempt" checkbox. When off, VAT is never charged (tax_amount forced
-- to 0) regardless of the per-document flag, and the app layer omits the
-- VAT/Subtotal breakdown from PDFs entirely (just Subtotal + TOTAL... see
-- lib/pdf/invoice-document.tsx / quotation-document.tsx).

alter table edoslmis_tenant_settings
  add column if not exists vat_enabled boolean not null default true;

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
  v_vat_enabled boolean;
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

  select coalesce(vat_rate, 16), coalesce(vat_enabled, true) into v_vat_rate, v_vat_enabled
  from edoslmis_tenant_settings
  where tenant_id = v_tenant_id;
  v_vat_rate := coalesce(v_vat_rate, 16);
  v_vat_enabled := coalesce(v_vat_enabled, true);

  v_tax_amount := case when p_is_vat_exempt or not v_vat_enabled then 0 else round(v_subtotal * v_vat_rate / 100, 2) end;

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
