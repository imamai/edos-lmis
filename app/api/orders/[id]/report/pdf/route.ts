import { NextResponse } from "next/server";
import { createElement } from "react";
import { getReleasedOrderReportData } from "@/lib/interop/data";
import { getCurrentStaff } from "@/lib/auth";
import { getTenantSettings } from "@/lib/data/settings";
import { renderPdf, pdfContentDisposition } from "@/lib/pdf/render";
import { OrderReportDocument } from "@/lib/pdf/order-report-document";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const staff = await getCurrentStaff();
  const [data, settings] = await Promise.all([getReleasedOrderReportData(id), getTenantSettings(staff.tenantId)]);

  if (!data) {
    return NextResponse.json({ error: "Order not found or has no released results" }, { status: 404 });
  }

  const buffer = await renderPdf(createElement(OrderReportDocument, { data, settings }));

  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": pdfContentDisposition(request, `${data.orderNumber}-report.pdf`),
    },
  });
}
