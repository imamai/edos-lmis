"use server";

import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const BUCKET = "edoslmis-branding";
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB, under the 5MB Server Action body limit
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

// Most common "vibrant" color in the logo — a flat average is dominated by
// white/transparent background on typical logos (mostly whitespace with a
// small colored mark), so instead this downsamples to a 32x32 grid, throws
// out transparent/near-white/near-black/low-saturation pixels, buckets the
// rest by quantized color, and returns the average of the largest bucket.
// Returns null if nothing vibrant enough is found, so header text never
// falls back to an illegible near-white color.
async function extractThemeColor(file: File): Promise<string | null> {
  const GRID = 32;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, info } = await sharp(buffer)
      .resize(GRID, GRID, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 128) continue;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lightness = (max + min) / 2;
      const saturation = max === min ? 0 : (max - min) / (255 - Math.abs(2 * lightness - 255));
      if (lightness > 235 || lightness < 20 || saturation < 0.15) continue;

      const key = `${r >> 4},${g >> 4},${b >> 4}`;
      const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.n += 1;
      buckets.set(key, bucket);
    }

    let best: { r: number; g: number; b: number; n: number } | null = null;
    for (const bucket of buckets.values()) {
      if (!best || bucket.n > best.n) best = bucket;
    }
    if (!best) return null;

    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
    return `#${toHex(best.r / best.n)}${toHex(best.g / best.n)}${toHex(best.b / best.n)}`;
  } catch {
    return null;
  }
}

export async function updateTenantSettings(
  targetTenantId: string | null,
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const staff = await getCurrentStaff();
  const tenantId = targetTenantId ?? staff.tenantId;
  if (tenantId !== staff.tenantId && !staff.isPlatformAdmin) {
    return { error: "Only a platform administrator can edit another tenant's settings." };
  }
  const supabase = await createClient();

  const themeColorRaw = String(formData.get("theme_color") ?? "");
  const themeColor = /^#[0-9a-fA-F]{6}$/.test(themeColorRaw) ? themeColorRaw : "#1d4ed8";

  const { error } = await supabase.from("edoslmis_tenant_settings").upsert(
    {
      tenant_id: tenantId,
      theme_color: themeColor,
      clinic_name: String(formData.get("clinic_name") ?? "").trim() || null,
      clinic_phone: String(formData.get("clinic_phone") ?? "").trim() || null,
      clinic_email: String(formData.get("clinic_email") ?? "").trim() || null,
      clinic_address: String(formData.get("clinic_address") ?? "").trim() || null,
      currency_code: String(formData.get("currency_code") ?? "KES").trim() || "KES",
      kra_pin: String(formData.get("kra_pin") ?? "").trim() || null,
      bank_name: String(formData.get("bank_name") ?? "").trim() || null,
      bank_account_number: String(formData.get("bank_account_number") ?? "").trim() || null,
      mpesa_till: String(formData.get("mpesa_till") ?? "").trim() || null,
      vat_rate: Number(formData.get("vat_rate") ?? 16) || 16,
      vat_enabled: formData.get("vat_enabled") === "on",
      invoice_footer_note: String(formData.get("invoice_footer_note") ?? "").trim() || null,
      quotation_footer_note: String(formData.get("quotation_footer_note") ?? "").trim() || null,
      updated_by: staff.userId,
    },
    { onConflict: "tenant_id" }
  );

  if (error) return { error: error.message };

  revalidatePath(tenantId === staff.tenantId ? "/settings" : `/admin/tenants/${tenantId}`);
  return { error: null };
}

async function uploadAsset(targetTenantId: string | null, kind: "logo" | "signature", file: File) {
  if (file.size > MAX_FILE_SIZE) {
    return { error: `File is too large — max ${MAX_FILE_SIZE / (1024 * 1024)}MB.` };
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { error: "Unsupported file type — upload a PNG, JPEG, or WEBP image." };
  }

  const staff = await getCurrentStaff();
  const tenantId = targetTenantId ?? staff.tenantId;
  if (tenantId !== staff.tenantId && !staff.isPlatformAdmin) {
    return { error: "Only a platform administrator can edit another tenant's branding." };
  }
  const supabase = await createClient();

  const column = kind === "logo" ? "logo_path" : "signature_path";
  const { data: existing } = await supabase
    .from("edoslmis_tenant_settings")
    .select("logo_path, signature_path")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  const previousPath = existing?.[column];

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "png";
  const path = `${tenantId}/${kind}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (uploadError) return { error: uploadError.message };

  // Only auto-pick a theme color on the tenant's very first logo — once set
  // (by extraction here or manually in Settings), replacing the logo later
  // never silently overwrites it. Use the Settings "Document theme color"
  // field to change it after the first upload.
  const themeColor = kind === "logo" && !previousPath ? await extractThemeColor(file) : null;

  const { error } = await supabase.from("edoslmis_tenant_settings").upsert(
    {
      tenant_id: tenantId,
      [column]: path,
      ...(themeColor ? { theme_color: themeColor } : {}),
      updated_by: staff.userId,
    },
    { onConflict: "tenant_id" }
  );
  if (error) return { error: error.message };

  if (previousPath && previousPath !== path) {
    await supabase.storage.from(BUCKET).remove([previousPath]);
  }

  revalidatePath(tenantId === staff.tenantId ? "/settings" : `/admin/tenants/${tenantId}`);
  return { error: null };
}

export async function uploadLogo(
  targetTenantId: string | null,
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a logo file." };
  return uploadAsset(targetTenantId, "logo", file);
}

export async function uploadSignature(
  targetTenantId: string | null,
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const file = formData.get("signature");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a signature file." };
  return uploadAsset(targetTenantId, "signature", file);
}
