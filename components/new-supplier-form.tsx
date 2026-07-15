"use client";

import { useActionState } from "react";
import { createSupplier } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function NewSupplierForm() {
  const [state, formAction, pending] = useActionState(createSupplier, null);

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Supplier name *</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="contact_person">Contact person</Label>
            <Input id="contact_person" name="contact_person" />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" />
          </div>
          <div>
            <Label htmlFor="payment_terms">Payment terms</Label>
            <Input id="payment_terms" name="payment_terms" placeholder="e.g. Net 30" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bank_details">Bank details</Label>
            <Textarea id="bank_details" name="bank_details" rows={2} placeholder="Bank name, account name/number" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="mt-4 rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
      )}

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Add Supplier"}
        </Button>
      </div>
    </form>
  );
}
