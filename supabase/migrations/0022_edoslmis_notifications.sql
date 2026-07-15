-- EDOS LMIS Phase 4 — notification audit log
-- The actual SMS/WhatsApp/email provider is pluggable (lib/notifications/*);
-- this table is the durable record of what was attempted/sent regardless of
-- which provider is wired in.

do $$ begin
  create type edoslmis_notification_channel as enum ('sms','whatsapp','email');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_notification_status as enum ('sent','failed','skipped');
exception when duplicate_object then null; end $$;

create table if not exists edoslmis_notifications_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  channel edoslmis_notification_channel not null,
  recipient varchar(200) not null,
  subject varchar(200),
  message text not null,
  status edoslmis_notification_status not null,
  provider varchar(60) not null,
  related_table varchar(100),
  related_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_notifications_log_tenant_idx on edoslmis_notifications_log(tenant_id, created_at desc);
create index if not exists edoslmis_notifications_log_related_idx on edoslmis_notifications_log(related_table, related_id);

alter table edoslmis_notifications_log enable row level security;
create policy edoslmis_notifications_log_select on edoslmis_notifications_log
  for select using (
    edoshms_is_platform_admin()
    or (tenant_id = edoshms_get_tenant_id() and edoslmis_is_admin_for(tenant_id))
  );
create policy edoslmis_notifications_log_insert on edoslmis_notifications_log
  for insert with check (tenant_id = edoshms_get_tenant_id());
