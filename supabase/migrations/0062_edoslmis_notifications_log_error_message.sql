-- EDOS LMIS — record the actual provider error on a failed notification
--
-- edoslmis_notifications_log has always recorded status='failed' but never
-- *why* (the Resend error message was discarded in application code). That
-- made a silently-undelivered supplier email undiagnosable without digging
-- through the Resend dashboard. Add a column for it; application code (see
-- lib/notifications/index.ts) now populates it on failure.

alter table edoslmis_notifications_log add column if not exists error_message text;
