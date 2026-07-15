import { NextResponse } from "next/server";
import { getReleasedResultData } from "@/lib/interop/data";
import { buildFhirBundle } from "@/lib/interop/fhir";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await getReleasedResultData(id);
  if (!data) {
    return NextResponse.json({ error: "Result not found or not yet released" }, { status: 404 });
  }

  const bundle = buildFhirBundle(data);
  return NextResponse.json(bundle, {
    headers: { "Content-Type": "application/fhir+json" },
  });
}
