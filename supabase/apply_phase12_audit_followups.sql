-- EDOS LMIS Phase 12 — audit follow-ups
-- 1. Drop discount_amount columns: declared numeric(14,2) default 0 on both
--    edoslmis_invoices and edoslmis_invoice_items since 0014, never written
--    by any action or RPC (confirmed via full-codebase search — zero
--    references outside their own column declaration). Same "declared but
--    dead" shape as the tax_amount bug fixed in 0034. No discount feature
--    exists in the UI, so remove the columns rather than leave them
--    implying a feature that isn't there.
-- 2. Cancelling an order left its already-issued invoice sitting at
--    issued/partially_paid forever (orders.ts auto-generates an invoice on
--    creation), so cancelled work kept counting as outstanding revenue on
--    the dashboard. Adds a best-effort, permission-gated companion to
--    edoslmis_generate_invoice_for_order that transitions the linked
--    invoice when its order is cancelled — mirrors that function's existing
--    "requires edoslmis.billing.manage, no-ops otherwise" convention
--    (see the comment in lib/actions/orders.ts:100-104).

alter table edoslmis_invoices drop column if exists discount_amount;
alter table edoslmis_invoice_items drop column if exists discount_amount;

-- ---------------------------------------------------------------------------
-- Transition an order's linked invoice on cancellation. Never touches an
-- invoice that's already fully paid (status = 'paid') — cancelling an order
-- after full payment is a refund decision, not something to auto-resolve.
-- A partially-paid invoice goes to 'written_off' (money is owed but the
-- service isn't happening); an unpaid one goes to 'cancelled'.
-- ---------------------------------------------------------------------------
create or replace function edoslmis_cancel_invoice_for_order(
  p_order_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant_id uuid;
  v_invoice edoslmis_invoices;
begin
  select * into v_invoice
  from edoslmis_invoices
  where order_id = p_order_id
  for update;

  if not found then
    return;
  end if;

  v_tenant_id := v_invoice.tenant_id;

  if v_tenant_id <> edoshms_get_tenant_id() and not edoshms_is_platform_admin() then
    return;
  end if;

  if not (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(v_tenant_id)) then
    return;
  end if;

  if v_invoice.status not in ('draft', 'issued', 'partially_paid') then
    return;
  end if;

  update edoslmis_invoices
  set status = case when v_invoice.amount_paid > 0 then 'written_off' else 'cancelled' end,
      cancellation_reason = 'Order cancelled: ' || p_reason
  where id = v_invoice.id;
end;
$$;

grant execute on function edoslmis_cancel_invoice_for_order(uuid, text) to authenticated;
