"use client";

import { useActionState } from "react";
import { uploadLogo, uploadSignature } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BrandingUploadForm({
  kind,
  title,
  currentUrl,
  tenantId = null,
}: {
  kind: "logo" | "signature";
  title: string;
  currentUrl: string | null;
  tenantId?: string | null;
}) {
  const action = (kind === "logo" ? uploadLogo : uploadSignature).bind(null, tenantId);
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {currentUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt={title} className="h-16 w-auto rounded border border-border bg-white p-1" />
        )}
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor={kind}>Upload new {kind}</Label>
            <Input id={kind} name={kind} type="file" accept="image/png,image/jpeg,image/webp" className="h-10" />
            <p className="mt-1 text-xs text-muted-foreground">PNG, JPEG, or WEBP — up to 4MB</p>
          </div>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Uploading..." : "Upload"}
          </Button>
        </form>
        {state?.error && <p className="text-sm text-critical">{state.error}</p>}
      </CardContent>
    </Card>
  );
}
