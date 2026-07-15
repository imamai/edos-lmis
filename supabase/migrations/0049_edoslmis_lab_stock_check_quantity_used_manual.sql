-- Track whether Quantity Used on a saved daily check was a deliberate manual
-- override or just accepted the ledger-derived default. Without this flag,
-- a saved value looks identical either way, so a later ledger correction
-- (e.g. a backdated stock transaction) would never be reflected once a date
-- had been saved once — breaking the "auto columns stay live" behavior every
-- other column on this form has.

alter table edoslmis_lab_stock_checks
  add column if not exists quantity_used_is_manual boolean not null default false;
