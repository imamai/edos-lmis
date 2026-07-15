-- EDOS LMIS Phase 1 — permission helper + RLS policies
-- Tenancy/role identity resolved via existing edoshms_* helper functions:
--   edoshms_get_tenant_id(), edoshms_get_branch_id(),
--   edoshms_is_platform_admin(), edoshms_is_tenant_admin(uuid)

create or replace function edoslmis_has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(edoshms_is_platform_admin(), false)
    or exists (
      select 1
      from edoshms_user_roles ur
      join edoshms_roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and (ur.expires_at is null or ur.expires_at > now())
        and r.is_active = true
        and r.permissions ? p_permission
    );
$$;

create or replace function edoslmis_is_admin_for(p_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select coalesce(edoshms_is_platform_admin(), false)
    or coalesce(edoshms_is_tenant_admin(p_tenant_id), false);
$$;

-- ---------------------------------------------------------------------------
-- Catalog tables: tenant-scoped read for all tenant staff, write requires
-- edoslmis.catalog.manage or tenant/platform admin.
-- ---------------------------------------------------------------------------
alter table edoslmis_departments enable row level security;
create policy edoslmis_departments_select on edoslmis_departments
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_departments_write on edoslmis_departments
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_specimen_types enable row level security;
create policy edoslmis_specimen_types_select on edoslmis_specimen_types
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_specimen_types_write on edoslmis_specimen_types
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_test_categories enable row level security;
create policy edoslmis_test_categories_select on edoslmis_test_categories
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_test_categories_write on edoslmis_test_categories
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_tests enable row level security;
create policy edoslmis_tests_select on edoslmis_tests
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_tests_write on edoslmis_tests
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_test_components enable row level security;
create policy edoslmis_test_components_select on edoslmis_test_components
  for select using (
    exists (select 1 from edoslmis_tests t where t.id = test_id
      and (t.tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin()))
  );
create policy edoslmis_test_components_write on edoslmis_test_components
  for all using (
    exists (select 1 from edoslmis_tests t where t.id = test_id and t.tenant_id = edoshms_get_tenant_id()
      and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(t.tenant_id)))
  ) with check (
    exists (select 1 from edoslmis_tests t where t.id = test_id and t.tenant_id = edoshms_get_tenant_id()
      and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(t.tenant_id)))
  );

alter table edoslmis_reference_ranges enable row level security;
create policy edoslmis_reference_ranges_select on edoslmis_reference_ranges
  for select using (
    exists (select 1 from edoslmis_tests t where t.id = test_id
      and (t.tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin()))
  );
create policy edoslmis_reference_ranges_write on edoslmis_reference_ranges
  for all using (
    exists (select 1 from edoslmis_tests t where t.id = test_id and t.tenant_id = edoshms_get_tenant_id()
      and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(t.tenant_id)))
  ) with check (
    exists (select 1 from edoslmis_tests t where t.id = test_id and t.tenant_id = edoshms_get_tenant_id()
      and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(t.tenant_id)))
  );

alter table edoslmis_panels enable row level security;
create policy edoslmis_panels_select on edoslmis_panels
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_panels_write on edoslmis_panels
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_panel_tests enable row level security;
create policy edoslmis_panel_tests_select on edoslmis_panel_tests
  for select using (
    exists (select 1 from edoslmis_panels p where p.id = panel_id
      and (p.tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin()))
  );
create policy edoslmis_panel_tests_write on edoslmis_panel_tests
  for all using (
    exists (select 1 from edoslmis_panels p where p.id = panel_id and p.tenant_id = edoshms_get_tenant_id()
      and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(p.tenant_id)))
  ) with check (
    exists (select 1 from edoslmis_panels p where p.id = panel_id and p.tenant_id = edoshms_get_tenant_id()
      and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(p.tenant_id)))
  );

-- ---------------------------------------------------------------------------
-- Patients: tenant + branch scoped. Any authenticated tenant staff member with
-- 'edoslmis.patient.manage' can register/edit; everyone in-tenant can read.
-- ---------------------------------------------------------------------------
alter table edoslmis_patients enable row level security;
create policy edoslmis_patients_select on edoslmis_patients
  for select using (
    tenant_id = edoshms_get_tenant_id()
    and (branch_id is null or branch_id = edoshms_get_branch_id() or edoslmis_is_admin_for(tenant_id))
    or edoshms_is_platform_admin()
  );
create policy edoslmis_patients_write on edoslmis_patients
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.patient.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.patient.manage') or edoslmis_is_admin_for(tenant_id))
  );

-- ---------------------------------------------------------------------------
-- Orders / order tests
-- ---------------------------------------------------------------------------
alter table edoslmis_orders enable row level security;
create policy edoslmis_orders_select on edoslmis_orders
  for select using (
    (tenant_id = edoshms_get_tenant_id()
      and (branch_id is null or branch_id = edoshms_get_branch_id() or edoslmis_is_admin_for(tenant_id)))
    or edoshms_is_platform_admin()
  );
create policy edoslmis_orders_write on edoslmis_orders
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.order.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.order.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_order_tests enable row level security;
create policy edoslmis_order_tests_select on edoslmis_order_tests
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_order_tests_write on edoslmis_order_tests
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.order.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.order.manage') or edoslmis_is_admin_for(tenant_id))
  );

-- ---------------------------------------------------------------------------
-- Specimens / tracking
-- ---------------------------------------------------------------------------
alter table edoslmis_specimens enable row level security;
create policy edoslmis_specimens_select on edoslmis_specimens
  for select using (
    (tenant_id = edoshms_get_tenant_id()
      and (branch_id is null or branch_id = edoshms_get_branch_id() or edoslmis_is_admin_for(tenant_id)))
    or edoshms_is_platform_admin()
  );
create policy edoslmis_specimens_write on edoslmis_specimens
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.specimen.collect') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.specimen.collect') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_specimen_tracking enable row level security;
create policy edoslmis_specimen_tracking_select on edoslmis_specimen_tracking
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_specimen_tracking_insert on edoslmis_specimen_tracking
  for insert with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.specimen.collect') or edoslmis_is_admin_for(tenant_id))
  );

-- ---------------------------------------------------------------------------
-- Results / verification / release / critical alerts
-- ---------------------------------------------------------------------------
alter table edoslmis_result_entries enable row level security;
create policy edoslmis_result_entries_select on edoslmis_result_entries
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_result_entries_write on edoslmis_result_entries
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_result_verification enable row level security;
create policy edoslmis_result_verification_select on edoslmis_result_verification
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_result_verification_write on edoslmis_result_verification
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.verify') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.verify') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_result_release enable row level security;
create policy edoslmis_result_release_select on edoslmis_result_release
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_result_release_insert on edoslmis_result_release
  for insert with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.release') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_critical_alerts enable row level security;
create policy edoslmis_critical_alerts_select on edoslmis_critical_alerts
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_critical_alerts_write on edoslmis_critical_alerts
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.critical.acknowledge') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.critical.acknowledge') or edoslmis_is_admin_for(tenant_id))
  );

-- ---------------------------------------------------------------------------
-- Audit log: read-only to tenant/platform admins; writes only via the
-- security-definer trigger function (which bypasses RLS).
-- ---------------------------------------------------------------------------
alter table edoslmis_audit_logs enable row level security;
create policy edoslmis_audit_logs_select on edoslmis_audit_logs
  for select using (
    edoshms_is_platform_admin()
    or (tenant_id = edoshms_get_tenant_id() and edoslmis_is_admin_for(tenant_id))
  );
