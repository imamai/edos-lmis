import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth";
import { getTenantSettings } from "@/lib/data/settings";
import { listTenants, listTenantAdmins } from "@/lib/data/tenant-admin";
import { TenantSettingsForm } from "@/components/tenant-settings-form";
import { BrandingUploadForm } from "@/components/branding-upload-form";
import { EditTenantForm } from "@/components/edit-tenant-form";
import { TenantAdminList } from "@/components/tenant-admin-list";
import { TenantActiveToggle } from "@/components/tenant-active-toggle";
import { DeleteTenantButton } from "@/components/delete-tenant-button";

export default async function TenantDetailPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
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

  const [{ data: tenants }, settings, { data: admins }] = await Promise.all([
    listTenants(),
    getTenantSettings(tenantId),
    listTenantAdmins(tenantId),
  ]);
  const tenant = tenants.find((t) => t.id === tenantId);
  if (!tenant) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/tenants" className="text-sm text-muted-foreground hover:underline">
            &larr; All tenants
          </Link>
          <h1 className="text-xl font-semibold text-foreground">{tenant.name}</h1>
          <p className="text-sm text-muted-foreground">
            Clinic info and branding shown on this tenant&apos;s generated documents
          </p>
        </div>
        <TenantActiveToggle tenantId={tenantId} isActive={!tenant.deleted_at} />
      </div>

      <EditTenantForm tenantId={tenantId} name={tenant.name} legalName={tenant.legal_name} code={tenant.code} />

      <TenantSettingsForm settings={settings} tenantId={tenantId} />
      <BrandingUploadForm kind="logo" title="Logo" currentUrl={settings.logo_url} tenantId={tenantId} />
      <BrandingUploadForm
        kind="signature"
        title="Authorized signature"
        currentUrl={settings.signature_url}
        tenantId={tenantId}
      />

      <TenantAdminList admins={admins} tenantId={tenantId} />

      <div className="border-t border-border pt-6">
        <h2 className="mb-2 text-sm font-medium text-foreground">Danger zone</h2>
        <DeleteTenantButton tenantId={tenantId} tenantName={tenant.name} />
      </div>
    </div>
  );
}
