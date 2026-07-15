-- EDOS LMIS Phase 16a — purchase order corrections/revisions
-- Additive only. Lets a PO be edited after it's been sent (but before any
-- commodities have been received against it, to avoid conflicting with
-- already-posted stock receipts) and tracks that a correction happened so
-- staff can resend the updated document to the supplier.

alter table edoslmis_purchase_orders
  add column if not exists revision int not null default 0,
  add column if not exists corrected_at timestamptz;
