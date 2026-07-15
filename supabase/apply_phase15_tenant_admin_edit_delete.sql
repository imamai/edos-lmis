-- EDOS LMIS Phase 15 — edit/remove a tenant's admin accounts, and let
-- deleting a tenant clean up its (invisible-to-this-UI) branches too, so
-- "remove the staff, then delete the tenant" actually works end-to-end.
--
-- edoslmis_delete_tenant deliberately still does NOT touch staff/admin
-- profiles itself — a platform admin removes those explicitly first, via
-- edoslmis_delete_tenant_admin below, one at a time. That keeps the
-- blast radius of a single "Delete tenant" click limited to structural
-- plumbing (branches) this UI never exposes any other way to remove,
-- while anything the admin didn't explicitly delete still blocks the
-- tenant delete with a clear foreign_key_violation message.

-- ---------------------------------------------------------------------------
-- edoslmis_list_tenant_admins() (0052): add phone so the edit form can be
-- pre-filled without blanking it out on save (same class of bug as the
-- earlier missing legal_name on edoslmis_list_tenants). Return columns
-- changed, so drop before recreate.
-- ---------------------------------------------------------------------------
drop function if exists edoslmis_list_tenant_admins(uuid);

create function edoslmis_list_tenant_admins(p_tenant_id uuid)
returns table (
  id uuid,
  first_name text,
  last_name text,
  phone text,
  is_active boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id, p.first_name, p.last_name, p.phone, p.is_active
  from edoshms_user_profiles p
  where edoshms_is_platform_admin()
    and p.tenant_id = p_tenant_id
    and p.is_tenant_admin = true
    and p.deleted_at is null
  order by p.first_name, p.last_name;
$$;

grant execute on function edoslmis_list_tenant_admins(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- edoslmis_update_tenant_admin(): edit a tenant admin's name/phone. Email
-- lives in auth.users, not this profile table, so it isn't handled here —
-- see updateTenantAdmin in lib/actions/tenant-admin.ts if that's ever needed.
-- ---------------------------------------------------------------------------
create or replace function edoslmis_update_tenant_admin(
  p_user_id uuid,
  p_tenant_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not edoshms_is_platform_admin() then
    raise exception 'Not authorized to edit tenant admins';
  end if;
  if p_first_name is null or trim(p_first_name) = '' or p_last_name is null or trim(p_last_name) = '' then
    raise exception 'First and last name are required';
  end if;

  update edoshms_user_profiles
    set first_name = trim(p_first_name),
        last_name = trim(p_last_name),
        phone = nullif(trim(coalesce(p_phone, '')), '')
    where id = p_user_id and tenant_id = p_tenant_id;

  if not found then
    raise exception 'Admin not found for this tenant';
  end if;
end;
$$;

grant execute on function edoslmis_update_tenant_admin(uuid, uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- edoslmis_delete_tenant_admin(): hard delete a tenant's admin profile row
-- (the caller — deleteTenantAdmin in lib/actions/tenant-admin.ts — then also
-- removes the matching auth.users login via the Admin API, since that has no
-- SQL equivalent). Scoped to p_tenant_id so a platform admin can only ever
-- delete a profile through the tenant page it's actually listed on.
-- ---------------------------------------------------------------------------
create or replace function edoslmis_delete_tenant_admin(p_user_id uuid, p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not edoshms_is_platform_admin() then
    raise exception 'Not authorized to remove tenant admins';
  end if;

  delete from edoshms_user_profiles where id = p_user_id and tenant_id = p_tenant_id;
  if not found then
    raise exception 'Admin not found for this tenant';
  end if;
exception
  when foreign_key_violation then
    raise exception 'This person still has records referencing them (e.g. as a creator/approver elsewhere) and cannot be removed.';
end;
$$;

grant execute on function edoslmis_delete_tenant_admin(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- edoslmis_delete_tenant(): now also deletes the tenant's branches before
-- deleting the tenant itself (branches have no management UI of their own
-- to clear them first). Still hits foreign_key_violation — caught with the
-- same message — the moment any branch or the tenant has real dependent
-- data (patients, orders, remaining staff, etc.), so this stays exactly as
-- safe as before, just one layer deeper.
-- ---------------------------------------------------------------------------
create or replace function edoslmis_delete_tenant(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not edoshms_is_platform_admin() then
    raise exception 'Not authorized to delete tenants';
  end if;

  delete from edoshms_branches where tenant_id = p_tenant_id;
  delete from edoshms_tenants where id = p_tenant_id;
  if not found then
    raise exception 'Tenant not found';
  end if;
exception
  when foreign_key_violation then
    raise exception 'This tenant still has staff, branches with data, or other records and cannot be deleted — remove its admins first, or deactivate it instead.';
end;
$$;

grant execute on function edoslmis_delete_tenant(uuid) to authenticated;

notify pgrst, 'reload schema';
