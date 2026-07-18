-- EDOS LMIS — activate/deactivate master-data classification entries
--
-- edoslmis_settings_lists previously only supported add/hard-delete. Deleting
-- an entry a tenant might want back later meant retyping it (and getting a
-- new id, unrelated to the original). Add a soft is_active flag instead so
-- admins can standardize which entries show up in pickers by checking or
-- unchecking them, without losing the entry or breaking any existing record
-- that already used it (this table was deliberately never a FK target — see
-- 0033 — so an inactive value in old records still displays fine, it just
-- can't be picked again until reactivated).

alter table edoslmis_settings_lists add column if not exists is_active boolean not null default true;
