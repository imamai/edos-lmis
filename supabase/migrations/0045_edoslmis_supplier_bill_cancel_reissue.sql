-- EDOS LMIS Phase 16e — supplier bill cancellation + reissue
-- Same treatment as 0044 (invoice cancel/reissue): relaxes the uniqueness
-- constraint so a fresh bill can be generated for a PO once its previous
-- bill is cancelled; the app-level cancelSupplierBill() action makes the
-- already-defined `cancelled` status reachable for the first time.

alter table edoslmis_supplier_bills drop constraint if exists edoslmis_supplier_bills_po_id_key;
create unique index if not exists edoslmis_supplier_bills_po_id_active_idx
  on edoslmis_supplier_bills(po_id) where status <> 'cancelled';

alter table edoslmis_supplier_bills
  add column if not exists cancellation_reason text;
