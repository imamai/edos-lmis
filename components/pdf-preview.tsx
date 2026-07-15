"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

export function PdfPreview({ src, title }: { src: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="no-print flex items-center justify-between border-b border-border px-4 py-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => iframeRef.current?.contentWindow?.print()}
          >
            <Printer size={16} /> Print
          </Button>
          <a href={`${src}${src.includes("?") ? "&" : "?"}download=1`}>
            <Button variant="secondary" size="sm">
              <Download size={16} /> Download
            </Button>
          </a>
        </div>
      </div>
      <iframe ref={iframeRef} src={src} title={title} className="h-[80vh] w-full" />
    </div>
  );
}
