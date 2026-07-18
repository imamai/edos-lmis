// Master list of individually-grantable permission strings, grouped by
// service area for the staff "custom permissions" checklist. This is the
// de-facto complete set currently checked by edoslmis_has_permission() across
// every RLS policy in supabase/migrations — there's no single source of
// truth in the database itself (roles are free-form jsonb arrays of these
// same strings), so this list has to be kept in sync by hand when a new
// permission string is introduced in a migration.
export type PermissionOption = { value: string; label: string };
export type PermissionGroup = { group: string; permissions: PermissionOption[] };

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    group: "Patients & Orders",
    permissions: [
      { value: "edoslmis.patient.manage", label: "Manage patients" },
      { value: "edoslmis.order.manage", label: "Manage orders" },
      { value: "edoslmis.specimen.collect", label: "Collect specimens" },
    ],
  },
  {
    group: "Results",
    permissions: [
      { value: "edoslmis.result.enter", label: "Enter results" },
      { value: "edoslmis.result.verify", label: "Verify results" },
      { value: "edoslmis.result.release", label: "Release results" },
      { value: "edoslmis.critical.acknowledge", label: "Acknowledge critical alerts" },
    ],
  },
  {
    group: "Specialty Departments",
    permissions: [
      { value: "edoslmis.microbiology.manage", label: "Microbiology" },
      { value: "edoslmis.histopathology.manage", label: "Histopathology" },
      { value: "edoslmis.bloodbank.manage", label: "Blood bank" },
      { value: "edoslmis.qc.manage", label: "Quality control" },
    ],
  },
  {
    group: "Inventory & Procurement",
    permissions: [
      { value: "edoslmis.inventory.manage", label: "Inventory, stock movements & procurement" },
      { value: "edoslmis.catalog.manage", label: "Test catalogue" },
    ],
  },
  {
    group: "Billing & Equipment",
    permissions: [
      { value: "edoslmis.billing.manage", label: "Billing & payments" },
      { value: "edoslmis.equipment.manage", label: "Equipment" },
    ],
  },
];

export const ALL_PERMISSIONS: PermissionOption[] = PERMISSION_GROUPS.flatMap((g) => g.permissions);
