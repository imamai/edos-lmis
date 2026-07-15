"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateQuotationStatus, sendQuotation } from "@/lib/actions/quotations";
import { Button } from "@/components/ui/button";

export function QuotationStatusActions({ quotationId, status }: { quotationId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  function transition(next: string) {
    startTransition(async () => {
      const result = await updateQuotationStatus(quotationId, next);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function send() {
    startTransition(async () => {
      const result = await sendQuotation(quotationId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setNotice(
        result.emailed
          ? `Emailed to ${result.customerEmail}`
          : result.customerEmail
            ? "Marked as sent — email delivery isn't wired in yet, send the PDF manually."
            : "Marked as sent — no customer email on file, send the PDF manually."
      );
      router.refresh();
    });
  }

  if (status === "draft") {
    return (
      <div>
        <Button disabled={isPending} onClick={send}>
          {isPending ? "Sending..." : "Send to Customer"}
        </Button>
        {notice && <p className="mt-2 text-xs text-muted-foreground">{notice}</p>}
        {error && <p className="mt-2 text-sm text-critical">{error}</p>}
      </div>
    );
  }

  const actions: { label: string; next: string; variant: "primary" | "outline" | "danger" }[] =
    status === "sent"
      ? [
          { label: "Mark Accepted", next: "accepted", variant: "primary" },
          { label: "Mark Rejected", next: "rejected", variant: "danger" },
          { label: "Mark Expired", next: "expired", variant: "outline" },
        ]
      : [];

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <Button key={a.next} variant={a.variant} disabled={isPending} onClick={() => transition(a.next)}>
          {isPending ? "Saving..." : a.label}
        </Button>
      ))}
      {error && <span className="text-xs text-critical">{error}</span>}
    </div>
  );
}
