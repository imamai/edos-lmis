import { getCurrentStaff } from "@/lib/auth";
import { getTenantSettings } from "@/lib/data/settings";
import { getSettingsList } from "@/lib/data/settings-lists";
import { getOrganisms, getAntibiotics } from "@/lib/data/microbiology-catalog";
import { TenantSettingsForm } from "@/components/tenant-settings-form";
import { BrandingUploadForm } from "@/components/branding-upload-form";
import { SettingsListManager } from "@/components/settings-list-manager";
import { MicrobiologyCatalogManager } from "@/components/microbiology-catalog-manager";

export default async function SettingsPage() {
  const staff = await getCurrentStaff();

  if (!staff.isTenantAdmin && !staff.isPlatformAdmin) {
    return (
      <div className="mx-auto max-w-md space-y-2 py-16 text-center">
        <h1 className="text-lg font-semibold text-foreground">Admins only</h1>
        <p className="text-sm text-muted-foreground">
          Tenant settings can only be changed by a tenant or platform administrator. Ask your administrator if
          something here needs to change.
        </p>
      </div>
    );
  }

  const [settings, categories, equipmentTypes, paymentMethods, histopathologyStains, organisms, antibiotics] =
    await Promise.all([
      getTenantSettings(staff.tenantId),
      getSettingsList("inventory_category"),
      getSettingsList("equipment_type"),
      getSettingsList("payment_method"),
      getSettingsList("histopathology_stain"),
      getOrganisms(),
      getAntibiotics(),
    ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Clinic info and branding shown on generated documents (invoices, purchase orders, lab reports)
        </p>
      </div>

      <TenantSettingsForm settings={settings} />
      <BrandingUploadForm kind="logo" title="Logo" currentUrl={settings.logo_url} />
      <BrandingUploadForm kind="signature" title="Authorized signature" currentUrl={settings.signature_url} />

      <div>
        <h2 className="text-lg font-semibold text-foreground">Master Data</h2>
        <p className="text-sm text-muted-foreground">
          Classification lists used across the app — add or remove entries without a code change
        </p>
      </div>
      <SettingsListManager
        listKey="inventory_category"
        title="Commodity Categories"
        description="Shown when adding or editing a commodity in Inventory"
        items={categories}
      />
      <SettingsListManager
        listKey="equipment_type"
        title="Equipment Types"
        description="Shown when registering or editing an asset in Equipment"
        items={equipmentTypes}
      />
      <SettingsListManager
        listKey="payment_method"
        title="Payment Methods"
        description="Shown when recording a payment against an invoice"
        items={paymentMethods}
      />
      <SettingsListManager
        listKey="histopathology_stain"
        title="Histopathology Stain Types"
        description="Shown when logging a slide in Histopathology"
        items={histopathologyStains}
      />
      <MicrobiologyCatalogManager organisms={organisms} antibiotics={antibiotics} />
    </div>
  );
}
