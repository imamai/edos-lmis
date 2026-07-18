-- EDOS LMIS — fix "function edoslmis_record_stock_transaction(...) is not unique"
--
-- CREATE OR REPLACE FUNCTION only replaces a function when its parameter
-- types match exactly. 0057 added a new p_performed_at date parameter to
-- edoslmis_record_stock_transaction, which changed the signature — so
-- instead of replacing the existing 6-parameter function, Postgres created a
-- second overload alongside it. Every call became ambiguous between the two
-- candidates (both have defaults for every optional parameter), which is
-- exactly the "is not unique" error. Drop the stale pre-0057 signature so
-- only the current 7-parameter version remains.

drop function if exists edoslmis_record_stock_transaction(
  uuid, edoslmis_stock_transaction_type, numeric, uuid, uuid, text
);
