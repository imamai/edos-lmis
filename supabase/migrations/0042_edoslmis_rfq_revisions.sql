-- EDOS LMIS Phase 16b — RFQ corrections/revisions
-- Same treatment as 0041 (purchase order revisions): lets an RFQ be edited
-- after it's been sent (before it's closed/converted/cancelled) and tracks
-- that a correction happened so staff can resend it to suppliers.

alter table edoslmis_rfqs
  add column if not exists revision int not null default 0,
  add column if not exists corrected_at timestamptz;
