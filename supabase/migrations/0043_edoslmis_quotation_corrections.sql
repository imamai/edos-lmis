-- EDOS LMIS Phase 16c — quotation customer contact + corrections/revisions
-- Quotations had no way to email a customer at all (only customer_name was
-- stored, "Send to Customer" only flipped a status flag). Adds contact
-- fields so a real send is possible, plus the same revision/corrected_at
-- pattern as purchase orders (0041) and RFQs (0042).

alter table edoslmis_quotations
  add column if not exists customer_email varchar(150),
  add column if not exists customer_phone varchar(30),
  add column if not exists revision int not null default 0,
  add column if not exists corrected_at timestamptz;
