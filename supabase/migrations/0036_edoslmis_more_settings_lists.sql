-- EDOS LMIS Phase 12b — more admin-mutable classification lists
-- Same treatment as 0033 (commodity category, equipment type): payment
-- method and histopathology stain type are pure classification/display
-- values with no branching logic anywhere else in the app (confirmed by
-- code audit — payment_method is only ever displayed/stored, never
-- switched on), so they move to the existing edoslmis_settings_lists
-- mechanism instead of a fixed Postgres enum / hardcoded <option> list.
-- Deliberately NOT applied to patient_category — that one does drive real
-- billing logic (edoslmis_generate_invoice_for_order derives payer_type
-- from it), so it stays a fixed enum.

alter table edoslmis_payments
  alter column payment_method type varchar(30) using payment_method::text;

insert into edoslmis_settings_lists (tenant_id, list_key, value, label, sort_order)
values
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'payment_method', 'cash', 'Cash', 1),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'payment_method', 'mpesa', 'M-Pesa', 2),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'payment_method', 'card', 'Card', 3),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'payment_method', 'bank_transfer', 'Bank Transfer', 4),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'payment_method', 'cheque', 'Cheque', 5),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'payment_method', 'insurance', 'Insurance', 6),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'payment_method', 'nhif', 'NHIF', 7),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'payment_method', 'sha', 'SHA', 8),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'histopathology_stain', 'H&E', 'H&E', 1),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'histopathology_stain', 'PAS', 'PAS', 2),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'histopathology_stain', 'Special stain', 'Special stain', 3),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'histopathology_stain', 'IHC', 'IHC', 4)
on conflict do nothing;
