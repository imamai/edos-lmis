import { createClient } from "@/lib/supabase/server";
import { PdfPreview } from "@/components/pdf-preview";
import { notFound } from "next/navigation";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: orderTest, error: orderTestError } = await supabase
    .from("edoslmis_order_tests")
    .select("id, status, edoslmis_tests(name, code)")
    .eq("id", id)
    .single();

  if (orderTestError) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{orderTestError.message}</p>
      </div>
    );
  }
  if (!orderTest || orderTest.status !== "released") notFound();

  const test = orderTest.edoslmis_tests as unknown as { name: string; code: string } | null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex justify-end gap-3 print:hidden">
        <a href={`/api/results/${id}/fhir`} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
          FHIR JSON
        </a>
        <a href={`/api/results/${id}/hl7`} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
          HL7 ORU
        </a>
      </div>
      <PdfPreview src={`/api/results/${id}/pdf`} title={`${test?.name ?? "Result"} (${test?.code ?? ""})`} />
    </div>
  );
}
