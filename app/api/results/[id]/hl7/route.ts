import { NextResponse } from "next/server";
import { getReleasedResultData } from "@/lib/interop/data";
import { buildHl7OruMessage } from "@/lib/interop/hl7";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await getReleasedResultData(id);
  if (!data) {
    return NextResponse.json({ error: "Result not found or not yet released" }, { status: 404 });
  }

  const message = buildHl7OruMessage(data);
  return new NextResponse(message, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
