-- EDOS LMIS Phase 16d — invoice cancellation + reissue
-- Financial ledger documents (unlike POs/RFQs/quotations) get corrections
-- via cancel-and-reissue rather than in-place editing, to preserve a clean
-- audit trail. The `cancelled` status and `cancellation_reason` column have
-- existed since 0014_edoslmis_billing.sql but were never reachable — no
-- action ever set them. This migration only relaxes the uniqueness
-- constraint so a fresh invoice can be generated for an order once its
-- previous invoice is cancelled; the app-level cancelInvoice() action makes
-- `cancelled` reachable for the first time.

alter table edoslmis_invoices drop constraint if exists edoslmis_invoices_order_id_key;
create unique index if not exists edoslmis_invoices_order_id_active_idx
  on edoslmis_invoices(order_id) where status <> 'cancelled';
