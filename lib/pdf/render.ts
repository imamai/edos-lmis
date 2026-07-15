import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

// @react-pdf/renderer's own types only accept a <Document> element; our
// document components (InvoiceDocument, PurchaseOrderDocument, ...) render a
// <Document> as their root but are otherwise ordinary components, so the
// element TypeScript sees at the call site doesn't structurally match
// DocumentProps. This narrows the cast to one place instead of one per route.
export function renderPdf(element: ReactElement): Promise<Buffer> {
  return renderToBuffer(element as ReactElement<DocumentProps>);
}

// Default to viewing the PDF inline (opens in the browser's own PDF viewer);
// pass ?download=1 to force a "Save As" download instead.
export function pdfContentDisposition(request: Request, filename: string): string {
  const forceDownload = new URL(request.url).searchParams.has("download");
  return `${forceDownload ? "attachment" : "inline"}; filename="${filename}"`;
}
