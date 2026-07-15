"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updateTenantSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { TenantSettings } from "@/lib/data/settings";

export function TenantSettingsForm({
  settings,
  tenantId = null,
}: {
  settings: TenantSettings;
  tenantId?: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateTenantSettings.bind(null, tenantId), null);
  const router = useRouter();

  return (
    // Keyed on the saved values: these inputs are uncontrolled (defaultValue),
    // and this form never unmounts, so without a key tied to the data a
    // successful save wouldn't visually update the fields even though the
    // underlying record did.
    <form key={JSON.stringify(settings)} action={formAction} onSubmit={() => router.refresh()}>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="clinic_name">Clinic / laboratory name</Label>
            <Input id="clinic_name" name="clinic_name" defaultValue={settings.clinic_name ?? ""} />
          </div>
          <div>
            <Label htmlFor="clinic_phone">Phone</Label>
            <Input id="clinic_phone" name="clinic_phone" type="tel" defaultValue={settings.clinic_phone ?? ""} />
          </div>
          <div>
            <Label htmlFor="clinic_email">Email</Label>
            <Input id="clinic_email" name="clinic_email" type="email" defaultValue={settings.clinic_email ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="clinic_address">Address</Label>
            <Textarea id="clinic_address" name="clinic_address" rows={2} defaultValue={settings.clinic_address ?? ""} />
          </div>
          <div>
            <Label htmlFor="currency_code">Currency code</Label>
            <Input id="currency_code" name="currency_code" maxLength={3} defaultValue={settings.currency_code} />
          </div>
          <div>
            <Label htmlFor="theme_color">Document theme color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="theme_color"
                name="theme_color"
                type="color"
                defaultValue={settings.theme_color}
                className="h-10 w-16 p-1"
              />
              <span className="text-sm text-muted-foreground">
                Used for the clinic name and document title on generated PDFs
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="kra_pin">KRA PIN</Label>
            <Input id="kra_pin" name="kra_pin" defaultValue={settings.kra_pin ?? ""} />
          </div>
          <div>
            <Label htmlFor="vat_rate">VAT rate (%)</Label>
            <Input id="vat_rate" name="vat_rate" type="number" step="0.01" min="0" defaultValue={settings.vat_rate} />
            <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" name="vat_enabled" defaultChecked={settings.vat_enabled} className="h-4 w-4" />
              Charge VAT on documents
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              When unchecked, VAT is never added and the VAT line is hidden from invoices and quotations.
            </p>
          </div>
          <div>
            <Label htmlFor="bank_name">Bank name</Label>
            <Input id="bank_name" name="bank_name" defaultValue={settings.bank_name ?? ""} />
          </div>
          <div>
            <Label htmlFor="bank_account_number">Bank account number</Label>
            <Input id="bank_account_number" name="bank_account_number" defaultValue={settings.bank_account_number ?? ""} />
          </div>
          <div>
            <Label htmlFor="mpesa_till">M-Pesa till</Label>
            <Input id="mpesa_till" name="mpesa_till" defaultValue={settings.mpesa_till ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="invoice_footer_note">Invoice footer note</Label>
            <Textarea id="invoice_footer_note" name="invoice_footer_note" rows={2} defaultValue={settings.invoice_footer_note ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="quotation_footer_note">Quotation footer note</Label>
            <Textarea id="quotation_footer_note" name="quotation_footer_note" rows={2} defaultValue={settings.quotation_footer_note ?? ""} />
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="mt-4 rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
      )}

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save Clinic Info"}
        </Button>
      </div>
    </form>
  );
}
