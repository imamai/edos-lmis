import { NextResponse } from "next/server";
import { createElement } from "react";
import { getReleasedResultData } from "@/lib/interop/data";
import { getCurrentStaff } from "@/lib/auth";
import { getTenantSettings } from "@/lib/data/settings";
import { renderPdf, pdfContentDisposition } from "@/lib/pdf/render";
import { ResultReportDocument } from "@/lib/pdf/result-report-document";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const staff = await getCurrentStaff();
  const [data, settings] = await Promise.all([getReleasedResultData(id), getTenantSettings(staff.tenantId)]);

  if (!data) {
    return NextResponse.json({ error: "Result not found or not yet released" }, { status: 404 });
  }

  const buffer = await renderPdf(createElement(ResultReportDocument, { data, settings }));

  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": pdfContentDisposition(request, `${data.orderNumber}-${data.testCode}.pdf`),
    },
  });
}
