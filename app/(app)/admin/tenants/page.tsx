import Link from "next/link";
import { getCurrentStaff } from "@/lib/auth";
import { listTenants } from "@/lib/data/tenant-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTenantForm } from "@/components/create-tenant-form";
import { TenantActiveToggle } from "@/components/tenant-active-toggle";

export default async function TenantsPage() {
  const staff = await getCurrentStaff();

  if (!staff.isPlatformAdmin) {
    return (
      <div className="mx-auto max-w-md space-y-2 py-16 text-center">
        <h1 className="text-lg font-semibold text-foreground">Platform admins only</h1>
        <p className="text-sm text-muted-foreground">
          Tenant management is restricted to platform administrators.
        </p>
      </div>
    );
  }

  const { data: tenants, error } = await listTenants();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Tenant Management</h1>
        <p className="text-sm text-muted-foreground">
          Create tenants and manage any tenant&apos;s clinic info, branding, and document settings
        </p>
      </div>

      <CreateTenantForm />

      {error && <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">LMIS settings</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No tenants found.
                  </td>
                </tr>
              )}
              {tenants.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <Link href={`/admin/tenants/${t.id}`} className="hover:underline">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.code}</td>
                  <td className="px-4 py-3">
                    <TenantActiveToggle tenantId={t.id} isActive={!t.deleted_at} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.settings_updated_at ? "Configured" : "Not configured yet"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
