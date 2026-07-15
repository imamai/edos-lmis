-- EDOS LMIS Phase 10b — tenant settings: tax/payment/document fields
-- Additive only. Powers the KRA-style tax invoice / quotation documents
-- (KRA PIN, bank/M-Pesa payment details, VAT rate, per-document footer
-- notes), reusing the existing admin-only write policy on
-- edoslmis_tenant_settings (0028) — no new RLS needed.

alter table edoslmis_tenant_settings
  add column if not exists kra_pin varchar(20),
  add column if not exists bank_name varchar(100),
  add column if not exists bank_account_number varchar(50),
  add column if not exists mpesa_till varchar(20),
  add column if not exists vat_rate numeric(5,2) not null default 16.00,
  add column if not exists invoice_footer_note text default 'Goods once sold are not returnable without invoice within 7 days',
  add column if not exists quotation_footer_note text default 'Prices valid for 14 days. Subject to stock availability';
