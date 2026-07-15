-- EDOS LMIS Phase 12c — tenant theme color for generated PDFs
-- Stores the dominant color extracted from the tenant's uploaded logo, so
-- the clinic name / document title text on invoices, purchase orders,
-- quotations, and lab reports match the logo instead of a fixed blue.
-- Computed server-side on each logo upload (lib/actions/settings.ts);
-- defaults to the app's existing blue so tenants without a logo yet see no
-- visual change.

alter table edoslmis_tenant_settings
  add column if not exists theme_color varchar(7) not null default '#1d4ed8';
