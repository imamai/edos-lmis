import { createClient } from "@/lib/supabase/server";

export type TenantSettings = {
  clinic_name: string | null;
  clinic_phone: string | null;
  clinic_email: string | null;
  clinic_address: string | null;
  currency_code: string;
  logo_path: string | null;
  signature_path: string | null;
  logo_url: string | null;
  signature_url: string | null;
  kra_pin: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  mpesa_till: string | null;
  vat_rate: number;
  vat_enabled: boolean;
  invoice_footer_note: string | null;
  quotation_footer_note: string | null;
  theme_color: string;
};

const BUCKET = "edoslmis-branding";

export async function getTenantSettings(tenantId: string): Promise<TenantSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("edoslmis_tenant_settings")
    .select(
      "clinic_name, clinic_phone, clinic_email, clinic_address, currency_code, logo_path, signature_path, kra_pin, bank_name, bank_account_number, mpesa_till, vat_rate, vat_enabled, invoice_footer_note, quotation_footer_note, theme_color"
    )
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const logoUrl = data?.logo_path
    ? supabase.storage.from(BUCKET).getPublicUrl(data.logo_path).data.publicUrl
    : null;
  const signatureUrl = data?.signature_path
    ? supabase.storage.from(BUCKET).getPublicUrl(data.signature_path).data.publicUrl
    : null;

  return {
    clinic_name: data?.clinic_name ?? null,
    clinic_phone: data?.clinic_phone ?? null,
    clinic_email: data?.clinic_email ?? null,
    clinic_address: data?.clinic_address ?? null,
    currency_code: data?.currency_code ?? "KES",
    logo_path: data?.logo_path ?? null,
    signature_path: data?.signature_path ?? null,
    logo_url: logoUrl,
    signature_url: signatureUrl,
    kra_pin: data?.kra_pin ?? null,
    bank_name: data?.bank_name ?? null,
    bank_account_number: data?.bank_account_number ?? null,
    mpesa_till: data?.mpesa_till ?? null,
    vat_rate: Number(data?.vat_rate ?? 16),
    vat_enabled: data?.vat_enabled ?? true,
    invoice_footer_note: data?.invoice_footer_note ?? null,
    quotation_footer_note: data?.quotation_footer_note ?? null,
    theme_color: data?.theme_color ?? "#1d4ed8",
  };
}
