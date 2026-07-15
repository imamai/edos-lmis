-- EDOS LMIS Phase 13 — supplier payment terms + bank details
-- Additive only. Shown on the supplier record and useful once accounts
-- payable (0040) tracks bills against a supplier.

alter table edoslmis_suppliers
  add column if not exists payment_terms varchar(100),
  add column if not exists bank_details text;
