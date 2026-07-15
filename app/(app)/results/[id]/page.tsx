import { createClient } from "@/lib/supabase/server";
import { getTestComponents } from "@/lib/data/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResultEntryForm, type ResultComponentRow } from "@/components/result-entry-form";
import { VerifyButton, ReleaseButton } from "@/components/verify-release-buttons";
import { CriticalAlertActions } from "@/components/critical-alert-actions";
import { RecollectionButton } from "@/components/recollection-button";
import Link from "next/link";
import { notFound } from "next/navigation";

const flagTone: Record<string, "neutral" | "warning" | "critical"> = {
  normal: "neutral",
  low: "warning",
  high: "warning",
  critical_low: "critical",
  critical_high: "critical",
  abnormal: "warning",
};

const verificationStatusTone: Record<string, "success" | "critical" | "neutral"> = {
  verified: "success",
  rejected_back_for_recollection: "critical",
  pending: "neutral",
};

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: orderTest, error: orderTestError } = await supabase
    .from("edoslmis_order_tests")
    .select(
      "id, status, test_id, order_id, edoslmis_tests(name, code), edoslmis_orders(order_number, edoslmis_patients(first_name, last_name, patient_number))"
    )
    .eq("id", id)
    .single();

  if (orderTestError) {
    return (
      <div className="space-y-6">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{orderTestError.message}</p>
      </div>
    );
  }
  if (!orderTest) notFound();

  const test = orderTest.edoslmis_tests as unknown as { name: string; code: string } | null;
  const order = orderTest.edoslmis_orders as unknown as {
    order_number: string;
    edoslmis_patients: { first_name: string; last_name: string; patient_number: string } | null;
  } | null;
  const patient = order?.edoslmis_patients;

  const components = await getTestComponents(orderTest.test_id);

  const { data: results } = await supabase
    .from("edoslmis_result_entries")
    .select("id, component_id, result_value_numeric, result_value_text, unit, flag, is_critical")
    .eq("order_test_id", id)
    .order("entered_at", { ascending: false });

  const { data: verifications } = await supabase
    .from("edoslmis_result_verification")
    .select("level, status, verified_at, verified_by, comments")
    .eq("order_test_id", id)
    .order("verified_at", { ascending: true });

  const verifierIds = [...new Set((verifications ?? []).map((v) => v.verified_by).filter((v): v is string => Boolean(v)))];
  let staffNames: { user_id: string; display_name: string }[] = [];
  if (verifierIds.length) {
    const { data } = await supabase.rpc("edoslmis_get_staff_display_names", { p_user_ids: verifierIds });
    staffNames = (data ?? []) as { user_id: string; display_name: string }[];
  }
  const nameMap = new Map(staffNames.map((s) => [s.user_id, s.display_name]));

  const { data: criticalAlerts } = await supabase
    .from("edoslmis_critical_alerts")
    .select("id, notes, notified_at, edoslmis_result_entries!inner(order_test_id, component_id, result_value_numeric, result_value_text)")
    .eq("edoslmis_result_entries.order_test_id", id)
    .is("acknowledged_at", null);

  const componentName = (componentId: string | null) =>
    components.find((c) => c.id === componentId)?.name ?? test?.name ?? "Result";

  const rangeLabel = (c: (typeof components)[number]) =>
    c.textRange ?? (c.low !== null || c.high !== null ? `${c.low ?? "-"} - ${c.high ?? "-"}` : null);

  const formComponents: ResultComponentRow[] =
    components.length > 0
      ? components.map((c) => ({
          id: c.id,
          name: c.name,
          unit: c.unit,
          dataType: c.dataType,
          selectOptions: c.selectOptions,
          rangeLabel: rangeLabel(c),
        }))
      : [{ id: null, name: test?.name ?? "Value", unit: null, dataType: "text", selectOptions: [], rangeLabel: null }];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{test?.name}</h1>
          <p className="text-sm text-muted-foreground">
            {order?.order_number} &middot; {patient ? `${patient.first_name} ${patient.last_name}` : "-"} (
            {patient?.patient_number})
          </p>
        </div>
        <Badge tone="info">{orderTest.status}</Badge>
      </div>

      {(criticalAlerts?.length ?? 0) > 0 && (
        <Card className="border-critical/40">
          <CardHeader>
            <CardTitle className="text-critical">Critical Result &mdash; Needs Acknowledgement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {criticalAlerts?.map((alert) => {
              const entry = alert.edoslmis_result_entries as unknown as {
                component_id: string | null;
                result_value_numeric: number | null;
                result_value_text: string | null;
              } | null;
              return (
                <div key={alert.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <p className="text-sm text-foreground">
                    {componentName(entry?.component_id ?? null)}:{" "}
                    <span className="font-semibold">{entry?.result_value_numeric ?? entry?.result_value_text}</span>
                  </p>
                  <CriticalAlertActions alertId={alert.id} orderTestId={id} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {["received", "in_analysis"].includes(orderTest.status) && (
        <ResultEntryForm orderTestId={id} components={formComponents} />
      )}

      {orderTest.status === "rejected" && (
        <Card>
          <CardHeader>
            <CardTitle>Specimen Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              This test&apos;s specimen was rejected. Request a recollection to reopen it for a fresh specimen.
            </p>
            <RecollectionButton orderTestId={id} />
          </CardContent>
        </Card>
      )}

      {(results?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Parameter</th>
                  <th className="px-4 py-2 font-medium">Value</th>
                  <th className="px-4 py-2 font-medium">Unit</th>
                  <th className="px-4 py-2 font-medium">Flag</th>
                </tr>
              </thead>
              <tbody>
                {results?.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2 text-foreground">{componentName(r.component_id)}</td>
                    <td className="px-4 py-2 font-medium text-foreground">
                      {r.result_value_numeric ?? r.result_value_text}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{r.unit ?? "-"}</td>
                    <td className="px-4 py-2">
                      <Badge tone={flagTone[r.flag ?? "normal"]}>{r.flag ?? "normal"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {orderTest.status === "resulted" && (
        <Card>
          <CardHeader>
            <CardTitle>Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <VerifyButton orderTestId={id} />
          </CardContent>
        </Card>
      )}

      {orderTest.status === "verified" && (
        <Card>
          <CardHeader>
            <CardTitle>Release</CardTitle>
          </CardHeader>
          <CardContent>
            <ReleaseButton orderTestId={id} />
          </CardContent>
        </Card>
      )}

      {orderTest.status === "released" && (
        <Link href={`/results/${id}/report`} className="text-primary hover:underline">
          View printable report &rarr;
        </Link>
      )}

      {(verifications?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Verification History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {verifications?.map((v, i) => (
              <div key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="font-medium capitalize text-foreground">{v.level}</span>
                    <Badge tone={verificationStatusTone[v.status] ?? "neutral"}>{v.status.replace(/_/g, " ")}</Badge>
                  </span>
                  <span className="text-muted-foreground">
                    {v.verified_at ? new Date(v.verified_at).toLocaleString() : "-"}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {v.verified_by ? nameMap.get(v.verified_by) ?? "Unknown staff" : "-"}
                </p>
                {v.comments && <p className="mt-1 text-foreground">&ldquo;{v.comments}&rdquo;</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
