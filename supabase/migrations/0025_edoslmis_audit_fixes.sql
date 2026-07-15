-- EDOS LMIS Phase 6 — audit fixes: QC per-instrument scoping, staff name
-- resolution, critical-alert acknowledgement permission.

-- ---------------------------------------------------------------------------
-- 1. Westgard multirule evaluation was scoped only by material_id, so two
-- instruments sharing one control lot had their runs interleaved into the
-- same rolling window — able to both mask a real violation on a failing
-- analyzer (diluted by an unaffected second instrument) and fabricate one on
-- a healthy analyzer (drift on a different instrument mistaken for a shift).
-- Re-scope the window to (material_id, equipment_id), null-safe so runs with
-- no instrument recorded still form their own consistent bucket.
-- ---------------------------------------------------------------------------
create or replace function edoslmis_evaluate_qc_run()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_mean numeric;
  v_sd numeric;
  v_z numeric;
  v_rules jsonb := '[]'::jsonb;
  v_status edoslmis_qc_status := 'accepted';
  v_recent numeric[];
begin
  select target_mean, target_sd into v_mean, v_sd
  from edoslmis_qc_materials where id = new.material_id;

  if v_sd is null or v_sd = 0 then
    new.z_score := null;
    new.status := 'accepted';
    new.violated_rules := '[]'::jsonb;
    return new;
  end if;

  v_z := (new.value - v_mean) / v_sd;
  new.z_score := v_z;

  if abs(v_z) >= 3 then
    v_rules := v_rules || '["1_3s"]'::jsonb;
    v_status := 'rejected';
  elsif abs(v_z) >= 2 then
    v_rules := v_rules || '["1_2s"]'::jsonb;
    v_status := 'warning';
  end if;

  select array_agg(z_score order by run_at desc) into v_recent
  from (
    select z_score, run_at from edoslmis_qc_runs
    where material_id = new.material_id
      and equipment_id is not distinct from new.equipment_id
      and z_score is not null
    order by run_at desc
    limit 9
  ) s;

  if v_recent is not null and array_length(v_recent, 1) >= 1 then
    if abs(v_z) >= 2 and abs(v_recent[1]) >= 2 and sign(v_z) = sign(v_recent[1]) then
      v_rules := v_rules || '["2_2s"]'::jsonb;
      v_status := 'rejected';
    end if;

    if abs(v_z - v_recent[1]) >= 4 then
      v_rules := v_rules || '["r_4s"]'::jsonb;
      v_status := 'rejected';
    end if;
  end if;

  if v_recent is not null and array_length(v_recent, 1) >= 3 then
    if abs(v_z) >= 1 and abs(v_recent[1]) >= 1 and abs(v_recent[2]) >= 1 and abs(v_recent[3]) >= 1
       and sign(v_z) = sign(v_recent[1]) and sign(v_z) = sign(v_recent[2]) and sign(v_z) = sign(v_recent[3])
    then
      v_rules := v_rules || '["4_1s"]'::jsonb;
      v_status := 'rejected';
    end if;
  end if;

  if v_recent is not null and array_length(v_recent, 1) >= 9 and sign(v_z) <> 0 then
    if (select bool_and(sign(z) = sign(v_z)) from unnest(v_recent[1:9]) as z) then
      v_rules := v_rules || '["10x"]'::jsonb;
      v_status := 'rejected';
    end if;
  end if;

  new.status := v_status;
  new.violated_rules := v_rules;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. edoshms_user_profiles has RLS enabled with no SELECT policy (see
-- 0008_edoslmis_current_staff_rpc.sql) — a user-session client embedding it
-- (e.g. edoslmis_result_verification -> edoshms_user_profiles) silently gets
-- null back, so "who verified/acknowledged this" can never render. Resolve
-- names through a SECURITY DEFINER function, same pattern as
-- edoslmis_get_current_staff(), scoped to the caller's own tenant.
-- ---------------------------------------------------------------------------
create or replace function edoslmis_get_staff_display_names(p_user_ids uuid[])
returns table (user_id uuid, display_name text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id, trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
  from edoshms_user_profiles p
  where p.id = any(p_user_ids)
    and (p.tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
$$;

grant execute on function edoslmis_get_staff_display_names(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. edoslmis_critical_alerts' write policy already checks for
-- 'edoslmis.critical.acknowledge' (0006_edoslmis_rls.sql) but nothing ever
-- granted it and no UI ever used it — critical results had no acknowledgement
-- path despite the SMS telling clinicians to go acknowledge one. Grant it
-- alongside the other lab_manager permissions; edoslmis.result.enter already
-- satisfies the policy too, so this mainly covers roles without that grant.
-- ---------------------------------------------------------------------------
update edoshms_roles
set permissions = permissions || '["edoslmis.critical.acknowledge"]'::jsonb
where tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87'
  and code = 'lab_manager'
  and not (permissions @> '["edoslmis.critical.acknowledge"]'::jsonb);
