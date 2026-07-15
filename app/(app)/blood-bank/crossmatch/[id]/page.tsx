import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CrossmatchResultForm } from "@/components/crossmatch-result-form";
import { IssueTransfusionForm } from "@/components/issue-transfusion-form";
import { TransfusionReactionForm } from "@/components/transfusion-reaction-form";
import { BLOOD_GROUP_LABELS, compatibleDonorGroups } from "@/lib/blood-compatibility";
import Link from "next/link";
import { notFound } from "next/navigation";

const resultTone: Record<string, "success" | "critical"> = {
  compatible: "success",
  incompatible: "critical",
};

const transfusionStatusTone: Record<string, "neutral" | "info" | "success" | "critical"> = {
  issued: "info",
  in_progress: "info",
  completed: "success",
  discontinued: "critical",
};

export default async function CrossmatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("edoslmis_bb_crossmatch_requests")
    .select(
      "id, patient_id, patient_blood_group, component_requested, units_requested, indication, status, requested_at, edoslmis_patients(id, first_name, last_name, patient_number)"
    )
    .eq("id", id)
    .single();

  if (!request) notFound();

  const patient = request.edoslmis_patients as unknown as {
    id: string; first_name: string; last_name: string; patient_number: string;
  } | null;

  const compatibleGroups = compatibleDonorGroups(request.patient_blood_group);

  const [{ data: candidateUnits }, { data: results }] = await Promise.all([
    supabase
      .from("edoslmis_bb_blood_units")
      .select("id, unit_number, blood_group, component, expiry_date")
      .eq("status", "available")
      .eq("component", request.component_requested)
      .in("blood_group", compatibleGroups)
      .order("expiry_date"),
    supabase
      .from("edoslmis_bb_crossmatch_results")
      .select("id, blood_unit_id, method, result, performed_at, notes, edoslmis_bb_blood_units(unit_number, blood_group)")
      .eq("crossmatch_request_id", id)
      .order("performed_at", { ascending: false }),
  ]);

  const resultIds = results?.map((r) => r.id) ?? [];
  const { data: transfusions } = resultIds.length
    ? await supabase
        .from("edoslmis_bb_transfusions")
        .select("id, crossmatch_result_id, blood_unit_id, ward_location, status, issued_at")
        .in("crossmatch_result_id", resultIds)
    : { data: [] as { id: string; crossmatch_result_id: string | null; blood_unit_id: string; ward_location: string | null; status: string; issued_at: string }[] };

  const transfusionByResult = new Map(
    (transfusions ?? []).map((t) => [t.crossmatch_result_id, t])
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Crossmatch Request</h1>
          {patient && (
            <p className="text-sm text-muted-foreground">
              <Link href={`/patients/${patient.id}`} className="text-primary hover:underline">
                {patient.first_name} {patient.last_name} ({patient.patient_number})
              </Link>
            </p>
          )}
        </div>
        <div className="text-right">
          <Badge tone="neutral">{request.patient_blood_group ? BLOOD_GROUP_LABELS[request.patient_blood_group] : "Unknown group"}</Badge>
          <p className="mt-1 text-sm text-muted-foreground">
            {request.units_requested}x {request.component_requested.replace(/_/g, " ")}
          </p>
        </div>
      </div>

      {request.indication && (
        <p className="text-sm text-muted-foreground">Indication: {request.indication}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Perform Crossmatch</CardTitle>
        </CardHeader>
        <CardContent>
          {(candidateUnits?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No compatible available units in stock for this group/component.</p>
          ) : (
            <CrossmatchResultForm crossmatchRequestId={id} candidateUnits={candidateUnits ?? []} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Crossmatch Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(results?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">No crossmatch results recorded yet.</p>
          )}
          {results?.map((r) => {
            const unit = r.edoslmis_bb_blood_units as unknown as { unit_number: string; blood_group: string } | null;
            const transfusion = transfusionByResult.get(r.id);
            return (
              <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {unit?.unit_number} &middot; {unit ? BLOOD_GROUP_LABELS[unit.blood_group] : ""} &middot; {r.method}
                  </p>
                  <Badge tone={resultTone[r.result] ?? "neutral"}>{r.result}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(r.performed_at).toLocaleString()} {r.notes && `— ${r.notes}`}</p>

                {r.result === "compatible" && !transfusion && (
                  <IssueTransfusionForm
                    crossmatchResultId={r.id}
                    bloodUnitId={r.blood_unit_id}
                    patientId={request.patient_id}
                    crossmatchRequestId={id}
                  />
                )}

                {transfusion && (
                  <div className="space-y-2 rounded-lg bg-surface-muted p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-foreground">
                        Issued to {transfusion.ward_location ?? "ward"} at {new Date(transfusion.issued_at).toLocaleString()}
                      </p>
                      <Badge tone={transfusionStatusTone[transfusion.status] ?? "neutral"}>{transfusion.status}</Badge>
                    </div>
                    {!["discontinued", "completed"].includes(transfusion.status) && (
                      <TransfusionReactionForm transfusionId={transfusion.id} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
